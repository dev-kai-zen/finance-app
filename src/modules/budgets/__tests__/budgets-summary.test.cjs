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


test("BUD-F02: card spending equals drill-down category shares across all periods and child-budget states", () => {
  const { db, date, time, expense } = setupParentBudget();
  const { getBudgetTransactionScope }=require("../services/get-budget-transaction-scope.service");
  const { listCategoryBudgetsSync }=require("../repositories/category-budgets.repository");
  const { getCategory, getCategoryChildren }=require("@/modules/categories");
  const { getTransactionsForExport }=require("@/modules/transactions");
  sqlite.prepare("INSERT INTO category_budgets (id,category_id,amount_minor_units,currency_code,start_date,created_at,updated_at) VALUES ('child','cat_groceries',600000,'PHP',?,?,?)").run(time,time,time);
  expense("direct","cat_dining",10000);
  expense("split_scope","cat_dining",10000);
  sqlite.prepare("INSERT INTO transaction_entries (id,transaction_id,category_id,amount_minor_units,created_at,updated_at) VALUES ('scope_a','split_scope','cat_restaurants',3000,?,?),('scope_b','split_scope','cat_groceries',7000,?,?)").run(time,time,time,time);
  expense("refund_scope","cat_restaurants",-2000);
  const parent={...getCategory("cat_dining",db),subcategories:getCategoryChildren("cat_dining",db)};
  const map=new Map([[parent.id,parent],...parent.subcategories.map(child=>[child.id,child])]);
  for(const enabled of [1,0]) {
    sqlite.prepare("UPDATE category_budgets SET is_enabled=? WHERE id='child'").run(enabled);
    for(const frequency of ["daily","weekly","biweekly","semi_monthly","monthly","custom_monthly","quarterly","yearly"]) {
      sqlite.prepare("UPDATE category_budgets SET frequency=? WHERE id='b_parent'").run(frequency);
      const budgets=listCategoryBudgetsSync(db);
      const status=calculateBudgetStatusesBatch(budgets,map,date,db).find(status=>status.budget.id==="b_parent");
      const before=queries.length;
      const scope=getBudgetTransactionScope(status,budgets);
      assert.equal(queries.length,before,"Building a link performs zero SQL queries");
      assert.equal(scope.categoryIds.includes("cat_groceries"),!enabled);
      const parse=key=>{const [y,m,d]=key.split("-").map(Number);return new Date(y,m-1,d);};
      const end=parse(scope.dateTo);end.setHours(23,59,59,999);
      const rows=getTransactionsForExport({type:"expense",categoryIds:scope.categoryIds,categoryAmountScope:true,startDate:parse(scope.dateFrom),endDate:end},db);
      assert.equal(-rows.reduce((sum,row)=>sum+row.categoryAmountMinorUnits,0),status.spentCents,frequency+" ownership "+enabled);
      assert.equal(rows.find(row=>row.id==="split_scope").categoryAmountMinorUnits,enabled?-3000:-10000);
      assert.equal(rows.find(row=>row.id==="refund_scope").categoryAmountMinorUnits,2000);
    }
  }
  sqlite.close();
});


test("BUD-F03: sibling and repeated split lines share one budget baseline and combined warning", () => {
  const { db, date }=setupParentBudget();
  const { checkExpenseBudgets }=require("../services/check-expense-budgets.service");
  const input={lines:[{categoryId:"cat_groceries",amountMinorUnits:30000},{categoryId:"cat_restaurants",amountMinorUnits:30000}],occurredAt:date,expenseCurrencyCode:"PHP",context:db};
  queries=[];
  const results=checkExpenseBudgets(input);
  assert.equal(results.length,1);assert.equal(results[0].budgetId,"b_parent");
  assert.equal(results[0].currentSpentCents,450000);assert.equal(results[0].additionalExpenseCents,60000);
  assert.equal(results[0].newSpentCents,510000);assert.equal(results[0].exceededByCents,10000);assert.equal(results[0].exceeds,true);
  const count=queries.length;assert.ok(count<=12,"Bounded shared-budget reads: "+count);
  assert.equal(queries.filter(query=>query.includes("sum(")).length,2,"One unsplit and one split aggregate for the owner");
  assert.ok(queries.every(query=>/^select/i.test(query)),"Checking never writes to the database");
  const childQuery=queries.find(query=>query.includes('where "categories"."parent_id" = ?'));
  const plan=sqlite.prepare("EXPLAIN QUERY PLAN "+childQuery).all("cat_dining").map(row=>row.detail).join(" | ");
  assert.match(plan,/categories_parent_id_index/);assert.doesNotMatch(plan,/TEMP B-TREE/);
  queries=[];
  const repeated=checkExpenseBudgets({...input,lines:Array.from({length:2000},(_,i)=>({categoryId:i%2?"cat_groceries":"cat_restaurants",amountMinorUnits:30}))});
  assert.deepEqual(repeated,results);assert.equal(queries.length,count,"Repeated lines add no SQL statements");
  sqlite.close();
});

test("BUD-F03: active child budgets stay independent; paused children join the parent and all exceeded budgets are returned", () => {
  const { db, date, time }=setupParentBudget();
  const { checkExpenseBudgets }=require("../services/check-expense-budgets.service");
  sqlite.prepare("INSERT INTO category_budgets(id,category_id,amount_minor_units,currency_code,start_date,created_at,updated_at) VALUES('child','cat_groceries',600000,'PHP',?,?,?)").run(time,time,time);
  const input={lines:[{categoryId:"cat_groceries",amountMinorUnits:200000},{categoryId:"cat_restaurants",amountMinorUnits:600000}],occurredAt:date,context:db};
  const checks=checkExpenseBudgets(input);assert.equal(checks.length,2);
  const byId=new Map(checks.map(check=>[check.budgetId,check]));
  assert.equal(byId.get("child").currentSpentCents,450000);assert.equal(byId.get("child").newSpentCents,650000);
  assert.equal(byId.get("b_parent").currentSpentCents,0);assert.equal(byId.get("b_parent").newSpentCents,600000);
  assert.ok(checks.every(check=>check.exceeds&&check.notifyOnExceeded));
  sqlite.exec("UPDATE category_budgets SET is_enabled=0 WHERE id='child'");
  const fallback=checkExpenseBudgets(input);assert.equal(fallback.length,1);
  assert.equal(fallback[0].newSpentCents,1250000);
  sqlite.close();
});

test("BUD-F03: split edits exclude the original parent once and respect the pending date", () => {
  const { db, date, time, expense }=setupParentBudget();
  const { checkExpenseBudgets }=require("../services/check-expense-budgets.service");
  expense("editing_split","cat_dining",10000);
  sqlite.prepare("INSERT INTO transaction_entries(id,transaction_id,category_id,amount_minor_units,created_at,updated_at) VALUES('old_a','editing_split','cat_groceries',4000,?,?),('old_b','editing_split','cat_restaurants',6000,?,?)").run(time,time,time,time);
  const input={lines:[{categoryId:"cat_groceries",amountMinorUnits:20000},{categoryId:"cat_restaurants",amountMinorUnits:40000}],occurredAt:date,excludeTransactionId:"editing_split",context:db};
  const [check]=checkExpenseBudgets(input);
  assert.equal(check.currentSpentCents,450000);assert.equal(check.newSpentCents,510000);
  const [otherMonth]=checkExpenseBudgets({...input,occurredAt:new Date(2026,9,15,12)});
  assert.equal(otherMonth.currentSpentCents,0);assert.equal(otherMonth.newSpentCents,60000);assert.equal(otherMonth.exceeds,false);
  sqlite.close();
});

test("BUD-F03: currency conversion rounds the combined budget allocation once", () => {
  const { db, date, time }=setupParentBudget();
  const { checkExpenseBudgets }=require("../services/check-expense-budgets.service");
  sqlite.exec("DELETE FROM transactions; UPDATE category_budgets SET currency_code='JPY',amount_minor_units=1");
  sqlite.prepare("INSERT INTO exchange_rates(id,base_currency,quote_currency,rate_basis_points,created_at,updated_at) VALUES('usd','PHP','USD',500000,?,?),('jpy','PHP','JPY',10000,?,?) ON CONFLICT(base_currency,quote_currency) DO UPDATE SET rate_basis_points=excluded.rate_basis_points").run(time,time,time,time);
  const [check]=checkExpenseBudgets({lines:[{categoryId:"cat_groceries",amountMinorUnits:1},{categoryId:"cat_restaurants",amountMinorUnits:1}],expenseCurrencyCode:"USD",occurredAt:date,context:db});
  assert.equal(check.additionalExpenseCents,1,"USD 0.02 = PHP 1.00 = JPY 1, not two rounded yen");
  assert.equal(check.newSpentCents,1);assert.equal(check.exceeds,false);
  sqlite.close();
});

test("BUD-F03: empty/missing/paused budgets fast-exit; alert opt-out is retained", () => {
  const { db, date }=setupParentBudget();
  const { checkExpenseBudgets }=require("../services/check-expense-budgets.service");
  queries=[];assert.deepEqual(checkExpenseBudgets({lines:[],context:db}),[]);assert.equal(queries.length,0);
  assert.deepEqual(checkExpenseBudgets({lines:[{categoryId:"missing",amountMinorUnits:100}],context:db}),[]);
  sqlite.exec("UPDATE category_budgets SET notify_on_exceeded=0");
  const [check]=checkExpenseBudgets({lines:[{categoryId:"cat_restaurants",amountMinorUnits:100000}],occurredAt:date,context:db});
  assert.equal(check.exceeds,true);assert.equal(check.notifyOnExceeded,false);
  sqlite.exec("UPDATE category_budgets SET is_enabled=0");queries=[];
  assert.deepEqual(checkExpenseBudgets({lines:[{categoryId:"cat_restaurants",amountMinorUnits:100000}],occurredAt:date,context:db}),[]);
  assert.ok(queries.every(query=>!query.includes("sum(")));
  sqlite.close();
});

test("BUD-F03: both budget and monthly-target lookups chunk at 500 IDs", () => {
  const db=setupTestDb();const time=Date.now();
  const { findCategoryBudgetsByCategoryIds }=require("../repositories/category-budgets.repository");
  const category=sqlite.prepare("INSERT INTO categories(id,name,type,created_at,updated_at) VALUES(?,?,'expense',?,?)");
  const budget=sqlite.prepare("INSERT INTO category_budgets(id,category_id,amount_minor_units,currency_code,start_date,created_at,updated_at) VALUES(?,?,100,'PHP',?,?,?)");
  sqlite.exec("BEGIN");
  const ids=[];
  for(let i=0;i<1001;i++){const id="bulk_"+i;ids.push(id);category.run(id,id,time,time);budget.run("budget_"+i,id,time,time,time);}
  sqlite.exec("COMMIT");
  sqlite.prepare("INSERT INTO budget_monthly_targets(id,budget_id,year,month,amount_minor_units,created_at,updated_at) VALUES('target','budget_1000',2026,12,250,?,?)").run(time,time);
  queries=[];const found=findCategoryBudgetsByCategoryIds(ids,db);
  assert.equal(found.length,1001);assert.equal(queries.length,6);
  assert.ok(queries.every(query=>(query.match(/\?/g)||[]).length<=500));
  assert.equal(found.find(row=>row.id==="budget_1000").monthlyTargets[0].amountMinorUnits,250);
  sqlite.close();
});


test("BUD-F04: zero limits agree with cards for custom targets, rollover and grouped splits", () => {
  const {db,date,time,expense}=setupParentBudget();
  const {checkExpenseBudgets}=require('../services/check-expense-budgets.service');
  sqlite.exec("DELETE FROM transactions; UPDATE category_budgets SET frequency='custom_monthly',amount_minor_units=100000");
  sqlite.prepare("INSERT INTO budget_monthly_targets(id,budget_id,year,month,amount_minor_units,created_at,updated_at) VALUES('zero','b_parent',2026,11,0,?,?)").run(time,time);
  const input={categoryId:'cat_restaurants',occurredAt:date,context:db};
  const snapshot=getBudgetLiveSnapshot(input);
  assert.equal(snapshot.effectiveBudgetCents,0);
  const queryCount=queries.length;
  for(const [current,pending,expected] of [[0,0,false],[0,10000,true],[-10000,5000,false],[-10000,10000,false],[-10000,10001,true]]) {
    const result=evaluateBudgetSnapshot({...snapshot,currentSpentCents:current},pending);
    assert.equal(result.exceeds,expected,JSON.stringify({current,pending}));
    assert.equal(result.exceededByCents,Math.max(0,current+pending));
  }
  for(const target of [100000,500000]) for(const pending of [target,target+1]) {
    assert.equal(evaluateBudgetSnapshot({...snapshot,effectiveBudgetCents:target},pending).exceeds,pending>target);
  }
  for(const flag of ['hasBudget','isEnabled']) assert.equal(evaluateBudgetSnapshot({...snapshot,[flag]:false},10000).exceeds,false);
  assert.equal(queries.length,queryCount,'Pure evaluations execute zero SQL');
  const [grouped]=checkExpenseBudgets({lines:[{categoryId:'cat_groceries',amountMinorUnits:4000},{categoryId:'cat_restaurants',amountMinorUnits:6000}],occurredAt:date,context:db});
  assert.equal(grouped.newSpentCents,10000);assert.equal(grouped.exceeds,true);
  expense('zero_saved','cat_restaurants',10000);
  assert.equal(checkBudgetExceeded({...input,amountMinorUnits:0}).exceeds,true);
  assert.equal(getBudgetsSummary(date,db).exceededCount,1);
  sqlite.exec("DELETE FROM transactions; UPDATE category_budgets SET frequency='monthly',allow_rollover=1,rollover_mode='full'");
  expense('previous','cat_groceries',250000,new Date(2026,9,15,12).getTime());
  const rollover=getBudgetLiveSnapshot(input);
  assert.equal(rollover.effectiveBudgetCents,0);
  assert.equal(evaluateBudgetSnapshot(rollover,10000).exceeds,true);
  expense('rollover_saved','cat_restaurants',10000);
  assert.equal(getBudgetsSummary(date,db).exceededCount,1);
  sqlite.close();
});

test("BUD-F05: date edits exclude the old transaction from previous-period spending during rollover calculation", () => {
  const { db, date, time, expense } = setupParentBudget();
  sqlite.exec("DELETE FROM transactions; UPDATE category_budgets SET frequency='monthly', amount_minor_units=500000, allow_rollover=1, rollover_mode='positive_only'");

  const prevDate = new Date(2026, 9, 15, 12);
  expense('tx_move', 'cat_groceries', 300000, prevDate.getTime());

  // 1. Edit tx_move: moved to current period (Nov) with amount 800,000
  const input = {
    categoryId: 'cat_groceries',
    occurredAt: date,
    excludeTransactionId: 'tx_move',
    context: db,
  };

  const snapshot = getBudgetLiveSnapshot(input);
  // Without fix: snapshot.effectiveBudgetCents was 700000 (300,000 counted in Oct).
  // With fix: snapshot.effectiveBudgetCents is 1000000 (tx_move excluded from Oct -> 500,000 rollover).
  assert.equal(snapshot.effectiveBudgetCents, 1000000);

  const check = evaluateBudgetSnapshot(snapshot, 800000);
  assert.equal(check.exceeds, false);

  // 2. Commit the edit to DB and verify post-save card and summary match preview exactly
  sqlite.prepare("UPDATE transactions SET occurred_at = ?, amount_minor_units = -800000 WHERE id = 'tx_move'").run(time);
  const postSaveSummary = getBudgetsSummary(date, db);
  assert.equal(postSaveSummary.totalBudgetedCents, 1000000);
  assert.equal(postSaveSummary.totalSpentCents, 800000);
  assert.equal(postSaveSummary.exceededCount, 0);

  // 3. Move back: edit tx_move to move from Nov back to Oct
  sqlite.exec("UPDATE category_budgets SET rollover_mode='full'");
  const moveBackInput = {
    categoryId: 'cat_groceries',
    occurredAt: prevDate,
    excludeTransactionId: 'tx_move',
    context: db,
  };
  const moveBackSnapshot = getBudgetLiveSnapshot(moveBackInput);
  // In October, tx_move is excluded -> October current spent is 0
  assert.equal(moveBackSnapshot.currentSpentCents, 0);
  assert.equal(moveBackSnapshot.effectiveBudgetCents, 1000000);

  sqlite.close();
});

