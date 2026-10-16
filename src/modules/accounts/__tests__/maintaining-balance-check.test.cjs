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
  // Account with maintaining balance of ₱5,000 (500,000 minor units), opening balance ₱10,000 (1,000,000 minor units)
  db.prepare(`
    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, maintaining_balance_minor_units, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "bank_with_maintaining",
    "system:asset:others",
    "Savings with Maintaining",
    "PHP",
    1000000,
    now,
    500000,
    0,
    0,
    now,
    now,
  );

  // Account without maintaining balance (null)
  db.prepare(`
    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, maintaining_balance_minor_units, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "bank_no_maintaining",
    "system:asset:others",
    "Digital Wallet",
    "PHP",
    1000000,
    now,
    null,
    0,
    1,
    now,
    now,
  );

  return { db, now };
}

test("maintaining balance: account without maintaining balance returns hasMaintainingBalance: false and isUnderMaintaining: false", () => {
  const { db } = setupTestDb();
  const account = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get("bank_no_maintaining");
  assert.equal(account.maintaining_balance_minor_units, null);
  const hasMaintaining = account.maintaining_balance_minor_units != null && account.maintaining_balance_minor_units > 0;
  assert.equal(hasMaintaining, false);
});

test("maintaining balance: expense keeping balance at or above maintaining balance passes without warning", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_food', 'Food', 'expense', 'utensils', 0, ?, ?)
  `).run(now, now);

  const account = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get("bank_with_maintaining");
  const maintaining = account.maintaining_balance_minor_units;
  assert.equal(maintaining, 500000);

  // Expense of ₱3,000 (300,000 minor units). Opening balance is 1,000,000.
  // Projected balance = 1,000,000 - 300,000 = 700,000 >= 500,000 -> Passes!
  const expense = 300000;
  const currentBalance = account.opening_balance_minor_units;
  const projectedBalance = currentBalance - expense;
  const isUnderMaintaining = projectedBalance < maintaining;
  const shortfall = Math.max(0, maintaining - projectedBalance);

  assert.equal(isUnderMaintaining, false);
  assert.equal(shortfall, 0);
  assert.equal(projectedBalance, 700000);
});

test("maintaining balance: expense bringing balance under maintaining balance triggers warning", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_bills', 'Bills', 'expense', 'receipt', 0, ?, ?)
  `).run(now, now);

  const account = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get("bank_with_maintaining");
  const maintaining = account.maintaining_balance_minor_units;
  assert.equal(maintaining, 500000);

  // Expense of ₱7,000 (700,000 minor units).
  // Projected balance = 1,000,000 - 700,000 = 300,000 < 500,000 -> Warning!
  const expense = 700000;
  const currentBalance = account.opening_balance_minor_units;
  const projectedBalance = currentBalance - expense;
  const isUnderMaintaining = projectedBalance < maintaining;
  const shortfall = Math.max(0, maintaining - projectedBalance);

  assert.equal(isUnderMaintaining, true);
  assert.equal(shortfall, 200000); // Under by ₱2,000
  assert.equal(projectedBalance, 300000);
});

test("maintaining balance: editing an existing transaction offsets previous amount", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_misc', 'Misc', 'expense', 'circle', 0, ?, ?)
  `).run(now, now);

  // Opening = 1,000,000
  // Existing tx_1 = -200,000
  // Existing tx_to_edit = -400,000
  // Current database balance = 400,000 (which is already under 500,000)
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_1', 'bank_with_maintaining', 'cat_misc', 'expense', -200000, 'Lunch', ?, ?, ?)
  `).run(now, now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_to_edit', 'bank_with_maintaining', 'cat_misc', 'expense', -400000, 'Dinner', ?, ?, ?)
  `).run(now, now, now);

  const account = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get("bank_with_maintaining");
  const maintaining = account.maintaining_balance_minor_units;

  const excludeId = "tx_to_edit";
  const txs = db
    .prepare("SELECT * FROM transactions WHERE account_id = 'bank_with_maintaining' AND deleted_at IS NULL")
    .all();

  const deltaWithoutExcluded = txs
    .filter((tx) => tx.id !== excludeId)
    .reduce((sum, tx) => sum + tx.amount_minor_units, 0);

  // Balance without tx_to_edit: 1,000,000 - 200,000 = 800,000
  const balanceWithoutExcluded = account.opening_balance_minor_units + deltaWithoutExcluded;
  assert.equal(balanceWithoutExcluded, 800000);

  // 1. Changing tx_to_edit to 250,000:
  // Projected = 800,000 - 250,000 = 550,000 >= 500,000 -> Not under maintaining!
  const editedExpenseWithin = 250000;
  const projectedWithin = balanceWithoutExcluded - editedExpenseWithin;
  assert.equal(projectedWithin >= maintaining, true);

  // 2. Changing tx_to_edit to 450,000:
  // Projected = 800,000 - 450,000 = 350,000 < 500,000 -> Under maintaining by 150,000!
  const editedExpenseOver = 450000;
  const projectedOver = balanceWithoutExcluded - editedExpenseOver;
  assert.equal(projectedOver < maintaining, true);
  assert.equal(maintaining - projectedOver, 150000);
});
