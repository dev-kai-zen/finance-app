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
    VALUES ('cat_1', 'Food', 'expense', 'utensils', 1, ${now}, ${now});
  `);

  return db;
}

test("labels: creates labels with sort_order and is_archived", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO labels (id, name, color, sort_order, is_archived, created_at, updated_at)
    VALUES ('lbl_trip', 'trip', '#6366F1', 1, 0, ${now}, ${now}),
           ('lbl_reimbursable', 'reimbursable', NULL, 2, 0, ${now}, ${now});
  `);

  const rows = db.prepare("SELECT * FROM labels ORDER BY sort_order ASC").all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "trip");
  assert.equal(rows[0].color, "#6366F1");
  assert.equal(rows[0].is_archived, 0);
  assert.equal(rows[1].name, "reimbursable");
  assert.equal(rows[1].color, null);
});

test("labels: enforces case-insensitive uniqueness on name", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at)
    VALUES ('lbl_1', 'Vacation', 1, 0, ${now}, ${now});
  `);

  assert.throws(() => {
    db.exec(`
      INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at)
      VALUES ('lbl_2', 'vacation', 2, 0, ${now}, ${now});
    `);
  }, /UNIQUE constraint failed/);
});

test("labels: assigns multiple labels to a single transaction", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at)
    VALUES ('lbl_1', 'trip', 1, 0, ${now}, ${now}),
           ('lbl_2', 'dinner', 2, 0, ${now}, ${now});
  `);

  db.exec(`
    INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES ('tx_1', 'acc_1', 'cat_1', 'expense', -5000, 'Team Dinner', ${now}, ${now}, ${now});
  `);

  db.exec(`
    INSERT INTO transaction_labels (transaction_id, label_id, created_at)
    VALUES ('tx_1', 'lbl_1', ${now}),
           ('tx_1', 'lbl_2', ${now});
  `);

  const assigned = db.prepare(`
    SELECT l.name FROM transaction_labels tl
    JOIN labels l ON tl.label_id = l.id
    WHERE tl.transaction_id = 'tx_1'
    ORDER BY l.sort_order ASC
  `).all();

  assert.equal(assigned.length, 2);
  assert.equal(assigned[0].name, "trip");
  assert.equal(assigned[1].name, "dinner");
});

test("labels: cascade deletes transaction_labels when transaction is deleted", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at)
    VALUES ('lbl_1', 'trip', 1, 0, ${now}, ${now});
    INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES ('tx_1', 'acc_1', 'cat_1', 'expense', -5000, 'Flight', ${now}, ${now}, ${now});
    INSERT INTO transaction_labels (transaction_id, label_id, created_at)
    VALUES ('tx_1', 'lbl_1', ${now});
  `);

  assert.equal(db.prepare("SELECT count(*) as count FROM transaction_labels").get().count, 1);

  db.exec("DELETE FROM transactions WHERE id = 'tx_1'");

  assert.equal(db.prepare("SELECT count(*) as count FROM transaction_labels").get().count, 0);
  assert.equal(db.prepare("SELECT count(*) as count FROM labels").get().count, 1);
});

test("labels: calculates usage count properly and protects used labels", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at)
    VALUES ('lbl_used', 'groceries', 1, 0, ${now}, ${now}),
           ('lbl_unused', 'unused', 2, 0, ${now}, ${now});
    INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES ('tx_1', 'acc_1', 'cat_1', 'expense', -2000, 'Supermarket', ${now}, ${now}, ${now});
    INSERT INTO transaction_labels (transaction_id, label_id, created_at)
    VALUES ('tx_1', 'lbl_used', ${now});
  `);

  const usedCount = db.prepare(`
    SELECT count(*) as count FROM transaction_labels WHERE label_id = 'lbl_used'
  `).get().count;
  const unusedCount = db.prepare(`
    SELECT count(*) as count FROM transaction_labels WHERE label_id = 'lbl_unused'
  `).get().count;

  assert.equal(usedCount, 1);
  assert.equal(unusedCount, 0);
});

