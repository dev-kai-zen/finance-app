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

test("parse-chat-transaction: falls back to default expense account when NO account is mentioned for expense", () => {
  const result = parseChatTransaction(
    "I spent 500 on lunch at Mcdonalds",
    {
      ...defaultContext,
      accounts: [
        { id: "acc-bdo", name: "BDO", currencyCode: "PHP" },
        { id: "acc-wallet", name: "Wallet", currencyCode: "PHP" },
      ],
      defaultExpenseAccountId: "acc-wallet",
      defaultIncomeAccountId: "acc-bdo",
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.accountId, "acc-wallet");
    assert.equal(result.proposal.amountMinorUnits, 50000);
  }
});

test("parse-chat-transaction: falls back to default income account when NO account is mentioned for income", () => {
  const result = parseChatTransaction(
    "Received 25000 salary",
    {
      ...defaultContext,
      accounts: [
        { id: "acc-cash", name: "Cash", currencyCode: "PHP" },
        { id: "acc-bdo", name: "BDO Savings", currencyCode: "PHP" },
      ],
      defaultExpenseAccountId: "acc-cash",
      defaultIncomeAccountId: "acc-bdo",
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "income");
    assert.equal(result.proposal.accountId, "acc-bdo");
    assert.equal(result.proposal.amountMinorUnits, 2500000);
  }
});

test("parse-chat-transaction: income falls back to defaultExpenseAccountId when defaultIncomeAccountId is not configured", () => {
  const result = parseChatTransaction(
    "Received 5000 bonus",
    {
      ...defaultContext,
      accounts: [
        { id: "acc-gcash", name: "GCash", currencyCode: "PHP" },
        { id: "acc-bdo", name: "BDO", currencyCode: "PHP" },
      ],
      defaultExpenseAccountId: "acc-gcash",
      defaultIncomeAccountId: null,
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.type, "income");
    assert.equal(result.proposal.accountId, "acc-gcash");
  }
});

test("parse-chat-transaction: attaches default pocket when falling back to default account", () => {
  const result = parseChatTransaction(
    "Spent 300 on groceries",
    {
      ...defaultContext,
      accounts: [
        { id: "acc-gcash", name: "GCash", currencyCode: "PHP" },
      ],
      pockets: [
        { id: "pkt-food", accountId: "acc-gcash", name: "Food Allowance" },
      ],
      defaultExpenseAccountId: "acc-gcash",
      defaultExpensePocketId: "pkt-food",
    },
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.accountId, "acc-gcash");
    assert.equal(result.proposal.pocketId, "pkt-food");
    assert.equal(result.proposal.pocketName, "Food Allowance");
  }
});

test("parse-chat-transaction: detects multiple ambiguous amounts", () => {
  const result = parseChatTransaction(
    "Spent 500 on lunch and 100 on tip using my wallet",
    defaultContext,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, "multiple_amounts");
    assert.ok(result.suggestedAmounts);
    assert.deepEqual(result.suggestedAmounts, [500, 100]);
  }
});

test("parse-chat-transaction: returns missing_category when category cannot be inferred and does NOT fallback to first category", () => {
  const customContext = {
    ...defaultContext,
    categories: [
      { id: "cat-housing", name: "Housing", type: "expense", icon: "home" },
      { id: "cat-other", name: "Other Category", type: "expense", icon: "tag" },
    ],
  };

  const result = parseChatTransaction(
    "Spent 350 at MysteriousShopX using my wallet",
    customContext,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, "missing_category");
    assert.ok(result.partialProposal);
    assert.equal(result.partialProposal.amountMinorUnits, 35000);
    assert.equal(result.partialProposal.categoryId, null);
    assert.equal(result.partialProposal.categoryName, null);
  }
});

test("parse-chat-transaction: auto-learns category and account from merchant history", () => {
  const mockHistory = (name) => {
    if (name.toLowerCase().includes("shell")) {
      return {
        merchantName: "Shell",
        mostFrequentCategoryId: "cat-transport",
        mostFrequentAccountId: "acc-bdo",
        lastAmountMinorUnits: 150000,
        transactionCount: 5,
      };
    }
    return null;
  };

  const result = parseChatTransaction("Shell 1500", {
    ...defaultContext,
    getMerchantHistory: mockHistory,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.name, "Shell");
    assert.equal(result.proposal.amountMinorUnits, 150000);
    assert.equal(result.proposal.categoryId, "cat-transport");
    assert.equal(result.proposal.accountId, "acc-bdo");
  }
});

test("parse-chat-transaction: flags potential duplicate transaction within 24 hours", () => {
  const mockDuplicateCheck = ({ amountMinorUnits, name }) => {
    return {
      isDuplicate: true,
      duplicateCount: 1,
      lastOccurredAt: new Date(Date.now() - 3600000),
    };
  };

  const result = parseChatTransaction("Spent 500 on lunch at Mcdonalds", {
    ...defaultContext,
    findRecentDuplicateTransaction: mockDuplicateCheck,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.isPotentialDuplicate, true);
    assert.ok(result.proposal.duplicateWarningMessage?.includes("similar transaction"));
  }
});

test("parse-chat-transaction: clean note defaults to null unless explicit note/memo is written", () => {
  const resultWithoutNote = parseChatTransaction(
    "I spent 500 on lunch on Mcdonalds from my wallet",
    defaultContext,
  );
  assert.equal(resultWithoutNote.success, true);
  if (resultWithoutNote.success) {
    assert.equal(resultWithoutNote.proposal.note, null);
  }

  const resultWithExplicitNote = parseChatTransaction(
    "I spent 500 on lunch at Mcdonalds from my wallet note: team celebration",
    defaultContext,
  );
  assert.equal(resultWithExplicitNote.success, true);
  if (resultWithExplicitNote.success) {
    assert.equal(resultWithExplicitNote.proposal.note, "Team celebration");
  }
});

test("parse-chat-transaction: resolves custom merchant and default category from merchantKeywordsMap", () => {
  const mockMerchantMap = new Map([
    [
      "lola nena's",
      {
        merchantId: "merch-lola",
        name: "Lola Nena's",
        defaultCategoryId: "cat-food",
        defaultAccountId: "acc-gcash",
      },
    ],
  ]);

  const result = parseChatTransaction("Lola Nena's 350", {
    ...defaultContext,
    merchantKeywordsMap: mockMerchantMap,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.name, "Lola Nena's");
    assert.equal(result.proposal.amountMinorUnits, 35000);
    assert.equal(result.proposal.categoryId, "cat-food");
    assert.equal(result.proposal.accountId, "acc-gcash");
    assert.equal(result.proposal.note, null);
  }
});
test("parse-chat-transaction: prioritizes Asset over Liability when account names are identical", () => {
  const accountsWithDuplicateNames = [
    {
      id: "acc-gcash-liability",
      name: "GCASH",
      currencyCode: "PHP",
      sortOrder: 0,
      accountType: { id: "type-liability", name: "Credit/Loan", accountGroup: "liability" },
    },
    {
      id: "acc-gcash-asset",
      name: "GCASH",
      currencyCode: "PHP",
      sortOrder: 1,
      accountType: { id: "type-ewallet", name: "E-Wallet", accountGroup: "asset" },
    },
  ];

  const result = parseChatTransaction("Lunch 250 using Gcash", {
    ...defaultContext,
    accounts: accountsWithDuplicateNames,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.proposal.accountId, "acc-gcash-asset");
    assert.equal(result.proposal.accountName, "GCASH");
    assert.equal(result.proposal.accountGroup, "asset");
  }
});
