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
      get sqliteDatabase() {
        return sqlite;
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
      /\bas\s+["`\w]+$/i.test(column)
        ? column
        : `${column} as "drizzle_col_${index}"`,
    )
    .join(", ")} ${query.slice(fromStart)}`;
}

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");

function setupTestDb() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      account_type_id TEXT,
      name TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      opening_balance_at INTEGER,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      hex_colors_id TEXT,
      parent_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      category_id TEXT REFERENCES categories(id),
      pocket_id TEXT,
      transaction_group_id TEXT,
      type TEXT NOT NULL,
      currency_code TEXT NOT NULL DEFAULT 'PHP',
      amount_minor_units INTEGER NOT NULL,
      original_amount_minor_units INTEGER,
      exchange_rate_scaled INTEGER,
      name TEXT,
      note TEXT,
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );
    CREATE TABLE transaction_entries (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id),
      amount_minor_units INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE exchange_rates (
      id TEXT PRIMARY KEY,
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      rate_basis_points INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(base_currency, quote_currency)
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

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
              getAllSync: () => [],
              getFirstSync: () => null,
              changes: result.changes,
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

  return database;
}

test("B05: unsplit expense of 1000 and refund of 200 accurately net 800 (not 1200)", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', ?, ?)").run(now, now);

  // Expense: 1000 PHP (-100000 minor units)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_exp_1', 'acc_main', 'cat_groceries', 'expense', 'PHP', -100000, ?, ?, ?)
  `).run(now, now, now);

  // Refund: 200 PHP (+20000 minor units)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_ref_1', 'acc_main', 'cat_groceries', 'expense', 'PHP', 20000, ?, ?, ?)
  `).run(now, now, now);

  const { getCategoryExpenseTotal, getCategoryExpenseTotalsGrouped } = require("../services/get-category-expense-summary.service");
  const { getCategoryBreakdown } = require("../services/get-category-breakdown.service");

  // 1. getCategoryExpenseTotal: 1000 - 200 = 800 PHP (80000 minor units)
  const total = getCategoryExpenseTotal(
    { categoryIds: ["cat_groceries"], startDate, endDate, targetCurrencyCode: "PHP" },
    db,
  );
  assert.equal(total, 80000, "Category total should be 80000 minor units, NOT 120000");

  // 2. getCategoryExpenseTotalsGrouped: maps categoryId -> 80000
  const grouped = getCategoryExpenseTotalsGrouped(
    { categoryIds: ["cat_groceries"], startDate, endDate, targetCurrencyCode: "PHP" },
    db,
  );
  assert.equal(grouped["cat_groceries"], 80000);

  // 3. getCategoryBreakdown: breakdown item total is 80000
  const breakdown = getCategoryBreakdown(
    { type: "expense", startDate, endDate },
    db,
  );
  const groceriesItem = breakdown.items.find((item) => item.categoryId === "cat_groceries");
  assert.ok(groceriesItem);
  assert.equal(groceriesItem.totalMinorUnits, 80000);
  assert.equal(breakdown.totalMinorUnits, 80000);

  sqlite.close();
});

test("B05: split expense of 500 and split refund of 100 accurately net 400 across categories", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_dining', 'Dining', 'expense', 'utensils', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_shopping', 'Shopping', 'expense', 'shopping-bag', ?, ?)").run(now, now);

  // Split Expense: 500 PHP (-50000 minor units) -> Dining 300 (30000), Shopping 200 (20000)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_split_exp', 'acc_main', null, 'expense', 'PHP', -50000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_1', 'tx_split_exp', 'cat_dining', 30000, ?, ?)
  `).run(now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_2', 'tx_split_exp', 'cat_shopping', 20000, ?, ?)
  `).run(now, now);

  // Split Refund: 100 PHP (+10000 minor units) -> Dining 100 (10000)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_split_ref', 'acc_main', null, 'expense', 'PHP', 10000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_3', 'tx_split_ref', 'cat_dining', 10000, ?, ?)
  `).run(now, now);

  const { getCategoryExpenseTotal, getCategoryExpenseTotalsGrouped } = require("../services/get-category-expense-summary.service");
  const { getCategoryBreakdown } = require("../services/get-category-breakdown.service");

  // Dining should net 30000 - 10000 = 20000
  const diningTotal = getCategoryExpenseTotal(
    { categoryIds: ["cat_dining"], startDate, endDate, targetCurrencyCode: "PHP" },
    db,
  );
  assert.equal(diningTotal, 20000);

  const grouped = getCategoryExpenseTotalsGrouped(
    { categoryIds: ["cat_dining", "cat_shopping"], startDate, endDate, targetCurrencyCode: "PHP" },
    db,
  );
  assert.equal(grouped["cat_dining"], 20000);
  assert.equal(grouped["cat_shopping"], 20000);

  const breakdown = getCategoryBreakdown(
    { type: "expense", startDate, endDate },
    db,
  );
  const diningItem = breakdown.items.find((item) => item.categoryId === "cat_dining");
  assert.equal(diningItem.totalMinorUnits, 20000);
  assert.equal(breakdown.totalMinorUnits, 40000);

  sqlite.close();
});

test("B05: net-negative category spending (refunds exceeding expenses) preserves negative magnitude", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_electronics', 'Electronics', 'expense', 'tv', ?, ?)").run(now, now);

  // Standalone refund with no expenses in this window: +5000
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_ref_standalone', 'acc_main', 'cat_electronics', 'expense', 'PHP', 5000, ?, ?, ?)
  `).run(now, now, now);

  const { getCategoryExpenseTotalsGrouped } = require("../services/get-category-expense-summary.service");
  const grouped = getCategoryExpenseTotalsGrouped(
    { categoryIds: ["cat_electronics"], startDate, endDate, targetCurrencyCode: "PHP" },
    db,
  );
  assert.equal(grouped["cat_electronics"], -5000, "Net negative category spending must be preserved, not converted to positive via Math.abs");

  sqlite.close();
});

test("B05: income reversal/refund in getCategoryBreakdown accurately nets revenue", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_salary', 'Salary', 'income', 'wallet', ?, ?)").run(now, now);

  // Income: 100,000 minor units
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_inc_1', 'acc_main', 'cat_salary', 'income', 'PHP', 100000, ?, ?, ?)
  `).run(now, now, now);

  // Income reversal / deduction: -20,000 minor units
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_inc_rev', 'acc_main', 'cat_salary', 'income', 'PHP', -20000, ?, ?, ?)
  `).run(now, now, now);

  const { getCategoryBreakdown } = require("../services/get-category-breakdown.service");
  const breakdown = getCategoryBreakdown(
    { type: "income", startDate, endDate },
    db,
  );

  const salaryItem = breakdown.items.find((item) => item.categoryId === "cat_salary");
  assert.ok(salaryItem);
  assert.equal(salaryItem.totalMinorUnits, 80000, "Salary net income should be 80000, not 120000");
  assert.equal(breakdown.totalMinorUnits, 80000);

  sqlite.close();
});
