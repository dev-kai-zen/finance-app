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

const { reconcileCreditCardBillingInContext } = require("../services/reconcile-credit-card-billing.service");
const { getCreditCardMonitoring } = require("../services/get-credit-card-monitoring.service");
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



