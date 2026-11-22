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


const { parseCsv, parseCsvAsync, resolveAmountInterpretation } = require("../../data-import/utils/csv.ts");
const textColumns = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18];

function transactionWithText(value) {
  return {
    ...baseTransaction,
    id: value, type: value, name: value, note: value,
    currencyCode: value, accountCurrency: value,
    accountName: value, pocketName: value, categoryName: value,
    labels: [{ id: "label", name: value }],
    transferAccountName: value, transferPocketName: value, transferFeeAccountName: value,
  };
}

test("V2-10: every transaction text column protects dangerous prefixes and literal apostrophes", () => {
  for (const value of ["=1+1", "+SUM(1,2)", "-formula", "@value", " \t\r\n=1+1", "\x01+1", "\x00=1", "\u00a0@value", "'=literal", "'ordinary", "''", '=HYPERLINK("url","label")']) {
    const row = transactionToCsvRow(transactionWithText(value));
    for (const index of textColumns) {
      // Currency codes are normalized by the existing exporter.
      if (index === 16) continue;
      const original = index === 5 ? value.trim().toUpperCase() : value;
      assert.equal(row[index], "'" + original, "text column " + index);
    }
    assert.equal(row[4], "-1500.00");
    assert.equal(row[19], "apostrophe-v1");
  }
  const original = transactionToCsvRow({ ...baseTransaction, currencyCode: "'=usd", accountCurrency: "PHP", originalAmountMinorUnits: -250, exchangeRateScaled: 100000000 });
  assert.equal(original[15], "-2.50");
  assert.equal(original[16], "''=USD");
});

test("V2-10: protected CSV round-trips text, punctuation and whitespace in sync and cooperative parsers", async () => {
  for (const value of ["=1+1", "+SUM(1,2)", "-formula", "@value", " \t=1+1  ", "\x01-1", "\r\n@value\n", "'=literal", "'ordinary", "''", 'plain, "quoted"\nnext line', " plain "]) {
    const transaction = transactionWithText(value);
    transaction.type = "expense";
    transaction.currencyCode = "USD";
    transaction.accountCurrency = "PHP";
    transaction.originalAmountMinorUnits = -250;
    const csv = buildTransactionsCsv([transaction]);
    const document = parseCsv(csv);
    assert.deepEqual(await parseCsvAsync(csv), document);
    for (const index of textColumns.filter((index) => ![2, 5, 16].includes(index))) {
      assert.equal(document.rows[0].cells[index], value, "round-trip column " + index);
    }
    assert.equal(document.rows[0].cells[4], "-1500.00");
    assert.equal(document.rows[0].cells[15], "-2.50");
    assert.equal(resolveAmountInterpretation(document.headers, {}), "signed");
  }
});

test("V2-10: split category text is protected after composition, and fees remain numeric", () => {
  const row = transactionToCsvRow({
    ...baseTransaction, isSplit: true,
    splitEntries: [{ categoryName: "\t=1+1", amountMinorUnits: -100 }, { categoryName: "Food", amountMinorUnits: -200 }],
    transferFeeAmountMinorUnits: -1500,
  });
  assert.equal(row[8], "'\t=1+1 (-1.00) | Food (-2.00)");
  assert.equal(row[13], "15.00");
  assert.equal(parseCsv(buildTransactionsCsv([{ ...baseTransaction, isSplit: true, splitEntries: [{ categoryName: "=1+1", amountMinorUnits: -100 }] }])).rows[0].cells[8], "=1+1 (-1.00)");
});

test("V2-10: only the exact marked format decodes text; legacy and external apostrophes survive", () => {
  const row = transactionToCsvRow({ ...baseTransaction, name: "'=literal", note: "''ordinary" });
  const serialize = (headers, cells) => headers.join(",") + "\r\n" + cells.map(escapeCsvCell).join(",");
  for (const headers of [TRANSACTION_CSV_HEADERS.slice(0, -1), [...TRANSACTION_CSV_HEADERS.slice(0, -1), "Other"], ["Other", ...TRANSACTION_CSV_HEADERS.slice(1)]]) {
    const cells = row.slice(0, headers.length);
    const document = parseCsv(serialize(headers, cells));
    assert.equal(document.rows[0].cells[3], "''=literal");
    assert.equal(document.rows[0].cells[10], "'''ordinary");
  }
  for (const marker of ["", "unknown-v2"]) {
    const document = parseCsv(serialize(TRANSACTION_CSV_HEADERS, [...row.slice(0, -1), marker]));
    assert.equal(document.rows[0].cells[3], "''=literal");
  }
  const external = parseCsv("Name,Note\n'=literal,''ordinary");
  assert.deepEqual(external.rows[0].cells, ["'=literal", "''ordinary"]);
  assert.equal(resolveAmountInterpretation(TRANSACTION_CSV_HEADERS.slice(0, -1), {}), "signed");
});
