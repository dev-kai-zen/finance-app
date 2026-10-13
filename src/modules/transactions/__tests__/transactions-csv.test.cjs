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
  TRANSACTION_CSV_HEADERS,
  buildTransactionsCsv,
  escapeCsvCell,
  formatMinorUnitsForCsv,
  transactionToCsvRow,
} = require("../utils/transactions-csv.ts");

const baseTransaction = {
  id: "tx_1",
  accountId: "acct_1",
  categoryId: "cat_1",
  pocketId: null,
  transactionGroupId: null,
  type: "expense",
  currencyCode: "PHP",
  amountMinorUnits: -150000,
  originalAmountMinorUnits: null,
  exchangeRateScaled: null,
  name: "Coffee",
  note: "Morning",
  occurredAt: new Date("2026-03-24T09:30:00"),
  createdAt: new Date("2026-03-24T09:31:00"),
  updatedAt: new Date("2026-03-24T09:31:00"),
  deletedAt: null,
  attachmentCount: 0,
  accountName: "Cash",
  accountCurrency: "PHP",
  accountTypeName: "Wallet",
  accountPocketEnabled: false,
  accountBalanceAfterMinorUnits: 850000,
  locationBalanceAfterMinorUnits: 850000,
  categoryName: "Food",
  categoryIcon: null,
  categoryColor: null,
  pocketName: null,
  transferAccountId: null,
  transferAccountName: null,
  transferAccountCurrency: null,
  transferAccountTypeName: null,
  transferAccountPocketEnabled: null,
  transferPocketId: null,
  transferPocketName: null,
  destinationBalanceAfterMinorUnits: null,
  destinationLocationBalanceAfterMinorUnits: null,
  labels: [{ id: "lbl_1", name: "Work", color: "#000000" }],
};

test("escapeCsvCell quotes commas and embedded quotes", () => {
  assert.equal(escapeCsvCell("plain"), "plain");
  assert.equal(escapeCsvCell('Say "hello"'), '"Say ""hello"""');
  assert.equal(escapeCsvCell("a,b"), '"a,b"');
});

test("formatMinorUnitsForCsv renders spreadsheet-friendly decimals", () => {
  assert.equal(formatMinorUnitsForCsv(150000, "PHP"), "1500.00");
  assert.equal(formatMinorUnitsForCsv(-250, "USD"), "-2.50");
  assert.equal(formatMinorUnitsForCsv(1000, "JPY"), "1000");
});

test("transactionToCsvRow maps expense fields", () => {
  const row = transactionToCsvRow(baseTransaction);
  assert.equal(row[0], "2026-03-24");
  assert.equal(row[2], "expense");
  assert.equal(row[3], "Coffee");
  assert.equal(row[4], "-1500.00");
  assert.equal(row[5], "PHP");
  assert.equal(row[9], "Work");
  assert.equal(row[18], "tx_1");
});

test("buildTransactionsCsv includes header and transfer row details", () => {
  const csv = buildTransactionsCsv([
    baseTransaction,
    {
      ...baseTransaction,
      id: "tx_transfer",
      type: "transfer",
      amountMinorUnits: -500000,
      name: "Move funds",
      transferAccountId: "acct_2",
      transferAccountName: "Savings",
      transferPocketName: "Emergency",
      transferFeeAmountMinorUnits: 1500,
      transferFeeAccountName: "Cash",
    },
  ]);

  const lines = csv.split("\r\n");
  assert.equal(lines[0], TRANSACTION_CSV_HEADERS.join(","));
  assert.match(lines[1], /Coffee/);
  assert.match(lines[2], /Move funds/);
  assert.match(lines[2], /5000\.00/);
  assert.match(lines[2], /Savings/);
  assert.match(lines[2], /15\.00/);
});
