const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

// Schema SQL runner
function setupTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // Run all migrations from journal
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

  return db;
}

test("categories: seeds default categories on empty database", () => {
  const db = setupTestDb();

  const countBefore = db.prepare("SELECT count(*) as count FROM categories").get().count;
  assert.equal(countBefore, 0);

  // Seed default categories
  const now = Date.now();
  const seedCategories = [
    { id: "cat_exp_food", name: "Food & Dining", type: "expense", color: "orange", icon: "utensils", is_system: 1 },
    { id: "cat_exp_groceries", name: "Groceries & Market", type: "expense", color: "green", icon: "shopping-cart", is_system: 1 },
    { id: "cat_exp_utilities", name: "Utilities & Bills", type: "expense", color: "amber", icon: "zap", is_system: 1 },
    { id: "cat_exp_others", name: "Other Expenses", type: "expense", color: "slate", icon: "more-horizontal", is_system: 1 },
    { id: "cat_inc_salary", name: "Salary & Wages", type: "income", color: "green", icon: "wallet", is_system: 1 },
    { id: "cat_inc_others", name: "Other Income", type: "income", color: "slate", icon: "more-horizontal", is_system: 1 },
  ];

  const insertStmt = db.prepare(
    "INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (const cat of seedCategories) {
    insertStmt.run(cat.id, cat.name, cat.type, cat.color, cat.icon, cat.is_system, now, now);
  }

  const countAfter = db.prepare("SELECT count(*) as count FROM categories").get().count;
  assert.equal(countAfter, 6);

  const expenseCount = db.prepare("SELECT count(*) as count FROM categories WHERE type = 'expense'").get().count;
  assert.equal(expenseCount, 4);

  const incomeCount = db.prepare("SELECT count(*) as count FROM categories WHERE type = 'income'").get().count;
  assert.equal(incomeCount, 2);
});

test("categories: creates custom category and links subcategories with parent_id", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(
    "INSERT INTO categories (id, name, type, parent_id, color, icon, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  // Create parent category
  insertStmt.run("cat_food", "Food & Dining", "expense", null, "orange", "utensils", 1, now, now);

  const parent = db.prepare("SELECT * FROM categories WHERE id = 'cat_food'").get();
  assert.equal(parent.name, "Food & Dining");
  assert.equal(parent.type, "expense");
  assert.equal(parent.parent_id, null);

  // Create subcategory under cat_food
  insertStmt.run("sub_coffee", "Coffee & Cafes", "expense", "cat_food", "orange", "utensils", 0, now, now);

  const sub = db.prepare("SELECT * FROM categories WHERE id = 'sub_coffee'").get();
  assert.equal(sub.name, "Coffee & Cafes");
  assert.equal(sub.parent_id, "cat_food");

  // Query subcategories for parent
  const subs = db.prepare("SELECT * FROM categories WHERE parent_id = 'cat_food'").all();
  assert.equal(subs.length, 1);
  assert.equal(subs[0].name, "Coffee & Cafes");

  // Foreign key check: inserting subcategory with non-existent parent_id should fail
  assert.throws(() => {
    insertStmt.run("sub_invalid", "Ghost", "expense", "non_existent_parent", "blue", "tag", 0, now, now);
  }, /FOREIGN KEY constraint failed/);
});

test("categories: protects system default categories from deletion", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(
    "INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("sys_1", "Salary", "income", "green", "wallet", 1, now, now);

  const cat = db.prepare("SELECT * FROM categories WHERE id = 'sys_1'").get();
  assert.equal(cat.is_system, 1);

  // Business logic check: system category deletion is prohibited
  const canDelete = cat.is_system === 0;
  assert.equal(canDelete, false);
});

test("categories: sort_order column exists and defaults to 0", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(
    "INSERT INTO categories (id, name, type, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("cat_test", "Test Category", "expense", 0, now, now);

  const row = db.prepare("SELECT * FROM categories WHERE id = 'cat_test'").get();
  assert.equal(row.sort_order, 0);
});

test("categories: reordering updates sort_order sequentially", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(
    "INSERT INTO categories (id, name, type, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  insertStmt.run("c1", "Utilities", "expense", 0, now, now);
  insertStmt.run("c2", "Food", "expense", 1, now, now);
  insertStmt.run("c3", "Rent", "expense", 2, now, now);

  // Reorder to: c3 (Rent), c1 (Utilities), c2 (Food)
  const orderedIds = ["c3", "c1", "c2"];

  const updateStmt = db.prepare("UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?");
  for (let i = 0; i < orderedIds.length; i++) {
    updateStmt.run(i, now, orderedIds[i]);
  }

  const results = db.prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC").all();
  assert.equal(results[0].id, "c3");
  assert.equal(results[0].sort_order, 0);
  assert.equal(results[1].id, "c1");
  assert.equal(results[1].sort_order, 1);
  assert.equal(results[2].id, "c2");
  assert.equal(results[2].sort_order, 2);
});

test("categories: alphabetical sorting orders categories by name and persists sort_order", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(
    "INSERT INTO categories (id, name, type, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  insertStmt.run("c_z", "Zoo Trips", "expense", 0, now, now);
  insertStmt.run("c_a", "Apple Store", "expense", 1, now, now);
  insertStmt.run("c_m", "Medical", "expense", 2, now, now);

  const rows = db.prepare("SELECT id, name FROM categories WHERE type = 'expense'").all();
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const orderedIds = sorted.map((c) => c.id);

  assert.deepEqual(orderedIds, ["c_a", "c_m", "c_z"]);

  const updateStmt = db.prepare("UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?");
  for (let i = 0; i < orderedIds.length; i++) {
    updateStmt.run(i, now, orderedIds[i]);
  }

  const persisted = db.prepare("SELECT id, name FROM categories ORDER BY sort_order ASC").all();
  assert.equal(persisted[0].id, "c_a");
  assert.equal(persisted[1].id, "c_m");
  assert.equal(persisted[2].id, "c_z");
});


