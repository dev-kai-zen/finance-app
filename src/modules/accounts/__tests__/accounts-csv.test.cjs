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
  ACCOUNT_CSV_HEADERS,
  accountToCsvRow,
  buildAccountsCsv,
  createAccountsCsvFileName,
  escapeCsvCell,
  formatMinorUnitsForCsv,
} = require("../utils/accounts-csv.ts");

const mockAccount = {
  id: "acc_1",
  accountTypeId: "type_bank",
  name: "BPI Savings",
  note: 'Main "salary" account',
  iconKey: "bank",
  currencyCode: "PHP",
  openingBalanceMinorUnits: 1000000,
  openingBalanceAt: new Date("2026-01-01T00:00:00Z"),
  startingBalanceLocked: true,
  hideFromSelection: false,
  hideFromReports: false,
  pocketEnabled: true,
  maintainingBalanceMinorUnits: 300000,
  isArchived: false,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T10:00:00Z"),
  updatedAt: new Date("2026-01-15T15:30:00Z"),
  accountType: {
    id: "type_bank",
    name: "Bank",
    accountGroup: "asset",
    color: "#2563eb",
  },
  creditCardDetails: null,
  currentBalanceMinorUnits: 2545075,
};

const mockPockets = [
  {
    id: "pkt_1",
    accountId: "acc_1",
    name: "Emergency Fund",
    isArchived: false,
    sortOrder: 0,
    createdAt: new Date("2026-01-02T10:00:00Z"),
    updatedAt: new Date("2026-01-02T10:00:00Z"),
    currentBalanceMinorUnits: 1500000,
  },
  {
    id: "pkt_2",
    accountId: "acc_1",
    name: "Vacation",
    isArchived: false,
    sortOrder: 1,
    createdAt: new Date("2026-01-03T10:00:00Z"),
    updatedAt: new Date("2026-01-03T10:00:00Z"),
    currentBalanceMinorUnits: 500000,
  },
];

test("accounts-csv: escapeCsvCell handles quotes and special characters", () => {
  assert.equal(escapeCsvCell("Checking"), "Checking");
  assert.equal(escapeCsvCell('Hello "World"'), '"Hello ""World"""');
  assert.equal(escapeCsvCell("Bank, Inc."), '"Bank, Inc."');
});

test("accounts-csv: formatMinorUnitsForCsv renders user-friendly decimal strings", () => {
  assert.equal(formatMinorUnitsForCsv(10000, "PHP"), "100.00");
  assert.equal(formatMinorUnitsForCsv(2545075, "PHP"), "25450.75");
  assert.equal(formatMinorUnitsForCsv(-50050, "USD"), "-500.50");
  assert.equal(formatMinorUnitsForCsv(1500, "JPY"), "1500");
  assert.equal(formatMinorUnitsForCsv(0, "PHP"), "0.00");
});

test("accounts-csv: accountToCsvRow properly maps all account fields and pockets summary", () => {
  const row = accountToCsvRow(mockAccount, mockPockets);

  assert.equal(row[0], "acc_1"); // Account ID
  assert.equal(row[1], "BPI Savings"); // Account Name
  assert.equal(row[2], "Bank"); // Account Type
  assert.equal(row[3], "asset"); // Account Group
  assert.equal(row[4], "PHP"); // Currency
  assert.equal(row[5], "25450.75"); // Current Balance (Decimal, not 2545075)
  assert.equal(row[6], "10000.00"); // Opening Balance
  assert.equal(row[8], "true"); // Locked Starting Balance
  assert.equal(row[9], "3000.00"); // Maintaining Balance
  assert.equal(row[13], "true"); // Pockets Enabled
  assert.equal(
    row[14],
    "Emergency Fund (15000.00); Vacation (5000.00)", // Pockets Summary
  );
  assert.equal(row[15], "false"); // Hide From Selection
  assert.equal(row[16], "false"); // Hide From Reports
  assert.equal(row[17], "false"); // Archived
  assert.equal(row[18], 'Main "salary" account'); // Note
});

test("accounts-csv: buildAccountsCsv includes headers and formatted rows with CRLF", () => {
  const csv = buildAccountsCsv([mockAccount], mockPockets);
  const lines = csv.split("\r\n");

  assert.equal(lines.length, 2);
  assert.equal(lines[0], ACCOUNT_CSV_HEADERS.join(","));
  assert.match(lines[1], /"Main ""salary"" account"/);
  assert.match(lines[1], /25450\.75/);
});

test("accounts-csv: createAccountsCsvFileName produces accounts- timestamped name", () => {
  const fixedDate = new Date(2026, 10, 18, 14, 30, 0); // Nov 18, 2026
  const fileName = createAccountsCsvFileName(fixedDate);
  assert.equal(fileName, "accounts-2026-11-18-143000.csv");
});
