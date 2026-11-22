const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
let sqlite, database, backupCalls, backupAction, proEnabled = false;
let nativeMain, testDirectory, livePath, bridgeOptions, statements;
const { nativeSqlite } = require("../../../infrastructure/database/__tests__/helpers/native-sqlite.cjs");
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
const mock = () => new Proxy(() => mock(), { get: (_, key) => key === "create" ? (value) => value : key === Symbol.toPrimitive ? () => "" : mock() });
Module._load = function (request, ...args) {
  if (request === "@/infrastructure/database/client" || request === "./client" && args[0]?.filename.includes(path.join("infrastructure", "database"))) return { DATABASE_NAME: "finance.db", get db() { return database; }, get sqliteDatabase() { return nativeMain; } };
  if (request === "expo-sqlite") return {
    openDatabaseAsync: async () => nativeSqlite(livePath, bridgeOptions),
    deserializeDatabaseAsync: async (bytes) => {
      const filename = path.join(testDirectory, require("node:crypto").randomUUID() + ".db");
      fs.writeFileSync(filename, bytes);
      return nativeSqlite(filename);
    },
  };
  if (request === "@/modules/local-backup") return { createLocalBackup: async () => { backupCalls++; await backupAction(); } };
  if (request === "@/modules/pro") return { PRO_LIMITS: { FREE_MAX_ACCOUNTS: 5 }, getCurrentProStatus: () => ({ isPro: proEnabled }) };
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
const { importDigest } = require("../utils/import-preview.ts");
const { prepareImportPreview: buildImportPreview } = require("../services/prepare-import-preview.service.ts");
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
          statements?.push({ query, params });
          const stmt = sqlite.prepare(aliasSelectColumns(query));
          const rows = stmt.all(...params);
          return { getAllSync: () => rows.map((row) => Object.values(row)) };
        },
      };
    },
  }, { schema });
}

beforeEach(() => {
  testDirectory = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "finance-import-"));
  livePath = path.join(testDirectory, "live.db");
  connect(livePath); sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  nativeMain = { execSync: (query) => sqlite.exec(query), getFirstSync: (query) => sqlite.prepare(query).get() };
  bridgeOptions = {};
  statements = [];
  database.dialect.migrate(migrations, database.session);
  sqlite.exec("INSERT OR IGNORE INTO currencies (code,name,symbol,minor_unit_exponent,is_active,created_at,updated_at) VALUES ('PHP','Peso','PHP',2,1,0,0)");
  sqlite.exec("INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ('onboarding.status','completed',0),('workspace.mode','personal',0)");
  backupCalls = 0; backupAction = async () => {}; proEnabled = false;
  sqlite.prepare("INSERT INTO account_types (id,name,account_group,sort_order,is_system,created_at,updated_at) VALUES ('wallet','Wallet','asset',0,0,0,0)").run();
});
afterEach(() => { sqlite.close(); fs.rmSync(testDirectory, { recursive: true, force: true }); });
function draft(csv = "Date,Type,Amount,Account,Category,Name,Labels,Source ID\n2026-01-02,expense,150,Cash,Food,Lunch,Personal,old-1") {
  const document = parseCsv(csv), hash = importDigest(csv);
  const options = { kind: "transactions", source: "Old app", columns: suggestColumns(document.headers), dateFormat: "ymd", decimal: ".", defaultCurrency: "PHP", defaultAccount: "", transferMode: "single", decisions: {},
    accounts: { cash: { existingId: "", name: "Cash", accountTypeId: "wallet", currency: "PHP", openingBalance: "1000", balanceDate: "2026-01-01" }, savings: { existingId: "", name: "Savings", accountTypeId: "wallet", currency: "PHP", openingBalance: "2000", balanceDate: "2026-01-01" } },
    categories: { [categoryMappingKey("expense", "Food")]: "", [categoryMappingKey("income", "Salary")]: "" } };
  const preview = () => buildImportPreview(document, options, getImportCatalog(), hash, { isPro: proEnabled, maxActiveAccounts: 5 });
  const save = () => commitImport(document, options, hash, "history.csv", preview().signature);
  return { document, hash, options, preview, save };
}
const count = (table) => sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

test("V2-09: 501 overdue occurrences coalesce, cancel between atomic batches, and resume without duplicates", async () => {
  const d = draft(); await d.save();
  const transaction = sqlite.prepare("SELECT account_id,category_id FROM transactions LIMIT 1").get();
  const { saveScheduledTransaction } = require("@/modules/scheduled-transactions/services/save-scheduled-transaction.service");
  const { processDueSchedulesAsync } = require("@/modules/scheduled-transactions/services/process-due-schedules.service");
  saveScheduledTransaction({
    transactionType: "expense", accountId: transaction.account_id, categoryId: transaction.category_id,
    amountMinorUnits: -100, frequency: "daily", intervalCount: 1, startsAt: new Date(2020, 0, 1),
    timeZone: "UTC", endMode: "after_count", maxOccurrences: 501, weekendPolicy: "exact", autoPost: true,
  });
  let cancelled = false, commits = 0, writes = 0;
  bridgeOptions.beforeRun = async () => { writes++; };
  bridgeOptions.beforeExec = async (query) => {
    if (query === "COMMIT;") { assert.ok(writes <= 200); commits++; cancelled = true; }
  };
  const first = processDueSchedulesAsync(new Date(2023, 0, 1), { isCancelled: () => cancelled });
  assert.equal(processDueSchedulesAsync(new Date(2023, 0, 1)), first);
  await first;
  assert.equal(commits, 1); assert.equal(count("transactions"), 9);
  bridgeOptions = {};
  await processDueSchedulesAsync(new Date(2023, 0, 1));
  assert.equal(count("transactions"), 502); assert.equal(count("transaction_schedule_occurrences"), 501);
  assert.equal(count("transaction_schedule_postings"), 501);
  await processDueSchedulesAsync(new Date(2023, 0, 1));
  assert.equal(count("transactions"), 502);
  const { listActionableScheduleOccurrences } = require("@/modules/scheduled-transactions/repositories/scheduled-transactions.repository");
  assert.deepEqual(listActionableScheduleOccurrences(101), []);
});

test("V2-09: actionable SQL uses the partial index and stable keyset pages", async () => {
  const d = draft(); await d.save();
  const row = sqlite.prepare("SELECT account_id,category_id FROM transactions LIMIT 1").get();
  const { saveScheduledTransaction } = require("@/modules/scheduled-transactions/services/save-scheduled-transaction.service");
  const schedule = saveScheduledTransaction({
    transactionType: "expense", accountId: row.account_id, categoryId: row.category_id,
    amountMinorUnits: -100, frequency: "daily", intervalCount: 1, startsAt: new Date(2020, 0, 1),
    timeZone: "UTC", endMode: "after_count", maxOccurrences: 1, weekendPolicy: "exact", autoPost: false,
  });
  const id = typeof schedule === "string" ? schedule : schedule.id;
  const insert = sqlite.prepare("INSERT INTO transaction_schedule_occurrences(id,schedule_id,sequence_number,nominal_due_at,effective_due_at,template_snapshot,status,created_at,updated_at) VALUES (?,?,?,?,0,'{}',?,0,0)");
  sqlite.exec("BEGIN");
  for (let i = 0; i < 501; i++) insert.run("page-" + String(i).padStart(4, "0"), id, i + 1, i, i < 300 ? "posted" : "due");
  sqlite.exec("COMMIT");
  statements.length = 0;
  const { listActionableScheduleOccurrences } = require("@/modules/scheduled-transactions/repositories/scheduled-transactions.repository");
  const first = listActionableScheduleOccurrences(101);
  const last = first[99], second = listActionableScheduleOccurrences(101, undefined, { date: last.nominalDueAt, id: last.id });
  assert.equal(first.length, 101); assert.equal(second.length, 101);
  assert.equal(new Set([...first.slice(0,100), ...second].map((r) => r.id)).size, 201);
  for (const { query, params } of statements) {
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + query).all(...params).map((r) => r.detail).join("\n");
    assert.match(plan, /schedule_occurrences_actionable_index/); assert.doesNotMatch(plan, /TEMP B-TREE/);
  }
});

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
  const d = draft(); let release, entered;
  const backingUp = new Promise((resolve) => { entered = resolve; });
  backupAction = () => new Promise((resolve) => { release = resolve; entered(); });
  const saving = d.save();
  await backingUp;
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

test("credit card accounts and transactions commit with required credit card details", async () => {
  const d = draft("Date,Type,Amount,Account,Category,Name\n2026-01-05,expense,1200,BPI Visa,Food,Groceries");
  d.options.accounts["bpi visa"] = {
    existingId: "",
    name: "BPI Visa",
    accountTypeId: "system:liability:credit-card",
    currency: "PHP",
    openingBalance: "0",
    balanceDate: "2026-01-01",
    creditLimit: "50000",
    statementDay: "15",
    paymentDueDay: "5",
  };
  assert.equal(d.preview().ready, true);
  const result = await d.save();
  assert.equal(result.imported, 1);
  const card = getAccountsWithBalances().find((a) => a.name === "BPI Visa");
  assert.ok(card);
  assert.equal(card.currentBalanceMinorUnits, -120000);
  const ccDetails = sqlite.prepare("SELECT credit_limit_minor_units, statement_day, payment_due_day FROM credit_card_details WHERE account_id = ?").get(card.id);
  assert.deepEqual({ ...ccDetails }, { credit_limit_minor_units: 5000000, statement_day: 15, payment_due_day: 5 });
});

test("commit enforces the Free 5-account limit and allows 6+ accounts when Pro is unlocked", async () => {
  const csv = [
    "Account,Currency,Opening Balance,Opening Date",
    "A1,PHP,100,2026-01-01",
    "A2,PHP,100,2026-01-01",
    "A3,PHP,100,2026-01-01",
    "A4,PHP,100,2026-01-01",
    "A5,PHP,100,2026-01-01",
    "A6,PHP,100,2026-01-01",
  ].join("\n");
  const d = draft(csv);
  d.options.kind = "accounts";
  d.options.accounts = Object.fromEntries(
    ["A1", "A2", "A3", "A4", "A5", "A6"].map((name) => [
      name.toLowerCase(),
      { existingId: "", name, accountTypeId: "wallet", currency: "PHP", openingBalance: "100", balanceDate: "2026-01-01" },
    ]),
  );

  assert.equal(d.preview().ready, false);
  assert.equal(d.preview().rows[5].issue, "freeAccountLimit");
  await assert.rejects(d.save(), /changed/);
  assert.equal(count("accounts"), 0);

  proEnabled = true;
  assert.equal(d.preview().ready, true);
  const result = await d.save();
  assert.equal(result.imported, 6);
  assert.equal(count("accounts"), 6);
});

test("Sample Mode -> Guided Setup -> Import Accounts -> Finish Setup (P1-06): replaces sample data without free-limit false positives and survives completeGuidedSetup", async () => {
  const {
    loadSampleWorkspace,
    completeGuidedSetup,
  } = require("@/modules/onboarding/services/workspace.service");

  sqlite.exec("DELETE FROM settings; DELETE FROM account_types WHERE id = 'wallet'");
  await loadSampleWorkspace();
  assert.equal(count("accounts"), 8);
  assert.equal(count("transactions"), 31);

  // Free user imports 2 accounts (including names that overlap with sample accounts) via Guided Setup
  proEnabled = false;
  const csv = [
    "Account,Currency,Opening Balance,Opening Date",
    "Wallet,PHP,2500,2026-01-01",
    "My Savings,PHP,10000,2026-01-01",
  ].join("\n");
  const document = parseCsv(csv);
  const hash = importDigest(csv);
  const options = {
    kind: "accounts",
    source: "CSV",
    columns: suggestColumns(document.headers),
    dateFormat: "ymd",
    decimal: ".",
    defaultCurrency: "PHP",
    defaultAccount: "",
    transferMode: "single",
    decisions: {},
    accounts: {
      wallet: {
        existingId: "",
        name: "Wallet",
        accountTypeId: "recommended:type:cash",
        currency: "PHP",
        openingBalance: "2500",
        balanceDate: "2026-01-01",
      },
      "my savings": {
        existingId: "",
        name: "My Savings",
        accountTypeId: "recommended:type:savings",
        currency: "PHP",
        openingBalance: "10000",
        balanceDate: "2026-01-01",
      },
    },
    categories: {},
  };

  const catalog = getImportCatalog();
  assert.equal(catalog.accounts.length, 0);
  const cashTypeId = catalog.accountTypes.find((t) => t.name === "Cash")?.id ?? catalog.accountTypes[0].id;
  const savingsTypeId = catalog.accountTypes.find((t) => t.name === "Savings")?.id ?? catalog.accountTypes[0].id;
  options.accounts.wallet.accountTypeId = cashTypeId;
  options.accounts["my savings"].accountTypeId = savingsTypeId;
  const preview = buildImportPreview(document, options, catalog, hash, {
    isPro: false,
    maxActiveAccounts: 5,
  });
  assert.equal(preview.ready, true);

  // Direct import without allowOnboarding is still blocked in sample mode
  await assert.rejects(
    commitImport(document, options, hash, "accounts.csv", preview.signature),
    /workspace/,
  );

  // Guided Setup import (allowOnboarding: true) clears sample data and imports the 2 accounts
  const result = await commitImport(
    document,
    options,
    hash,
    "accounts.csv",
    preview.signature,
    { allowOnboarding: true },
  );
  assert.equal(result.imported, 2);
  assert.equal(count("accounts"), 2);
  assert.equal(count("transactions"), 0);

  // Tapping "Finish Setup" (completeGuidedSetup) must NOT wipe the newly imported accounts
  const finalState = await completeGuidedSetup({
    currencyCode: "PHP",
    accountStrategy: "import",
    nickname: "John",
  });
  assert.equal(finalState.mode, "personal");
  assert.equal(count("accounts"), 2);
  const accountsAfterFinish = getAccountsWithBalances();
  assert.deepEqual(
    accountsAfterFinish
      .map((a) => [a.name, a.currentBalanceMinorUnits])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    [
      ["My Savings", 1000000],
      ["Wallet", 250000],
    ],
  );
});

test('P2-11d: exported archived accounts commit with status and protected text intact', async () => {
  const { buildAccountsCsv } = require('../../accounts/utils/accounts-csv.ts');
  const { prepareImportMappings } = require('../utils/prepare-import-mappings.ts');
  const now = new Date(2026, 0, 1);
  const base = { id: 'source', accountTypeId: 'wallet', name: '=Archived wallet', currencyCode: 'PHP',
    accountType: { name: 'Wallet', accountGroup: 'asset' }, currentBalanceMinorUnits: -12300,
    openingBalanceMinorUnits: -12300, openingBalanceAt: now, createdAt: now, updatedAt: now,
    isArchived: true, note: '=1+1', sortOrder: 0 };
  const d = draft(buildAccountsCsv([base, { ...base, id: 'active', name: 'Active Wallet', isArchived: false }]));
  d.options.kind = 'accounts'; d.options.accounts = {};
  Object.assign(d.options, prepareImportMappings(d.document, d.options, getImportCatalog()));
  assert.equal(d.preview().ready, true);
  await d.save();
  const archived = sqlite.prepare("SELECT * FROM accounts WHERE name = '=Archived wallet'").get();
  assert.equal(archived.is_archived, 1); assert.equal(archived.note, '=1+1');
  assert.equal(archived.opening_balance_minor_units, -12300);
  assert.equal(sqlite.prepare("SELECT is_archived FROM accounts WHERE name='Active Wallet'").get().is_archived, 0);
});

test('P2-11d: Status aliases validate strictly and archived imports do not consume active-account slots', async () => {
  const d = draft('Account,Currency,Opening Balance,Opening Date,Status\nCash,PHP,1000,2026-01-01,Archived');
  d.options.kind = 'accounts';
  for (let i=0; i<5; i++) sqlite.prepare("INSERT INTO accounts (id,account_type_id,name,currency_code,opening_balance_minor_units,opening_balance_at,created_at,updated_at) VALUES (?, 'wallet', ?, 'PHP',0,0,0,0)").run('active_'+i,'Active '+i);
  assert.equal(d.preview().ready, true); await d.save();
  assert.equal(sqlite.prepare("SELECT is_archived FROM accounts WHERE name='Cash'").get().is_archived, 1);
  const invalid = draft('Account,Currency,Opening Balance,Opening Date,Status\nSavings,PHP,1000,2026-01-01,unknown');
  invalid.options.kind='accounts'; assert.equal(invalid.preview().ready, false);
  assert.equal(invalid.preview().rows[0].issue, 'unsupported');
});

for (const [currency,unit] of [["JPY",1],["PHP",100],["KWD",1000]]) {
  test("V2-05: exported signed ledger round-trips through SQLite in "+currency,async()=>{
    const {buildTransactionsCsv}=require("../../transactions/utils/transactions-csv.ts");
    sqlite.prepare("INSERT OR IGNORE INTO currencies (code,name,symbol,minor_unit_exponent,is_active,created_at,updated_at) VALUES (?,?,?,?,1,0,0)").run(currency,currency,currency,unit===1?0:unit===100?2:3);
    const values=[-150*unit,100*unit,200*unit,-25*unit];
    const csv=buildTransactionsCsv(values.map((amountMinorUnits,i)=>({id:"source-"+i,type:i<2?"expense":"income",amountMinorUnits,currencyCode:currency,accountCurrency:currency,accountName:"Cash",categoryName:i<2?"Food":"Salary",name:"Row "+i,occurredAt:new Date(2026,0,2,12,i)})));
    const d=draft(csv); d.options.accounts.cash.currency=currency;
    const p=d.preview(); assert.equal(p.ready,true);
    assert.deepEqual(p.rows.map(r=>r.transaction.amount),values);
    assert.equal(p.expense[currency],50*unit);assert.equal(p.income[currency],175*unit);
    assert.equal(p.balances[0].after,1125*unit);
    await d.save();
    const rows=sqlite.prepare("SELECT type,amount_minor_units FROM transactions ORDER BY occurred_at,id").all();
    assert.deepEqual(rows.map(r=>r.amount_minor_units),values);
    assert.deepEqual(rows.map(r=>r.type),["expense","expense","income","income"]);
    const account=getAccountsWithBalances().find(a=>a.name==="Cash");
    assert.equal(account.currentBalanceMinorUnits,p.balances[0].after);
    d.options.accounts.cash.existingId=account.id;
    assert.equal(d.preview().skipped,4);
    d.options.source="Another file"; // distinct provenance still requires duplicate review
    assert.equal(d.preview().errors,4);
    d.options.decisions={2:"import",3:"import",4:"import",5:"import"};
    assert.equal(d.preview().accepted,4); await d.save();
    assert.equal(getAccountsWithBalances().find(a=>a.id===account.id).currentBalanceMinorUnits,1250*unit);
  });
}

test("V2-05: signed debit/credit refunds and reversals commit with preview parity",async()=>{
  const d=draft("Date,Type,Debit,Credit,Account,Category\n2026-01-02,expense,0,100,Cash,Food\n2026-01-03,income,25,0,Cash,Salary");
  d.options.amountInterpretation="signed";
  const p=d.preview(); assert.equal(p.ready,true);await d.save();
  assert.deepEqual(sqlite.prepare("SELECT amount_minor_units FROM transactions ORDER BY occurred_at,id").all().map(r=>r.amount_minor_units),[10000,-2500]);
  assert.equal(getAccountsWithBalances().find(a=>a.name==="Cash").currentBalanceMinorUnits,p.balances[0].after);
});

test("V2-08: concurrent edits during staging reject publication and preserve the other edit", async () => {
  const d = draft();
  bridgeOptions.beforeExec = async (query) => {
    if (query === "BEGIN IMMEDIATE;") sqlite.exec("INSERT INTO settings VALUES ('concurrent-edit','keep',0)");
  };
  await assert.rejects(d.save(), /changed/);
  assert.equal(count("accounts"), 0); assert.equal(count("import_records"), 0);
  assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='concurrent-edit'").get().value, "keep");
  assert.equal(sqlite.prepare("PRAGMA busy_timeout").get().timeout, 5000);
});

test("V2-08: failed native publication rolls back staged writes and restores connection settings", async () => {
  const d = draft();
  bridgeOptions.beforeRun = async (query) => { if (/insert into "import_records"/i.test(query)) throw new Error("native write failed"); };
  await assert.rejects(d.save(), /native write failed/);
  for (const table of ["accounts", "transactions", "labels", "import_batches", "import_records"]) assert.equal(count(table), 0);
  assert.equal(sqlite.prepare("PRAGMA busy_timeout").get().timeout, 5000);
  bridgeOptions = {}; await d.save(); assert.equal(count("transactions"), 1);
});

test("V2-08: live readers see no partial import and competing synchronous writes fail promptly", async () => {
  const d = draft(); let inspected = false;
  bridgeOptions.beforeRun = async (query) => {
    if (!/insert into "transactions"/i.test(query)) return;
    inspected = true;
    assert.equal(count("accounts"), 0); assert.equal(count("transactions"), 0);
    assert.throws(() => sqlite.exec("INSERT INTO settings VALUES ('competing','write',0)"), /locked/);
  };
  await d.save(); assert.equal(inspected, true); assert.equal(count("accounts"), 1); assert.equal(count("transactions"), 1);
});

test("V2-08: comparison SQL is candidate-bounded with a 10k ledger, exact Unicode names and transfer direction", async () => {
  const d = draft(); await d.save();
  const cash = getAccountsWithBalances().find((a) => a.name === "Cash");
  const insert = sqlite.prepare("INSERT INTO transactions(id,account_id,type,currency_code,amount_minor_units,name,occurred_at,created_at,updated_at) VALUES (?,?,'expense','PHP',-777,?,0,0,0)");
  sqlite.exec("BEGIN");
  for (let i = 0; i < 10000; i++) insert.run("noise-" + i, cash.id, "Noise " + i);
  sqlite.exec("COMMIT");
  d.options.accounts.cash.existingId = cash.id; d.options.source = "different source";
  d.options.rowEdits = { 2: ["2026-01-02", "expense", "150", "Cash", "Food", "Ｌｕｎｃｈ", "Personal", "other-id"] };
  statements.length = 0;
  const p = d.preview(); assert.equal(p.rows[0].issue, "duplicate");
  const comparisons = statements.filter((s) => /from "transactions"/i.test(s.query) && /limit \?/i.test(s.query));
  assert.equal(comparisons.length, 1);
  for (const { query, params } of comparisons) {
    assert.ok(params.length <= 500);
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + query).all(...params).map((r) => r.detail).join("\n");
    assert.match(plan, /transactions_active_import_comparison_index/);
    assert.doesNotMatch(plan, /TEMP B-TREE/);
    assert.equal(sqlite.prepare(query).all(...params).length, 1);
  }
  const keys = require("../repositories/imports.repository.ts").listImportedSourceKeys;
  statements.length = 0;
  assert.deepEqual(keys([]), []); assert.equal(statements.length, 0);
  keys(Array.from({ length: 1001 }, (_, i) => "key-" + i));
  assert.equal(statements.length, 3);
  assert.ok(statements.every((s) => s.params.length <= 500 && /where "import_records"."source_key" in/.test(s.query)));
});

test("V2-08: tied duplicate candidates page at 500 without omissions or temporary sorting", async () => {
  const d = draft(); await d.save();
  const cash = getAccountsWithBalances().find((a) => a.name === "Cash");
  const insert = sqlite.prepare("INSERT INTO transactions(id,account_id,type,currency_code,amount_minor_units,name,occurred_at,created_at,updated_at) VALUES (?,?,'expense','PHP',-123,?,?,0,0)");
  sqlite.exec("BEGIN");
  for (let i = 0; i < 1001; i++) insert.run("tie-" + String(i).padStart(4, "0"), cash.id, "Name " + i, new Date(2026, 0, 3).getTime());
  sqlite.exec("COMMIT");
  statements.length = 0;
  const pages = [...require("@/modules/transactions").getTransactionImportCatalog([
    { type: "expense", accountId: cash.id, amount: -123, date: new Date(2026, 0, 3) },
  ])];
  assert.deepEqual(pages.map((page) => page.length), [500, 500, 1]);
  assert.equal(new Set(pages.flat().map((r) => r.name)).size, 1001);
  assert.equal(statements.length, 3);
  for (const { query, params } of statements) {
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + query).all(...params).map((r) => r.detail).join("\n");
    assert.match(plan, /transactions_active_import_comparison_index/); assert.doesNotMatch(plan, /TEMP B-TREE/);
  }
});

test("V2-08: existing legacy account IDs are compared without reserving an ID prefix", () => {
  sqlite.exec("INSERT INTO accounts(id,name,account_type_id,currency_code,opening_balance_minor_units,opening_balance_at,created_at,updated_at) VALUES ('new:legacy','Cash','wallet','PHP',100000,0,0,0)");
  sqlite.prepare("INSERT INTO transactions(id,account_id,type,currency_code,amount_minor_units,name,occurred_at,created_at,updated_at) VALUES ('legacy-tx','new:legacy','expense','PHP',-15000,'Lunch',?,0,0)").run(new Date(2026, 0, 2).getTime());
  const d = draft(); d.options.accounts.cash.existingId = "new:legacy";
  assert.equal(d.preview().rows[0].issue, "duplicate");
});

for (const size of [100, 500, 1000]) {
  test(`V2-08: ${size} rows stage cooperatively and publish as one atomic import`, async () => {
    const d = draft("Date,Type,Amount,Account,Category,Name\n" + Array.from({ length: size }, (_, i) =>
      `2026-01-02,expense,1,Cash,Food,Item ${i}`).join("\n"));
    let checks = 0;
    bridgeOptions.beforeRun = async () => {
      checks++;
      if (checks % 100 === 0) {
        assert.equal(count("accounts"), 0); assert.equal(count("transactions"), 0); assert.equal(count("import_records"), 0);
        await new Promise(setImmediate);
      }
    };
    const saved = await d.save();
    assert.equal(saved.imported, size); assert.equal(count("transactions"), size); assert.equal(count("import_records"), size);
    assert.equal(getAccountsWithBalances().find((a) => a.name === "Cash").currentBalanceMinorUnits, 100000 - size * 100);
    assert.ok(checks >= size);
  });
}


test("V2-10: protected transaction names and notes survive preview and committed SQLite import", async () => {
  const { buildTransactionsCsv } = require("../../transactions/utils/transactions-csv.ts");
  const text = ["=1+1", "+SUM(1,2)", "-formula", "@value", "'=literal", "'ordinary", 'plain, "quoted"\nnext line'];
  const csv = buildTransactionsCsv(text.map((value, index) => ({
    id: "protected-" + index, type: "expense", amountMinorUnits: -100,
    currencyCode: "PHP", accountCurrency: "PHP", accountName: "Cash", categoryName: "Food",
    name: value, note: value, occurredAt: new Date(2026, 0, 2, 12, index),
  })));
  const d = draft(csv);
  const preview = d.preview();
  assert.equal(preview.ready, true);
  assert.deepEqual(preview.rows.map((row) => row.transaction.name), text);
  assert.deepEqual(preview.rows.map((row) => row.transaction.note), text);
  await d.save();
  const rows = sqlite.prepare("SELECT name, note, amount_minor_units FROM transactions ORDER BY occurred_at,id").all();
  assert.deepEqual(rows.map((row) => row.name), text);
  assert.deepEqual(rows.map((row) => row.note), text);
  assert.deepEqual(rows.map((row) => row.amount_minor_units), text.map(() => -100));
});
