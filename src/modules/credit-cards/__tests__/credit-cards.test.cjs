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
