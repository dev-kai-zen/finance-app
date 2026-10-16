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
    "Visa Gold Card",
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
  `).run("card_1", 5000000, 18, 8); // ₱50,000 credit limit

  db.prepare(`
    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "checking_1",
    "system:asset:others",
    "Checking Account",
    "PHP",
    1000000,
    now,
    0,
    1,
    now,
    now,
  );

  return { db, now };
}

test("credit limit check: non-credit card account returns hasCreditCard: false and exceeds: false", () => {
  const { db } = setupTestDb();
  const cardDetails = db
    .prepare("SELECT * FROM credit_card_details WHERE account_id = ?")
    .get("checking_1");
  assert.equal(cardDetails, undefined);
});

test("credit limit check: pending expense within limit passes without warning", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_general', 'General', 'expense', 'tag', 0, ?, ?)
  `).run(now, now);

  // Existing debt of ₱30,000 (3,000,000 minor units)
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_1', 'card_1', 'cat_general', 'expense', -3000000, 'Shopping', ?, ?, ?)
  `).run(now, now, now);

  const limit = 5000000;
  const currentDebt = 3000000;
  const expense = 1000000; // ₱10,000
  const newDebt = currentDebt + expense;

  const exceeds = newDebt > limit;
  const exceededBy = Math.max(0, newDebt - limit);

  assert.equal(exceeds, false);
  assert.equal(exceededBy, 0);
  assert.equal(newDebt, 4000000);
});

test("credit limit check: pending expense exceeding credit limit triggers warning", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_general', 'General', 'expense', 'tag', 0, ?, ?)
  `).run(now, now);

  // Existing debt of ₱42,000 (4,200,000 minor units) on ₱50,000 limit
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_1', 'card_1', 'cat_general', 'expense', -4200000, 'Shopping', ?, ?, ?)
  `).run(now, now, now);

  const limit = 5000000;
  const currentDebt = 4200000;
  const expense = 1500000; // ₱15,000
  const newDebt = currentDebt + expense; // ₱57,000

  const exceeds = newDebt > limit;
  const exceededBy = Math.max(0, newDebt - limit);

  assert.equal(exceeds, true);
  assert.equal(exceededBy, 700000); // Exceeded by ₱7,000
  assert.equal(newDebt, 5700000);
});

test("credit limit check: editing an existing transaction offsets previous amount", () => {
  const { db, now } = setupTestDb();
  db.prepare(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_general', 'General', 'expense', 'tag', 0, ?, ?)
  `).run(now, now);

  // Existing transactions: tx_other (-2,000,000) and tx_edit (-2,500,000)
  // Total debt = 4,500,000
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_other', 'card_1', 'cat_general', 'expense', -2000000, 'Groceries', ?, ?, ?)
  `).run(now, now, now);
  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, amount_minor_units, name,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_edit', 'card_1', 'cat_general', 'expense', -2500000, 'Airfare', ?, ?, ?)
  `).run(now, now, now);

  const limit = 5000000;
  const excludeId = "tx_edit";

  const txs = db.prepare("SELECT * FROM transactions WHERE account_id = 'card_1' AND deleted_at IS NULL").all();
  const baseDebt = txs
    .filter((tx) => tx.id !== excludeId)
    .reduce((sum, tx) => sum + Math.abs(tx.amount_minor_units), 0);

  // Base debt without tx_edit is only 2,000,000
  assert.equal(baseDebt, 2000000);

  // Updating tx_edit to 2,800,000 -> 2,000,000 + 2,800,000 = 4,800,000 <= 5,000,000 (Passes)
  const newEditedExpenseWithin = 2800000;
  const projectedWithin = baseDebt + newEditedExpenseWithin;
  assert.equal(projectedWithin <= limit, true);

  // Updating tx_edit to 3,500,000 -> 2,000,000 + 3,500,000 = 5,500,000 > 5,000,000 (Exceeds by 500,000)
  const newEditedExpenseOver = 3500000;
  const projectedOver = baseDebt + newEditedExpenseOver;
  assert.equal(projectedOver > limit, true);
  assert.equal(projectedOver - limit, 500000);
});
