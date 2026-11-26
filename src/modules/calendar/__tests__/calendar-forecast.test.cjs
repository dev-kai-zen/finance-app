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

require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const { calculateProjectedMonthEndNet } = require("../utils/calendar-forecast");

const identityConvert = (amount) => amount;
const emptyAccountMap = new Map();

test("CAL-F01: Baseline ordinary income and expense with no pending schedules", () => {
  const transactions = [
    { type: "income", amountMinorUnits: 20000, accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: -10000, accountCurrency: "PHP" },
  ];
  const schedules = [];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 10000); // +₱100.00
});

test("CAL-F01: Refund netting - expense refund is not counted twice", () => {
  // Food expense -100, Food refund +20, salary +200; no pending schedules
  // Pre-fix bug counted refund twice (+14000). Fixed must equal +12000 (+₱120.00).
  const transactions = [
    { type: "income", amountMinorUnits: 20000, accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: -10000, accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: 2000, accountCurrency: "PHP" }, // Refund: expense type, positive amount
  ];
  const schedules = [];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 12000); // Exactly +₱120.00, NOT +₱140.00
});

test("CAL-F01: Pending scheduled bill deducts from forecast instead of adding", () => {
  // Ledger net +120, pending ordinary bill -50 (stored as -5000)
  // Pre-fix bug produced +19000. Fixed must equal +7000 (+₱70.00).
  const transactions = [
    { type: "income", amountMinorUnits: 20000, accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: -10000, accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: 2000, accountCurrency: "PHP" },
  ];
  const schedules = [
    {
      status: "due",
      transactionType: "expense",
      amountMinorUnits: -5000, // Ordinary schedule stored negative
      accountId: "acc-1",
    },
  ];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 7000); // Exactly +₱70.00, NOT +₱190.00
});

test("CAL-F01: Guard against unsigned positive expense schedule", () => {
  // Even if an external or legacy schedule occurrence has positive minor units,
  // transactionType === 'expense' must strictly deduct.
  const transactions = [
    { type: "income", amountMinorUnits: 10000, accountCurrency: "PHP" },
  ];
  const schedules = [
    {
      status: "upcoming",
      transactionType: "expense",
      amountMinorUnits: 3000, // Positive minor units on an expense schedule
      accountId: "acc-1",
    },
  ];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 7000); // 10000 - 3000 = 7000
});

test("CAL-F01: Pending scheduled income increases forecast", () => {
  const transactions = [
    { type: "income", amountMinorUnits: 10000, accountCurrency: "PHP" },
  ];
  const schedules = [
    {
      status: "upcoming",
      transactionType: "income",
      amountMinorUnits: 5000,
      accountId: "acc-1",
    },
  ];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 15000);
});

test("CAL-F01: Income reversal is not deducted twice", () => {
  // Income 20000, reversal -5000 (income type, negative amount)
  // Pre-fix bug deducted reversal twice (+10000). Fixed must equal +15000.
  const transactions = [
    { type: "income", amountMinorUnits: 20000, accountCurrency: "PHP" },
    { type: "income", amountMinorUnits: -5000, accountCurrency: "PHP" },
  ];
  const schedules = [];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 15000);
});

test("CAL-F01: Transfers and deleted transactions are excluded from net forecast", () => {
  const transactions = [
    { type: "income", amountMinorUnits: 10000, accountCurrency: "PHP" },
    { type: "transfer", amountMinorUnits: -5000, accountCurrency: "PHP" },
    { type: "transfer", amountMinorUnits: 5000, accountCurrency: "PHP" },
    {
      type: "expense",
      amountMinorUnits: -4000,
      accountCurrency: "PHP",
      deletedAt: "2026-11-20T00:00:00Z",
    },
  ];
  const schedules = [
    {
      status: "due",
      transactionType: "transfer",
      amountMinorUnits: 10000,
      accountId: "acc-1",
    },
  ];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 10000);
});

test("CAL-F01: Non-pending schedule statuses (posted, skipped, failed) are excluded", () => {
  const transactions = [
    { type: "income", amountMinorUnits: 10000, accountCurrency: "PHP" },
  ];
  const schedules = [
    {
      status: "posted",
      transactionType: "expense",
      amountMinorUnits: -2000,
      accountId: "acc-1",
    },
    {
      status: "skipped",
      transactionType: "expense",
      amountMinorUnits: -3000,
      accountId: "acc-1",
    },
    {
      status: "failed",
      transactionType: "expense",
      amountMinorUnits: -4000,
      accountId: "acc-1",
    },
  ];

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    emptyAccountMap,
    identityConvert,
  );

  assert.equal(result, 10000); // None of the non-pending schedules alter forecast
});

test("CAL-F01: Multi-currency conversion applies before aggregation", () => {
  const transactions = [
    { type: "income", amountMinorUnits: 10000, accountCurrency: "PHP" }, // 10000
    { type: "expense", amountMinorUnits: -100, accountCurrency: "USD" }, // -100 USD * 50 = -5000 PHP
  ];
  const schedules = [
    {
      status: "due",
      transactionType: "expense",
      amountMinorUnits: -20, // -20 USD * 50 = -1000 PHP
      accountId: "acc-usd",
    },
  ];
  const accountMap = new Map([["acc-usd", "USD"]]);
  const convert = (amount, currency) => {
    if (currency === "USD") return amount * 50;
    return amount;
  };

  const result = calculateProjectedMonthEndNet(
    transactions,
    schedules,
    accountMap,
    convert,
  );

  // 10000 + (-5000) + (-1000) = 4000 PHP
  assert.equal(result, 4000);
});
