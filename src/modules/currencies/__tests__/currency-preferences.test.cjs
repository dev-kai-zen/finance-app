const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const currency = require(path.resolve(__dirname, "../../../utils/currency.ts"));

afterEach(() => {
  currency.setActiveCurrencyFormattingPreferences(
    currency.DEFAULT_CURRENCY_PREFERENCES,
    "en-PH",
  );
});

test("formatCurrency uses each currency standard decimal places", () => {
  currency.setActiveCurrencyFormattingPreferences({
    ...currency.DEFAULT_CURRENCY_PREFERENCES,
    decimalDigits: 9,
    decimalFormat: "comma-dot",
  });

  assert.equal(currency.formatCurrency(123456, "PHP"), "₱1,234.56");
  assert.equal(currency.formatCurrency(1234, "JPY"), "¥1,234");
});

test("currency preferences control symbol, negative style, and separators", () => {
  currency.setActiveCurrencyFormattingPreferences({
    ...currency.DEFAULT_CURRENCY_PREFERENCES,
    displayCurrency: false,
    negativeFormat: "parentheses",
    decimalDigits: 3,
    decimalFormat: "dot-comma",
  });

  assert.equal(currency.formatCurrency(-123456, "PHP"), "(1.234,56)");
});
