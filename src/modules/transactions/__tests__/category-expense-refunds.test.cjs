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
    CREATE TABLE labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE transaction_labels (
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (transaction_id, label_id)
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

test("REP-F01: getLabelBreakdown accurately nets expense refunds and income reversals in SQLite", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('lbl_work', 'Work', '#10B981', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('lbl_travel', 'Travel', '#3B82F6', ?, ?)").run(now, now);

  // Expense 1: 1000 PHP (-100000 minor units) tagged Work & Travel
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_exp_work_1', 'acc_main', 'expense', 'PHP', -100000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES ('tx_exp_work_1', 'lbl_work', ?)").run(now);
  sqlite.prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES ('tx_exp_work_1', 'lbl_travel', ?)").run(now);

  // Refund 1: 200 PHP (+20000 minor units) tagged Work only
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_ref_work_1', 'acc_main', 'expense', 'PHP', 20000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES ('tx_ref_work_1', 'lbl_work', ?)").run(now);

  // Unlabeled Expense: 300 PHP (-30000 minor units)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_exp_unlabeled', 'acc_main', 'expense', 'PHP', -30000, ?, ?, ?)
  `).run(now, now, now);

  const { getLabelBreakdown } = require("../services/get-label-breakdown.service");

  // 1. Expense Breakdown:
  // Net total = 1000 - 200 + 300 = 1100 PHP (110000 minor units)
  // Work: 1000 - 200 = 800 PHP (80000 minor units)
  // Travel: 1000 PHP (100000 minor units)
  // Unlabeled: 300 PHP (30000 minor units)
  const expenseResult = getLabelBreakdown({ type: "expense", startDate, endDate }, db);

  assert.equal(expenseResult.totalMinorUnits, 110000, "Overall expense should net to 110000, not 150000");
  assert.equal(expenseResult.transactionCount, 3);
  assert.equal(expenseResult.labeledMinorUnits, 80000); // 1000 - 200
  assert.equal(expenseResult.unlabeledMinorUnits, 30000);

  const workItem = expenseResult.items.find((i) => i.labelId === "lbl_work");
  assert.ok(workItem);
  assert.equal(workItem.totalMinorUnits, 80000, "Work label must net to 80000, not 120000");
  assert.equal(workItem.transactionCount, 2);

  const travelItem = expenseResult.items.find((i) => i.labelId === "lbl_travel");
  assert.ok(travelItem);
  assert.equal(travelItem.totalMinorUnits, 100000);
  assert.equal(travelItem.transactionCount, 1);

  // 2. Income Breakdown with reversal:
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_inc_work_1', 'acc_main', 'income', 'PHP', 200000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES ('tx_inc_work_1', 'lbl_work', ?)").run(now);

  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_inc_rev_1', 'acc_main', 'income', 'PHP', -10000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES ('tx_inc_rev_1', 'lbl_work', ?)").run(now);

  const incomeResult = getLabelBreakdown({ type: "income", startDate, endDate }, db);
  assert.equal(incomeResult.totalMinorUnits, 190000, "Income must net to 190000, not 210000");
  const workIncome = incomeResult.items.find((i) => i.labelId === "lbl_work");
  assert.ok(workIncome);
  assert.equal(workIncome.totalMinorUnits, 190000);
  assert.equal(workIncome.transactionCount, 2);

  sqlite.close();
});

test("REP-F02: split transactions contribute to category counts and overall distinct transaction count", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_dining', 'Dining', 'expense', 'utensils', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', ?, ?)").run(now, now);

  // 1. Unsplit Expense: 1000 PHP (-100000 minor units) in Dining
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_unsplit_1', 'acc_main', 'cat_dining', 'expense', 'PHP', -100000, ?, ?, ?)
  `).run(now, now, now);

  // 2. Split Expense: 500 PHP (-50000 minor units) split across Dining (30000), Groceries (20000)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_split_1', 'acc_main', null, 'expense', 'PHP', -50000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_s1', 'tx_split_1', 'cat_dining', 30000, ?, ?)
  `).run(now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_s2', 'tx_split_1', 'cat_groceries', 20000, ?, ?)
  `).run(now, now);

  // 3. Split Expense with multiple entries in SAME category: 300 PHP (-30000 minor units) with two Dining items
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_split_2', 'acc_main', null, 'expense', 'PHP', -30000, ?, ?, ?)
  `).run(now, now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_s3', 'tx_split_2', 'cat_dining', 20000, ?, ?)
  `).run(now, now);
  sqlite.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
    VALUES ('entry_s4', 'tx_split_2', 'cat_dining', 10000, ?, ?)
  `).run(now, now);

  const { getCategoryBreakdown } = require("../services/get-category-breakdown.service");

  const breakdown = getCategoryBreakdown({ type: "expense", startDate, endDate }, db);

  // Total transactions: exactly 3 parent transactions (tx_unsplit_1, tx_split_1, tx_split_2)
  assert.equal(breakdown.transactionCount, 3, "Overall count must be 3 distinct parent transactions");
  assert.equal(breakdown.totalMinorUnits, 180000); // 1000 + 500 + 300 = 1800 PHP

  // Dining should have 3 transactions:
  // - tx_unsplit_1 (unsplit)
  // - tx_split_1 (split 1)
  // - tx_split_2 (split 2 - multiple entries count as 1 contributing transaction)
  const diningItem = breakdown.items.find((i) => i.categoryId === "cat_dining");
  assert.ok(diningItem);
  assert.equal(diningItem.transactionCount, 3, "Dining should count 3 distinct contributing transactions");
  assert.equal(diningItem.totalMinorUnits, 160000); // 1000 + 300 + 300

  // Groceries should have 1 transaction:
  // - tx_split_1 (split 1)
  const groceriesItem = breakdown.items.find((i) => i.categoryId === "cat_groceries");
  assert.ok(groceriesItem);
  assert.equal(groceriesItem.transactionCount, 1, "Groceries should count 1 contributing transaction, NOT 0");
  assert.equal(groceriesItem.totalMinorUnits, 20000); // 200 PHP

  sqlite.close();
});

test("REP-F03: getCategoryBreakdown calculates percentage against positive category spending", () => {
  const db = setupTestDb();
  const now = new Date(2026, 10, 15, 12).getTime();
  const startDate = new Date(2026, 10, 1);
  const endDate = new Date(2026, 10, 30, 23, 59, 59);

  sqlite.prepare("INSERT INTO accounts (id, name, currency_code, created_at, updated_at) VALUES ('acc_main', 'Cash', 'PHP', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_dining', 'Dining', 'expense', 'utensils', ?, ?)").run(now, now);
  sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES ('cat_electronics', 'Electronics', 'expense', 'tv', ?, ?)").run(now, now);

  // Dining expense: ₱100 (10,000 minor units)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_dining', 'acc_main', 'cat_dining', 'expense', 'PHP', -10000, ?, ?, ?)
  `).run(now, now, now);

  // Electronics refund: ₱20 (2,000 minor units)
  sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES ('tx_elec_ref', 'acc_main', 'cat_electronics', 'expense', 'PHP', 2000, ?, ?, ?)
  `).run(now, now, now);

  const { getCategoryBreakdown } = require("../services/get-category-breakdown.service");

  const breakdown = getCategoryBreakdown({ type: "expense", startDate, endDate }, db);

  // Net total: 100 - 20 = 80 PHP (8000 minor units)
  assert.equal(breakdown.totalMinorUnits, 8000);
  assert.equal(breakdown.transactionCount, 2);

  // Dining: 100 PHP, percentage should be 100% of positive spending, NOT 125%
  const diningItem = breakdown.items.find((i) => i.categoryId === "cat_dining");
  assert.ok(diningItem);
  assert.equal(diningItem.totalMinorUnits, 10000);
  assert.equal(diningItem.percentage, 100);

  // Electronics: -20 PHP, percentage should be 0%
  const elecItem = breakdown.items.find((i) => i.categoryId === "cat_electronics");
  assert.ok(elecItem);
  assert.equal(elecItem.totalMinorUnits, -2000);
  assert.equal(elecItem.percentage, 0);

  sqlite.close();
});
