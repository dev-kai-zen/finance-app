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
    const file = path.join(__dirname, "../../../../drizzle", `${entry.tag}.sql`);
    const sql = fs.readFileSync(file, "utf-8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) {
        db.exec(trimmed);
      }
    }
  }

  // Seed default account types
  const now = Date.now();
  db.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, color, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'blue', 'landmark', 1, ${now}, ${now});
  `);

  // Seed 2 accounts
  db.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now}),
           ('acc_2', 'act_dep', 'Savings Account', 'PHP', 50000, ${now}, 0, 1, ${now}, ${now});
  `);

  // Seed 2 categories
  db.exec(`
    INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at)
    VALUES ('cat_groceries', 'Groceries', 'expense', 'green', 'shopping-cart', 1, ${now}, ${now}),
           ('cat_salary', 'Salary', 'income', 'blue', 'wallet', 1, ${now}, ${now});
  `);

  return db;
}

test("transactions: records expense and income transactions cleanly", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transfer_account_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Record Expense of PHP 1,500.00 (150000 cents)
  insertStmt.run("tx_1", "acc_1", "cat_groceries", null, "expense", 150000, "SM Supermarket Provisions", now, now, now);

  // Record Income of PHP 50,000.00 (5000000 cents)
  insertStmt.run("tx_2", "acc_1", "cat_salary", null, "income", 5000000, "Monthly Salary Payout", now, now, now);

  const txList = db.prepare("SELECT * FROM transactions ORDER BY occurred_at DESC").all();
  assert.equal(txList.length, 2);

  const expense = txList.find((t) => t.id === "tx_1");
  assert.equal(expense.type, "expense");
  assert.equal(expense.amount_cents, 150000);
  assert.equal(expense.category_id, "cat_groceries");

  const income = txList.find((t) => t.id === "tx_2");
  assert.equal(income.type, "income");
  assert.equal(income.amount_cents, 5000000);
  assert.equal(income.category_id, "cat_salary");
});

test("transactions: records transfer between two accounts", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transfer_account_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Transfer PHP 10,000.00 from acc_1 (Checking) to acc_2 (Savings)
  insertStmt.run("tx_transfer_1", "acc_1", null, "acc_2", "transfer", 1000000, "Savings Allocation", now, now, now);

  const transfer = db.prepare("SELECT * FROM transactions WHERE id = 'tx_transfer_1'").get();
  assert.equal(transfer.type, "transfer");
  assert.equal(transfer.account_id, "acc_1");
  assert.equal(transfer.transfer_account_id, "acc_2");
  assert.equal(transfer.category_id, null);
  assert.equal(transfer.amount_cents, 1000000);
});

test("transactions: aggregates inflow, outflow and net cashflow accurately", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transfer_account_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Income: 60,000.00
  insertStmt.run("tx_inc", "acc_1", "cat_salary", null, "income", 6000000, "Salary", now, now, now);

  // Expense: 20,000.00
  insertStmt.run("tx_exp", "acc_1", "cat_groceries", null, "expense", 2000000, "Provisions", now, now, now);

  // Transfer: 10,000.00 (transfers do not alter overall net cashflow across user accounts)
  insertStmt.run("tx_xfer", "acc_1", null, "acc_2", "transfer", 1000000, "Transfer", now, now, now);

  const allTx = db.prepare("SELECT type, amount_cents FROM transactions").all();
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const t of allTx) {
    if (t.type === "income") totalInflow += t.amount_cents;
    if (t.type === "expense") totalOutflow += t.amount_cents;
  }

  assert.equal(totalInflow, 6000000);
  assert.equal(totalOutflow, 2000000);
  assert.equal(totalInflow - totalOutflow, 4000000);
});

test("transactions: deletes transaction record cleanly", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transfer_account_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_del', 'acc_1', 'cat_groceries', null, 'expense', 50000, 'Test delete', ${now}, ${now}, ${now})
  `).run();

  const existsBefore = db.prepare("SELECT count(*) as c FROM transactions WHERE id = 'tx_del'").get().c;
  assert.equal(existsBefore, 1);

  db.prepare("DELETE FROM transactions WHERE id = 'tx_del'").run();

  const existsAfter = db.prepare("SELECT count(*) as c FROM transactions WHERE id = 'tx_del'").get().c;
  assert.equal(existsAfter, 0);
});

test("transactions: records transaction with name column and signed amount", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transfer_account_id, type, amount_cents, name, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Record Expense with name and signed negative amount (-150000 cents)
  insertStmt.run("tx_name_1", "acc_1", "cat_groceries", null, "expense", -150000, "SM Grocery Shopping", "Weekly fruits and milk", now, now, now);

  // Record Income with name and signed positive amount (+5000000 cents)
  insertStmt.run("tx_name_2", "acc_1", "cat_salary", null, "income", 5000000, "September Payday", "Regular monthly payroll", now, now, now);

  const row1 = db.prepare("SELECT * FROM transactions WHERE id = 'tx_name_1'").get();
  assert.equal(row1.name, "SM Grocery Shopping");
  assert.equal(row1.amount_cents, -150000);
  assert.equal(row1.type, "expense");

  const row2 = db.prepare("SELECT * FROM transactions WHERE id = 'tx_name_2'").get();
  assert.equal(row2.name, "September Payday");
  assert.equal(row2.amount_cents, 5000000);
  assert.equal(row2.type, "income");

  // Dynamic balance formula: Opening (100,000) + sum(transactions)
  // 100000 + (-150000) + 5000000 = 4,950,000
  const sumTx = db.prepare("SELECT SUM(amount_cents) as total FROM transactions WHERE account_id = 'acc_1'").get().total;
  assert.equal(sumTx, 4850000);
  assert.equal(100000 + sumTx, 4950000);
});

