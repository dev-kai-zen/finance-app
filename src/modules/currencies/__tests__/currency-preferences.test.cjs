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

test("currency preferences support decimal digits from 0 through 9", () => {
  for (let decimalDigits = 0; decimalDigits <= 9; decimalDigits += 1) {
    currency.setActiveCurrencyFormattingPreferences({
      ...currency.DEFAULT_CURRENCY_PREFERENCES,
      decimalDigits,
      decimalFormat: "comma-dot",
    });

    const formatted = currency.formatCurrency(123456, "PHP");
    const expected = decimalDigits === 0
      ? "₱1,235"
      : decimalDigits === 1
        ? "₱1,234.6"
        : `₱1,234.56${"0".repeat(decimalDigits - 2)}`;
    assert.equal(formatted, expected);
    assert.equal(formatted.split(".")[1]?.length ?? 0, decimalDigits);
  }
});

test("currency preferences control symbol, negative style, and separators", () => {
  currency.setActiveCurrencyFormattingPreferences({
    ...currency.DEFAULT_CURRENCY_PREFERENCES,
    displayCurrency: false,
    negativeFormat: "parentheses",
    decimalDigits: 3,
    decimalFormat: "dot-comma",
  });

  assert.equal(currency.formatCurrency(-123456, "PHP"), "(1.234,560)");
});
