const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
let sqlite, database, backupCalls, backupAction;
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
const mock = () => new Proxy(() => mock(), { get: (_, key) => key === "create" ? (value) => value : key === Symbol.toPrimitive ? () => "" : mock() });
Module._load = function (request, ...args) {
  if (request === "@/infrastructure/database/client") return { get db() { return database; } };
  if (request === "@/modules/local-backup") return { createLocalBackup: async () => { backupCalls++; await backupAction(); } };
  if (request === "expo-crypto") return { randomUUID: require("node:crypto").randomUUID };
  if (request.includes("drizzle/migrations")) return {};
  if (/^(expo|@expo|react|react-native)/.test(request) || request === "lucide-react-native") return mock();
  return load.call(this, request, ...args);
};
require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
require.extensions[".png"] = require.extensions[".jpg"] = (module) => { module.exports = "image"; };
const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const { commitImport } = require("../services/commit-import.service.ts");
const { getImportCatalog } = require("../services/import-catalog.service.ts");
const { parseCsv, suggestColumns, categoryMappingKey } = require("../utils/csv.ts");
const { buildImportPreview, importDigest } = require("../utils/import-preview.ts");
const { getAccountsWithBalances } = require("@/modules/accounts/services/get-accounts-with-balances.service");
const journal = require("../../../../drizzle/meta/_journal.json");
const migrations = journal.entries.map((entry) => ({ sql: fs.readFileSync(path.join(root, "../drizzle", entry.tag + ".sql"), "utf8").split("--> statement-breakpoint"), folderMillis: entry.when, hash: "", bps: true }));
function aliasSelectColumns(query) {
  const selectMatch = /^\s*select\s+/i.exec(query);
  if (!selectMatch) return query;
  const selectStart = selectMatch[0].length;
  let depth = 0;
  let quote = null;
  let fromStart = -1;

  for (let index = selectStart; index < query.length; index += 1) {
    const char = query[index];
    if (quote) {
      if (char === quote && query[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && /^\sfrom\s/i.test(query.slice(index))) {
      fromStart = index;
      break;
    }
  }

  if (fromStart < 0) return query;
  const selectList = query.slice(selectStart, fromStart);
  const columns = [];
  let columnStart = 0;
  depth = 0;
  quote = null;
  for (let index = 0; index <= selectList.length; index += 1) {
    const char = selectList[index];
    if (quote) {
      if (char === quote && selectList[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if ((char === "," && depth === 0) || index === selectList.length) {
      columns.push(selectList.slice(columnStart, index).trim());
      columnStart = index + 1;
    }
  }

  return `${query.slice(0, selectStart)}${columns
    .map((column, index) =>
      `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

function connect(filename = ":memory:") {
  sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA foreign_keys=ON");
  database = drizzle({
    prepareSync(query) {
      return {
        executeSync(params) {
          const stmt = sqlite.prepare(query);
          if (/^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query)) {
            const rows = stmt.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
          }
          const result = stmt.run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params) {
          const stmt = sqlite.prepare(aliasSelectColumns(query));
          const rows = stmt.all(...params);
          return { getAllSync: () => rows.map((row) => Object.values(row)) };
        },
      };
    },
  }, { schema });
}

beforeEach(() => {
  connect(); database.dialect.migrate(migrations, database.session);
  sqlite.exec("INSERT OR IGNORE INTO currencies (code,name,symbol,minor_unit_exponent,is_active,created_at,updated_at) VALUES ('PHP','Peso','PHP',2,1,0,0)");
  sqlite.exec("INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ('onboarding.status','completed',0),('workspace.mode','personal',0)");
  backupCalls = 0; backupAction = async () => {};
  sqlite.prepare("INSERT INTO account_types (id,name,account_group,sort_order,is_system,created_at,updated_at) VALUES ('wallet','Wallet','asset',0,0,0,0)").run();
});
afterEach(() => sqlite.close());
function draft(csv = "Date,Type,Amount,Account,Category,Name,Labels,Source ID\n2026-01-02,expense,150,Cash,Food,Lunch,Personal,old-1") {
  const document = parseCsv(csv), hash = importDigest(csv);
  const options = { kind: "transactions", source: "Old app", columns: suggestColumns(document.headers), dateFormat: "ymd", decimal: ".", defaultCurrency: "PHP", defaultAccount: "", transferMode: "single", decisions: {},
    accounts: { cash: { existingId: "", name: "Cash", accountTypeId: "wallet", currency: "PHP", openingBalance: "1000", balanceDate: "2026-01-01" }, savings: { existingId: "", name: "Savings", accountTypeId: "wallet", currency: "PHP", openingBalance: "2000", balanceDate: "2026-01-01" } },
    categories: { [categoryMappingKey("expense", "Food")]: "", [categoryMappingKey("income", "Salary")]: "" } };
  const preview = () => buildImportPreview(document, options, getImportCatalog(), hash);
  const save = () => commitImport(document, options, hash, "history.csv", preview().signature);
  return { document, hash, options, preview, save };
}
const count = (table) => sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

test("commit writes real accounts, categories, labels, transactions, and provenance atomically", async () => {
  const d = draft(); assert.equal(d.preview().ready, true);
  const result = await d.save();
  assert.equal(result.imported, 1); assert.equal(backupCalls, 1);
  for (const table of ["accounts", "categories", "labels", "transactions", "import_batches", "import_records"]) assert.ok(count(table) >= 1, table);
  const account = getAccountsWithBalances().find((a) => a.name === "Cash");
  assert.equal(account.openingBalanceMinorUnits, 100000); assert.equal(account.currentBalanceMinorUnits, 85000);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  d.options.accounts.cash.existingId = account.id;
  assert.equal(d.preview().rows[0].repeated, true); assert.equal(d.preview().accepted, 0);
});

test("backup failure prevents every write", async () => {
  const d = draft(); backupAction = async () => { throw new Error("disk full"); };
  await assert.rejects(d.save(), /backup/);
  assert.equal(count("accounts"), 0); assert.equal(count("transactions"), 0); assert.equal(count("import_batches"), 0);
});

test("failure after writing financial data rolls back every imported record", async () => {
  const d = draft();
  sqlite.exec("CREATE TRIGGER reject_import BEFORE INSERT ON import_records BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;");
  await assert.rejects(d.save(), /simulated failure/);
  for (const table of ["accounts", "labels", "transactions", "import_batches", "import_records"]) assert.equal(count(table), 0, table);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM categories WHERE name='Food'").get().n, 0);
});

test("data changing during backup invalidates the reviewed preview", async () => {
  const d = draft();
  backupAction = async () => { sqlite.exec("DELETE FROM account_types WHERE id='wallet'"); };
  await assert.rejects(d.save(), /changed/);
  assert.equal(count("accounts"), 0); assert.equal(count("transactions"), 0);
});

test("paired transfers create exactly two linked legs and two source references", async () => {
  const d = draft("Date,Type,Amount,Account,To Account,Source ID\n2026-01-02,transfer,-150,Cash,Savings,out-1\n2026-01-02,transfer,150,Savings,Cash,in-1");
  d.options.transferMode = "paired";
  assert.equal(d.preview().ready, true);
  const result = await d.save(); assert.equal(result.imported, 1);
  const rows = sqlite.prepare("SELECT * FROM transactions ORDER BY amount_minor_units").all();
  assert.equal(rows.length, 2); assert.equal(rows[0].amount_minor_units, -15000); assert.equal(rows[1].amount_minor_units, 15000);
  assert.equal(rows[0].transaction_group_id, rows[1].transaction_group_id);
  assert.equal(count("import_records"), 2);
  assert.equal(getAccountsWithBalances().find((a) => a.name === "Cash").currentBalanceMinorUnits, 85000);
  assert.equal(getAccountsWithBalances().find((a) => a.name === "Savings").currentBalanceMinorUnits, 215000);
});

test("accounts-only imports create balances without manufacturing income transactions", async () => {
  const d = draft("Account,Currency,Opening Balance,Balance Date\nCash,PHP,1000,2026-01-01");
  d.options.kind = "accounts";
  await d.save(); assert.equal(count("transactions"), 0); assert.equal(count("accounts"), 1);
  assert.equal(getAccountsWithBalances()[0].currentBalanceMinorUnits, 100000);
});

test("case variants of a label resolve to one label and one assignment", async () => {
  const d = draft("Date,Type,Amount,Account,Category,Labels\n2026-01-02,expense,150,Cash,Food,Personal;personal");
  await d.save(); assert.equal(count("labels"), 1); assert.equal(count("transaction_labels"), 1);
});
test("sample workspaces cannot receive personal imports", async () => {
  const d = draft(); sqlite.exec("UPDATE settings SET value='sample' WHERE key='workspace.mode'");
  await assert.rejects(d.save(), /workspace/);
  assert.equal(backupCalls, 0); assert.equal(count("accounts"), 0);
});
test("a second submission is rejected while the first import is backing up", async () => {
  const d = draft(); let release;
  backupAction = () => new Promise((resolve) => { release = resolve; });
  const saving = d.save();
  await assert.rejects(d.save(), /busy/);
  release(); await saving;
  assert.equal(count("transactions"), 1); assert.equal(count("import_batches"), 1);
});

test("edits from review are the values written to the ledger", async () => {
  const d = draft(); d.options.source = "";
  d.options.rowEdits = { 2: ["2026-01-04", "expense", "125.50", "Cash", "Food", "Corrected lunch", "Personal", "old-1"] };
  await d.save();
  const row = sqlite.prepare("SELECT amount_minor_units, name FROM transactions").get();
  assert.equal(row.amount_minor_units, -12550); assert.equal(row.name, "Corrected lunch");
  assert.equal(sqlite.prepare("SELECT source FROM import_batches").get().source, "CSV");
});

test("inferred transfer pairs commit as one linked movement between accounts", async () => {
  const d = draft("Date,Time,Type,Amount,Account\n2026-01-02,09:00,transfer,-150,Cash\n2026-01-02,09:03,transfer,150,Savings");
  d.options.transferMode = "paired";
  const result = await d.save(); assert.equal(result.imported, 1);
  assert.equal(count("transactions"), 2); assert.equal(count("import_records"), 2);
  assert.equal(getAccountsWithBalances().find((a) => a.name === "Cash").currentBalanceMinorUnits, 85000);
});

test("only the final import saves ready records, leaving deliberately excluded types out", async () => {
  const d = draft("Date,Type,Amount,Account,Category\n2026-01-02,Payment,150,Cash,Food\n2026-01-03,Adjustment,20,Cash,Food");
  d.options.typeMappings = { payment: "expense", adjustment: "exclude" };
  assert.equal(d.preview().ready, true); assert.equal(count("transactions"), 0); assert.equal(count("import_batches"), 0);
  const result = await d.save();
  assert.equal(result.imported, 1); assert.equal(result.skipped, 1); assert.equal(count("transactions"), 1);
  assert.equal(count("import_records"), 1);
});
test("default Other categories are saved without creating unknown category names", async () => {
  sqlite.exec("INSERT INTO categories (id,name,type,created_at,updated_at) VALUES ('cat_exp_others','Other Expense','expense',0,0),('cat_inc_others','Other Income','income',0,0)");
  const { prepareImportMappings } = require("../utils/prepare-import-mappings.ts");
  const d = draft("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Unknown\n2026-01-03,income,20,Cash,");
  d.options.categories = {};
  Object.assign(d.options, prepareImportMappings(d.document, d.options, getImportCatalog()));
  await d.save();
  const rows = sqlite.prepare("SELECT type, category_id FROM transactions ORDER BY type").all();
  assert.deepEqual(rows.map((row) => row.category_id), ["cat_exp_others", "cat_inc_others"]);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM categories WHERE name='Unknown'").get().n, 0);
});
