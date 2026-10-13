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
  db.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'landmark', 1, ${now}, ${now});
  `);
  db.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now});
  `);
  db.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, created_at, updated_at)
    VALUES ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', 1, ${now}, ${now}),
           ('cat_personal', 'Personal Care', 'expense', 'sparkles', 1, ${now}, ${now});
  `);

  return db;
}

test("split transactions: parent stores total and entries allocate categories", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, transaction_group_id, type, currency_code,
      amount_minor_units, name, occurred_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "tx_split",
    "acc_1",
    null,
    null,
    "expense",
    "PHP",
    -350000,
    "SM Mall",
    now,
    now,
    now,
  );

  const insertEntry = db.prepare(`
    INSERT INTO transaction_entries (
      id, transaction_id, category_id, amount_minor_units, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertEntry.run("entry_1", "tx_split", "cat_groceries", 250000, null, now, now);
  insertEntry.run("entry_2", "tx_split", "cat_personal", 100000, null, now, now);

  const parent = db
    .prepare("SELECT category_id, amount_minor_units FROM transactions WHERE id = 'tx_split'")
    .get();
  assert.equal(parent.category_id, null);
  assert.equal(parent.amount_minor_units, -350000);

  const entrySum = db
    .prepare(
      "SELECT coalesce(sum(amount_minor_units), 0) AS total FROM transaction_entries WHERE transaction_id = 'tx_split'",
    )
    .get();
  assert.equal(entrySum.total, 350000);

  const groceriesSpend = db
    .prepare(
      `SELECT coalesce(sum(te.amount_minor_units), 0) AS total
       FROM transaction_entries te
       INNER JOIN transactions t ON t.id = te.transaction_id
       WHERE te.category_id = 'cat_groceries' AND t.deleted_at IS NULL`,
    )
    .get();
  assert.equal(groceriesSpend.total, 250000);
});

test("split transactions: cascade delete removes entries with parent", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO transactions (
      id, account_id, category_id, type, currency_code, amount_minor_units,
      occurred_at, created_at, updated_at
    ) VALUES ('tx_parent', 'acc_1', NULL, 'expense', 'PHP', -100000, ?, ?, ?)
  `).run(now, now, now);
  db.prepare(`
    INSERT INTO transaction_entries (
      id, transaction_id, category_id, amount_minor_units, created_at, updated_at
    ) VALUES ('entry_a', 'tx_parent', 'cat_groceries', 60000, ?, ?),
             ('entry_b', 'tx_parent', 'cat_personal', 40000, ?, ?)
  `).run(now, now, now, now);

  db.prepare("DELETE FROM transactions WHERE id = 'tx_parent'").run();

  const remaining = db
    .prepare("SELECT count(*) AS count FROM transaction_entries")
    .get();
  assert.equal(remaining.count, 0);
});
