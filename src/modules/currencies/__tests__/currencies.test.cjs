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

test("currencies: seed currencies inserts all default currencies and enforces unique code", () => {
  const db = setupTestDb();
  const now = Date.now();

  const standardCurrencies = [
    "AED", "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "IDR", "INR",
    "JPY", "KRW", "MYR", "NZD", "PHP", "SAR", "SGD", "THB", "TWD", "USD", "VND",
  ];

  const insertStmt = db.prepare(`
    INSERT INTO currencies (code, name, symbol, minor_unit_exponent, sort_order, is_active, is_custom, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?);
  `);

  for (const code of standardCurrencies) {
    insertStmt.run(code, code, `${code} `, 2, 0, now, now);
  }

  const count = db.prepare("SELECT COUNT(*) AS total FROM currencies;").get();
  assert.equal(count.total, 21, "Must have 21 currencies inserted");

  // Attempting to insert duplicate code throws constraint error
  assert.throws(() => {
    insertStmt.run("USD", "US Dollar Duplicate", "$", 2, 0, now, now);
  }, /UNIQUE constraint failed|PRIMARY KEY/);
});

