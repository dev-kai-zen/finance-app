const { test } = require("node:test");
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

test("currencies: exchange_rates table contains initial default seed rates", () => {
  const db = setupTestDb();

  const rows = db.prepare(
    "SELECT base_currency, quote_currency, rate_basis_points FROM exchange_rates WHERE base_currency = 'PHP';"
  ).all();

  assert.ok(rows.length >= 10, "Must have at least 10 seeded rates");

  const usdRow = rows.find((r) => r.quote_currency === "USD");
  assert.ok(usdRow, "Must have USD rate");
  assert.equal(usdRow.rate_basis_points, 585000, "1 USD = 58.50 PHP (585,000 bps)");

  const eurRow = rows.find((r) => r.quote_currency === "EUR");
  assert.ok(eurRow, "Must have EUR rate");
  assert.equal(eurRow.rate_basis_points, 635000, "1 EUR = 63.50 PHP (635,000 bps)");

  const jpyRow = rows.find((r) => r.quote_currency === "JPY");
  assert.ok(jpyRow, "Must have JPY rate");
  assert.equal(jpyRow.rate_basis_points, 3900, "1 JPY = 0.39 PHP (3,900 bps)");
});

test("currencies: upsert exchange rate updates existing rate on conflict", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO exchange_rates (id, base_currency, quote_currency, rate_basis_points, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(base_currency, quote_currency) DO UPDATE SET
      rate_basis_points = excluded.rate_basis_points,
      updated_at = excluded.updated_at;
  `).run("rate_php_usd", "PHP", "USD", 600000, now, now);

  const row = db.prepare(
    "SELECT rate_basis_points FROM exchange_rates WHERE base_currency = 'PHP' AND quote_currency = 'USD';"
  ).get();

  assert.equal(row.rate_basis_points, 600000, "USD rate updated to 60.00 PHP");
});
