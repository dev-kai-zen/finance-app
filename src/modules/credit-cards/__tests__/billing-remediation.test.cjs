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

const {
  reconcileCreditCardBilling,
  reconcileCreditCardBillingInContext,
  ensureCreditCardBillingReconciled,
  invalidateCreditCardReconciliationCache,
} = require("../services/reconcile-credit-card-billing.service");
const { getCreditCardMonitoring } = require("../services/get-credit-card-monitoring.service");
const { checkCreditLimitExceeded } = require("../services/check-credit-limit-exceeded.service");
const { createCreditCardInstallmentPlan } = require("../services/create-installment-plan.service");
const { createTransaction, createTransfer, getTransactionsByIds, removeTransaction, restoreTransaction, updateTransaction } = require("@/modules/transactions");
function fixture() {
  const db = setupTestDb();
  const today = new Date(2026, 10, 21, 12);
  const occurred = new Date(2026, 10, 5, 12).getTime();
  sqlite.prepare("INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, created_at, updated_at) VALUES ('card', 'system:liability:credit-card', 'Test Card', 'PHP', 0, ?, ?, ?)").run(occurred, occurred, occurred);
  sqlite.exec("INSERT INTO credit_card_details (account_id, credit_limit_minor_units, statement_day, payment_due_day) VALUES ('card', 5000000, 10, 25)");
  function charge(id, amount, type = "expense") {
    sqlite.prepare("INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES (?, 'card', 'cat_dining', ?, ?, ?, ?, ?, ?)")
      .run(id, type, amount, id, occurred, occurred, occurred);
  }
  function reconcile() { db.transaction(context => reconcileCreditCardBillingInContext(today, context)); }
  function monitor() { return getCreditCardMonitoring(today).cards.find(card => card.accountId === "card" || card.id === "card"); }
  function statement() { return sqlite.prepare("SELECT * FROM credit_card_statements WHERE account_id = 'card' AND kind = 'billing_cycle'").get(); }
  return { db, today, occurred, charge, reconcile, monitor, statement };
}

test("P2-08: billed charge edits adjust issued/remaining balances and displayed items exactly once", () => {
  const f = fixture();
  try {
    f.charge("edited", -100000); f.charge("other", -50000); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 150000);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -300000 WHERE id = 'edited'");
    f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 350000);
    const card = f.monitor();
    assert.ok(card);
    assert.equal(card.billedMinorUnits, 350000);
    assert.equal(card.billedItems.find(item => item.description === "edited").amountMinorUnits, 300000);
    const count = sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n;
    f.reconcile();
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n, count);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -200000 WHERE id = 'edited'"); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 250000);
    assert.equal(f.monitor().billedMinorUnits, 250000);
  } finally { sqlite.close(); }
});

test("P2-08: delete, edit in Trash, and restore retain accurate balances and hide deleted billed items", () => {
  const f = fixture();
  try {
    f.charge("deleted", -100000); f.charge("visible", -50000); f.reconcile();
    sqlite.prepare("UPDATE transactions SET deleted_at = ? WHERE id = 'deleted'").run(f.occurred);
    f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 50000);
    assert.equal(f.monitor().billedMinorUnits, 50000);
    assert.deepEqual(f.monitor().billedItems.map(item => item.description), ["visible"]);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -300000 WHERE id = 'deleted'"); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 50000);
    sqlite.exec("UPDATE transactions SET deleted_at = NULL WHERE id = 'deleted'"); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 350000);
    assert.equal(f.monitor().billedItems.find(item => item.description === "deleted").amountMinorUnits, 300000);
    const before = sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n;
    f.reconcile(); assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n, before);
  } finally { sqlite.close(); }
});

test("P2-08: charge adjustments preserve allocated payments; payment reversals do not inflate issued charges", () => {
  const f = fixture();
  try {
    f.charge("charge", -100000); f.charge("other", -50000); f.charge("payment", 40000, "transfer"); f.reconcile();
    assert.equal(f.monitor().billedMinorUnits, 110000);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -300000 WHERE id = 'charge'"); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 350000);
    assert.equal(f.monitor().billedMinorUnits, 310000);
    sqlite.prepare("UPDATE transactions SET deleted_at = ? WHERE id = 'payment'").run(f.occurred); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 350000);
    assert.equal(f.monitor().billedMinorUnits, 350000);
  } finally { sqlite.close(); }
});

test("P2-08: installment entries remain scheduled amounts and disappear when their purchase is deleted", () => {
  const f = fixture();
  try {
    f.charge("purchase", -120000); f.charge("other", -50000);
    sqlite.prepare("INSERT INTO credit_card_installment_plans (id, account_id, purchase_transaction_id, term_months, principal_minor_units, first_statement_on, status, created_at, updated_at) VALUES ('plan', 'card', 'purchase', 3, 120000, '2026-11-10', 'active', ?, ?)").run(f.occurred, f.occurred);
    sqlite.prepare("INSERT INTO credit_card_installments (id, plan_id, installment_number, scheduled_statement_on, principal_minor_units, created_at) VALUES ('installment', 'plan', 1, '2026-11-10', 40000, ?)").run(f.occurred);
    f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 90000);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -150000 WHERE id = 'purchase'"); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 90000, "Do not bill the entire installment purchase");
    sqlite.prepare("UPDATE transactions SET deleted_at = ? WHERE id = 'purchase'").run(f.occurred); f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 50000);
    assert.equal(f.monitor().billedItems.length, 1);
  } finally { sqlite.close(); }
});

test("P2-08: repeat reconciliation uses bounded reads for already billed charges and remains write-free", () => {
  const f = fixture();
  try {
    f.charge("first", -100); f.reconcile();
    queries = []; f.reconcile(); const baseline = queries.length;
    for (let index = 0; index < 1000; index++) f.charge("bulk_" + index, -100);
    f.reconcile();
    queries = []; f.reconcile();
    assert.ok(queries.length <= baseline + 2, "Read count must not grow per billed charge: " + queries.length + " vs " + baseline);
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)/i.test(query)), "Idempotent reconciliation writes nothing");
    const entryQuery = queries.find(query => query.includes('from "credit_card_statement_entries"'));
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + entryQuery).all(f.statement().id);
    assert.ok(plan.some(row => row.detail.includes("credit_card_statement_entries_statement_index")));
  } finally { sqlite.close(); }
});

test("P2-08: charge edit and billing adjustment roll back together if an adjustment write fails", () => {
  const f = fixture();
  try {
    f.charge("charge", -100000); f.reconcile();
    sqlite.exec("CREATE TRIGGER fail_adjustment BEFORE INSERT ON credit_card_statement_entries WHEN NEW.entry_type = 'adjustment' BEGIN SELECT RAISE(ABORT, 'adjustment failed'); END;");
    assert.throws(() => f.db.transaction(context => {
      sqlite.exec("UPDATE transactions SET amount_minor_units = -300000 WHERE id = 'charge'");
      reconcileCreditCardBillingInContext(f.today, context);
    }), /adjustment failed/);
    assert.equal(sqlite.prepare("SELECT amount_minor_units FROM transactions WHERE id = 'charge'").get().amount_minor_units, -100000);
    assert.equal(f.statement().issued_amount_minor_units, 100000);
  } finally { sqlite.close(); }
});

test("P2-08: statement-entry hydration chunks IDs at 500 while retaining date order", () => {
  const f = fixture();
  try {
    const ids = [];
    const insertStatement = sqlite.prepare("INSERT INTO credit_card_statements (id, account_id, kind, cycle_start_on, cycle_end_on, statement_on, due_on, created_at, updated_at) VALUES (?, 'card', 'billing_cycle', ?, ?, ?, ?, ?, ?)");
    const insertEntry = sqlite.prepare("INSERT INTO credit_card_statement_entries (id, statement_id, entry_type, amount_minor_units, occurred_on_snapshot, created_at) VALUES (?, ?, 'opening_balance', 1, ?, ?)");
    for (let i = 0; i < 501; i++) {
      const date = new Date(2020, 0, 1 + i).toISOString().slice(0, 10);
      const id = 'statement_' + i; ids.push(id);
      insertStatement.run(id, date, date, date, date, f.occurred + i, f.occurred + i);
      insertEntry.run('entry_' + i, id, date, f.occurred + i);
    }
    const { listEntriesForStatements } = require("../repositories/credit-card-billing.repository");
    queries = [];
    assert.equal(listEntriesForStatements([], f.db).length, 0);
    assert.equal(queries.length, 0);
    const entries = listEntriesForStatements([...ids].reverse(), f.db);
    assert.equal(queries.length, 2);
    assert.ok(queries.every(query => (query.match(/\?/g) ?? []).length <= 500));
    assert.deepEqual(entries.map(entry => entry.id), ids.map((_, i) => 'entry_' + i));
  } finally { sqlite.close(); }
});

test("B03: reducing card payment creates adjustment releasing excess allocation and restores remaining statement balance", () => {
  const f = fixture();
  try {
    f.charge("charge_1", -100000); // ₱1,000 billed charge
    f.charge("payment_1", 100000, "transfer"); // ₱1,000 payment
    f.reconcile();

    // Statement should be fully paid (remaining = 0)
    assert.equal(f.statement().issued_amount_minor_units, 100000);
    assert.equal(f.monitor().billedMinorUnits, 0, "Billed remaining should be 0 when fully paid");

    // Reduce payment from 100,000 to 50,000
    sqlite.exec("UPDATE transactions SET amount_minor_units = 50000 WHERE id = 'payment_1'");
    f.reconcile();

    // Now remaining billed amount must be 50,000!
    assert.equal(f.statement().issued_amount_minor_units, 100000, "Issued charges remain 100,000");
    assert.equal(f.monitor().billedMinorUnits, 50000, "Billed remaining must reflect the unpaid 50,000");

    // Check statement entries:
    // 1 charge (100,000), 1 payment (-100,000), 1 adjustment (+50,000)
    const entries = sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE transaction_id = 'payment_1'").all();
    assert.equal(entries.length, 2, "Payment should have original entry and adjustment entry");
    const adjustment = entries.find(e => e.entry_type === "adjustment");
    assert.ok(adjustment, "Adjustment entry must be created");
    assert.equal(adjustment.amount_minor_units, 50000, "Adjustment must release excess 50,000");

    // Re-increase payment from 50,000 to 80,000
    sqlite.exec("UPDATE transactions SET amount_minor_units = 80000 WHERE id = 'payment_1'");
    f.reconcile();
    assert.equal(f.monitor().billedMinorUnits, 20000, "Remaining billed balance must decrease to 20,000");

    // Repeat reconciliation must be idempotent
    const entryCount = sqlite.prepare("SELECT count(*) as c FROM credit_card_statement_entries").get().c;
    f.reconcile();
    assert.equal(sqlite.prepare("SELECT count(*) as c FROM credit_card_statement_entries").get().c, entryCount, "Reconciliation must be idempotent");
  } finally { sqlite.close(); }
});

test("B03: multi-statement payment reduction unwinds allocations LIFO from newest to oldest statement", () => {
  const f = fixture();
  try {
    const oct5 = new Date(2026, 9, 5, 12).getTime();
    const nov5 = new Date(2026, 10, 5, 12).getTime();

    // Oct 10 statement charge: ₱400 (40,000 minor units)
    sqlite.prepare("INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES ('charge_oct', 'card', 'cat_dining', 'expense', -40000, 'Oct Dinner', ?, ?, ?)")
      .run(oct5, oct5, oct5);

    // Nov 10 statement charge: ₱600 (60,000 minor units)
    sqlite.prepare("INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES ('charge_nov', 'card', 'cat_dining', 'expense', -60000, 'Nov Groceries', ?, ?, ?)")
      .run(nov5, nov5, nov5);

    // Payment of ₱1,000 (100,000 minor units) on Nov 15
    f.charge("payment_100k", 100000, "transfer");
    f.reconcile();

    // Verify both statements exist and are fully paid
    const statements = sqlite.prepare("SELECT * FROM credit_card_statements WHERE account_id = 'card' AND kind = 'billing_cycle' ORDER BY statement_on ASC").all();
    assert.equal(statements.length, 2, "Two statements should exist (Oct and Nov)");
    assert.equal(f.monitor().billedMinorUnits, 0, "Both statements fully paid");

    // Reduce payment from 100,000 to 50,000
    sqlite.exec("UPDATE transactions SET amount_minor_units = 50000 WHERE id = 'payment_100k'");
    f.reconcile();

    // Check each statement's remaining balance:
    // Oct statement (older, 40,000) should remain 0 remaining (fully paid)
    // Nov statement (newer, 60,000) should have released 50,000, so remaining is 50,000
    const entries = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY created_at ASC").all();
    const octEntries = entries.filter(e => e.statement_id === statements[0].id);
    const novEntries = entries.filter(e => e.statement_id === statements[1].id);

    const octRemaining = octEntries.reduce((sum, e) => sum + e.amount_minor_units, 0);
    const novRemaining = novEntries.reduce((sum, e) => sum + e.amount_minor_units, 0);

    assert.equal(octRemaining, 0, "Older Oct statement must remain fully paid");
    assert.equal(novRemaining, 50000, "Newer Nov statement must have released 50,000 excess payment");
    assert.equal(f.monitor().billedMinorUnits, 50000, "Total billed remaining across card must be 50,000");
  } finally { sqlite.close(); }
});

test("B04: moving billed charge from credit card to cash reverses charge from old statement", () => {
  const f = fixture();
  try {
    f.charge("charge_stay", -30000); // ₱300 that stays
    f.charge("charge_move", -70000); // ₱700 that will move to cash ('acc_1')
    f.reconcile();

    // Statement issued amount should be 100,000 (30k + 70k)
    assert.equal(f.statement().issued_amount_minor_units, 100000);
    assert.equal(f.monitor().billedMinorUnits, 100000);

    // Now edit charge_move to change its account to Cash ('acc_1')
    sqlite.exec("UPDATE transactions SET account_id = 'acc_1' WHERE id = 'charge_move'");
    f.reconcile();

    // The old card statement must now only bill 30,000!
    assert.equal(f.statement().issued_amount_minor_units, 30000, "Old statement must adjust down to 30,000");
    assert.equal(f.monitor().billedMinorUnits, 30000, "Card monitor billed amount must be 30,000");

    // The moved charge should not appear in the card's billed items
    const billedItems = f.monitor().billedItems;
    assert.equal(billedItems.length, 1, "Only charge_stay should remain in billed items");
    assert.equal(billedItems[0].description, "charge_stay");

    // Moving it back to the card restores it on the statement
    sqlite.exec("UPDATE transactions SET account_id = 'card' WHERE id = 'charge_move'");
    f.reconcile();
    assert.equal(f.statement().issued_amount_minor_units, 100000, "Moving back restores charge on statement");
    assert.equal(f.monitor().billedMinorUnits, 100000);

    // Moving from Card 1 to Card 2:
    sqlite.prepare("INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, created_at, updated_at) VALUES ('card_2', 'system:liability:credit-card', 'Test Card 2', 'PHP', 0, ?, ?, ?)").run(f.occurred, f.occurred, f.occurred);
    sqlite.exec("INSERT INTO credit_card_details (account_id, credit_limit_minor_units, statement_day, payment_due_day) VALUES ('card_2', 5000000, 10, 25)");

    sqlite.exec("UPDATE transactions SET account_id = 'card_2' WHERE id = 'charge_move'");
    f.reconcile();

    // Card 1 statement must only bill 30,000
    assert.equal(f.statement().issued_amount_minor_units, 30000, "Card 1 statement must adjust down to 30,000");
    // Card 2 statement must now bill 70,000
    const card2Statement = sqlite.prepare("SELECT * FROM credit_card_statements WHERE account_id = 'card_2' AND kind = 'billing_cycle'").get();
    assert.ok(card2Statement, "Card 2 statement should be created");
    assert.equal(card2Statement.issued_amount_minor_units, 70000, "Card 2 statement must bill the moved 70,000");
  } finally { sqlite.close(); }
});

function expectedCreditLimit(overrides = {}) {
  return {
    hasCreditCard: true,
    accountName: "Test Card",
    currencyCode: "PHP",
    creditLimitMinorUnits: 5000000,
    currentOutstandingMinorUnits: 0,
    additionalExpenseMinorUnits: 4000000,
    newOutstandingMinorUnits: 4000000,
    availableLimitBeforeMinorUnits: 5000000,
    availableLimitAfterMinorUnits: 1000000,
    exceeds: false,
    exceededByMinorUnits: 0,
    ...overrides,
  };
}

test("CC-F01: billed edits replace the old expense for unchanged, increased, and reduced amounts", () => {
  const f = fixture();
  try {
    f.charge("billed", -4000000);
    f.reconcile();
    for (const [amount, expected] of [
      [4000000, expectedCreditLimit()],
      [6000000, expectedCreditLimit({ additionalExpenseMinorUnits: 6000000, newOutstandingMinorUnits: 6000000, availableLimitAfterMinorUnits: 0, exceeds: true, exceededByMinorUnits: 1000000 })],
      [3000000, expectedCreditLimit({ additionalExpenseMinorUnits: 3000000, newOutstandingMinorUnits: 3000000, availableLimitAfterMinorUnits: 2000000 })],
    ]) {
      assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: amount, excludeTransactionId: "billed", occurredAt: f.today }), expected);
    }
  } finally { sqlite.close(); }
});

test("CC-F01: unbilled edits and purchases on another account do not duplicate ledger effects", () => {
  const f = fixture();
  try {
    f.charge("unbilled", -4000000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    f.charge("other_account", -9000000);
    sqlite.exec("UPDATE transactions SET account_id = 'acc_1' WHERE id = 'other_account'");
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 4000000, excludeTransactionId: "unbilled", occurredAt: f.today }), expectedCreditLimit());
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 1000000, excludeTransactionId: "other_account", occurredAt: f.today }), expectedCreditLimit({ currentOutstandingMinorUnits: 4000000, additionalExpenseMinorUnits: 1000000, newOutstandingMinorUnits: 5000000, availableLimitBeforeMinorUnits: 1000000, availableLimitAfterMinorUnits: 0 }));
  } finally { sqlite.close(); }
});

test("CC-F01: unused prepayment offsets the proposed expense before debt is clamped", () => {
  const f = fixture();
  try {
    sqlite.exec("UPDATE credit_card_details SET credit_limit_minor_units = 100000 WHERE account_id = 'card'");
    f.charge("prepayment", 100000, "transfer");
    f.reconcile();
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 150000 }), expectedCreditLimit({ creditLimitMinorUnits: 100000, additionalExpenseMinorUnits: 150000, newOutstandingMinorUnits: 50000, availableLimitBeforeMinorUnits: 100000, availableLimitAfterMinorUnits: 50000 }));
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 50000 }), expectedCreditLimit({ creditLimitMinorUnits: 100000, additionalExpenseMinorUnits: 50000, newOutstandingMinorUnits: 0, availableLimitBeforeMinorUnits: 100000, availableLimitAfterMinorUnits: 100000 }));
  } finally { sqlite.close(); }
});

test("CC-F01: editing a paid billed purchase preserves the payment's credit", () => {
  const f = fixture();
  try {
    f.charge("billed", -4000000);
    f.charge("payment", 1000000, "transfer");
    f.reconcile();
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 4000000, excludeTransactionId: "billed", occurredAt: f.today }), expectedCreditLimit({ newOutstandingMinorUnits: 3000000, availableLimitAfterMinorUnits: 2000000 }));
  } finally { sqlite.close(); }
});

test("CC-F01: opening debt/credit, refunds, and deleted entries use signed active ledger amounts", () => {
  const f = fixture();
  try {
    f.charge("expense", -4000000);
    f.charge("refund", 500000);
    f.charge("deleted", -9000000);
    sqlite.prepare("UPDATE transactions SET deleted_at = ? WHERE id = 'deleted'").run(f.occurred);
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -1000000 WHERE id = 'card'");
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 1000000 }), expectedCreditLimit({ currentOutstandingMinorUnits: 4500000, additionalExpenseMinorUnits: 1000000, newOutstandingMinorUnits: 5500000, availableLimitBeforeMinorUnits: 500000, availableLimitAfterMinorUnits: 0, exceeds: true, exceededByMinorUnits: 500000 }));
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 1000000 WHERE id = 'card'");
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 1000000 }), expectedCreditLimit({ currentOutstandingMinorUnits: 2500000, additionalExpenseMinorUnits: 1000000, newOutstandingMinorUnits: 3500000, availableLimitBeforeMinorUnits: 2500000, availableLimitAfterMinorUnits: 1500000 }));
  } finally { sqlite.close(); }
});

test("CC-F01: partially allocated excess payment remains available for a new expense", () => {
  const f = fixture();
  try {
    f.charge("billed", -4000000);
    f.charge("payment", 6000000, "transfer");
    f.reconcile();
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 6000000 }), expectedCreditLimit({ additionalExpenseMinorUnits: 6000000 }));
  } finally { sqlite.close(); }
});

test("CC-F01: billed installment edits exclude the full original principal exactly once", () => {
  const f = fixture();
  try {
    f.charge("installment_purchase", -4000000);
    f.db.transaction(context => createCreditCardInstallmentPlan(getTransactionsByIds(["installment_purchase"], context)[0], { termMonths: 3 }, context));
    f.reconcile();
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 4000000, excludeTransactionId: "installment_purchase", occurredAt: f.today }), expectedCreditLimit());
  } finally { sqlite.close(); }
});

test("CC-F01: exact limit passes and one minor unit over the limit warns", () => {
  const f = fixture();
  try {
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 5000000 }), expectedCreditLimit({ additionalExpenseMinorUnits: 5000000, newOutstandingMinorUnits: 5000000, availableLimitAfterMinorUnits: 0 }));
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 5000001 }), expectedCreditLimit({ additionalExpenseMinorUnits: 5000001, newOutstandingMinorUnits: 5000001, availableLimitAfterMinorUnits: 0, exceeds: true, exceededByMinorUnits: 1 }));
  } finally { sqlite.close(); }
});

test("CC-F01: PHP, JPY, and KWD checks use account-native minor units including FX-posted entries", () => {
  const f = fixture();
  try {
    f.charge("fx_purchase", -4000);
    sqlite.exec("UPDATE transactions SET currency_code = 'USD', original_amount_minor_units = -100, exchange_rate_scaled = 40000000 WHERE id = 'fx_purchase'");
    for (const currency of ["PHP", "JPY", "KWD"]) {
      sqlite.prepare("UPDATE accounts SET currency_code = ? WHERE id = 'card'").run(currency);
      sqlite.exec("UPDATE credit_card_details SET credit_limit_minor_units = 5000 WHERE account_id = 'card'");
      assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 1001 }), expectedCreditLimit({ currencyCode: currency, creditLimitMinorUnits: 5000, currentOutstandingMinorUnits: 4000, additionalExpenseMinorUnits: 1001, newOutstandingMinorUnits: 5001, availableLimitBeforeMinorUnits: 1000, availableLimitAfterMinorUnits: 0, exceeds: true, exceededByMinorUnits: 1 }));
    }
  } finally { sqlite.close(); }
});

test("CC-F01: all reads use the supplied transaction context and see its pending writes", () => {
  const f = fixture();
  try {
    let reads = 0;
    f.db.transaction(context => {
      f.charge("pending", -4000000);
      const trackedContext = new Proxy(context, {
        get(target, key) {
          if (key === "select") return (...args) => { reads++; return target.select(...args); };
          return Reflect.get(target, key);
        },
      });
      assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 1000000, context: trackedContext }), expectedCreditLimit({ currentOutstandingMinorUnits: 4000000, additionalExpenseMinorUnits: 1000000, newOutstandingMinorUnits: 5000000, availableLimitBeforeMinorUnits: 1000000, availableLimitAfterMinorUnits: 0 }));
    });
    assert.equal(reads, 3, "Account, card details, and aggregate must all use the supplied context");
  } finally { sqlite.close(); }
});

test("CC-F01: missing accounts, non-card accounts, and zero-limit cards preserve the no-warning contract", () => {
  const f = fixture();
  try {
    for (const accountId of ["", "missing", "acc_1", "card"]) {
      sqlite.exec("UPDATE credit_card_details SET credit_limit_minor_units = 0 WHERE account_id = 'card'");
      const result = checkCreditLimitExceeded({ accountId, expenseAmountMinorUnits: 100 });
      assert.equal(result.hasCreditCard, false);
      assert.equal(result.exceeds, false);
      assert.equal(result.additionalExpenseMinorUnits, 100);
      assert.equal(result.newOutstandingMinorUnits, 100);
    }
  } finally { sqlite.close(); }
});

test("CC-F01: 10k-row checks execute three read-only statements with an indexed scalar aggregate", () => {
  const f = fixture();
  try {
    for (let index = 0; index < 10000; index++) f.charge("bulk_" + index, -100);
    queries = [];
    assert.deepEqual(checkCreditLimitExceeded({ accountId: "card", expenseAmountMinorUnits: 4000000 }), expectedCreditLimit({ currentOutstandingMinorUnits: 1000000, newOutstandingMinorUnits: 5000000, availableLimitBeforeMinorUnits: 4000000, availableLimitAfterMinorUnits: 0 }));
    assert.equal(queries.length, 3);
    assert.ok(queries.every(query => /^\s*select\b/i.test(query)));
    assert.ok(queries.every(query => !/credit_card_(statements|statement_entries|installment)/i.test(query)));
    const aggregate = queries.find(query => /sum\(/i.test(query));
    assert.ok(aggregate);
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + aggregate).all("card");
    assert.ok(plan.some(row => /SEARCH transactions USING .*INDEX .*account/i.test(row.detail)), JSON.stringify(plan));
    assert.ok(plan.every(row => !/TEMP B-TREE|SCAN transactions/i.test(row.detail)), JSON.stringify(plan));
  } finally { sqlite.close(); }
});

function installmentFixture(input = { termMonths: 3 }) {
  const f = fixture();
  f.charge("purchase", -120000);
  f.db.transaction(context => createCreditCardInstallmentPlan(getTransactionsByIds(["purchase"], context)[0], input, context));
  return f;
}

function installmentFinancialSnapshot() {
  const card = getCreditCardMonitoring(new Date()).cards.find(item => item.accountId === "card");
  return {
    billed: card.billedMinorUnits,
    unbilled: card.unbilledMinorUnits,
    outstanding: card.outstandingMinorUnits,
    available: card.availableCreditMinorUnits,
    utilization: card.utilizationPercent,
    dueThisMonth: card.dueThisMonthMinorUnits,
    overdue: card.overdueMinorUnits,
    nextDueOn: card.nextDueOn,
    activePlans: card.activeInstallmentCount,
    statements: card.statements.map(statement => ({
      id: statement.id,
      statementOn: statement.statementOn,
      dueOn: statement.dueOn,
      issued: statement.issuedAmountMinorUnits,
      remaining: statement.remainingAmountMinorUnits,
    })),
  };
}

test("CC-F02: actual delete/restore restores the billed installment without replacing history or schedules", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    assert.equal(before.billed, 40000); assert.equal(before.unbilled, 80000); assert.equal(before.outstanding, 120000);
    const schedule = sqlite.prepare("SELECT * FROM credit_card_installments ORDER BY id").all();
    const issuedEntry = sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE entry_type = 'installment'").get();
    removeTransaction("purchase");
    const deleted = installmentFinancialSnapshot();
    assert.equal(deleted.outstanding, 0); assert.equal(deleted.activePlans, 0);
    restoreTransaction("purchase");
    assert.deepEqual(installmentFinancialSnapshot(), before);
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_installments ORDER BY id").all(), schedule);
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE entry_type = 'installment'").get(), issuedEntry);
    assert.deepEqual(sqlite.prepare("SELECT entry_type, amount_minor_units FROM credit_card_statement_entries ORDER BY rowid").all().map(row => [row.entry_type, row.amount_minor_units]), [["installment", 40000], ["adjustment", -40000], ["adjustment", 40000]]);
    assert.equal(sqlite.prepare("SELECT opening_balance_minor_units + (SELECT coalesce(sum(amount_minor_units), 0) FROM transactions WHERE account_id = 'card' AND deleted_at IS NULL) AS balance FROM accounts WHERE id = 'card'").get().balance, -120000);
  } finally { sqlite.close(); }
});

test("CC-F02: restore before the first cutoff keeps the full purchase unbilled", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 8, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    assert.equal(before.billed, 0); assert.equal(before.unbilled, 120000);
    removeTransaction("purchase"); restoreTransaction("purchase");
    assert.deepEqual(installmentFinancialSnapshot(), before);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n, 0);
  } finally { sqlite.close(); }
});

test("CC-F02: multiple issued statements recover their own installment amounts", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 11, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    assert.equal(before.billed, 80000); assert.equal(before.unbilled, 40000);
    removeTransaction("purchase"); restoreTransaction("purchase");
    assert.deepEqual(installmentFinancialSnapshot(), before);
    assert.deepEqual(sqlite.prepare("SELECT amount_minor_units FROM credit_card_statement_entries WHERE entry_type = 'adjustment' AND amount_minor_units > 0 ORDER BY rowid").all().map(row => row.amount_minor_units), [40000, 40000]);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries WHERE entry_type = 'installment'").get().n, 2);
  } finally { sqlite.close(); }
});

for (const payment of [20000, 40000, 70000]) {
  test(`CC-F02: restoring a billed purchase preserves an existing ${payment}-minor-unit payment`, t => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
    const f = installmentFixture();
    try {
      f.charge("payment", payment, "transfer");
      reconcileCreditCardBilling();
      const before = installmentFinancialSnapshot();
      assert.equal(before.outstanding, 120000 - payment);
      const allocations = sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE transaction_id = 'payment' ORDER BY id").all();
      removeTransaction("purchase"); restoreTransaction("purchase");
      assert.deepEqual(installmentFinancialSnapshot(), before);
      const restoredAllocations = sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE transaction_id = 'payment' ORDER BY id").all();
      for (const original of allocations) {
        assert.deepEqual(restoredAllocations.find(entry => entry.id === original.id), original);
      }
      assert.equal(restoredAllocations.reduce((sum, entry) => sum + entry.amount_minor_units, 0), allocations.reduce((sum, entry) => sum + entry.amount_minor_units, 0), "Release/reapplication history preserves the original net allocation");
    } finally { sqlite.close(); }
  });
}

test("CC-F02: a cutoff passing in Trash issues the new bill and restores the old one once", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling(); removeTransaction("purchase");
    t.mock.timers.setTime(new Date(2026, 11, 21, 12).getTime());
    restoreTransaction("purchase");
    const restored = installmentFinancialSnapshot();
    assert.equal(restored.billed, 80000); assert.equal(restored.unbilled, 40000); assert.equal(restored.outstanding, 120000);
    assert.equal(restored.overdue, 40000); assert.equal(restored.dueThisMonth, 80000);
    assert.deepEqual(restored.statements.map(statement => [statement.statementOn, statement.issued, statement.remaining]), [["2026-12-10", 40000, 40000], ["2026-11-10", 40000, 40000]]);
    const entryCount = sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n;
    reconcileCreditCardBilling();
    assert.deepEqual(installmentFinancialSnapshot(), restored);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n, entryCount);
  } finally { sqlite.close(); }
});

test("CC-F02: BNPL restore preserves deferred principal and later restores its issued bill", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture({ termMonths: 3, deferredMonths: 2 });
  try {
    reconcileCreditCardBilling();
    const deferred = installmentFinancialSnapshot();
    assert.equal(deferred.billed, 0); assert.equal(deferred.unbilled, 120000);
    removeTransaction("purchase"); restoreTransaction("purchase");
    assert.deepEqual(installmentFinancialSnapshot(), deferred);
    t.mock.timers.setTime(new Date(2027, 0, 21, 12).getTime());
    reconcileCreditCardBilling();
    const issued = installmentFinancialSnapshot();
    assert.equal(issued.billed, 40000); assert.equal(issued.unbilled, 80000);
    removeTransaction("purchase"); restoreTransaction("purchase");
    assert.deepEqual(installmentFinancialSnapshot(), issued);
  } finally { sqlite.close(); }
});

test("CC-F02: repeated delete/restore cycles converge without duplicate issuance or idle writes", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    for (let cycle = 1; cycle <= 3; cycle++) {
      removeTransaction("purchase"); restoreTransaction("purchase");
      assert.deepEqual(installmentFinancialSnapshot(), before);
      assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries").get().n, 1 + cycle * 2);
      queries = [];
      reconcileCreditCardBilling(); reconcileCreditCardBilling();
      assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
      assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries WHERE entry_type = 'installment'").get().n, 1);
    }
  } finally { sqlite.close(); }
});

test("CC-F02: reconciliation repairs an already-active purchase left broken by an earlier restore", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    removeTransaction("purchase");
    sqlite.exec("UPDATE transactions SET deleted_at = NULL WHERE id = 'purchase'; UPDATE credit_card_installment_plans SET status = 'active'");
    assert.equal(installmentFinancialSnapshot().outstanding, 80000, "Fixture reproduces the old restore state before explicit reconciliation");
    reconcileCreditCardBilling();
    assert.deepEqual(installmentFinancialSnapshot(), before);
    const entries = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    reconcileCreditCardBilling();
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all(), entries);
  } finally { sqlite.close(); }
});

test("CC-F02: failed restoration adjustment rolls back source restore, plan activation, and newly due bills", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling(); removeTransaction("purchase");
    const tables = ["transactions", "credit_card_installment_plans", "credit_card_installments", "credit_card_statements", "credit_card_statement_entries"];
    const snapshot = () => tables.map(table => sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = snapshot();
    t.mock.timers.setTime(new Date(2026, 11, 21, 12).getTime());
    sqlite.exec("CREATE TRIGGER fail_installment_restore BEFORE INSERT ON credit_card_statement_entries WHEN NEW.entry_type = 'adjustment' AND NEW.amount_minor_units > 0 AND NEW.transaction_id = 'purchase' BEGIN SELECT RAISE(ABORT, 'installment restore failed'); END");
    assert.throws(() => restoreTransaction("purchase"), /installment restore failed/);
    assert.deepEqual(snapshot(), before);
    sqlite.exec("DROP TRIGGER fail_installment_restore");
    restoreTransaction("purchase");
    assert.equal(installmentFinancialSnapshot().outstanding, 120000);
    assert.equal(sqlite.prepare("SELECT deleted_at FROM transactions WHERE id = 'purchase'").get().deleted_at, null);
  } finally { sqlite.close(); }
});

test("CC-F02: a 120-statement restore adds corrections without adding history reads", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2036, 10, 21, 12).getTime() });
  const f = installmentFixture({ termMonths: 120 });
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    assert.equal(before.billed, 120000); assert.equal(before.unbilled, 0); assert.equal(before.statements.length, 120);
    queries = [];
    reconcileCreditCardBilling();
    const historyReadCount = queries.filter(query => /^\s*select\b/i.test(query) && !/randomblob/i.test(query)).length;
    removeTransaction("purchase");
    queries = [];
    restoreTransaction("purchase");
    const restoreReads = queries.filter(query => /^\s*select\b/i.test(query) && !/randomblob/i.test(query));
    assert.equal(restoreReads.length, historyReadCount + 1, "Only the restore service's source lookup is additional; ID generation is excluded");
    assert.deepEqual(installmentFinancialSnapshot(), before);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM credit_card_statement_entries WHERE entry_type = 'installment'").get().n, 120);
    queries = [];
    reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
  } finally { sqlite.close(); }
});

function paidPurchaseFixture() {
  const f = fixture();
  f.charge("paid_purchase", -100000);
  f.charge("payment", 100000, "transfer");
  f.charge("unbilled", -100000);
  sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'payment'").run(new Date(2026, 10, 11, 12).getTime());
  sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
  reconcileCreditCardBilling();
  return f;
}

function assertCardLedgerParity() {
  const snapshot = installmentFinancialSnapshot();
  const balance = sqlite.prepare("SELECT opening_balance_minor_units + (SELECT coalesce(sum(amount_minor_units), 0) FROM transactions WHERE account_id = 'card' AND deleted_at IS NULL) AS balance FROM accounts WHERE id = 'card'").get().balance;
  assert.equal(snapshot.outstanding, Math.max(0, -balance), "Monitoring debt must match the independent signed ledger");
  const negativeStatements = sqlite.prepare("SELECT statement_id FROM credit_card_statement_entries GROUP BY statement_id HAVING sum(amount_minor_units) < 0").all();
  assert.deepEqual(negativeStatements, [], "No statement may retain an excess credit allocation");
  return snapshot;
}

test("CC-F03: deleting a paid charge releases a real transfer's credit to unbilled spending", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    f.charge("paid_purchase", -100000); reconcileCreditCardBilling();
    const payment = createTransfer({ fromAccountId: "acc_1", toAccountId: "card", amountMinorUnits: 100000, occurredAt: new Date(2026, 10, 11, 12) });
    f.charge("unbilled", -100000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling();
    const transferRows = sqlite.prepare("SELECT * FROM transactions WHERE transaction_group_id = ? ORDER BY id").all(payment.transactionGroupId);
    const originalEntry = sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE transaction_id = ?").get(payment.inLeg.id);
    removeTransaction("paid_purchase");
    const after = assertCardLedgerParity();
    assert.equal(after.billed, 0); assert.equal(after.unbilled, 0); assert.equal(after.outstanding, 0); assert.equal(after.available, 5000000);
    assert.equal(after.statements[0].issued, 0); assert.equal(after.statements[0].remaining, 0);
    assert.deepEqual(sqlite.prepare("SELECT * FROM transactions WHERE transaction_group_id = ? ORDER BY id").all(payment.transactionGroupId), transferRows);
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_statement_entries WHERE id = ?").get(originalEntry.id), originalEntry);
    assert.equal(sqlite.prepare("SELECT sum(amount_minor_units) AS n FROM credit_card_statement_entries WHERE transaction_id = ?").get(payment.inLeg.id).n, 0);
  } finally { sqlite.close(); }
});

test("CC-F03: reducing and re-increasing a paid charge preserves debt and issued-charge totals", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    const before = installmentFinancialSnapshot();
    const input = { accountId: "card", categoryId: "cat_dining", type: "expense", amountMinorUnits: -40000, occurredAt: new Date(f.occurred) };
    await updateTransaction("paid_purchase", input);
    const reduced = assertCardLedgerParity();
    assert.equal(reduced.billed, 0); assert.equal(reduced.unbilled, 40000); assert.equal(reduced.outstanding, 40000);
    assert.equal(reduced.statements[0].issued, 40000);
    await updateTransaction("paid_purchase", { ...input, amountMinorUnits: -100000 });
    assert.deepEqual(assertCardLedgerParity(), before);
  } finally { sqlite.close(); }
});

test("CC-F03: moving a paid charge to cash and back releases and reapplies credit atomically", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    const before = installmentFinancialSnapshot();
    const input = { accountId: "acc_1", categoryId: "cat_dining", type: "expense", amountMinorUnits: -100000, occurredAt: new Date(f.occurred) };
    await updateTransaction("paid_purchase", input);
    assert.equal(assertCardLedgerParity().outstanding, 0);
    await updateTransaction("paid_purchase", { ...input, accountId: "card" });
    assert.deepEqual(assertCardLedgerParity(), before);
  } finally { sqlite.close(); }
});

test("CC-F03: released credit pays a newer statement and returns to the oldest on restoration", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    t.mock.timers.setTime(new Date(2026, 11, 21, 12).getTime());
    reconcileCreditCardBilling();
    const before = assertCardLedgerParity();
    assert.equal(before.billed, 100000); assert.equal(before.overdue, 0);
    removeTransaction("paid_purchase");
    assert.equal(assertCardLedgerParity().outstanding, 0);
    restoreTransaction("paid_purchase");
    assert.deepEqual(assertCardLedgerParity(), before, "Oldest-first allocation must restore due/overdue parity too");
  } finally { sqlite.close(); }
});

test("CC-F03: mixed payment/refund credits remain available after charge deletion and credit restore", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    f.charge("paid_purchase", -100000); f.charge("payment", 60000, "transfer"); f.charge("refund", 40000);
    f.charge("unbilled", -50000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling(); removeTransaction("paid_purchase");
    assert.equal(assertCardLedgerParity().outstanding, 0);
    f.charge("more_unbilled", -80000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'more_unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling();
    assert.equal(assertCardLedgerParity().outstanding, 30000);
    removeTransaction("refund"); assert.equal(assertCardLedgerParity().outstanding, 70000);
    restoreTransaction("refund"); assert.equal(assertCardLedgerParity().outstanding, 30000);
  } finally { sqlite.close(); }
});

test("CC-F03: surplus credit survives a release, later spending, and payment deletion/restoration", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    sqlite.exec("UPDATE transactions SET amount_minor_units = 150000 WHERE id = 'payment'");
    reconcileCreditCardBilling(); removeTransaction("paid_purchase");
    assert.equal(assertCardLedgerParity().outstanding, 0);
    f.charge("extra", -100000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'extra'").run(new Date(2026, 10, 16, 12).getTime());
    reconcileCreditCardBilling();
    assert.equal(assertCardLedgerParity().outstanding, 50000);
    removeTransaction("payment"); assert.equal(assertCardLedgerParity().outstanding, 200000);
    restoreTransaction("payment"); assert.equal(assertCardLedgerParity().outstanding, 50000);
  } finally { sqlite.close(); }
});

test("CC-F03: released credit offsets unbilled installment principal without changing its schedule", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    createTransaction({ accountId: "card", categoryId: "cat_dining", type: "expense", amountMinorUnits: -120000, occurredAt: new Date(2026, 10, 15, 12), installment: { termMonths: 3 } });
    const schedule = sqlite.prepare("SELECT * FROM credit_card_installments ORDER BY id").all();
    removeTransaction("paid_purchase");
    const after = assertCardLedgerParity();
    assert.equal(after.billed, 0); assert.equal(after.unbilled, 120000); assert.equal(after.outstanding, 120000);
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_installments ORDER BY id").all(), schedule);
  } finally { sqlite.close(); }
});

test("CC-F03: split parents and transfer fees consume released credit exactly once", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    f.charge("paid_purchase", -100000); reconcileCreditCardBilling();
    createTransfer({ fromAccountId: "acc_1", toAccountId: "card", amountMinorUnits: 100000, occurredAt: new Date(2026, 10, 15, 12), fee: { accountId: "card", categoryId: "cat_dining", amountMinorUnits: 10000 } });
    createTransaction({ accountId: "card", type: "expense", amountMinorUnits: -60000, occurredAt: new Date(2026, 10, 15, 12), splitEntries: [{ categoryId: "cat_dining", amountMinorUnits: 20000 }, { categoryId: "cat_groceries", amountMinorUnits: 40000 }] });
    removeTransaction("paid_purchase");
    assert.equal(assertCardLedgerParity().outstanding, 0);
    createTransaction({ accountId: "card", categoryId: "cat_dining", type: "expense", amountMinorUnits: -50000, occurredAt: new Date(2026, 10, 16, 12) });
    assert.equal(assertCardLedgerParity().outstanding, 20000);
  } finally { sqlite.close(); }
});

test("CC-F03: tied credit timestamps have stable ID ordering and release the later credit first", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    f.charge("paid_purchase", -100000);
    f.charge("credit_z", 60000, "transfer"); f.charge("credit_a", 60000, "transfer");
    reconcileCreditCardBilling();
    const net = id => Math.max(0, -sqlite.prepare("SELECT coalesce(sum(amount_minor_units), 0) AS n FROM credit_card_statement_entries WHERE transaction_id = ?").get(id).n);
    assert.equal(net("credit_a"), 60000); assert.equal(net("credit_z"), 40000);
    sqlite.exec("UPDATE transactions SET amount_minor_units = -50000 WHERE id = 'paid_purchase'");
    reconcileCreditCardBilling();
    assert.equal(net("credit_a"), 50000); assert.equal(net("credit_z"), 0);
    assertCardLedgerParity();
  } finally { sqlite.close(); }
});

test("CC-F03: existing released allocations are read as net credit, not gross negative entries", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    removeTransaction("paid_purchase");
    // Seed the corrected allocation explicitly to isolate monitoring from reconciliation.
    sqlite.exec("DELETE FROM credit_card_statement_entries WHERE transaction_id = 'payment' AND entry_type = 'adjustment'");
    const statementId = f.statement().id;
    sqlite.prepare("INSERT INTO credit_card_statement_entries (id, statement_id, transaction_id, entry_type, amount_minor_units, occurred_on_snapshot, created_at) VALUES ('manual_release', ?, 'payment', 'adjustment', 100000, '2026-11-24', ?)").run(statementId, Date.now());
    const after = installmentFinancialSnapshot();
    assert.equal(after.billed, 0); assert.equal(after.unbilled, 0); assert.equal(after.outstanding, 0);
  } finally { sqlite.close(); }
});

test("CC-F03: explicit reconciliation heals already-stranded credit and converges without writes", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    removeTransaction("paid_purchase");
    sqlite.exec("DELETE FROM credit_card_statement_entries WHERE transaction_id = 'payment' AND entry_type = 'adjustment'");
    reconcileCreditCardBilling();
    assert.equal(assertCardLedgerParity().outstanding, 0);
    const before = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    queries = []; reconcileCreditCardBilling(); reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all(), before);
  } finally { sqlite.close(); }
});

test("CC-F03: credit-release failure rolls back charge deletion and billing history together", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    const tables = ["transactions", "credit_card_statements", "credit_card_statement_entries"];
    const snapshot = () => tables.map(table => sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = snapshot();
    sqlite.exec("CREATE TRIGGER fail_credit_release BEFORE INSERT ON credit_card_statement_entries WHEN NEW.transaction_id = 'payment' AND NEW.entry_type = 'adjustment' AND NEW.amount_minor_units > 0 BEGIN SELECT RAISE(ABORT, 'credit release failed'); END");
    assert.throws(() => removeTransaction("paid_purchase"), /credit release failed/);
    assert.deepEqual(snapshot(), before);
    sqlite.exec("DROP TRIGGER fail_credit_release");
    removeTransaction("paid_purchase"); assert.equal(assertCardLedgerParity().outstanding, 0);
  } finally { sqlite.close(); }
});

test("CC-F03: allocation failure rolls back release, deletion, and the destination bill", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 11, 21, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    const tables = ["transactions", "credit_card_statements", "credit_card_statement_entries"];
    const snapshot = () => tables.map(table => sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = snapshot();
    const newerStatement = sqlite.prepare("SELECT id FROM credit_card_statements WHERE statement_on = '2026-12-10'").get().id;
    sqlite.exec(`CREATE TRIGGER fail_reallocation BEFORE INSERT ON credit_card_statement_entries WHEN NEW.transaction_id = 'payment' AND NEW.entry_type = 'payment' AND NEW.statement_id = '${newerStatement}' BEGIN SELECT RAISE(ABORT, 'reallocation failed'); END`);
    assert.throws(() => removeTransaction("paid_purchase"), /reallocation failed/);
    assert.deepEqual(snapshot(), before);
  } finally { sqlite.close(); }
});

test("CC-F03: payment-owned corrections never rewrite opening principal on subsequent reconciliation", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    f.charge("payment", 100000, "transfer"); reconcileCreditCardBilling();
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -40000 WHERE id = 'card'");
    f.charge("unbilled", -100000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling();
    const after = assertCardLedgerParity();
    assert.equal(after.billed, 0); assert.equal(after.unbilled, 40000); assert.equal(after.statements[0].issued, 40000);
    const entries = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    reconcileCreditCardBilling();
    assert.deepEqual(assertCardLedgerParity(), after);
    assert.deepEqual(sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all(), entries);
  } finally { sqlite.close(); }
});

test("CC-F03: reduced opening-debt payments stay correct across repeated reconciliation", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    f.charge("payment", 100000, "transfer"); reconcileCreditCardBilling();
    sqlite.exec("UPDATE transactions SET amount_minor_units = 50000 WHERE id = 'payment'");
    reconcileCreditCardBilling(); reconcileCreditCardBilling();
    const after = assertCardLedgerParity();
    assert.equal(after.billed, 50000); assert.equal(after.statements[0].issued, 100000);
  } finally { sqlite.close(); }
});

test("CC-F03: 10k ledger rows add no history reads for credit release or idle reconciliation", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = paidPurchaseFixture();
  try {
    for (let index = 0; index < 10000; index++) f.charge("bulk_" + index, -1);
    reconcileCreditCardBilling();
    queries = []; reconcileCreditCardBilling();
    const historyReads = queries.filter(query => /^\s*select\b/i.test(query) && !/randomblob/i.test(query)).length;
    queries = []; removeTransaction("paid_purchase");
    assert.equal(queries.filter(query => /^\s*select\b/i.test(query) && !/randomblob/i.test(query)).length, historyReads + 1);
    assert.equal(assertCardLedgerParity().outstanding, 10000);
    queries = []; reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
  } finally { sqlite.close(); }
});

test("CC-F04: deleting and restoring an opening-debt payment releases credit and restores debt without altering opening principal", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    const payment = createTransfer({ fromAccountId: "acc_1", toAccountId: "card", amountMinorUnits: 100000, occurredAt: new Date(2026, 10, 5, 12) });
    const paidState = assertCardLedgerParity();
    assert.equal(paidState.billed, 0); assert.equal(paidState.outstanding, 0);

    // Delete payment: credit is released, opening debt is restored to 100,000
    removeTransaction(payment.inLeg.id);
    const deletedState = assertCardLedgerParity();
    assert.equal(deletedState.billed, 100000); assert.equal(deletedState.outstanding, 100000);

    // Repeated reconciliation writes nothing and does not corrupt opening principal
    queries = [];
    reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
    assert.deepEqual(assertCardLedgerParity(), deletedState);

    // Restore payment: debt returns to 0
    restoreTransaction(payment.inLeg.id);
    const restoredState = assertCardLedgerParity();
    assert.equal(restoredState.billed, 0); assert.equal(restoredState.outstanding, 0);
    queries = [];
    reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
  } finally { sqlite.close(); }
});

test("CC-F04: refund corrections against opening debt maintain ledger parity and stable entry counts", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    f.charge("refund", 50000, "income");
    reconcileCreditCardBilling();
    const halfPaid = assertCardLedgerParity();
    assert.equal(halfPaid.billed, 50000); assert.equal(halfPaid.outstanding, 50000);

    // Increase refund to cover full debt
    sqlite.exec("UPDATE transactions SET amount_minor_units = 100000 WHERE id = 'refund'");
    reconcileCreditCardBilling();
    const fullyPaid = assertCardLedgerParity();
    assert.equal(fullyPaid.billed, 0); assert.equal(fullyPaid.outstanding, 0);

    // Repeated reconciliation converges with zero writes
    const entriesBefore = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    for (let i = 0; i < 5; i++) reconcileCreditCardBilling();
    const entriesAfter = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    assert.deepEqual(entriesAfter, entriesBefore);
    assert.deepEqual(assertCardLedgerParity(), fullyPaid);
  } finally { sqlite.close(); }
});

test("CC-F04: account opening balance edits update issued amounts and converge without phantom entries", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const initial = assertCardLedgerParity();
    assert.equal(initial.billed, 100000); assert.equal(initial.statements[0].issued, 100000);

    // Decrease opening debt: -100,000 -> -40,000
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -40000 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const decreased = assertCardLedgerParity();
    assert.equal(decreased.billed, 40000); assert.equal(decreased.statements[0].issued, 40000);

    // Second run must be write-free
    queries = [];
    reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));

    // Increase opening debt: -40,000 -> -150,000
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -150000 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const increased = assertCardLedgerParity();
    assert.equal(increased.billed, 150000); assert.equal(increased.statements[0].issued, 150000);

    // Clear opening debt: -150,000 -> 0
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 0 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const cleared = assertCardLedgerParity();
    assert.equal(cleared.billed, 0); assert.equal(cleared.statements[0].issued, 0);
    queries = [];
    reconcileCreditCardBilling();
    assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)));
  } finally { sqlite.close(); }
});

test("CC-F04: multiple reconciliation runs across mixed opening-debt payments write zero rows after initial convergence", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = -100000 WHERE id = 'card'");
    f.charge("payment", 100000, "transfer");
    reconcileCreditCardBilling();
    sqlite.exec("UPDATE transactions SET amount_minor_units = 60000 WHERE id = 'payment'");
    reconcileCreditCardBilling();
    const parity = assertCardLedgerParity();
    assert.equal(parity.billed, 40000); assert.equal(parity.outstanding, 40000);

    const snapshot = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    for (let run = 0; run < 10; run++) {
      queries = [];
      reconcileCreditCardBilling();
      assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)), `Run ${run + 1} must write nothing`);
    }
    const after = sqlite.prepare("SELECT * FROM credit_card_statement_entries ORDER BY id").all();
    assert.deepEqual(after, snapshot);
    assert.deepEqual(assertCardLedgerParity(), parity);
  } finally { sqlite.close(); }
});

test("CC-F05: positive opening credit offsets unbilled purchases and maintains ledger parity", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 100000 WHERE id = 'card'");
    f.charge("unbilled", -200000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling();
    const parity = assertCardLedgerParity();
    assert.equal(parity.billed, 0);
    assert.equal(parity.unbilled, 100000);
    assert.equal(parity.outstanding, 100000);
    assert.equal(parity.available, 4900000);
  } finally { sqlite.close(); }
});

test("CC-F05: positive opening credit allocates to billed cycle statements in oldest-first order", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 100000 WHERE id = 'card'");
    f.charge("billed", -200000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'billed'").run(new Date(2026, 10, 5, 12).getTime());
    reconcileCreditCardBilling();
    const parity = assertCardLedgerParity();
    assert.equal(parity.billed, 100000);
    assert.equal(parity.unbilled, 0);
    assert.equal(parity.outstanding, 100000);
    assert.equal(parity.available, 4900000);
    assert.equal(parity.statements[0].issued, 200000);
    assert.equal(parity.statements[0].remaining, 100000);
  } finally { sqlite.close(); }
});

test("CC-F05: surplus opening credit covers all charges with zero outstanding debt and capped available limit", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 100000 WHERE id = 'card'");
    f.charge("billed", -40000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'billed'").run(new Date(2026, 10, 5, 12).getTime());
    f.charge("unbilled", -30000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'unbilled'").run(new Date(2026, 10, 15, 12).getTime());
    reconcileCreditCardBilling();
    const parity = assertCardLedgerParity();
    assert.equal(parity.billed, 0);
    assert.equal(parity.unbilled, 0);
    assert.equal(parity.outstanding, 0);
    assert.equal(parity.available, 5000000);
    assert.equal(parity.statements[0].issued, 40000);
    assert.equal(parity.statements[0].remaining, 0);
  } finally { sqlite.close(); }
});

test("CC-F05: positive opening credit offsets unbilled installment principal and subsequent bills", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 8, 12).getTime() });
  const f = installmentFixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 100000 WHERE id = 'card'");
    reconcileCreditCardBilling();
    // Before first bill: principal 120,000 - opening credit 100,000 = 20,000 unbilled debt
    const before = assertCardLedgerParity();
    assert.equal(before.billed, 0);
    assert.equal(before.unbilled, 20000);
    assert.equal(before.outstanding, 20000);

    // After first cutoff (Nov 21): 40,000 billed, fully covered by opening credit
    t.mock.timers.setTime(new Date(2026, 10, 21, 12).getTime());
    reconcileCreditCardBilling();
    const after = assertCardLedgerParity();
    assert.equal(after.billed, 0);
    assert.equal(after.unbilled, 20000);
    assert.equal(after.outstanding, 20000);
    assert.equal(after.statements[0].issued, 40000);
    assert.equal(after.statements[0].remaining, 0);
  } finally { sqlite.close(); }
});

test("CC-F05: opening credit and subsequent payments apply chronologically to multiple statements", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 50000 WHERE id = 'card'");
    f.charge("oct_billed", -100000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'oct_billed'").run(new Date(2026, 9, 5, 12).getTime());
    f.charge("payment", 150000, "transfer");
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'payment'").run(new Date(2026, 10, 2, 12).getTime());
    f.charge("nov_billed", -100000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'nov_billed'").run(new Date(2026, 10, 5, 12).getTime());
    reconcileCreditCardBilling();
    const parity = assertCardLedgerParity();
    assert.equal(parity.billed, 0);
    assert.equal(parity.unbilled, 0);
    assert.equal(parity.outstanding, 0);
    assert.equal(parity.available, 5000000);
    assert.equal(parity.statements[0].remaining, 0);
    assert.equal(parity.statements[1].remaining, 0);
  } finally { sqlite.close(); }
});

test("CC-F05: editing positive opening balance adjusts allocations and converges with zero phantom writes", t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const f = fixture();
  try {
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 100000 WHERE id = 'card'");
    f.charge("billed", -200000);
    sqlite.prepare("UPDATE transactions SET occurred_at = ? WHERE id = 'billed'").run(new Date(2026, 10, 5, 12).getTime());
    reconcileCreditCardBilling();
    const initial = assertCardLedgerParity();
    assert.equal(initial.billed, 100000);
    assert.equal(initial.outstanding, 100000);

    // Decrease opening balance: 100,000 -> 40,000 (debt increases to 160,000)
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 40000 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const decreased = assertCardLedgerParity();
    assert.equal(decreased.billed, 160000);
    assert.equal(decreased.outstanding, 160000);

    // Clear opening balance: 40,000 -> 0 (debt increases to full 200,000)
    sqlite.exec("UPDATE accounts SET opening_balance_minor_units = 0 WHERE id = 'card'");
    reconcileCreditCardBilling();
    const cleared = assertCardLedgerParity();
    assert.equal(cleared.billed, 200000);
    assert.equal(cleared.outstanding, 200000);

    // Repeated runs write zero queries
    for (let run = 0; run < 10; run++) {
      queries = [];
      reconcileCreditCardBilling();
      assert.ok(queries.every(query => !/^\s*(insert|update|delete)\b/i.test(query)), `Run ${run + 1} must write nothing`);
    }
    assert.deepEqual(assertCardLedgerParity(), cleared);
  } finally { sqlite.close(); }
});

function installmentPlanStatus() {
  return sqlite
    .prepare(
      "SELECT status FROM credit_card_installment_plans WHERE purchase_transaction_id = 'purchase'",
    )
    .get()?.status;
}

test("CC-F10: mid-schedule installment plan counts as active", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const snap = installmentFinancialSnapshot();
    assert.equal(snap.activePlans, 1);
    assert.equal(installmentPlanStatus(), "active");
    assert.equal(snap.outstanding, 120000);
  } finally {
    sqlite.close();
  }
});

test("CC-F10: fully issued schedule completes when unpaid statement debt remains", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2027, 1, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const snap = installmentFinancialSnapshot();
    assert.equal(snap.outstanding, 120000);
    assert.equal(snap.activePlans, 0);
    assert.equal(installmentPlanStatus(), "completed");
  } finally {
    sqlite.close();
  }
});

test("CC-F10: fully issued and fully paid plan shows zero active installments", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2027, 1, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    f.charge("payment", 120000, "transfer");
    reconcileCreditCardBilling();
    const snap = installmentFinancialSnapshot();
    assert.equal(snap.outstanding, 0);
    assert.equal(snap.activePlans, 0);
    assert.equal(installmentPlanStatus(), "completed");
  } finally {
    sqlite.close();
  }
});

test("CC-F10: delete/restore reopens an incomplete schedule without changing paid totals", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    const before = installmentFinancialSnapshot();
    assert.equal(before.activePlans, 1);
    removeTransaction("purchase");
    assert.equal(installmentFinancialSnapshot().activePlans, 0);
    restoreTransaction("purchase");
    const restored = installmentFinancialSnapshot();
    assert.equal(restored.activePlans, 1);
    assert.equal(installmentPlanStatus(), "active");
    assert.deepEqual(restored, before);
  } finally {
    sqlite.close();
  }
});

test("CC-F11: createCreditCardInstallmentPlan rejects tiny principal before SQLite", (t) => {
  const f = fixture();
  try {
    f.charge("tiny", -2);
    assert.throws(
      () => {
        f.db.transaction((context) => {
          createCreditCardInstallmentPlan(
            getTransactionsByIds(["tiny"], context)[0],
            { termMonths: 3 },
            context,
          );
        });
      },
      /too small/,
    );
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM credit_card_installment_plans").get().n,
      0,
    );
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM credit_card_installments").get().n,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test("CC-F11: three-month plan on two minor units succeeds only at term two", (t) => {
  const f = fixture();
  try {
    f.charge("edge", -2);
    f.db.transaction((context) => {
      createCreditCardInstallmentPlan(
        getTransactionsByIds(["edge"], context)[0],
        { termMonths: 2 },
        context,
      );
    });
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM credit_card_installments").get().n,
      2,
    );
  } finally {
    sqlite.close();
  }
});

test("CC-F10: completed plans stay complete across repeat reconciliation", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2027, 1, 21, 12).getTime() });
  const f = installmentFixture();
  try {
    reconcileCreditCardBilling();
    assert.equal(installmentPlanStatus(), "completed");
    for (let run = 0; run < 3; run += 1) {
      reconcileCreditCardBilling();
      assert.equal(installmentPlanStatus(), "completed");
      assert.equal(installmentFinancialSnapshot().activePlans, 0);
    }
  } finally {
    sqlite.close();
  }
});

test("Q-CC02: due-by-month-end catch-up exceeds calendar-month due when older statements remain", () => {
  const f = fixture();
  try {
    f.charge("old", -100000);
    f.reconcile();
    sqlite.exec(
      "UPDATE credit_card_statements SET due_on = '2026-10-25' WHERE account_id = 'card'",
    );
    f.reconcile();
    f.charge("new", -50000);
    f.reconcile();
    const snapshot = f.monitor();
    assert.ok(snapshot);
    assert.ok(
      snapshot.dueThisMonthMinorUnits > snapshot.dueInCalendarMonthMinorUnits,
    );
    assert.equal(snapshot.dueInCalendarMonthMinorUnits, 50000);
    assert.ok(snapshot.nextDueOn >= "2026-11-21");
    assert.ok(snapshot.overdueMinorUnits > 0);
  } finally {
    sqlite.close();
  }
});

test("Q-CC04: future-dated purchases do not affect monitoring debt as of today", () => {
  const f = fixture();
  try {
    const future = new Date(2026, 11, 5, 12).getTime();
    f.charge("today", -80000);
    sqlite
      .prepare(
        "INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES ('future', 'card', 'cat_dining', 'expense', -200000, 'future', ?, ?, ?)",
      )
      .run(future, future, future);
    f.reconcile();
    const snapshot = f.monitor();
    assert.ok(snapshot);
    assert.equal(snapshot.unbilledMinorUnits, 80000);
    assert.equal(snapshot.outstandingMinorUnits, 80000);
    const limit = checkCreditLimitExceeded({
      accountId: "card",
      expenseAmountMinorUnits: 50000,
      occurredAt: f.today,
    });
    assert.equal(limit.currentOutstandingMinorUnits, 80000);
  } finally {
    sqlite.close();
  }
});

test("Q-CC07: rolled-back reconcile does not publish reconciliation cache", () => {
  const f = fixture();
  try {
    invalidateCreditCardReconciliationCache();
    f.charge("pending", -25000);
    assert.throws(() => {
      f.db.transaction((context) => {
        reconcileCreditCardBillingInContext(f.today, context);
        throw new Error("rollback");
      });
    }, /rollback/);
    assert.equal(
      sqlite
        .prepare("SELECT count(*) AS n FROM credit_card_statement_entries")
        .get().n,
      0,
    );
    ensureCreditCardBillingReconciled(f.today);
    assert.ok(
      sqlite
        .prepare("SELECT count(*) AS n FROM credit_card_statement_entries")
        .get().n > 0,
    );
  } finally {
    sqlite.close();
  }
});




