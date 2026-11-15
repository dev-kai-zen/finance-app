const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const resolve = Module._resolveFilename, load = Module._load;

Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};

Module._load = function (request, ...args) {
  if (request === "@/utils/currency") {
    return {
      getCurrencyMinorUnitExponent: () => 2,
    };
  }
  return load.call(this, request, ...args);
};

require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);

const { validateColumnSample } = require("../utils/validate-column-sample.ts");

const defaultOptions = {
  kind: "transactions",
  source: "",
  columns: {},
  dateFormat: "ymd",
  decimal: ".",
  defaultCurrency: "PHP",
  defaultAccount: "",
  transferMode: "single",
  accounts: {},
  categories: {},
  decisions: {},
};

test("date validation: returns null for valid format and suggests format for alternative formats", () => {
  // Matching format
  assert.equal(validateColumnSample("date", "2026-05-11", defaultOptions), null);

  // DMY format when YMD is active
  const dmyResult = validateColumnSample("date", "15/08/2026", defaultOptions);
  assert.ok(dmyResult);
  assert.equal(dmyResult.warningKey, "dataImport.wizard.formatMismatchDate");
  assert.equal(dmyResult.suggestedFormat, "dmy");

  // Non-date string
  const textResult = validateColumnSample("date", "Coffee at Starbucks", defaultOptions);
  assert.ok(textResult);
  assert.equal(textResult.warningKey, "dataImport.wizard.formatMismatchDate");
  assert.equal(textResult.suggestedFormat, undefined);
});

test("amount validation: detects valid amounts, decimal mismatches, and non-numeric strings", () => {
  // Valid amounts with dot
  assert.equal(validateColumnSample("amount", "1250.50", defaultOptions), null);
  assert.equal(validateColumnSample("amount", "-45.00", defaultOptions), null);
  assert.equal(validateColumnSample("amount", "₱350.00", defaultOptions), null);
  assert.equal(validateColumnSample("amount", "$1,200.50", defaultOptions), null);

  // Decimal mismatch (comma used in file when dot is configured)
  const decimalMismatch = validateColumnSample("amount", "1.250,50", defaultOptions);
  assert.ok(decimalMismatch);
  assert.equal(decimalMismatch.warningKey, "dataImport.wizard.formatMismatchDecimal");
  assert.equal(decimalMismatch.suggestedDecimal, ",");

  // Non-numeric string
  const textAmount = validateColumnSample("amount", "Salary", defaultOptions);
  assert.ok(textAmount);
  assert.equal(textAmount.warningKey, "dataImport.wizard.formatMismatchAmount");
});

test("debit and credit validation: rejects negative values", () => {
  const negativeDebit = validateColumnSample("debit", "-150.00", defaultOptions);
  assert.ok(negativeDebit);
  assert.equal(negativeDebit.warningKey, "dataImport.wizard.formatMismatchDebitCredit");

  const positiveDebit = validateColumnSample("debit", "150.00", defaultOptions);
  assert.equal(positiveDebit, null);
});

test("time validation: verifies 12h and 24h formats and flags invalid values", () => {
  assert.equal(validateColumnSample("time", "14:30", defaultOptions), null);
  assert.equal(validateColumnSample("time", "02:30 PM", defaultOptions), null);
  assert.equal(validateColumnSample("time", "09:15:00", defaultOptions), null);

  const invalidTime = validateColumnSample("time", "Lunch time", defaultOptions);
  assert.ok(invalidTime);
  assert.equal(invalidTime.warningKey, "dataImport.wizard.formatMismatchTime");
});

test("currency validation: validates 3-letter codes against catalog", () => {
  const catalog = { currencies: ["PHP", "USD", "EUR"] };
  assert.equal(validateColumnSample("currency", "USD", defaultOptions, catalog), null);
  assert.equal(validateColumnSample("currency", "php", defaultOptions, catalog), null);

  const invalidCurrency = validateColumnSample("currency", "Cash", defaultOptions, catalog);
  assert.ok(invalidCurrency);
  assert.equal(invalidCurrency.warningKey, "dataImport.wizard.formatMismatchCurrency");
});

test("account and category validation: flags samples that look like amounts or dates", () => {
  assert.equal(validateColumnSample("account", "BDO Savings", defaultOptions), null);
  assert.equal(validateColumnSample("category", "Food & Dining", defaultOptions), null);

  const numericAccount = validateColumnSample("account", "1500.00", defaultOptions);
  assert.ok(numericAccount);
  assert.equal(numericAccount.warningKey, "dataImport.wizard.formatMismatchAccount");

  const dateCategory = validateColumnSample("category", "2026-01-15", defaultOptions);
  assert.ok(dateCategory);
  assert.equal(dateCategory.warningKey, "dataImport.wizard.formatMismatchCategory");
});

