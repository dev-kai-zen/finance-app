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

test("monitor: discovers all schema tables from sqlite_master", () => {
  const db = setupTestDb();

  const tables = db.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;"
  ).all();

  const tableNames = tables.map((t) => t.name);

  assert.ok(tableNames.includes("accounts"), "Must include accounts table");
  assert.ok(tableNames.includes("account_types"), "Must include account_types table");
  assert.ok(tableNames.includes("categories"), "Must include categories table");
  assert.ok(tableNames.includes("transactions"), "Must include transactions table");
  assert.ok(tableNames.includes("settings"), "Must include settings table");
});

test("monitor: inspects columns, primary keys, and types via PRAGMA table_info", () => {
  const db = setupTestDb();

  const columns = db.prepare("PRAGMA table_info('transactions');").all();
  const colNames = columns.map((c) => c.name);

  assert.ok(colNames.includes("id"));
  assert.ok(colNames.includes("account_id"));
  assert.ok(colNames.includes("category_id"));
  assert.ok(colNames.includes("transfer_account_id"));
  assert.ok(colNames.includes("type"));
  assert.ok(colNames.includes("amount_cents"));
  assert.ok(colNames.includes("occurred_at"));

  const idCol = columns.find((c) => c.name === "id");
  assert.equal(idCol.pk, 1, "id must be primary key");
});

test("monitor: executes arbitrary SELECT and measures row count", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.exec(`
    INSERT INTO categories (id, name, type, color, icon, is_system, created_at, updated_at)
    VALUES ('cat_t1', 'Dining Out', 'expense', 'orange', 'utensils', 0, ${now}, ${now}),
           ('cat_t2', 'Internet', 'expense', 'blue', 'wifi', 0, ${now}, ${now});
  `);

  const rows = db.prepare("SELECT id, name, type FROM categories WHERE is_system = 0;").all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "cat_t1");
  assert.equal(rows[1].id, "cat_t2");
});
