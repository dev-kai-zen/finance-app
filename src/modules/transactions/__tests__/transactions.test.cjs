const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

function setupTestDb(upToTag) {
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
    if (entry.tag === upToTag) break;
  }

  const now = Date.now();
  db.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'landmark', 1, ${now}, ${now});
  `);

  db.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now}),
           ('acc_2', 'act_dep', 'Savings Account', 'PHP', 50000, ${now}, 0, 1, ${now}, ${now});
  `);

  db.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', 1, ${now}, ${now}),
           ('cat_salary', 'Salary', 'income', 'wallet', 1, ${now}, ${now});
  `);

  return db;
}

test("transactions: records expense and income transactions cleanly", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run("tx_1", "acc_1", "cat_groceries", null, "expense", -150000, "SM Supermarket Provisions", now, now, now);
  insertStmt.run("tx_2", "acc_1", "cat_salary", null, "income", 5000000, "Monthly Salary Payout", now, now, now);

  const txList = db.prepare("SELECT * FROM transactions ORDER BY occurred_at DESC").all();
  assert.equal(txList.length, 2);

  const expense = txList.find((t) => t.id === "tx_1");
  assert.equal(expense.type, "expense");
  assert.equal(expense.amount_cents, -150000);
  assert.equal(expense.category_id, "cat_groceries");

  const income = txList.find((t) => t.id === "tx_2");
  assert.equal(income.type, "income");
  assert.equal(income.amount_cents, 5000000);
  assert.equal(income.category_id, "cat_salary");
});

test("transactions: records transfer as two signed legs linked by transaction_group_id", () => {
  const db = setupTestDb();
  const now = Date.now();
  const groupId = "grp_transfer_1";

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run("tx_out", "acc_1", null, groupId, "transfer", -1000000, "Savings Allocation", now, now, now);
  insertStmt.run("tx_in", "acc_2", null, groupId, "transfer", 1000000, "Savings Allocation", now, now, now);

  const legs = db.prepare("SELECT * FROM transactions WHERE transaction_group_id = ? ORDER BY amount_cents ASC").all(groupId);
  assert.equal(legs.length, 2);
  assert.equal(legs[0].account_id, "acc_1");
  assert.equal(legs[0].amount_cents, -1000000);
  assert.equal(legs[1].account_id, "acc_2");
  assert.equal(legs[1].amount_cents, 1000000);
});

test("transactions: migrates legacy pocket movements and enables pockets on their accounts", () => {
  const db = setupTestDb("0012_add_account_pockets");
  const now = Date.now();

  db.prepare(`
    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "acc_pocket_migration",
    "system:asset:others",
    "Legacy Pocket Account",
    "PHP",
    100000,
    now,
    0,
    0,
    now,
    now,
  );
  db.prepare(`
    INSERT INTO pockets (
      id, account_id, name, is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("pocket_legacy", "acc_pocket_migration", "Bills", 0, 0, now, now);
  db.prepare(`
    INSERT INTO pocket_movements (
      id, account_id, from_pocket_id, to_pocket_id, amount_minor_units,
      note, occurred_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "movement_legacy",
    "acc_pocket_migration",
    null,
    "pocket_legacy",
    25000,
    "Initial allocation",
    now,
    now,
  );

  for (const migration of [
    "0013_replace_pocket_movements_with_transactions.sql",
    "0014_add_account_pocket_enabled.sql",
  ]) {
    const migrationSql = fs.readFileSync(
      path.join(__dirname, "../../../../drizzle", migration),
      "utf-8",
    );
    for (const statement of migrationSql.split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }

  const legs = db.prepare(`
    SELECT account_id, pocket_id, amount_cents, transaction_group_id
    FROM transactions
    WHERE transaction_group_id = 'pocket-transfer:movement_legacy'
    ORDER BY amount_cents
  `).all();
  assert.equal(legs.length, 2);
  assert.deepEqual(
    legs.map((leg) => [leg.account_id, leg.pocket_id, leg.amount_cents]),
    [
      ["acc_pocket_migration", null, -25000],
      ["acc_pocket_migration", "pocket_legacy", 25000],
    ],
  );
  assert.equal(
    db.prepare("SELECT SUM(amount_cents) AS total FROM transactions WHERE account_id = ?")
      .get("acc_pocket_migration").total,
    0,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'pocket_movements'")
      .get().count,
    0,
  );
  assert.equal(
    db.prepare("SELECT pocket_enabled FROM accounts WHERE id = ?")
      .get("acc_pocket_migration").pocket_enabled,
    1,
  );
});

test("transactions: aggregates inflow, outflow and net cashflow accurately", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run("tx_inc", "acc_1", "cat_salary", null, "income", 6000000, "Salary", now, now, now);
  insertStmt.run("tx_exp", "acc_1", "cat_groceries", null, "expense", -2000000, "Provisions", now, now, now);
  insertStmt.run("tx_out", "acc_1", null, "grp_xfer", "transfer", -1000000, "Transfer", now, now, now);
  insertStmt.run("tx_in", "acc_2", null, "grp_xfer", "transfer", 1000000, "Transfer", now, now, now);

  const allTx = db.prepare("SELECT transaction_group_id, amount_cents FROM transactions").all();
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const t of allTx) {
    if (t.transaction_group_id) continue;
    if (t.amount_cents > 0) totalInflow += t.amount_cents;
    if (t.amount_cents < 0) totalOutflow += Math.abs(t.amount_cents);
  }

  assert.equal(totalInflow, 6000000);
  assert.equal(totalOutflow, 2000000);
  assert.equal(totalInflow - totalOutflow, 4000000);
});

test("transactions: deleting one transfer leg removes the whole group", () => {
  const db = setupTestDb();
  const now = Date.now();
  const groupId = "grp_delete";

  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_out', 'acc_1', NULL, ?, 'transfer', -50000, 'Test delete', ?, ?, ?)
  `).run(groupId, now, now, now);

  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, note, occurred_at, created_at, updated_at)
    VALUES ('tx_in', 'acc_2', NULL, ?, 'transfer', 50000, 'Test delete', ?, ?, ?)
  `).run(groupId, now, now, now);

  db.prepare("DELETE FROM transactions WHERE transaction_group_id = ?").run(groupId);

  const remaining = db.prepare("SELECT count(*) as c FROM transactions").get().c;
  assert.equal(remaining, 0);
});

test("transactions: records transaction with name column and signed amount", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, transaction_group_id, type, amount_cents, name, note, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run("tx_name_1", "acc_1", "cat_groceries", null, "expense", -150000, "SM Grocery Shopping", "Weekly fruits and milk", now, now, now);
  insertStmt.run("tx_name_2", "acc_1", "cat_salary", null, "income", 5000000, "September Payday", "Regular monthly payroll", now, now, now);

  const row1 = db.prepare("SELECT * FROM transactions WHERE id = 'tx_name_1'").get();
  assert.equal(row1.name, "SM Grocery Shopping");
  assert.equal(row1.amount_cents, -150000);
  assert.equal(row1.type, "expense");

  const row2 = db.prepare("SELECT * FROM transactions WHERE id = 'tx_name_2'").get();
  assert.equal(row2.name, "September Payday");
  assert.equal(row2.amount_cents, 5000000);
  assert.equal(row2.type, "income");

  const sumTx = db.prepare("SELECT SUM(amount_cents) as total FROM transactions WHERE account_id = 'acc_1'").get().total;
  assert.equal(sumTx, 4850000);
  assert.equal(100000 + sumTx, 4950000);
});
