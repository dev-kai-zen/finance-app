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

const { getCategorySpendingBreakdown } = require("../repositories/dashboard.repository");
const { buildCategoryExpenseBreakdown } = require("../../calendar/utils/category-expense-breakdown");
const { getCategoriesByIds } = require("@/modules/categories");
const { getCategoryExpenseTotalsGrouped } = require("@/modules/transactions");

function fixture() {
  const db = setupTestDb();
  const date = new Date(2026, 10, 15, 12);
  const time = date.getTime();
  sqlite.prepare("INSERT INTO hex_colors (id, name, hex, created_at, updated_at) VALUES ('color_ef4444', 'Red', '#ef4444', ?, ?)").run(time, time);
  sqlite.exec("UPDATE categories SET parent_id = 'cat_dining', hex_colors_id = 'color_ef4444' WHERE id = 'cat_groceries'");
  const insertCategory = sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES (?, ?, 'expense', ?, ?, ?)");
  insertCategory.run("shopping", "Shopping", "shopping-bag", time, time);
  insertCategory.run("entertainment", "Entertainment", "tv", time, time);
  sqlite.prepare("INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_at, created_at, updated_at) VALUES ('usd', 'act_dep', 'USD', 'USD', ?, ?, ?)").run(time, time, time);
  sqlite.prepare("INSERT INTO exchange_rates (id, base_currency, quote_currency, rate_basis_points, created_at, updated_at) VALUES ('php_usd', 'PHP', 'USD', 500000, ?, ?) ON CONFLICT(base_currency, quote_currency) DO UPDATE SET rate_basis_points = 500000").run(time, time);
  const all = [];
  function transaction(id, categoryId, amount, options = {}) {
    const occurredAt = options.occurredAt ?? time;
    const type = options.type ?? "expense";
    const accountId = options.currency === "USD" ? "usd" : "acc_1";
    sqlite.prepare("INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, occurred_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, accountId, categoryId, type, -amount, occurredAt, time, time, options.deleted ? time : null);
    for (const [index, entry] of (options.entries ?? []).entries()) {
      sqlite.prepare("INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id + "_" + index, id, entry.categoryId, entry.amountMinorUnits, time, time);
    }
    all.push({ id, categoryId, type, amountMinorUnits: -amount, occurredAt: new Date(occurredAt),
      accountCurrency: options.currency ?? "PHP", isSplit: Boolean(options.entries?.length),
      splitEntries: options.entries, deletedAt: options.deleted ? new Date(time) : null });
  }
  const flat = getCategoriesByIds(["cat_dining", "cat_groceries", "shopping", "entertainment"], db);
  const categories = flat.filter(category => !category.parentId);
  categories.find(category => category.id === "cat_dining").subcategories = flat.filter(category => category.parentId);
  const calendar = () => buildCategoryExpenseBreakdown(
    all.filter(tx => tx.occurredAt.getFullYear() === 2026 && tx.occurredAt.getMonth() === 10),
    categories,
    (amount, currency) => currency === "USD" ? amount * 50 : amount,
  );
  return { db, date, time, transaction, calendar };
}

function assertParity(dashboard, calendar) {
  assert.equal(dashboard.length, calendar.length);
  for (const item of dashboard) {
    const matching = calendar.find(category => category.id === item.categoryId);
    assert.ok(matching, item.categoryId);
    assert.equal(item.totalMinorUnits, matching.totalMinorUnits);
    assert.equal(item.percentage, matching.percentage);
  }
}

test("P2-04: calendar subcategory metadata and split category totals match dashboard", () => {
  const f = fixture();
  try {
    f.transaction("plain", "cat_groceries", 50000);
    f.transaction("split", null, 100000, { entries: [
      { categoryId: "shopping", amountMinorUnits: 60000 },
      { categoryId: "entertainment", amountMinorUnits: 40000 },
    ] });
    const calendar = f.calendar();
    const groceries = calendar.find(row => row.id === "cat_groceries");
    assert.equal(groceries.name, "Groceries");
    assert.equal(groceries.icon, "shopping-cart");
    assert.equal(groceries.color, "#ef4444");
    const dashboard = getCategorySpendingBreakdown(f.db, f.date);
    assertParity(dashboard, calendar);
    assert.equal(dashboard.find(row => row.categoryId === "shopping").totalMinorUnits, 60000);
    assert.equal(dashboard.find(row => row.categoryId === "entertainment").totalMinorUnits, 40000);
    assert.ok(dashboard.every(row => row.categoryId !== "uncategorized"));
    assert.equal(dashboard.find(row => row.categoryId === "cat_groceries").categoryColor, "ef4444");
  } finally { sqlite.close(); }
});

test("P2-04: mixed currencies, tied times, splits, fees, null categories and date boundaries retain parity", () => {
  const f = fixture();
  try {
    f.transaction("parent-with-splits", "cat_dining", 5000, { entries: [
      { categoryId: "shopping", amountMinorUnits: 2000 },
      { categoryId: "shopping", amountMinorUnits: 3000 },
    ] });
    f.transaction("usd-split", null, 100, { currency: "USD", entries: [
      { categoryId: "shopping", amountMinorUnits: 60 },
      { categoryId: "entertainment", amountMinorUnits: 40 },
    ] });
    f.transaction("fee", "cat_groceries", 500);
    f.transaction("legacy-no-category", null, 300);
    f.transaction("start", "shopping", 100, { occurredAt: new Date(2026, 10, 1).getTime() });
    f.transaction("end", "entertainment", 100, { occurredAt: new Date(2026, 11, 1).getTime() - 1 });
    f.transaction("old", "shopping", 999, { occurredAt: new Date(2026, 10, 1).getTime() - 1 });
    f.transaction("future", "shopping", 999, { occurredAt: new Date(2026, 11, 1).getTime() });
    for (const type of ["income", "transfer"]) f.transaction(type, "shopping", 999, { type });
    f.transaction("deleted", null, 999, { deleted: true, entries: [{ categoryId: "shopping", amountMinorUnits: 999 }] });
    const dashboard = getCategorySpendingBreakdown(f.db, f.date);
    assertParity(dashboard, f.calendar());
    assert.equal(dashboard.reduce((sum, row) => sum + row.totalMinorUnits, 0), 11000);
    assert.equal(dashboard.find(row => row.categoryId === "shopping").totalMinorUnits, 8100);
    assert.ok(!dashboard.some(row => row.categoryId === "cat_dining"), "Never count the split parent");
    assert.equal(dashboard.find(row => row.categoryId === "uncategorized").totalMinorUnits, 300);
  } finally { sqlite.close(); }
});

test("P2-04: SQL aggregation has a fixed statement count and indexed split probes", () => {
  const f = fixture();
  try {
    f.transaction("base", "shopping", 100);
    queries = [];
    getCategorySpendingBreakdown(f.db, f.date);
    const initialCount = queries.length;
    assert.ok(initialCount <= 6, "No per-category/transaction queries: " + initialCount);
    const aggregate = queries.find(query => query.includes('sum(-') || query.includes('sum(abs('));
    assert.ok(aggregate);
    assert.ok(!aggregate.includes('"transactions"."id",'), "Hydrate aggregates, not ledger rows");
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + aggregate).all("expense", new Date(2026, 10, 1).getTime(), new Date(2026, 11, 1).getTime() - 1);
    assert.ok(plan.some(row => row.detail.includes("transaction_entries_transaction_id_index")));
    const metadata = queries.find(query => query.includes('where "categories"."id" in'));
    const metadataPlan = sqlite.prepare("EXPLAIN QUERY PLAN " + metadata).all("shopping");
    assert.ok(metadataPlan.some(row => row.detail.includes("INDEX")));
    assert.ok(metadataPlan.every(row => !row.detail.includes("TEMP B-TREE")));
    for (let index = 0; index < 1000; index++) f.transaction("bulk_" + index, "shopping", 100);
    queries = [];
    const result = getCategorySpendingBreakdown(f.db, f.date);
    assert.equal(queries.length, initialCount);
    assert.equal(result[0].totalMinorUnits, 100100);
    queries = [];
    assert.deepEqual(getCategoryExpenseTotalsGrouped({ categoryIds: [], startDate: f.date, endDate: f.date }, f.db), {});
    assert.equal(queries.length, 0);
    assert.equal(getCategoriesByIds([], f.db).length, 0);
    assert.equal(queries.length, 0);
    getCategoriesByIds(Array.from({ length: 1001 }, (_, i) => "missing_" + i), f.db);
    assert.equal(queries.length, 3);
    assert.ok(queries.every(query => (query.match(/\?/g) ?? []).length <= 500));
  } finally { sqlite.close(); }
});


test("P3-05: category filters chunk at 500 unique IDs with split and currency parity", () => {
  const f = fixture();
  try {
    const ids = [];
    const insert = sqlite.prepare("INSERT INTO categories (id, name, type, icon, created_at, updated_at) VALUES (?, ?, 'expense', 'tag', ?, ?)");
    for (let i = 0; i < 1001; i++) {
      const id = "chunk_" + i;
      ids.push(id);
      insert.run(id, id, f.time, f.time);
    }
    f.transaction("first", ids[0], 123);
    f.transaction("boundary", ids[499], 2, { currency: "USD" });
    f.transaction("second-chunk", ids[500], 456);
    f.transaction("last-split", ids[1000], 100, { entries: [
      { categoryId: ids[0], amountMinorUnits: 40 },
      { categoryId: ids[1000], amountMinorUnits: 60 },
    ] });
    f.transaction("deleted-chunk", ids[500], 999, { deleted: true });
    f.transaction("income-chunk", ids[500], 999, { type: "income" });
    f.transaction("transfer-chunk", ids[500], 999, { type: "transfer" });
    f.transaction("outside-chunk", ids[500], 999, { occurredAt: f.time - 86400000 });
    const query = { categoryIds: [...ids, ids[0], ids[499], ids[1000]], startDate: f.date, endDate: f.date, targetCurrencyCode: "PHP" };
    queries = [];
    const grouped = getCategoryExpenseTotalsGrouped(query, f.db);
    const aggregates = queries.filter(sql => sql.includes('sum('));
    assert.equal(aggregates.length, 6, "Three unsplit and three split aggregations");
    assert.ok(aggregates.every(sql => (sql.match(/\?/g) ?? []).length <= 503));
    assert.deepEqual(grouped, { [ids[0]]: 163, [ids[499]]: 100, [ids[500]]: 456, [ids[1000]]: 60 });
    const { getCategoryExpenseTotal } = require("@/modules/transactions");
    const { listExpenseEntryTotalsByCategory } = require("../../transactions/repositories/transaction-entries.repository");
    queries = [];
    assert.equal(getCategoryExpenseTotal(query, f.db), 779);
    assert.equal(queries.filter(sql => sql.includes('sum(')).length, 6);
    assert.equal(getCategoryExpenseTotal({ ...query, targetCurrencyCode: "USD" }, f.db), 16, "Convert once after combining chunks to preserve rounding");
    assert.equal(getCategoryExpenseTotal({ ...query, excludeTransactionId: "last-split" }, f.db), 679);
    assert.deepEqual(listExpenseEntryTotalsByCategory(query, f.db), [
      { categoryId: ids[0], currencyCode: "PHP", total: 40 },
      { categoryId: ids[1000], currencyCode: "PHP", total: 60 },
    ]);
    queries = [];
    assert.equal(getCategoryExpenseTotal({ ...query, categoryIds: [] }, f.db), 0);
    assert.deepEqual(listExpenseEntryTotalsByCategory({ ...query, categoryIds: [] }, f.db), []);
    assert.equal(queries.length, 0);
    assert.deepEqual(getCategoryExpenseTotalsGrouped({ ...query, categoryIds: undefined }, f.db), grouped);
  } finally { sqlite.close(); }
});

test("P3-05: Dashboard balances skip management scans and retain amounts", () => {
  const f = fixture();
  try {
    f.transaction("expense", "shopping", 200);
    const { getAccountsWithBalances } = require("@/modules/accounts");
    const { getAccountDynamicBalances, getDashboardSummary } = require("../repositories/dashboard.repository");
    queries = [];
    const baseline = getAccountsWithBalances(f.db);
    const managementCount = queries.length;
    queries = [];
    const lean = getAccountDynamicBalances(f.db);
    assert.ok(queries.length < managementCount);
    assert.deepEqual(lean, baseline.map(({ isDeletable, canChangeCurrency, ...account }) => account));
    queries = [];
    const summary = getDashboardSummary(f.db, f.date, { includeNetWorthHistory: false, includeRecentTransactions: false, includeCategoryBreakdown: false });
    assert.deepEqual(summary.accountsWithBalances, lean);
    assert.equal(typeof summary.currencyCode, "string");
    assert.ok(summary.currencyCode.length > 0);
    assert.equal(queries.filter(sql => sql.includes('from "accounts"')).length, 1, "Fetch account snapshot once");
    assert.ok(!queries.some(sql => sql.includes('from "schedules"')));
  } finally { sqlite.close(); }
});

test("D-F06: getDashboardSummary includes atomic currencyCode snapshot", () => {
  const f = fixture();
  try {
    const { getDashboardSummary } = require("../repositories/dashboard.repository");
    const summary = getDashboardSummary(f.db, f.date, { includeNetWorthHistory: false, includeRecentTransactions: false, includeCategoryBreakdown: false });
    assert.equal(typeof summary.currencyCode, "string");
    assert.ok(["PHP", "USD", "EUR"].includes(summary.currencyCode));
  } finally { sqlite.close(); }
});

test("D-F07: getMonthlyCashflow delegates to @/modules/transactions service and returns accurate cashflow", () => {
  const f = fixture();
  try {
    f.transaction("tx_inc", "shopping", -15000, { type: "income" });
    f.transaction("tx_exp", "shopping", 5000, { type: "expense" });
    const { getMonthlyCashflow: getDashboardCashflow } = require("../repositories/dashboard.repository");
    const { getMonthlyCashflow: getTxCashflow } = require("@/modules/transactions");

    const dashboardResult = getDashboardCashflow(f.db, f.date);
    const txResult = getTxCashflow(f.db, f.date);

    assert.deepEqual(dashboardResult, txResult);
    assert.equal(dashboardResult.totalInflowMinorUnits, 15000);
    assert.equal(dashboardResult.totalOutflowMinorUnits, 5000);
    assert.equal(dashboardResult.netSavingsMinorUnits, 10000);
    assert.equal(dashboardResult.savingsRatePercentage, 67);
  } finally { sqlite.close(); }
});
