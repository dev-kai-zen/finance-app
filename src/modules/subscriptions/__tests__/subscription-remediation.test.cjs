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

// Exercise the real subscription repositories, category fallback, ledger writes, and transactions.
// Scheduling is independent of the cases below (the subscriptions have no linked schedule).
const loadWithNativeMocks = Module._load;
Module._load = function (request, ...args) {
  if (request === "@/modules/scheduled-transactions") return {
    getScheduleBySubscriptionId: () => null,
    processDueSchedules() {},
  };
  if (request === "@/modules/transactions") return {
    recordTransactionInContext(command, context) {
      return require("../../transactions/services/create-transaction.service").createTransactionInContext(command.input, context, { reconcileBilling: false });
    },
  };
  return loadWithNativeMocks.call(this, request, ...args);
};
const { saveSubscriptionInContext } = require("../services/save-subscription.service");
const { recordSubscriptionPayment } = require("../services/record-subscription-payment.service");
const { subscriptionFormSchema } = require("../schemas/subscription.schema");
const { DEFAULT_OTHERS_CATEGORY_IDS } = require("../../categories/constants/categories.constants");

function input(overrides = {}) {
  return { name: "Service", amountMinorUnits: 14900, currencyCode: "PHP", billingCycle: "monthly",
    status: "active", firstBillingDate: new Date(2026, 10, 21), ...overrides };
}

test("P2-05: zero and invalid renewal costs fail schema and service validation before SQL, including trials", () => {
  const db = setupTestDb();
  try {
    for (const status of ["active", "trial"]) {
      for (const amountMinorUnits of [0, -100, 1.5, NaN, Infinity]) {
        const value = input({ status, amountMinorUnits });
        assert.equal(subscriptionFormSchema.safeParse(value).success, false);
        queries = [];
        assert.throws(() => saveSubscriptionInContext(value, undefined, db));
        assert.equal(queries.length, 0, "Invalid amounts must not perform reads or writes");
      }
    }
  } finally { sqlite.close(); }
});

test("P2-05: today's midnight remains due today for all billing cycles; past dates advance to today", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 15, 30).getTime() });
  const db = setupTestDb();
  try {
    for (const billingCycle of ["weekly", "monthly", "quarterly", "semi_annual", "yearly"]) {
      const firstBillingDate = new Date(2026, 10, 21);
      const id = saveSubscriptionInContext(input({ billingCycle, firstBillingDate }), undefined, db);
      assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id).next_renewal_date, firstBillingDate.getTime());
    }
    const id = saveSubscriptionInContext(input({ firstBillingDate: new Date(2026, 9, 21) }), undefined, db);
    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id).next_renewal_date, new Date(2026, 10, 21).getTime());
    const future = new Date(2026, 11, 15);
    const futureId = saveSubscriptionInContext(input({ firstBillingDate: future }), undefined, db);
    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(futureId).next_renewal_date, future.getTime());
    const explicit = new Date(2026, 11, 1);
    const explicitId = saveSubscriptionInContext(input({ nextRenewalDate: explicit }), undefined, db);
    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(explicitId).next_renewal_date, explicit.getTime());
  } finally { sqlite.close(); }
});

test("P2-05: editing preserves the original creation timestamp", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const db = setupTestDb();
  try {
    const id = saveSubscriptionInContext(input(), undefined, db);
    const before = sqlite.prepare("SELECT created_at FROM subscriptions WHERE id = ?").get(id).created_at;
    t.mock.timers.tick(86400000);
    saveSubscriptionInContext(input({ name: "Updated", amountMinorUnits: 19900 }), id, db);
    const after = sqlite.prepare("SELECT created_at, updated_at, name FROM subscriptions WHERE id = ?").get(id);
    assert.equal(after.created_at, before);
    assert.ok(after.updated_at > before);
    assert.equal(after.name, "Updated");
  } finally { sqlite.close(); }
});

test("P2-05: deleting a linked category still permits an atomic payment using the default expense category", () => {
  const db = setupTestDb();
  try {
    const now = Date.now();
    const preferred = DEFAULT_OTHERS_CATEGORY_IDS.expense;
    sqlite.prepare("INSERT OR IGNORE INTO categories (id, name, type, created_at, updated_at) VALUES (?, 'Other Expenses', 'expense', ?, ?)").run(preferred, now, now);
    const id = saveSubscriptionInContext(input({ categoryId: "cat_dining" }), undefined, db);
    sqlite.prepare("UPDATE subscriptions SET account_id = 'acc_1' WHERE id = ?").run(id);
    sqlite.prepare("DELETE FROM categories WHERE id = 'cat_dining'").run();
    assert.equal(sqlite.prepare("SELECT category_id FROM subscriptions WHERE id = ?").get(id).category_id, null);
    const result = recordSubscriptionPayment(id);
    const ledger = sqlite.prepare("SELECT * FROM transactions WHERE id = ?").get(result.transactionId);
    assert.equal(ledger.category_id, preferred);
    assert.equal(ledger.amount_minor_units, -14900);
    assert.equal(sqlite.prepare("SELECT category_id FROM subscriptions WHERE id = ?").get(id).category_id, preferred);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM subscription_payments WHERE subscription_id = ?").get(id).n, 1);
    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id).next_renewal_date, result.nextRenewalDate.getTime());
  } finally { sqlite.close(); }
});

test("P2-05: missing default uses another expense category; no expense category aborts without a payment", () => {
  const db = setupTestDb();
  try {
    sqlite.prepare("DELETE FROM categories WHERE id = ?").run(DEFAULT_OTHERS_CATEGORY_IDS.expense);
    const id = saveSubscriptionInContext(input(), undefined, db);
    sqlite.prepare("UPDATE subscriptions SET account_id = 'acc_1' WHERE id = ?").run(id);
    const result = recordSubscriptionPayment(id);
    const category = sqlite.prepare("SELECT c.type FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?").get(result.transactionId);
    assert.equal(category.type, "expense");
    const other = saveSubscriptionInContext(input(), undefined, db);
    sqlite.prepare("UPDATE subscriptions SET account_id = 'acc_1' WHERE id = ?").run(other);
    sqlite.exec("DELETE FROM subscription_payments; DELETE FROM transactions; UPDATE subscriptions SET category_id = NULL; DELETE FROM categories WHERE type = 'expense';");
    const before = sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(other).next_renewal_date;
    assert.throws(() => recordSubscriptionPayment(other), /Create an expense category/);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM subscription_payments").get().n, 0);
    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(other).next_renewal_date, before);
  } finally { sqlite.close(); }
});

test("P2-05: failed payment audit rolls back ledger, fallback category and renewal", () => {
  const db = setupTestDb();
  try {
    const id = saveSubscriptionInContext(input(), undefined, db);
    sqlite.prepare("UPDATE subscriptions SET account_id = 'acc_1' WHERE id = ?").run(id);
    const before = sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id).next_renewal_date;
    sqlite.exec("CREATE TRIGGER reject_subscription_payment BEFORE INSERT ON subscription_payments BEGIN SELECT RAISE(ABORT, 'audit failed'); END;");
    assert.throws(() => recordSubscriptionPayment(id), /audit failed/);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    const after = sqlite.prepare("SELECT next_renewal_date, category_id FROM subscriptions WHERE id = ?").get(id);
    assert.equal(after.next_renewal_date, before);
    assert.equal(after.category_id, null);
    const { getDefaultExpenseCategoryId } = require("@/modules/categories");
    sqlite.prepare("DELETE FROM categories WHERE id = ?").run(DEFAULT_OTHERS_CATEGORY_IDS.expense);
    queries = [];
    assert.ok(getDefaultExpenseCategoryId(db));
    assert.equal(queries.length, 2, "One preferred-ID probe and one bounded fallback probe");
    const fallback = queries.find(query => query.includes('where "categories"."type" = ?'));
    assert.ok(fallback.includes("limit ?"));
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + fallback).all("expense", 1);
    assert.ok(plan.some(row => row.detail.includes("categories_type_index")));
    assert.ok(plan.every(row => !row.detail.includes("TEMP B-TREE")));
  } finally { sqlite.close(); }
});

test("P2-05: legacy zero-cost subscriptions fail payment validation without writing ledger or audit rows", () => {
  const db = setupTestDb();
  try {
    const id = saveSubscriptionInContext(input(), undefined, db);
    sqlite.prepare("UPDATE subscriptions SET account_id = 'acc_1', amount_minor_units = 0 WHERE id = ?").run(id);
    assert.throws(() => recordSubscriptionPayment(id), /greater than zero/);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM subscription_payments").get().n, 0);
  } finally { sqlite.close(); }
});
