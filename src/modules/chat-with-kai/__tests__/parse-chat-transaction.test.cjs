const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");
const fs = require("node:fs");

// Register .ts handler for require
require.extensions[".ts"] = function (module, filename) {
  const code = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(transpiled, filename);
};

const { parseChatTransaction } = require("../services/parse-chat-transaction.service.ts");

const mockAccounts = [
  { id: "acc-wallet", name: "Wallet", currencyCode: "PHP" },
  { id: "acc-bdo", name: "BDO", currencyCode: "PHP" },
  { id: "acc-gcash", name: "GCash", currencyCode: "PHP" },
  { id: "acc-billetera", name: "Billetera", currencyCode: "USD" },
];

const mockCategories = [
  { id: "cat-food", name: "Food & Dining", type: "expense", icon: "utensils" },
  { id: "cat-transport", name: "Transportation", type: "expense", icon: "car" },
  { id: "cat-utilities", name: "Bills & Utilities", type: "expense", icon: "zap" },
  { id: "cat-salary", name: "Salary", type: "income", icon: "briefcase" },
];

const defaultContext = {
  accounts: mockAccounts,
  categories: mockCategories,
  defaultExpenseAccountId: "acc-wallet",
  defaultCurrency: "PHP",
  language: "en",
};

test("parse-chat-transaction: parses user example 'I spend 500 on lunch on Mcdonalds from my wallet'", () => {
  const result = parseChatTransaction(
    "I spend 500 on lunch on Mcdonalds from my wallet",
    defaultContext,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "expense");
    assert.equal(result.proposal.amountMinorUnits, 50000);
    assert.equal(result.proposal.accountId, "acc-wallet");
    assert.equal(result.proposal.categoryName, "Food & Dining");
    assert.equal(result.proposal.name, "McDonald's");
  }
});

test("parse-chat-transaction: parses income 'Received 25000 salary from Acme Corp to BDO'", () => {
  const result = parseChatTransaction(
    "Received 25000 salary from Acme Corp to BDO",
    defaultContext,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "income");
    assert.equal(result.proposal.amountMinorUnits, 2500000);
    assert.equal(result.proposal.accountId, "acc-bdo");
    assert.equal(result.proposal.categoryName, "Salary");
    assert.equal(result.proposal.name, "Acme Corp");
  }
});

test("parse-chat-transaction: parses transfer 'Transfer 2000 from BDO to GCash'", () => {
  const result = parseChatTransaction(
    "Transfer 2000 from BDO to GCash",
    defaultContext,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "transfer");
    assert.equal(result.proposal.amountMinorUnits, 200000);
    assert.equal(result.proposal.accountId, "acc-bdo");
    assert.equal(result.proposal.transferAccountId, "acc-gcash");
  }
});

test("parse-chat-transaction: parses Filipino 'Gumastos ng 150 sa kape sa Starbucks gamit ang GCash'", () => {
  const result = parseChatTransaction(
    "Gumastos ng 150 sa kape sa Starbucks gamit ang GCash",
    { ...defaultContext, language: "fil" },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "expense");
    assert.equal(result.proposal.amountMinorUnits, 15000);
    assert.equal(result.proposal.accountId, "acc-gcash");
    assert.equal(result.proposal.categoryName, "Food & Dining");
    assert.equal(result.proposal.name, "Starbucks");
  }
});

test("parse-chat-transaction: parses Spanish 'Gasté 500 en almuerzo en Mcdonalds de mi billetera'", () => {
  const result = parseChatTransaction(
    "Gasté 500 en almuerzo en Mcdonalds de mi billetera",
    { ...defaultContext, language: "es" },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "expense");
    assert.equal(result.proposal.amountMinorUnits, 50000);
    assert.equal(result.proposal.accountId, "acc-billetera");
    assert.equal(result.proposal.categoryName, "Food & Dining");
    assert.equal(result.proposal.name, "McDonald's");
  }
});

test("parse-chat-transaction: returns failure when amount is missing", () => {
  const result = parseChatTransaction(
    "I bought lunch at McDonald's",
    defaultContext,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, "missing_amount");
    assert.ok(result.message.length > 0);
    assert.ok(result.suggestedPrompts.length > 0);
  }
});

test("parse-chat-transaction: resolves custom learned category and account keywords via dynamic maps", () => {
  const customCatMap = new Map([
    ["special drink", "cat-food"],
    ["train ticket", "cat-transport"],
  ]);
  const customAccMap = new Map([
    ["my emergency cash", "acc-wallet"],
  ]);

  const result = parseChatTransaction(
    "Paid 120 for special drink using my emergency cash",
    {
      ...defaultContext,
      categoryKeywordsMap: customCatMap,
      accountKeywordsMap: customAccMap,
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.amountMinorUnits, 12000);
    assert.equal(result.proposal.categoryId, "cat-food");
    assert.equal(result.proposal.accountId, "acc-wallet");
  }
});

test("parse-chat-transaction: recognizes dynamic custom action keywords", () => {
  const customActionMap = new Map([
    ["disburse", "expense"],
    ["acquired", "income"],
    ["shift", "transfer"],
  ]);

  const expenseResult = parseChatTransaction("Disburse 300 for lunch from wallet", {
    ...defaultContext,
    actionKeywordsMap: customActionMap,
  });
  assert.equal(expenseResult.success, true);
  if (expenseResult.success) {
    assert.equal(expenseResult.proposal.type, "expense");
  }

  const incomeResult = parseChatTransaction("Acquired 5000 bonus to BDO", {
    ...defaultContext,
    actionKeywordsMap: customActionMap,
  });
  assert.equal(incomeResult.success, true);
  if (incomeResult.success) {
    assert.equal(incomeResult.proposal.type, "income");
  }

  const transferResult = parseChatTransaction("Shift 1500 from BDO to GCash", {
    ...defaultContext,
    actionKeywordsMap: customActionMap,
  });
  assert.equal(transferResult.success, true);
  if (transferResult.success) {
    assert.equal(transferResult.proposal.type, "transfer");
  }
});

test("parse-chat-transaction: rejects transaction with unknown_account when explicit account does not exist", () => {
  const result = parseChatTransaction(
    "I spent 500 on lunch at Mcdonalds using my wallet",
    {
      ...defaultContext,
      accounts: [{ id: "acc-bdo", name: "BDO", currencyCode: "PHP" }],
      defaultExpenseAccountId: "acc-bdo",
    },
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, "unknown_account");
    assert.ok(result.message.includes("wallet"));
  }
});

test("parse-chat-transaction: falls back to default account when NO account is mentioned", () => {
  const result = parseChatTransaction(
    "I spent 500 on lunch at Mcdonalds",
    {
      ...defaultContext,
      accounts: [{ id: "acc-bdo", name: "BDO", currencyCode: "PHP" }],
      defaultExpenseAccountId: "acc-bdo",
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.accountId, "acc-bdo");
    assert.equal(result.proposal.amountMinorUnits, 50000);
  }
});


