const test = require("node:test");
const assert = require("node:assert/strict");
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
  resolveScheduledDefaultLocation,
} = require("../utils/resolve-scheduled-defaults.ts");

const mockAccounts = [
  { id: "acc-1", name: "Wallet", isArchived: false },
  { id: "acc-2", name: "Bank", isArchived: false },
  { id: "acc-archived", name: "Old Bank", isArchived: true },
];

const mockPockets = [
  { id: "pocket-1", accountId: "acc-1", name: "Groceries", isArchived: false },
  { id: "pocket-archived", accountId: "acc-1", name: "Old Pocket", isArchived: true },
  { id: "pocket-2", accountId: "acc-2", name: "Savings", isArchived: false },
];

test("resolveScheduledDefaultLocation: returns default expense account and pocket for expense", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "expense",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: "acc-1",
    defaultExpensePocketId: "pocket-1",
    defaultIncomeAccountId: "acc-2",
    defaultIncomePocketId: "pocket-2",
  });

  assert.equal(result.accountId, "acc-1");
  assert.equal(result.pocketId, "pocket-1");
});

test("resolveScheduledDefaultLocation: returns default income account and pocket for income", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "income",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: "acc-1",
    defaultExpensePocketId: "pocket-1",
    defaultIncomeAccountId: "acc-2",
    defaultIncomePocketId: "pocket-2",
  });

  assert.equal(result.accountId, "acc-2");
  assert.equal(result.pocketId, "pocket-2");
});

test("resolveScheduledDefaultLocation: falls back to first active account when no default configured", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "expense",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: null,
    defaultExpensePocketId: null,
  });

  assert.equal(result.accountId, "acc-1");
  assert.equal(result.pocketId, null);
});

test("resolveScheduledDefaultLocation: falls back to first active account when default account is archived", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "expense",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: "acc-archived",
  });

  assert.equal(result.accountId, "acc-1");
  assert.equal(result.pocketId, null);
});

test("resolveScheduledDefaultLocation: ignores archived pocket for default account", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "expense",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: "acc-1",
    defaultExpensePocketId: "pocket-archived",
  });

  assert.equal(result.accountId, "acc-1");
  assert.equal(result.pocketId, null);
});

test("resolveScheduledDefaultLocation: transfer uses default expense account as source", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "transfer",
    accounts: mockAccounts,
    pockets: mockPockets,
    defaultExpenseAccountId: "acc-2",
    defaultExpensePocketId: "pocket-2",
  });

  assert.equal(result.accountId, "acc-2");
  assert.equal(result.pocketId, "pocket-2");
});

test("resolveScheduledDefaultLocation: safely handles empty accounts array", () => {
  const result = resolveScheduledDefaultLocation({
    transactionType: "expense",
    accounts: [],
    pockets: [],
  });

  assert.equal(result.accountId, "");
  assert.equal(result.pocketId, null);
});
