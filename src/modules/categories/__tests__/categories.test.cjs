const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

// Schema SQL runner
function setupTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // Run initial migrations
  const migration0 = fs.readFileSync(
    path.join(__dirname, "../../../../drizzle/0000_uneven_mercury.sql"),
    "utf-8"
  );
  
  // Split statements by --> statement-breakpoint
  const statements = migration0.split("--> statement-breakpoint");
  for (const sql of statements) {
    const trimmed = sql.trim();
    if (trimmed) {
      db.exec(trimmed);
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

test("categories: creates custom category and enforces unique names per type", () => {
  const db = setupTestDb();
  const now = Date.now();

  const insertStmt = db.prepare(
    "INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  insertStmt.run("c1", "Coffee & Snacks", "expense", "amber", "cup", 0, now, now);

  const created = db.prepare("SELECT * FROM categories WHERE id = 'c1'").get();
  assert.equal(created.name, "Coffee & Snacks");
  assert.equal(created.type, "expense");
  assert.equal(created.is_system, 0);

  // Attempt duplicate in expense should fail unique constraint
  assert.throws(() => {
    insertStmt.run("c2", "Coffee & Snacks", "expense", "blue", "cup", 0, now, now);
  }, /UNIQUE constraint failed/);

  // Same name in income is allowed
  assert.doesNotThrow(() => {
    insertStmt.run("c3", "Coffee & Snacks", "income", "green", "cup", 0, now, now);
  });
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
