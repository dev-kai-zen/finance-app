const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive) return () => "";
      if (prop === "create") return (s) => s || {};
      return createMock();
    },
  });
};

const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "@/infrastructure/database/client") {
    return {
      get db() {
        return database;
      },
    };
  }
  if (request.includes("drizzle/migrations") || request.endsWith("migrations")) {
    return {};
  }
  if (
    request.startsWith("expo") ||
    request.startsWith("@expo") ||
    request.startsWith("react-native") ||
    request.startsWith("react") ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  return originalLoad.call(this, request, ...args);
};

require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

function aliasSelectColumns(query) {
  const selectMatch = query.match(/^\s*select\s+/i);
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

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const {
  getRecentTransactions,
} = require("../services/get-recent-transactions.service");

function setupTestDb() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
  for (const entry of journal.entries) {
    const file = path.join(root, "../drizzle", `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(file, "utf-8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }

  database = drizzle(
    {
      prepareSync(query) {
        return {
          executeSync(params) {
            const stmt = sqlite.prepare(query);
            if (
              /^\s*(select|pragma|with)\b/i.test(query) ||
              /\breturning\b/i.test(query)
            ) {
              const rows = stmt.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
              };
            }
            const result = stmt.run(...params);
            return {
              changes: Number(result.changes),
              lastInsertRowId: Number(result.lastInsertRowid),
            };
          },
          executeForRawResultSync(params) {
            const stmt = sqlite.prepare(aliasSelectColumns(query));
            const rows = stmt.all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );

  const now = Date.now();
  sqlite.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'landmark', 1, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now}),
           ('acc_2', 'act_dep', 'Savings Account', 'PHP', 50000, ${now}, 0, 1, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_food', 'Food', 'expense', 'utensils', 1, ${now}, ${now}),
           ('cat_pay', 'Salary', 'income', 'wallet', 1, ${now}, ${now});
  `);

  return database;
}

test("getRecentTransactions: bounds results to the newest items and handles transfer groupings accurately", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = new Date(2026, 0, 1).getTime();
  const t2 = new Date(2026, 0, 2).getTime();
  const t3 = new Date(2026, 0, 3).getTime();
  const t4 = new Date(2026, 0, 4).getTime();
  const t5 = new Date(2026, 0, 5).getTime();
  const t6 = new Date(2026, 0, 6).getTime();

  insert.run("tx_1", "acc_1", "cat_food", null, "expense", -1000, "Old Coffee", t1, t1, t1);
  insert.run("tx_2", "acc_1", "cat_pay", null, "income", 50000, "Old Salary", t2, t2, t2);
  insert.run("tx_3", "acc_1", "cat_food", null, "expense", -2000, "Lunch", t3, t3, t3);
  insert.run("tx_4", "acc_1", "cat_food", null, "expense", -3000, "Dinner", t4, t4, t4);

  // Transfer with 2 legs and a fee at t5
  const grp = "grp_transfer_1";
  insert.run("tx_out", "acc_1", null, grp, "transfer", -15000, "Bank Transfer Out", t5, t5, t5);
  insert.run("tx_in", "acc_2", null, grp, "transfer", 15000, "Bank Transfer In", t5, t5, t5);
  insert.run("tx_fee", "acc_1", "cat_food", grp, "expense", -2500, "Transfer Fee", t5, t5, t5);

  // Standalone latest transaction at t6
  insert.run("tx_latest", "acc_1", "cat_food", null, "expense", -500, "Snack", t6, t6, t6);

  // Request latest 4 items
  const recent = getRecentTransactions(4, db);

  assert.equal(recent.length, 4);
  // Item 0: Snack (t6)
  assert.equal(recent[0].id, "tx_latest");
  assert.equal(recent[0].name, "Snack");
  assert.equal(recent[0].amountMinorUnits, -500);

  // Items at t5: Standalone fee and transfer
  const feeItem = recent.find((r) => r.id === "tx_fee");
  assert.ok(feeItem);
  assert.equal(feeItem.name, "Transfer Fee");
  assert.equal(feeItem.amountMinorUnits, -2500);

  const transferItem = recent.find((r) => r.type === "transfer");
  assert.ok(transferItem);
  assert.equal(transferItem.transactionGroupId, grp);
  assert.equal(transferItem.amountMinorUnits, 15000);
  assert.equal(transferItem.transferAccountName, "Savings Account");
  assert.equal(transferItem.transferFeeAmountMinorUnits, 2500);

  // Item 3: Dinner (t4)
  assert.equal(recent[3].id, "tx_4");
  assert.equal(recent[3].name, "Dinner");
});

test("getRecentTransactions: returns empty array when limit is 0 or ledger is empty", () => {
  const db = setupTestDb();
  assert.deepEqual(getRecentTransactions(0, db), []);
  assert.deepEqual(getRecentTransactions(-5, db), []);
});
