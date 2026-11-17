const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const {
  calculateMonthlyBurnRate,
  calculateNextRenewal,
  calculateYearlyProjection,
  getDaysUntilRenewal,
} = require("../utils/renewal-calculator.ts");

test("monthly burn rate calculates accurately across cadences", () => {
  // Monthly PHP 500 = 500
  assert.equal(calculateMonthlyBurnRate(50000, "monthly", 1), 50000);

  // Every 2 months PHP 1000 = 500
  assert.equal(calculateMonthlyBurnRate(100000, "monthly", 2), 50000);

  // Annual PHP 1200 = 100
  assert.equal(calculateMonthlyBurnRate(120000, "yearly", 1), 10000);

  // Quarterly PHP 300 = 100
  assert.equal(calculateMonthlyBurnRate(30000, "quarterly", 1), 10000);

  // Semi-annual PHP 600 = 100
  assert.equal(calculateMonthlyBurnRate(60000, "semi_annual", 1), 10000);

  // Weekly PHP 100 = round((100 * 52) / 12) = 433.33
  assert.equal(calculateMonthlyBurnRate(10000, "weekly", 1), 43333);
});

test("yearly projection multiplies monthly burn rate by 12", () => {
  assert.equal(calculateYearlyProjection(10000), 120000);
});

test("calculateNextRenewal advances dates correctly", () => {
  const base = new Date(2026, 0, 15); // Jan 15, 2026

  const nextMonth = calculateNextRenewal(base, "monthly", 1);
  assert.equal(nextMonth.getMonth(), 1); // Feb
  assert.equal(nextMonth.getDate(), 15);

  const nextYear = calculateNextRenewal(base, "yearly", 1);
  assert.equal(nextYear.getFullYear(), 2027);

  const nextWeek = calculateNextRenewal(base, "weekly", 1);
  assert.equal(nextWeek.getDate(), 22); // Jan 22

  const nextQuarter = calculateNextRenewal(base, "quarterly", 1);
  assert.equal(nextQuarter.getMonth(), 3); // April
});

test("calculateNextRenewal clamps month-end without month rollover and restores anchorDay", () => {
  // Jan 31, 2026 -> Feb 28, 2026 (non-leap year)
  const jan31 = new Date(2026, 0, 31);
  const feb = calculateNextRenewal(jan31, "monthly", 1, 31);
  assert.equal(feb.getFullYear(), 2026);
  assert.equal(feb.getMonth(), 1); // February
  assert.equal(feb.getDate(), 28);

  // Feb 28 with anchorDay 31 -> March 31
  const march = calculateNextRenewal(feb, "monthly", 1, 31);
  assert.equal(march.getFullYear(), 2026);
  assert.equal(march.getMonth(), 2); // March
  assert.equal(march.getDate(), 31);

  // Feb 17 quarterly -> May 17
  const feb17 = new Date(2026, 1, 17);
  const may17 = calculateNextRenewal(feb17, "quarterly", 1);
  assert.equal(may17.getMonth(), 4); // May
  assert.equal(may17.getDate(), 17);

  // Feb 17 semi-annual -> Aug 17
  const aug17 = calculateNextRenewal(feb17, "semi_annual", 1);
  assert.equal(aug17.getMonth(), 7); // August
  assert.equal(aug17.getDate(), 17);
});

test("getDaysUntilRenewal computes correct day offsets", () => {
  const now = new Date(2026, 0, 10, 12, 0, 0);

  const today = new Date(2026, 0, 10, 20, 0, 0);
  assert.equal(getDaysUntilRenewal(today, now), 0);

  const tomorrow = new Date(2026, 0, 11, 8, 0, 0);
  assert.equal(getDaysUntilRenewal(tomorrow, now), 1);

  const inFiveDays = new Date(2026, 0, 15, 9, 0, 0);
  assert.equal(getDaysUntilRenewal(inFiveDays, now), 5);

  const past = new Date(2026, 0, 8, 10, 0, 0);
  assert.equal(getDaysUntilRenewal(past, now), -2);
});
