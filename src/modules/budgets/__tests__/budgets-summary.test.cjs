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
let queries = [];

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
const { getBudgetsSummary } = require("../services/get-budgets-summary.service");
const {
  calculateCategoryBudgetStatus,
  calculateBudgetStatusesBatch,
} = require("../services/calculate-category-budget.service");

function setupTestDb() {
  queries = [];
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
        queries.push(query);
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
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, sort_order, created_at, updated_at)
    VALUES ('cat_dining', 'Dining', 'expense', 'utensils', 1, 0, ${now}, ${now}),
           ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', 1, 1, ${now}, ${now});
  `);

  return database;
}

test("budgets: calculateBudgetStatusesBatch accurately batches spend totals matching single calculation", () => {
  const db = setupTestDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const midMonth = new Date(year, month, 15, 12, 0).getTime();

  // Insert two budgets
  sqlite.exec(`
    INSERT INTO category_budgets (id, category_id, amount_minor_units, currency_code, frequency, is_enabled, allow_rollover, rollover_mode, notify_on_exceeded, start_date, created_at, updated_at)
    VALUES ('b_dining', 'cat_dining', 500000, 'PHP', 'monthly', 1, 0, 'positive_only', 1, ${new Date(year, month, 1).getTime()}, ${now.getTime()}, ${now.getTime()}),
           ('b_groceries', 'cat_groceries', 1000000, 'PHP', 'monthly', 1, 0, 'positive_only', 1, ${new Date(year, month, 1).getTime()}, ${now.getTime()}, ${now.getTime()});
  `);

  // Insert expense transactions
  const insertTx = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run("tx_d1", "acc_1", "cat_dining", "expense", -150000, midMonth, midMonth, midMonth);
  insertTx.run("tx_d2", "acc_1", "cat_dining", "expense", -50000, midMonth, midMonth, midMonth);
  insertTx.run("tx_g1", "acc_1", "cat_groceries", "expense", -400000, midMonth, midMonth, midMonth);

  const summary = getBudgetsSummary(now, db);

  assert.equal(summary.activeCount, 2);
  assert.equal(summary.totalBudgetedCents, 1500000); // 5,000 + 10,000 PHP in cents
  assert.equal(summary.totalSpentCents, 600000); // (1500 + 500) + 4000 PHP in cents = 6,000 PHP
  assert.equal(summary.totalRemainingCents, 900000); // 15,000 - 6,000 = 9,000 PHP
  assert.equal(summary.overallPercentage, 40); // 600,000 / 1,500,000 = 40%
  assert.equal(summary.exceededCount, 0);
  assert.equal(summary.nearLimitCount, 0);
});

test("budgets (P1-13): toggling a budget OFF preserves its displayed spentCents and rolloverCents in calculateBudgetStatusesBatch while excluding it from active summary totals", () => {
  const db = setupTestDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const prevMonthMid = new Date(year, month - 1, 15, 12, 0).getTime();
  const currMonthMid = new Date(year, month, 15, 12, 0).getTime();
  const startDateMs = new Date(year, month - 1, 1).getTime();

  // Insert a paused budget (is_enabled = 0) with rollover enabled
  sqlite.exec(`
    INSERT INTO category_budgets (id, category_id, amount_minor_units, currency_code, frequency, is_enabled, allow_rollover, rollover_mode, notify_on_exceeded, start_date, created_at, updated_at)
    VALUES ('b_dining_paused', 'cat_dining', 500000, 'PHP', 'monthly', 0, 1, 'positive_only', 1, ${startDateMs}, ${now.getTime()}, ${now.getTime()});
  `);

  // Spend 3,000 PHP last month (leaving 2,000 PHP rollover -> 7,000 PHP effective target) and 1,500 PHP this month
  const insertTx = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTx.run("tx_prev", "acc_1", "cat_dining", "expense", -300000, prevMonthMid, prevMonthMid, prevMonthMid);
  insertTx.run("tx_curr", "acc_1", "cat_dining", "expense", -150000, currMonthMid, currMonthMid, currMonthMid);

  const { listCategoryBudgetsSync } = require("../repositories/category-budgets.repository");
  const { listCategoriesSync } = require("@/modules/categories/repositories/categories.repository");

  const budgets = listCategoryBudgetsSync(db);
  const categories = listCategoriesSync(db);
  const flatMap = new Map(categories.map((c) => [c.id, c]));

  const statuses = calculateBudgetStatusesBatch(budgets, flatMap, now, db);
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].budget.isEnabled, false);
  assert.equal(statuses[0].spentCents, 150000);
  assert.equal(statuses[0].rolloverCents, 200000);
  assert.equal(statuses[0].effectiveTargetCents, 700000);

  // Active summary excludes the paused budget
  const summary = getBudgetsSummary(now, db);
  assert.equal(summary.activeCount, 0);
  assert.equal(summary.totalBudgetedCents, 0);
  assert.equal(summary.totalSpentCents, 0);
});


const {
  getBudgetLiveSnapshot,
  evaluateBudgetSnapshot,
  checkBudgetExceeded,
} = require("../services/check-budget-exceeded.service");

function setupParentBudget() {
  const db = setupTestDb();
  const date = new Date(2026, 10, 15, 12);
  const time = date.getTime();
  sqlite.prepare("UPDATE categories SET parent_id = ? WHERE id = ?").run("cat_dining", "cat_groceries");
  sqlite.prepare("INSERT INTO categories (id, name, type, parent_id, created_at, updated_at) VALUES (?, ?, 'expense', ?, ?, ?)")
    .run("cat_restaurants", "Restaurants", "cat_dining", time, time);
  sqlite.prepare("INSERT INTO category_budgets (id, category_id, amount_minor_units, currency_code, start_date, created_at, updated_at) VALUES (?, ?, ?, 'PHP', ?, ?, ?)")
    .run("b_parent", "cat_dining", 500000, new Date(2026, 10, 1).getTime(), time, time);
  function expense(id, categoryId, amount, occurredAt = time, type = "expense") {
    sqlite.prepare("INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, occurred_at, created_at, updated_at) VALUES (?, 'acc_1', ?, ?, ?, ?, ?, ?)")
      .run(id, categoryId, type, -amount, occurredAt, occurredAt, occurredAt);
  }
  expense("groceries", "cat_groceries", 450000);
  return { db, date, time, expense };
}

test("budgets (P2-02): sibling spending counts in parent live preview and save warning", () => {
  const { db, date } = setupParentBudget();
  const input = { categoryId: "cat_restaurants", occurredAt: date, context: db };
  const snapshot = getBudgetLiveSnapshot(input);
  const queryCount = queries.length;
  const preview = evaluateBudgetSnapshot(snapshot, 100000);
  assert.equal(preview.currentSpentCents, 450000);
  assert.equal(preview.newSpentCents, 550000);
  assert.equal(preview.effectiveBudgetCents, 500000);
  assert.equal(preview.remainingAfterCents, -50000);
  assert.equal(preview.exceededByCents, 50000);
  assert.equal(preview.exceeds, true);
  assert.equal(preview.notifyOnExceeded, true);
  assert.equal(Math.round(preview.newSpentCents / preview.effectiveBudgetCents * 100), 110);
  for (let amount = 0; amount < 100000; amount += 1000) evaluateBudgetSnapshot(snapshot, amount);
  assert.equal(queries.length, queryCount, "Typing performs zero SQL queries");
  assert.deepEqual(checkBudgetExceeded({ ...input, amountMinorUnits: 100000 }), preview);
  assert.equal(getBudgetsSummary(date, db).totalSpentCents, preview.currentSpentCents);
  queries = [];
  getBudgetLiveSnapshot(input);
  assert.ok(queries.length <= 12, "Fixed snapshot query bound: " + queries.length);
  const childrenQuery = queries.find(query => query.includes('where "categories"."parent_id" = ?'));
  assert.ok(childrenQuery, "Children are filtered in SQLite");
  const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + childrenQuery).all("cat_dining");
  assert.ok(plan.some(row => row.detail.includes("categories_parent_id_index")));
  assert.ok(plan.every(row => !row.detail.includes("TEMP B-TREE")));
});

test("budgets (P2-02): child budgets override parent budgets and paused children fall back", () => {
  const { db, date, time } = setupParentBudget();
  sqlite.prepare("INSERT INTO category_budgets (id, category_id, amount_minor_units, currency_code, start_date, created_at, updated_at) VALUES (?, ?, ?, 'PHP', ?, ?, ?)")
    .run("b_child", "cat_groceries", 600000, time, time, time);
  const parent = getBudgetLiveSnapshot({ categoryId: "cat_restaurants", occurredAt: date, context: db });
  assert.equal(parent.currentSpentCents, 0, "Separately budgeted siblings do not consume parent budget");
  const child = getBudgetLiveSnapshot({ categoryId: "cat_groceries", occurredAt: date, context: db });
  assert.equal(child.effectiveBudgetCents, 600000);
  assert.equal(child.currentSpentCents, 450000);
  sqlite.exec("UPDATE category_budgets SET is_enabled = 0 WHERE id = 'b_child'");
  const fallback = getBudgetLiveSnapshot({ categoryId: "cat_groceries", occurredAt: date, context: db });
  assert.equal(fallback.effectiveBudgetCents, 500000);
  assert.equal(fallback.currentSpentCents, 450000);
  assert.equal(fallback.currentSpentCents, getBudgetsSummary(date, db).totalSpentCents);
  const edit = getBudgetLiveSnapshot({ categoryId: "cat_restaurants", occurredAt: date, excludeTransactionId: "groceries", context: db });
  assert.equal(edit.currentSpentCents, 0);
});

test("budgets (P2-02): parent spending includes direct expenses and splits, excluding deleted, transfer and old rows", () => {
  const { db, date, time, expense } = setupParentBudget();
  expense("fee", "cat_dining", 1000);
  expense("split", "cat_dining", 10000);
  const insertEntry = sqlite.prepare("INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at) VALUES (?, 'split', ?, ?, ?, ?)");
  insertEntry.run("entry_a", "cat_groceries", 4000, time, time);
  insertEntry.run("entry_b", "cat_restaurants", 6000, time, time);
  expense("deleted", "cat_groceries", 100000);
  sqlite.prepare("UPDATE transactions SET deleted_at = ? WHERE id = 'deleted'").run(time);
  expense("transfer", "cat_groceries", 100000, time, "transfer");
  expense("old", "cat_groceries", 100000, new Date(2026, 9, 15).getTime());
  const snapshot = getBudgetLiveSnapshot({ categoryId: "cat_dining", occurredAt: date, context: db });
  assert.equal(snapshot.currentSpentCents, 461000);
  assert.equal(snapshot.currentSpentCents, getBudgetsSummary(date, db).totalSpentCents);
  const edit = getBudgetLiveSnapshot({ categoryId: "cat_restaurants", occurredAt: date, excludeTransactionId: "split", context: db });
  assert.equal(edit.currentSpentCents, 451000);
});

test("budgets (P2-02): missing budgets skip child reads; enabled-budget lookups chunk IDs", () => {
  const { db, date } = setupParentBudget();
  sqlite.exec("UPDATE category_budgets SET is_enabled = 0");
  queries = [];
  assert.equal(getBudgetLiveSnapshot({ categoryId: "cat_restaurants", occurredAt: date, context: db }).hasBudget, false);
  assert.ok(queries.every(query => !query.includes('where "categories"."parent_id"')));
  const { findEnabledBudgetCategoryIds } = require("../repositories/category-budgets.repository");
  queries = [];
  assert.equal(findEnabledBudgetCategoryIds([], db).size, 0);
  assert.equal(queries.length, 0);
  sqlite.exec("UPDATE category_budgets SET is_enabled = 1");
  const ids = Array.from({ length: 1000 }, (_, i) => "missing_" + i).concat("cat_dining");
  assert.deepEqual([...findEnabledBudgetCategoryIds(ids, db)], ["cat_dining"]);
  assert.equal(queries.length, 3);
  assert.ok(queries.every(query => (query.match(/\?/g) || []).length <= 501));
});
