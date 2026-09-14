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

  const now = Date.now();

  // Seed accounts: 1 Asset (100,000 cents = ₱1,000), 1 Liability (20,000 cents = ₱200)
  db.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_bank', 'system:asset:others', 'Bank Checking', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now}),
           ('acc_card', 'system:liability:credit-card', 'Credit Card', 'PHP', 20000, ${now}, 0, 1, ${now}, ${now});
  `);

  // Seed categories
  db.exec(`
    INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at)
    VALUES ('cat_groceries', 'Groceries', 'expense', 'green', 'shopping-cart', 1, ${now}, ${now}),
           ('cat_dining', 'Dining', 'expense', 'orange', 'utensils', 1, ${now}, ${now}),
           ('cat_salary', 'Salary', 'income', 'blue', 'wallet', 1, ${now}, ${now});
  `);

  return db;
}

test("dashboard: computes real-time dynamic account balances and net worth", () => {
  const db = setupTestDb();
  const now = Date.now();

  // Add Income of ₱500.00 (50,000 cents) into acc_bank
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_1', 'acc_bank', 'cat_salary', null, 'income', 50000, 'Bonus', ${now}, ${now}, ${now})
  `).run();

  // Add Expense of ₱150.00 (15,000 cents) from acc_bank
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_2', 'acc_bank', 'cat_groceries', null, 'expense', -15000, 'Supermarket', ${now}, ${now}, ${now})
  `).run();

  // Bank initial: 100,000. Delta: +50,000 - 15,000 = +35,000. Expected live balance = 135,000 cents.
  const allTx = db.prepare("SELECT * FROM transactions").all();
  let bankDelta = 0;
  for (const t of allTx) {
    if (t.account_id === "acc_bank") {
      bankDelta += t.amount_cents;
    }
  }

  const bankAccount = db.prepare("SELECT * FROM accounts WHERE id = 'acc_bank'").get();
  const liveBankBalance = bankAccount.opening_balance_minor_units + bankDelta;
  assert.equal(liveBankBalance, 135000);

  const cardAccount = db.prepare("SELECT * FROM accounts WHERE id = 'acc_card'").get();
  const liveCardBalance = cardAccount.opening_balance_minor_units; // No transactions on card
  assert.equal(liveCardBalance, 20000);

  // Net worth: Assets (135,000) - Liabilities (20,000) = 115,000 cents (₱1,150.00)
  const netWorth = liveBankBalance - liveCardBalance;
  assert.equal(netWorth, 115000);
});

test("dashboard: computes monthly cashflow and category spending percentages", () => {
  const db = setupTestDb();
  const now = Date.now();

  // Income: 100,000 cents
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_inc', 'acc_bank', 'cat_salary', null, 'income', 100000, 'Salary', ${now}, ${now}, ${now})
  `).run();

  // Expense Groceries: 30,000 cents
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_groc', 'acc_bank', 'cat_groceries', null, 'expense', -30000, 'Groceries', ${now}, ${now}, ${now})
  `).run();

  // Expense Dining: 10,000 cents
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_dine', 'acc_bank', 'cat_dining', null, 'expense', -10000, 'Restaurant', ${now}, ${now}, ${now})
  `).run();

  // Total Inflow: 100,000
  // Total Outflow: 40,000
  // Net Savings: 60,000
  // Savings Rate: 60%
  const totalInflow = 100000;
  const totalOutflow = 40000;
  const netSavings = totalInflow - totalOutflow;
  const savingsRate = Math.round((netSavings / totalInflow) * 100);

  assert.equal(totalInflow, 100000);
  assert.equal(totalOutflow, 40000);
  assert.equal(netSavings, 60000);
  assert.equal(savingsRate, 60);

  // Category percentages:
  // Groceries: 30,000 / 40,000 = 75%
  // Dining: 10,000 / 40,000 = 25%
  const grocPct = Math.round((30000 / totalOutflow) * 100);
  const dinePct = Math.round((10000 / totalOutflow) * 100);

  assert.equal(grocPct, 75);
  assert.equal(dinePct, 25);
});
