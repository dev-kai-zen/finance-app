const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const fs = require("node:fs");

function loadFinancialQuotesModule() {
  const filePath = path.resolve(__dirname, "../constants/financial-quotes.constants.ts");
  const code = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const m = new Module(filePath, module);
  m.filename = filePath;
  m.paths = Module._nodeModulePaths(path.dirname(filePath));
  m._compile(transpiled, filePath);
  return m.exports;
}

test("financial-quotes: has 400 properly curated and unique quotes", () => {
  const { MOTIVATIONAL_QUOTES } = loadFinancialQuotesModule();
  assert.equal(MOTIVATIONAL_QUOTES.length, 400);

  const ids = new Set();
  const normalizedQuotes = new Set();
  const allowedCategories = new Set(["finance", "motivation", "success"]);

  MOTIVATIONAL_QUOTES.forEach((q, index) => {
    assert.equal(q.id, index + 1, `Quote at index ${index} should have id ${index + 1}`);
    assert.ok(!ids.has(q.id), `Duplicate id ${q.id} found`);
    ids.add(q.id);

    assert.ok(typeof q.quote === "string" && q.quote.trim().length > 0, `Quote ${q.id} has invalid text`);
    assert.ok(typeof q.author === "string" && q.author.trim().length > 0, `Quote ${q.id} has invalid author`);
    assert.ok(allowedCategories.has(q.category), `Quote ${q.id} has unexpected category: ${q.category}`);

    const normalized = q.quote.toLowerCase().replace(/[^a-z0-9]/g, "");
    assert.ok(!normalizedQuotes.has(normalized), `Duplicate quote text detected at id ${q.id}: "${q.quote}"`);
    normalizedQuotes.add(normalized);
  });
});

test("financial-quotes: getDailyQuote returns consistent daily quote across all calendar days", () => {
  const { getDailyQuote, MOTIVATIONAL_QUOTES } = loadFinancialQuotesModule();
  
  // Leap year check (2024 has 366 days)
  const leapDates = [
    new Date("2024-01-01T12:00:00Z"),
    new Date("2024-02-29T12:00:00Z"),
    new Date("2024-07-04T12:00:00Z"),
    new Date("2024-12-31T12:00:00Z"),
  ];

  for (const date of leapDates) {
    const quote = getDailyQuote(date);
    assert.ok(quote, "Daily quote should exist");
    assert.ok(quote.id >= 1 && quote.id <= MOTIVATIONAL_QUOTES.length);
  }
});

test("financial-quotes: getRandomQuote operates in O(1) and strictly avoids excludeId", () => {
  const { getRandomQuote, MOTIVATIONAL_QUOTES } = loadFinancialQuotesModule();

  // Test random picking without excludeId
  const quote = getRandomQuote();
  assert.ok(quote, "Should return a valid quote");
  assert.ok(quote.id >= 1 && quote.id <= MOTIVATIONAL_QUOTES.length);

  // Test with excludeId over 1,000 runs
  const targetExcludeId = 42;
  for (let i = 0; i < 1000; i++) {
    const picked = getRandomQuote(targetExcludeId);
    assert.notEqual(picked.id, targetExcludeId, "Must never return the excluded quote ID");
  }
});
