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
    getScheduleBySubscriptionId: (...args) =>
      require("../../scheduled-transactions/repositories/scheduled-transactions.repository").findScheduleBySubscriptionId(...args),
    processDueSchedules: (...args) =>
      require("../../scheduled-transactions/services/process-due-schedules.service").processDueSchedules(...args),
    saveScheduledTransactionInContext: (...args) => require("../../scheduled-transactions/services/save-scheduled-transaction.service").saveScheduledTransactionInContext(...args),
    resolveScheduleOccurrencePaidInContext: (...args) =>
      require("../../scheduled-transactions/services/resolve-schedule-paid.service").resolveScheduleOccurrencePaidInContext(...args),
    setScheduledTransactionPaused() {},
    getScheduledTransaction: (...args) => require("../../scheduled-transactions/repositories/scheduled-transactions.repository").findScheduledTransaction(...args),
    restoreScheduledTransaction: (...args) =>
      require("../../scheduled-transactions/services/manage-scheduled-transaction.service").restoreScheduledTransaction(...args),
    removeScheduledTransaction: (...args) =>
      require("../../scheduled-transactions/services/manage-scheduled-transaction.service").removeScheduledTransaction(...args),
    unlinkScheduledTransactionSubscription: (...args) =>
      require("../../scheduled-transactions/services/manage-scheduled-transaction.service").unlinkScheduledTransactionSubscription(...args),
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


test("V2-01: automatic, Post Now and Mark Paid all debit the ledger; general refunds retain their sign", () => {
  const db = setupTestDb();
  try {
    const now = new Date();
    const { processDueSchedules, postScheduledOccurrence } = require('../../scheduled-transactions/services/process-due-schedules.service');
    for (const mode of ['auto', 'post', 'manual']) {
      const id = saveSubscriptionInContext(input({name: mode, accountId:'acc_1', categoryId:'cat_dining', autoPost:mode === 'auto', firstBillingDate:now}), undefined, db);
      if (mode === 'manual') recordSubscriptionPayment(id);
      else {
        processDueSchedules(new Date(now.getTime()+1000));
        if (mode === 'post') {
          const occurrence = sqlite.prepare("SELECT o.id FROM transaction_schedule_occurrences o JOIN transaction_schedules s ON s.id=o.schedule_id WHERE s.subscription_id=? AND o.status='due'").get(id);
          postScheduledOccurrence(occurrence.id);
        }
      }
      assert.equal(sqlite.prepare('SELECT amount_minor_units FROM transactions WHERE name=?').get(mode).amount_minor_units,-14900);
      assert.equal(sqlite.prepare('SELECT count(*) n FROM subscription_payments WHERE subscription_id=?').get(id).n,1);
      assert.ok(sqlite.prepare('SELECT next_renewal_date FROM subscriptions WHERE id=?').get(id).next_renewal_date > now.getTime());
    }
    const { createTransactionInContext } = require('../../transactions/services/create-transaction.service');
    const refund=createTransactionInContext({accountId:'acc_1',categoryId:'cat_dining',type:'expense',amountMinorUnits:10000,occurredAt:now},db,{reconcileBilling:false});
    assert.equal(refund.amountMinorUnits,10000);
  } finally { sqlite.close(); }
});

test("V2-01: migration repairs only linked future payments, preserves history and recovery evidence, and is idempotent", () => {
  const db=setupTestDb();
  try {
    const now=new Date();
    const id=saveSubscriptionInContext(input({accountId:'acc_1',categoryId:'cat_dining',firstBillingDate:now}),undefined,db);
    const schedule=sqlite.prepare('SELECT schedule_id FROM subscriptions WHERE id=?').get(id).schedule_id;
    const { processDueSchedules }=require('../../scheduled-transactions/services/process-due-schedules.service');
    processDueSchedules(new Date(now.getTime()+1000));
    sqlite.prepare('UPDATE transaction_schedules SET amount_minor_units=14900 WHERE id=?').run(schedule);
    sqlite.prepare("UPDATE transaction_schedule_occurrences SET template_snapshot=json_set(template_snapshot,'$.amountMinorUnits',14900) WHERE schedule_id=?").run(schedule);
    const { saveScheduledTransactionInContext }=require('../../scheduled-transactions/services/save-scheduled-transaction.service');
    const refund=saveScheduledTransactionInContext({transactionType:'expense',accountId:'acc_1',categoryId:'cat_dining',amountMinorUnits:10000,frequency:'once',intervalCount:1,startsAt:now,timeZone:'UTC',endMode:'never',weekendPolicy:'exact',autoPost:false},undefined,db);
    const due=sqlite.prepare("SELECT id FROM transaction_schedule_occurrences WHERE schedule_id=? AND status='due'").get(schedule);
    require('../../scheduled-transactions/services/process-due-schedules.service').postScheduledOccurrence(due.id);
    sqlite.prepare('UPDATE transactions SET amount_minor_units=14900 WHERE id=(SELECT transaction_id FROM subscription_payments WHERE subscription_id=?)').run(id);
    sqlite.prepare("DELETE FROM settings WHERE key='__subscription_payment_sign_repair_v1'").run();
    sqlite.prepare("INSERT INTO transaction_schedule_occurrences (id,schedule_id,sequence_number,nominal_due_at,template_snapshot,status,created_at,updated_at) VALUES ('pending-sign',?,99,?,?,'failed',?,?)").run(schedule,now.getTime()+86400000,JSON.stringify({transactionType:'expense',amountMinorUnits:14900}),now.getTime(),now.getTime());
    const postedSnapshot=sqlite.prepare("SELECT template_snapshot FROM transaction_schedule_occurrences WHERE schedule_id=? AND status='posted'").get(schedule).template_snapshot;
    const migration=fs.readFileSync(path.join(root,'../drizzle/0049_fix_subscription_schedule_payment_sign.sql'),'utf8');
    sqlite.exec(migration);
    const evidence=sqlite.prepare("SELECT value FROM settings WHERE key='__subscription_payment_sign_repair_v1'").get().value;
    assert.equal(sqlite.prepare('SELECT amount_minor_units FROM transaction_schedules WHERE id=?').get(schedule).amount_minor_units,-14900);
    assert.equal(sqlite.prepare('SELECT amount_minor_units FROM transaction_schedules WHERE id=?').get(refund.id).amount_minor_units,10000);
    assert.equal(sqlite.prepare('SELECT amount_minor_units FROM transactions').get().amount_minor_units,14900,'Historical records require review');
    assert.equal(JSON.parse(sqlite.prepare("SELECT template_snapshot FROM transaction_schedule_occurrences WHERE id='pending-sign'").get().template_snapshot).amountMinorUnits,-14900);
    assert.equal(sqlite.prepare("SELECT template_snapshot FROM transaction_schedule_occurrences WHERE schedule_id=? AND status='posted'").get(schedule).template_snapshot,postedSnapshot);
    const repairEvidence = JSON.parse(evidence);
    const postedPaymentsForReview =
      typeof repairEvidence.postedPaymentsForReview === "string"
        ? JSON.parse(repairEvidence.postedPaymentsForReview)
        : repairEvidence.postedPaymentsForReview;
    assert.equal(postedPaymentsForReview.length, 1);
    sqlite.exec(migration);
    assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='__subscription_payment_sign_repair_v1'").get().value,evidence);
  } finally { sqlite.close(); }
});

test("SUB-F01: note/name/amount edit preserves advanced renewal after early payment and preserves linked schedule", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    const firstBillingDate = new Date(2026, 11, 1);
    const id = saveSubscriptionInContext(
      input({
        name: "Spotify",
        amountMinorUnits: 14900,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate,
        accountId: "acc_1",
        categoryId: "cat_dining",
      }),
      undefined,
      db,
    );

    const initialSub = sqlite.prepare("SELECT next_renewal_date, schedule_id FROM subscriptions WHERE id = ?").get(id);
    assert.equal(initialSub.next_renewal_date, firstBillingDate.getTime());

    const payResult = recordSubscriptionPayment(id, { paidAt: fixedNow });
    const jan1 = new Date(2027, 0, 1);
    assert.equal(payResult.nextRenewalDate.getTime(), jan1.getTime());

    const paidSub = sqlite.prepare("SELECT next_renewal_date, schedule_id FROM subscriptions WHERE id = ?").get(id);
    assert.equal(paidSub.next_renewal_date, jan1.getTime());

    saveSubscriptionInContext(
      input({
        name: "Spotify Family",
        notes: "Paid early via GCash",
        amountMinorUnits: 14900,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate,
        accountId: "acc_1",
        categoryId: "cat_dining",
      }),
      id,
      db,
    );

    const afterEdit = sqlite.prepare("SELECT next_renewal_date, name, notes, schedule_id FROM subscriptions WHERE id = ?").get(id);
    assert.equal(afterEdit.next_renewal_date, jan1.getTime(), "Renewal date must be preserved at Jan 1, 2027 on note/name edit");
    assert.equal(afterEdit.name, "Spotify Family");
    assert.equal(afterEdit.notes, "Paid early via GCash");

    if (afterEdit.schedule_id) {
      const sched = sqlite.prepare("SELECT next_nominal_at FROM transaction_schedules WHERE id = ?").get(afterEdit.schedule_id);
      if (sched && sched.next_nominal_at) {
        assert.equal(sched.next_nominal_at, jan1.getTime(), "Linked schedule cursor must remain at Jan 1, 2027");
      }
    }

    const paymentCount = sqlite.prepare("SELECT count(*) as count FROM subscription_payments WHERE subscription_id = ?").get(id).count;
    assert.equal(paymentCount, 1);
  } finally { sqlite.close(); }
});

test("SUB-F01: overdue renewal is preserved on note-only edit without jumping forward", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    const overdueDate = new Date(2026, 10, 10);
    const id = saveSubscriptionInContext(
      input({
        name: "Gym",
        firstBillingDate: overdueDate,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        accountId: "acc_1",
        categoryId: "cat_dining",
        nextRenewalDate: overdueDate,
      }),
      undefined,
      db,
    );

    assert.equal(sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id).next_renewal_date, overdueDate.getTime());

    saveSubscriptionInContext(
      input({
        name: "Gym",
        notes: "Overdue reminder sent",
        firstBillingDate: overdueDate,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        accountId: "acc_1",
        categoryId: "cat_dining",
      }),
      id,
      db,
    );

    const after = sqlite.prepare("SELECT next_renewal_date, notes FROM subscriptions WHERE id = ?").get(id);
    assert.equal(after.next_renewal_date, overdueDate.getTime(), "Overdue renewal must remain Nov 10");
    assert.equal(after.notes, "Overdue reminder sent");
  } finally { sqlite.close(); }
});

test("SUB-F01: intentional recurrence edit updates next renewal date", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    const originalDate = new Date(2026, 11, 1);
    const id = saveSubscriptionInContext(
      input({
        firstBillingDate: originalDate,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        accountId: "acc_1",
        categoryId: "cat_dining",
      }),
      undefined,
      db,
    );

    const newDate = new Date(2026, 11, 15);
    saveSubscriptionInContext(
      input({
        firstBillingDate: newDate,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        accountId: "acc_1",
        categoryId: "cat_dining",
      }),
      id,
      db,
    );

    const after = sqlite.prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?").get(id);
    assert.equal(after.next_renewal_date, newDate.getTime(), "Intentional first billing date change must recalculate renewal");
  } finally { sqlite.close(); }
});

test("SUB-F02: restoring an archived subscription reactivates its linked schedule and restores a valid next nominal date", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    const firstBillingDate = new Date(2026, 10, 26);
    const id = saveSubscriptionInContext(
      input({
        name: "Netflix",
        amountMinorUnits: 54900,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate,
        accountId: "acc_1",
        categoryId: "cat_dining",
        autoPost: false,
      }),
      undefined,
      db,
    );

    const sub = sqlite.prepare("SELECT schedule_id FROM subscriptions WHERE id = ?").get(id);
    assert.ok(sub.schedule_id, "Linked schedule must be created");

    // Generate due occurrence and post it to establish schedule posting history
    const { processDueSchedules } = require("../../scheduled-transactions/services/process-due-schedules.service");
    processDueSchedules(fixedNow);

    const payResult = recordSubscriptionPayment(id, { paidAt: fixedNow });
    assert.ok(payResult.transactionId);

    // Archive the subscription
    const { deleteOrArchiveSubscriptionInContext, restoreSubscriptionInContext } = require("../services/delete-subscription.service");
    const archiveResult = deleteOrArchiveSubscriptionInContext(id, db);
    assert.equal(archiveResult, "archived");

    // Verify both subscription and schedule are archived with null next date
    const archivedSub = sqlite.prepare("SELECT archived_at FROM subscriptions WHERE id = ?").get(id);
    assert.ok(archivedSub.archived_at !== null, "Subscription must be archived");

    const archivedSched = sqlite.prepare("SELECT status, archived_at, next_nominal_at FROM transaction_schedules WHERE id = ?").get(sub.schedule_id);
    assert.ok(archivedSched.archived_at !== null, "Linked schedule must be archived");
    assert.equal(archivedSched.next_nominal_at, null, "Archived schedule has null next_nominal_at");

    // Restore the subscription
    restoreSubscriptionInContext(id, db);

    // Verify subscription is restored
    const restoredSub = sqlite.prepare("SELECT status, archived_at FROM subscriptions WHERE id = ?").get(id);
    assert.equal(restoredSub.archived_at, null, "Subscription archived_at must be cleared");
    assert.equal(restoredSub.status, "active");

    // Verify linked schedule is restored with valid next date
    const restoredSched = sqlite.prepare("SELECT status, archived_at, next_nominal_at, next_effective_at FROM transaction_schedules WHERE id = ?").get(sub.schedule_id);
    assert.equal(restoredSched.archived_at, null, "Linked schedule archived_at must be cleared");
    assert.equal(restoredSched.status, "active", "Linked schedule status must be active");
    assert.ok(restoredSched.next_nominal_at !== null, "Linked schedule next_nominal_at must NOT be null");
    assert.ok(restoredSched.next_effective_at !== null, "Linked schedule next_effective_at must NOT be null");

    // Next nominal date should be Dec 26, 2026 (1 month after Nov 26 payment)
    const expectedNext = new Date(2026, 11, 26);
    assert.equal(new Date(restoredSched.next_nominal_at).toDateString(), expectedNext.toDateString());
  } finally { sqlite.close(); }
});

test("SUB-F03: trial subscription delays charging until trialEndsAt, reports correct countdown, and activates upon first billing", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    const trialStartsAt = new Date(2026, 10, 26);
    const trialEndsAt = new Date(2026, 11, 10);
    const id = saveSubscriptionInContext(
      input({
        name: "Apple Music",
        status: "trial",
        amountMinorUnits: 14900,
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate: trialStartsAt,
        trialEndsAt,
        accountId: "acc_1",
        categoryId: "cat_dining",
        autoPost: true,
      }),
      undefined,
      db,
    );

    const subRecord = sqlite.prepare("SELECT status, next_renewal_date, trial_ends_at, schedule_id FROM subscriptions WHERE id = ?").get(id);
    assert.equal(subRecord.status, "trial");
    assert.equal(subRecord.next_renewal_date, trialEndsAt.getTime(), "Subscription renewal must be trialEndsAt");

    const schedRecord = sqlite.prepare("SELECT starts_at, next_nominal_at FROM transaction_schedules WHERE id = ?").get(subRecord.schedule_id);
    assert.equal(schedRecord.starts_at, trialEndsAt.getTime(), "Schedule starts_at must be trialEndsAt");
    assert.equal(schedRecord.next_nominal_at, trialEndsAt.getTime(), "Schedule next_nominal_at must be trialEndsAt");

    const { findSubscriptionById } = require("../repositories/subscriptions.repository");
    const mapped = findSubscriptionById(id, db);
    assert.equal(mapped.daysUntilRenewal, 14, "Countdown must show 14 days left until trial ends");
    assert.equal(mapped.isOverdue, false);

    const { processDueSchedules } = require("../../scheduled-transactions/services/process-due-schedules.service");
    processDueSchedules(fixedNow);

    const txCount = sqlite.prepare("SELECT count(*) as count FROM transactions").get().count;
    assert.equal(txCount, 0, "No transactions should be created during the free trial");
    const payCount = sqlite.prepare("SELECT count(*) as count FROM subscription_payments").get().count;
    assert.equal(payCount, 0, "No subscription payments should be recorded during the free trial");

    const trialEndNow = new Date(2026, 11, 10, 12, 0, 0);
    t.mock.timers.tick(trialEndNow.getTime() - fixedNow.getTime());
    processDueSchedules(trialEndNow);

    const afterTxCount = sqlite.prepare("SELECT count(*) as count FROM transactions").get().count;
    assert.equal(afterTxCount, 1, "Exactly one transaction created when trial expires");

    const afterSub = sqlite.prepare("SELECT status, next_renewal_date FROM subscriptions WHERE id = ?").get(id);
    assert.equal(afterSub.status, "active", "Status must transition from trial to active after first billing");
    const expectedNextRenewal = new Date(2027, 0, 10);
    assert.equal(new Date(afterSub.next_renewal_date).toDateString(), expectedNextRenewal.toDateString());

    const afterSched = sqlite.prepare("SELECT status, next_nominal_at FROM transaction_schedules WHERE id = ?").get(subRecord.schedule_id);
    assert.equal(afterSched.status, "active");
    assert.equal(new Date(afterSched.next_nominal_at).toDateString(), expectedNextRenewal.toDateString());
  } finally { sqlite.close(); }
});

test("SUB-F04: subscription linked to account inherits account currency; manual and scheduled payments debit identical amounts", t => {
  const fixedNow = new Date(2026, 10, 26, 12, 0, 0);
  t.mock.timers.enable({ apis: ["Date"], now: fixedNow.getTime() });
  const db = setupTestDb();
  try {
    // 1. Create a subscription linked to acc_1 (PHP currency), but passing USD currency in input
    const subId = saveSubscriptionInContext(
      input({
        name: "Netflix Premium",
        amountMinorUnits: 1500, // 15.00
        currencyCode: "USD",
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate: new Date(2026, 10, 26),
        accountId: "acc_1",
        categoryId: "cat_dining",
        autoPost: false,
      }),
      undefined,
      db,
    );

    // Verify subscription inherited PHP currency from acc_1
    const subRow = sqlite.prepare("SELECT currency_code, amount_minor_units, schedule_id FROM subscriptions WHERE id = ?").get(subId);
    assert.equal(subRow.currency_code, "PHP", "Subscription must inherit account's PHP currency");
    assert.equal(subRow.amount_minor_units, 1500);

    // Verify linked schedule also has PHP currency and identical magnitude
    const schedRow = sqlite.prepare("SELECT currency_code, amount_minor_units FROM transaction_schedules WHERE id = ?").get(subRow.schedule_id);
    assert.equal(schedRow.currency_code, "PHP", "Schedule must inherit account's PHP currency");
    assert.equal(schedRow.amount_minor_units, -1500);

    // 2. Perform manual payment ("Mark Paid")
    const manualResult = recordSubscriptionPayment(subId);
    const manualTx = sqlite.prepare("SELECT amount_minor_units, currency_code FROM transactions WHERE id = ?").get(manualResult.transactionId);
    assert.equal(manualTx.currency_code, "PHP", "Manual payment must be debited in PHP");
    assert.equal(manualTx.amount_minor_units, -1500, "Manual payment magnitude must be -1500 (-15.00 PHP)");

    // 3. Create a second subscription with autoPost: true to test scheduled payment parity
    const schedSubId = saveSubscriptionInContext(
      input({
        name: "Spotify Duo",
        amountMinorUnits: 1500, // 15.00
        currencyCode: "USD",
        billingCycle: "monthly",
        billingCycleInterval: 1,
        firstBillingDate: new Date(2026, 10, 26),
        accountId: "acc_1",
        categoryId: "cat_dining",
        autoPost: true,
      }),
      undefined,
      db,
    );

    const { processDueSchedules } = require("../../scheduled-transactions/services/process-due-schedules.service");
    processDueSchedules(fixedNow);

    // Find transaction generated by the auto-post schedule
    const autoTx = sqlite.prepare(
      "SELECT amount_minor_units, currency_code FROM transactions WHERE name = 'Spotify Duo'"
    ).get();
    assert.ok(autoTx, "Scheduled auto-post transaction must be created");
    assert.equal(autoTx.currency_code, "PHP", "Scheduled payment must be debited in PHP");
    assert.equal(autoTx.amount_minor_units, -1500, "Scheduled payment magnitude must be -1500 (-15.00 PHP)");

    // 4. Verify 100% parity: manual payment delta equals scheduled payment delta
    assert.equal(
      manualTx.amount_minor_units,
      autoTx.amount_minor_units,
      "Manual and scheduled payment magnitudes must be exactly identical",
    );
    assert.equal(
      manualTx.currency_code,
      autoTx.currency_code,
      "Manual and scheduled payment currencies must be exactly identical",
    );
  } finally { sqlite.close(); }
});
