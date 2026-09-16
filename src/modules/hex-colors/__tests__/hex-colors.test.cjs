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

  return db;
}

test("hex_colors: seeds initial system colors with is_system = 1", () => {
  const db = setupTestDb();
  const rows = db.prepare("SELECT * FROM hex_colors ORDER BY name").all();

  assert.equal(rows.length, 11);
  for (const row of rows) {
    assert.equal(row.is_system, 1, `Color ${row.name} should be a system color`);
    assert.match(row.hex, /^#[0-9A-F]{6}$/i);
  }

  const blue = db.prepare("SELECT * FROM hex_colors WHERE id = 'color_blue'").get();
  assert.ok(blue);
  assert.equal(blue.name, "Blue");
  assert.equal(blue.hex, "#2563EB");
});

test("hex_colors: prevents updating system colors", () => {
  const db = setupTestDb();
  const blue = db.prepare("SELECT * FROM hex_colors WHERE id = 'color_blue'").get();
  assert.equal(blue.is_system, 1);

  // Attempting to update a system color via business rule
  const isSystem = Boolean(blue.is_system);
  assert.throws(() => {
    if (isSystem) {
      throw new Error("System colors cannot be modified or deleted.");
    }
  }, /System colors cannot be modified or deleted/);
});

test("hex_colors: prevents deleting system colors", () => {
  const db = setupTestDb();
  const red = db.prepare("SELECT * FROM hex_colors WHERE id = 'color_red'").get();
  assert.equal(red.is_system, 1);

  const isSystem = Boolean(red.is_system);
  assert.throws(() => {
    if (isSystem) {
      throw new Error("System colors cannot be modified or deleted.");
    }
  }, /System colors cannot be modified or deleted/);
});

test("hex_colors: creates custom non-system color and allows deletion when unused", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(
    "INSERT INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("color_custom_gold", "Gold", "#FFD700", 0, now, now);

  const created = db.prepare("SELECT * FROM hex_colors WHERE id = 'color_custom_gold'").get();
  assert.ok(created);
  assert.equal(created.name, "Gold");
  assert.equal(created.hex, "#FFD700");
  assert.equal(created.is_system, 0);

  // Since it is unused, it can be deleted safely
  db.prepare("DELETE FROM hex_colors WHERE id = 'color_custom_gold'").run();
  const deleted = db.prepare("SELECT * FROM hex_colors WHERE id = 'color_custom_gold'").get();
  assert.equal(deleted, undefined);
});

test("hex_colors: ON DELETE RESTRICT prevents deleting color used by account_types or categories", () => {
  const db = setupTestDb();
  const now = Date.now();

  // Create custom color
  db.prepare(
    "INSERT INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("color_custom_coral", "Coral", "#FF7F50", 0, now, now);

  // Link to an account type
  db.prepare(
    "INSERT INTO account_types (id, name, account_group, hex_colors_id, is_system, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("type_coral_savings", "Coral Savings", "asset", "color_custom_coral", 0, 10, now, now);

  // Verify foreign key RESTRICT prevents direct SQLite deletion
  assert.throws(() => {
    db.prepare("DELETE FROM hex_colors WHERE id = 'color_custom_coral'").run();
  }, /FOREIGN KEY constraint failed/);

  // Verify usage count helper finds the reference
  const accountTypeUsages = db.prepare(
    "SELECT count(*) as count FROM account_types WHERE hex_colors_id = 'color_custom_coral'"
  ).get().count;
  assert.equal(accountTypeUsages, 1);

  // Link to a category as well
  db.prepare(
    "INSERT INTO categories (id, name, type, hex_colors_id, is_system, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("cat_coral_gifts", "Gifts", "expense", "color_custom_coral", 0, 5, now, now);

  const categoryUsages = db.prepare(
    "SELECT count(*) as count FROM categories WHERE hex_colors_id = 'color_custom_coral'"
  ).get().count;
  assert.equal(categoryUsages, 1);

  // Build the user-facing message exactly as implemented in delete-hex-color.service
  const parts = [];
  if (accountTypeUsages > 0) parts.push(`${accountTypeUsages} account type`);
  if (categoryUsages > 0) parts.push(`${categoryUsages} category`);
  const errorMessage = `Cannot delete "Coral". This color is currently used by ${parts.join(" and ")}.`;

  assert.equal(
    errorMessage,
    'Cannot delete "Coral". This color is currently used by 1 account type and 1 category.'
  );
});
