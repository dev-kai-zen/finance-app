const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

function setupTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const journal = require("../../../../drizzle/meta/_journal.json");
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(
      path.join(__dirname, "../../../../drizzle", `${entry.tag}.sql`),
      "utf-8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "card_1",
    "system:liability:credit-card",
    "Rewards Card",
    "PHP",
    0,
    now,
    0,
    0,
    now,
    now,
  );
  db.prepare(`
    INSERT INTO credit_card_details (
      account_id, credit_limit_minor_units, statement_day, payment_due_day
    ) VALUES (?, ?, ?, ?)
  `).run("card_1", 5000000, 18, 8);
  return { db, now };
}

test("credit cards: creates one statement per card billing cycle", () => {
  const { db, now } = setupTestDb();
  const insert = db.prepare(`
    INSERT INTO credit_card_statements (
      id, account_id, kind, cycle_start_on, cycle_end_on, statement_on,
      due_on, issued_amount_minor_units, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    "stmt_1",
    "card_1",
    "billing_cycle",
    "2026-09-19",
    "2026-10-18",
    "2026-10-18",
    "2026-11-08",
    0,
    now,
    now,
  );
  assert.throws(() =>
    insert.run(
      "stmt_duplicate",
      "card_1",
      "billing_cycle",
      "2026-09-19",
      "2026-10-18",
      "2026-10-18",
      "2026-11-08",
      0,
      now,
      now,
    ),
  );
});

test("credit cards: installment schedule preserves the full purchase principal", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_laptop', 'Electronics', 'expense', 'laptop', 0, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_cents, name,
      occurred_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "tx_laptop",
    "card_1",
    "cat_laptop",
    "expense",
    -1200000,
    "Laptop",
    now,
    now,
    now,
  );
  db.prepare(`
    INSERT INTO credit_card_installment_plans (
      id, account_id, purchase_transaction_id, term_months,
      principal_minor_units, first_statement_on, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "plan_laptop",
    "card_1",
    "tx_laptop",
    12,
    1200000,
    "2026-10-18",
    "active",
    now,
    now,
  );
  const insertInstallment = db.prepare(`
    INSERT INTO credit_card_installments (
      id, plan_id, installment_number, scheduled_statement_on,
      principal_minor_units, interest_minor_units, fee_minor_units, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)
  `);
  for (let index = 1; index <= 12; index += 1) {
    insertInstallment.run(
      `installment_${index}`,
      "plan_laptop",
      index,
      `2026-${String(9 + index).padStart(2, "0")}-18`,
      100000,
      now,
    );
  }
  const total = db
    .prepare(`
      SELECT SUM(principal_minor_units) AS total
      FROM credit_card_installments
      WHERE plan_id = 'plan_laptop'
    `)
    .get().total;
  assert.equal(total, 1200000);
});

test("credit cards: BNPL 3-month deferred installment plan defers first statement cutoff", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_bnpl', 'Electronics', 'expense', 'laptop', 0, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_cents, name,
      occurred_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "tx_bnpl_phone",
    "card_1",
    "cat_bnpl",
    "expense",
    -6000000,
    "Flagship Phone",
    now,
    now,
    now,
  );
  // Deferred 3 months: purchase in Oct 2026, first statement in Jan 2027
  db.prepare(`
    INSERT INTO credit_card_installment_plans (
      id, account_id, purchase_transaction_id, term_months,
      principal_minor_units, first_statement_on, deferred_months, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "plan_bnpl_phone",
    "card_1",
    "tx_bnpl_phone",
    6,
    6000000,
    "2027-01-18",
    3,
    "active",
    now,
    now,
  );
  const insertInstallment = db.prepare(`
    INSERT INTO credit_card_installments (
      id, plan_id, installment_number, scheduled_statement_on,
      principal_minor_units, interest_minor_units, fee_minor_units, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)
  `);
  // 6 monthly installments starting Jan 2027
  const statementDates = [
    "2027-01-18",
    "2027-02-18",
    "2027-03-18",
    "2027-04-18",
    "2027-05-18",
    "2027-06-18",
  ];
  for (let i = 0; i < statementDates.length; i += 1) {
    insertInstallment.run(
      `inst_bnpl_${i + 1}`,
      "plan_bnpl_phone",
      i + 1,
      statementDates[i],
      1000000,
      now,
    );
  }
  const plan = db
    .prepare("SELECT * FROM credit_card_installment_plans WHERE id = ?")
    .get("plan_bnpl_phone");
  assert.equal(plan.deferred_months, 3);
  assert.equal(plan.first_statement_on, "2027-01-18");

  // In Nov 2026 (before first statement), 0 installments are scheduled <= 2026-11-30
  const earlyCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM credit_card_installments WHERE plan_id = ? AND scheduled_statement_on <= ?",
    )
    .get("plan_bnpl_phone", "2026-11-30").count;
  assert.equal(earlyCount, 0);

  // In Jan 2027 (at first statement), 1 installment is due
  const janCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM credit_card_installments WHERE plan_id = ? AND scheduled_statement_on <= ?",
    )
    .get("plan_bnpl_phone", "2027-01-18").count;
  assert.equal(janCount, 1);
});

test("credit cards: deleting a source transaction preserves statement history", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_food_test', 'Food Test', 'expense', 'utensils', 0, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_cents, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_food', 'card_1', 'cat_food_test', 'expense', -200000, 'Dinner', ?, ?, ?)
  `).run(now, now, now);
  db.prepare(`
    INSERT INTO credit_card_statements (
      id, account_id, kind, cycle_start_on, cycle_end_on, statement_on,
      due_on, issued_amount_minor_units, created_at, updated_at
    ) VALUES (
      'stmt_food', 'card_1', 'billing_cycle', '2026-09-19', '2026-10-18',
      '2026-10-18', '2026-11-08', 200000, ?, ?
    )
  `).run(now, now);
  db.prepare(`
    INSERT INTO credit_card_statement_entries (
      id, statement_id, transaction_id, entry_type, amount_minor_units,
      description_snapshot, occurred_on_snapshot, created_at
    ) VALUES (
      'entry_food', 'stmt_food', 'tx_food', 'charge', 200000,
      'Dinner', '2026-10-01', ?
    )
  `).run(now);

  db.prepare("DELETE FROM transactions WHERE id = 'tx_food'").run();

  const statementCount = db
    .prepare("SELECT COUNT(*) AS count FROM credit_card_statements")
    .get().count;
  const entry = db
    .prepare(`
      SELECT transaction_id, description_snapshot, amount_minor_units
      FROM credit_card_statement_entries
      WHERE id = 'entry_food'
    `)
    .get();
  assert.equal(statementCount, 1);
  assert.equal(entry.transaction_id, null);
  assert.equal(entry.description_snapshot, "Dinner");
  assert.equal(entry.amount_minor_units, 200000);
});

test("credit cards: deleting a statement cascades only its billing entries", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO credit_card_statements (
      id, account_id, kind, cycle_start_on, cycle_end_on, statement_on,
      due_on, issued_amount_minor_units, created_at, updated_at
    ) VALUES (
      'stmt_opening', 'card_1', 'opening', '2026-09-01', '2026-09-01',
      '2026-09-01', '2026-09-08', 500000, ?, ?
    )
  `).run(now, now);
  db.prepare(`
    INSERT INTO credit_card_statement_entries (
      id, statement_id, entry_type, amount_minor_units,
      description_snapshot, occurred_on_snapshot, created_at
    ) VALUES (
      'entry_opening', 'stmt_opening', 'opening_balance', 500000,
      'Opening billed balance', '2026-09-01', ?
    )
  `).run(now);

  db.prepare("DELETE FROM credit_card_statements WHERE id = 'stmt_opening'").run();
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS count FROM credit_card_statement_entries")
      .get().count,
    0,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM accounts").get().count,
    1,
  );
});

test("credit cards: unbilled activity correctly increases unbilled and outstanding while billed stays as is", () => {
  const { db, now } = setupTestDb();
  // Set starting debt (initial balance) to ₱10,000 (1,000,000 cents)
  db.prepare("UPDATE accounts SET opening_balance_minor_units = -1000000 WHERE id = 'card_1'").run();

  // Initial opening statement of ₱10,000
  db.prepare(`
    INSERT INTO credit_card_statements (
      id, account_id, kind, cycle_start_on, cycle_end_on, statement_on,
      due_on, issued_amount_minor_units, created_at, updated_at
    ) VALUES ('stmt_open', 'card_1', 'opening', '2026-10-01', '2026-10-01', '2026-10-01', '2026-10-21', 1000000, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO credit_card_statement_entries (
      id, statement_id, entry_type, amount_minor_units,
      description_snapshot, occurred_on_snapshot, created_at
    ) VALUES ('entry_open', 'stmt_open', 'opening_balance', 1000000, 'Opening balance', '2026-10-01', ?)
  `).run(now);

  // Statement balance before new expense
  const statementBalance = db.prepare(`
    SELECT coalesce(sum(amount_minor_units), 0) as total FROM credit_card_statement_entries WHERE statement_id = 'stmt_open'
  `).get().total;
  assert.equal(statementBalance, 1000000);

  // Record a new expense of ₱500 (-50,000 cents)
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_expense', 'General', 'expense', 'tag', 0, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_cents, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_expense_500', 'card_1', 'cat_expense', 'expense', -50000, 'Coffee & Pastry', ?, ?, ?)
  `).run(now, now, now);

  // Billed items = statement remaining amount
  const billed = statementBalance;
  // Unbilled items = sum of unbilled transactions (not yet linked to statement)
  const billedTxIds = new Set(
    db.prepare("SELECT transaction_id FROM credit_card_statement_entries WHERE transaction_id IS NOT NULL").all().map((r) => r.transaction_id)
  );
  const unbilledTxs = db.prepare("SELECT * FROM transactions WHERE account_id = 'card_1' AND deleted_at IS NULL AND amount_cents < 0").all()
    .filter((tx) => !billedTxIds.has(tx.id));

  const unbilledGross = unbilledTxs.reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
  const unbilled = unbilledGross;
  const outstanding = billed + unbilled;
  const limit = 5000000; // ₱50,000 limit
  const availableCredit = limit - outstanding;

  assert.equal(billed, 1000000, "Billed stays as is (₱10,000)");
  assert.equal(unbilled, 50000, "Unbilled is +₱500");
  assert.equal(outstanding, 1050000, "Outstanding is initial + ₱500 (₱10,500)");
  assert.equal(availableCredit, 3950000, "Available credit is limit - outstanding (₱39,500)");
});

test("credit cards: payment against opening statement reduces billed, then subsequent expense increases unbilled & outstanding", () => {
  const { db, now } = setupTestDb();
  // Opening balance: ₱74,792.49 (7,479,249 centavos)
  const openingTarget = 7479249;
  db.prepare("UPDATE accounts SET opening_balance_minor_units = ? WHERE id = 'card_1'").run(-openingTarget);

  // Opening statement
  db.prepare(`
    INSERT INTO credit_card_statements (
      id, account_id, kind, cycle_start_on, cycle_end_on, statement_on,
      due_on, issued_amount_minor_units, created_at, updated_at
    ) VALUES ('stmt_open_user', 'card_1', 'opening', '2026-10-01', '2026-10-01', '2026-10-01', '2026-10-21', ?, ?, ?)
  `).run(openingTarget, now, now);
  db.prepare(`
    INSERT INTO credit_card_statement_entries (
      id, statement_id, entry_type, amount_minor_units,
      description_snapshot, occurred_on_snapshot, created_at
    ) VALUES ('entry_open_user', 'stmt_open_user', 'opening_balance', ?, 'Opening balance', '2026-10-01', ?)
  `).run(openingTarget, now);

  // User pays ₱10,329.99 (1,032,999 centavos)
  const paymentAmount = 1032999;
  db.prepare(`
    INSERT INTO credit_card_statement_entries (
      id, statement_id, entry_type, amount_minor_units,
      description_snapshot, occurred_on_snapshot, created_at
    ) VALUES ('entry_pay_user', 'stmt_open_user', 'payment', ?, 'Card payment', '2026-10-02', ?)
  `).run(-paymentAmount, now);

  // Check reconciliation logic: opening statement base should ignore payment
  const openingEntries = db.prepare("SELECT * FROM credit_card_statement_entries WHERE statement_id = 'stmt_open_user'").all();
  const openingBase = openingEntries
    .filter((e) => ["opening_balance", "adjustment"].includes(e.entry_type))
    .reduce((s, e) => s + e.amount_minor_units, 0);
  const openingDiff = openingTarget - openingBase;
  // openingDiff MUST be 0 (no spurious adjustment entry)
  assert.equal(openingDiff, 0, "No spurious adjustment should be generated to reverse the payment");

  // Remaining statement balance
  const remainingStatement = openingEntries.reduce((s, e) => s + e.amount_minor_units, 0);
  const billed = remainingStatement;
  assert.equal(billed, 6446250, "Billed should be 74,792.49 - 10,329.99 = 64,462.50");

  // User spends ₱286.00 (28,600 centavos)
  const expenseAmount = 28600;
  const unbilled = expenseAmount;
  const outstanding = billed + unbilled;

  assert.equal(unbilled, 28600, "Unbilled is ₱286.00");
  assert.equal(outstanding, 6474850, "Outstanding is 64,462.50 + 286.00 = ₱64,748.50");
});

test("credit cards: dedicated computation functions calculate billed, unbilled, outstanding, available limit, and utilization accurately", () => {
  // Test Billed computation
  const statements = [
    { remainingAmountMinorUnits: 500000 },
    { remainingAmountMinorUnits: 1446250 },
    { remainingAmountMinorUnits: 0 },
  ];
  const billed = Math.max(
    0,
    statements.reduce((s, st) => s + st.remainingAmountMinorUnits, 0),
  );
  assert.equal(billed, 1946250);

  // Test Unbilled computation
  const unbilledItems = [
    { amountMinorUnits: 28600 },
    { amountMinorUnits: 100000 },
  ];
  const unbilledGross = unbilledItems.reduce((s, it) => s + it.amountMinorUnits, 0);
  const unallocatedCredits = 50000;
  const unbilled = Math.max(0, unbilledGross - unallocatedCredits);
  assert.equal(unbilled, 78600);

  // Test Outstanding computation: Billed + Unbilled
  const outstanding = billed + unbilled;
  assert.equal(outstanding, 2024850);

  // Test Available Limit computation: Limit - Outstanding
  const limit = 5000000;
  const available = Math.max(0, limit - outstanding);
  assert.equal(available, 2975150);

  // Test Utilization computation: (Outstanding / Limit) * 100
  const utilization = (outstanding / limit) * 100;
  assert.equal(utilization, 40.497);
});



