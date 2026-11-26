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

const { buildCategoryExpenseBreakdown } = require("../utils/category-expense-breakdown");

const categories = [
  { id: "cat_groceries", name: "Groceries", icon: "shopping-cart", color: "#22c55e" },
  { id: "cat_dining", name: "Dining", icon: "utensils", color: "#f97316" },
  { id: "cat_shopping", name: "Shopping", icon: "shopping-bag", color: "#3b82f6" },
  { id: "cat_electronics", name: "Electronics", icon: "tv", color: "#a855f7" },
];

const identityConvert = (amount) => amount;

test("CAL-F02: Baseline ordinary expense assigns 100% to single category", () => {
  const transactions = [
    { type: "expense", amountMinorUnits: -10000, categoryId: "cat_groceries", accountCurrency: "PHP" },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].id, "cat_groceries");
  assert.equal(breakdown[0].totalMinorUnits, 10000); // ₱100.00
  assert.equal(breakdown[0].percentage, 100);
});

test("CAL-F02: Refund netting - expense -100 plus refund +20 yields 80 spent, not 120", () => {
  // Food expense -100 (-10000), Food refund +20 (+2000)
  // Pre-fix bug produced 12000. Fixed must equal 8000 (₱80.00).
  const transactions = [
    { type: "expense", amountMinorUnits: -10000, categoryId: "cat_groceries", accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: 2000, categoryId: "cat_groceries", accountCurrency: "PHP" },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].id, "cat_groceries");
  assert.equal(breakdown[0].totalMinorUnits, 8000); // Exactly ₱80.00, NOT ₱120.00
  assert.equal(breakdown[0].percentage, 100);
});

test("CAL-F02: Refund-only category does not disguise refund as positive spending", () => {
  // Returned Electronics item (+5000) with no new expenses in that category
  // Pre-fix bug disguised this as +5000 positive spending with 100%.
  // Fixed must report -5000 with 0% percentage.
  const transactions = [
    { type: "expense", amountMinorUnits: -10000, categoryId: "cat_groceries", accountCurrency: "PHP" },
    { type: "expense", amountMinorUnits: 5000, categoryId: "cat_electronics", accountCurrency: "PHP" },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  const groceries = breakdown.find((item) => item.id === "cat_groceries");
  const electronics = breakdown.find((item) => item.id === "cat_electronics");

  assert.ok(groceries);
  assert.ok(electronics);
  assert.equal(groceries.totalMinorUnits, 10000);
  assert.equal(electronics.totalMinorUnits, -5000); // Negative net spending
  assert.equal(electronics.percentage, 0); // Not disguised as positive %
});

test("CAL-F02: Split expense and split refund properly net across split categories", () => {
  // Split Expense: 500 PHP (-50000) -> Dining 300 (30000), Shopping 200 (20000)
  // Split Refund: 100 PHP (+10000) -> Dining 100 (10000)
  const transactions = [
    {
      type: "expense",
      amountMinorUnits: -50000,
      isSplit: true,
      accountCurrency: "PHP",
      splitEntries: [
        { categoryId: "cat_dining", amountMinorUnits: 30000 },
        { categoryId: "cat_shopping", amountMinorUnits: 20000 },
      ],
    },
    {
      type: "expense",
      amountMinorUnits: 10000, // Parent refund
      isSplit: true,
      accountCurrency: "PHP",
      splitEntries: [
        { categoryId: "cat_dining", amountMinorUnits: 10000 },
      ],
    },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  const dining = breakdown.find((item) => item.id === "cat_dining");
  const shopping = breakdown.find((item) => item.id === "cat_shopping");

  assert.ok(dining);
  assert.ok(shopping);
  // Dining net: 30000 - 10000 = 20000 (₱200.00), NOT 40000
  assert.equal(dining.totalMinorUnits, 20000);
  assert.equal(shopping.totalMinorUnits, 20000);
  assert.equal(dining.percentage, 50);
  assert.equal(shopping.percentage, 50);
});

test("CAL-F02: Income, transfer, and deleted transactions are excluded", () => {
  const transactions = [
    { type: "expense", amountMinorUnits: -10000, categoryId: "cat_groceries", accountCurrency: "PHP" },
    { type: "income", amountMinorUnits: 50000, categoryId: "cat_groceries", accountCurrency: "PHP" },
    { type: "transfer", amountMinorUnits: -20000, categoryId: "cat_groceries", accountCurrency: "PHP" },
    {
      type: "expense",
      amountMinorUnits: -30000,
      categoryId: "cat_shopping",
      accountCurrency: "PHP",
      deletedAt: "2026-11-20T00:00:00Z",
    },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].id, "cat_groceries");
  assert.equal(breakdown[0].totalMinorUnits, 10000);
});

test("CAL-F02: Multi-currency conversion retains signed direction", () => {
  const transactions = [
    { type: "expense", amountMinorUnits: -100, categoryId: "cat_shopping", accountCurrency: "USD" }, // -100 USD * 50 = +5000 PHP spending
    { type: "expense", amountMinorUnits: 20, categoryId: "cat_shopping", accountCurrency: "USD" }, // +20 USD refund * 50 = -1000 PHP spending
  ];
  const convert = (amount, currency) => (currency === "USD" ? amount * 50 : amount);

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, convert);

  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].id, "cat_shopping");
  assert.equal(breakdown[0].totalMinorUnits, 4000); // 5000 - 1000 = 4000 PHP
});

test("CAL-F02: All-refund month with net negative overall spending produces 0% for all items", () => {
  const transactions = [
    { type: "expense", amountMinorUnits: 5000, categoryId: "cat_groceries", accountCurrency: "PHP" },
  ];

  const breakdown = buildCategoryExpenseBreakdown(transactions, categories, identityConvert);

  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].totalMinorUnits, -5000);
  assert.equal(breakdown[0].percentage, 0); // No NaN or negative percentage
});
