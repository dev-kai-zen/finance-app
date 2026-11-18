const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

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
const {
  calculateBurnRateSummary,
} = require("../services/calculate-burn-rate.service.ts");
const { SUBSCRIPTION_PRESETS } = require("../constants/subscription-presets.constants.ts");
const { subscriptionFormSchema } = require("../schemas/subscription.schema.ts");

test("presets catalog is valid and complete", () => {
  assert.ok(SUBSCRIPTION_PRESETS.length >= 10);
  for (const preset of SUBSCRIPTION_PRESETS) {
    assert.ok(preset.id.length > 0);
    assert.ok(preset.name.length > 0);
    assert.ok(preset.defaultAmountMinorUnits > 0);
    assert.ok(["weekly", "monthly", "quarterly", "semi_annual", "yearly"].includes(preset.defaultBillingCycle));
    assert.ok(preset.icon.length > 0);
    assert.ok(preset.color.startsWith("#"));
  }
});

test("calculateBurnRateSummary aggregates multiple subscriptions correctly", () => {
  const mockSubs = [
    {
      id: "sub-1",
      name: "Netflix",
      status: "active",
      amountMinorUnits: 50000, // PHP 500 / mo
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 3,
      archivedAt: null,
    },
    {
      id: "sub-2",
      name: "Amazon Prime",
      status: "active",
      amountMinorUnits: 120000, // PHP 1200 / yr = PHP 100 / mo
      billingCycle: "yearly",
      billingCycleInterval: 1,
      daysUntilRenewal: 15,
      archivedAt: null,
    },
    {
      id: "sub-3",
      name: "ChatGPT Plus",
      status: "trial",
      amountMinorUnits: 100000, // PHP 1000 / mo
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 5,
      archivedAt: null,
    },
    {
      id: "sub-4",
      name: "Paused Gym",
      status: "paused",
      amountMinorUnits: 250000,
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 20,
      archivedAt: null,
    },
    {
      id: "sub-5",
      name: "Archived Sub",
      status: "active",
      amountMinorUnits: 50000,
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 2,
      archivedAt: new Date(),
    },
  ];

  const summary = calculateBurnRateSummary(mockSubs, "PHP");

  // Burn rate: sub-1 (50000) + sub-2 (10000) + sub-3 (100000) = 160000
  assert.equal(summary.totalMonthlyBurnRateMinorUnits, 160000);
  assert.equal(summary.totalYearlyProjectedMinorUnits, 160000 * 12);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.trialCount, 1);
  assert.equal(summary.pausedCount, 1);
  // Due in 7 days: sub-1 (3d) + sub-3 (5d) = 2
  assert.equal(summary.upcomingCount7Days, 2);
  assert.equal(summary.currencyCode, "PHP");
});

test("calculateBurnRateSummary converts multi-currency subscriptions to base currency", () => {
  const multiCurrencySubs = [
    {
      id: "sub-usd",
      name: "Netflix US",
      status: "active",
      amountMinorUnits: 1500, // $15.00 USD
      currencyCode: "USD",
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 5,
      archivedAt: null,
    },
    {
      id: "sub-php",
      name: "PLDT",
      status: "active",
      amountMinorUnits: 150000, // ₱1500.00 PHP
      currencyCode: "PHP",
      billingCycle: "monthly",
      billingCycleInterval: 1,
      daysUntilRenewal: 10,
      archivedAt: null,
    },
  ];

  // Rates: 1 USD = 58 PHP (580,000 bps)
  const ratesMap = new Map([["USD", 580000]]);
  const summary = calculateBurnRateSummary(multiCurrencySubs, "PHP", ratesMap);

  // $15.00 * 58 = 870.00 PHP (87000 minor units) + 150000 PHP = 237000 PHP
  assert.equal(summary.totalMonthlyBurnRateMinorUnits, 237000);
  assert.equal(summary.currencyCode, "PHP");
});

test("subscriptionFormSchema validates valid and invalid payloads", () => {
  const valid = {
    name: "Spotify Family",
    amountMinorUnits: 23900,
    currencyCode: "PHP",
    billingCycle: "monthly",
    billingCycleInterval: 1,
    status: "active",
    firstBillingDate: new Date(),
    autoPost: true,
  };

  const parsed = subscriptionFormSchema.parse(valid);
  assert.equal(parsed.name, "Spotify Family");
  assert.equal(parsed.amountMinorUnits, 23900);
  assert.equal(parsed.autoPost, true);

  // Fails with empty name
  assert.throws(() => {
    subscriptionFormSchema.parse({
      ...valid,
      name: "",
    });
  });

  // Fails with invalid cycle
  assert.throws(() => {
    subscriptionFormSchema.parse({
      ...valid,
      billingCycle: "hourly",
    });
  });
});

test("subscriptionFormSchema supports pocketId and endsOn attributes", () => {
  const payloadWithPocketAndEnd = {
    name: "Gym Membership",
    amountMinorUnits: 150000,
    currencyCode: "PHP",
    billingCycle: "monthly",
    billingCycleInterval: 1,
    status: "active",
    firstBillingDate: new Date("2026-01-01"),
    autoPost: true,
    pocketId: "pocket-123",
    endsOn: new Date("2026-12-31"),
  };

  const parsed = subscriptionFormSchema.parse(payloadWithPocketAndEnd);
  assert.equal(parsed.pocketId, "pocket-123");
  assert.equal(parsed.endsOn.getFullYear(), 2026);
});
