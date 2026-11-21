const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};
const currency = require("../currency.ts");
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "@/utils/currency") return currency;
  if (request === "@/modules/currencies") return {
    getExchangeRateMap: () => new Map(Object.entries(currency.DEFAULT_EXCHANGE_RATES_TO_PHP_BPS)),
  };
  return originalLoad.call(this, request, ...args);
};
const { CURRENCY_NAMES } = require("../../modules/currencies/constants/currency-preferences.constants.ts");
const { resolveTransactionExchangeSnapshot } = require("../../modules/transactions/services/transaction-exchange-snapshot.service.ts");
const { snapshotExchangeRateFromBook: snapshot, applyExchangeRate: apply,
  DEFAULT_EXCHANGE_RATES_TO_PHP_BPS: defaults, EXCHANGE_RATE_SNAPSHOT_SCALE: scale } = currency;

test("P2-06: weak-currency transactions save their full amount using an unrounded major-unit snapshot", () => {
  for (const [code, amount, expected] of [["KRW", 50000, 3675], ["VND", 50000, 197], ["IDR", 50000, 308], ["JPY", 10000, 6667]]) {
    const rate = snapshot(code, "USD");
    assert.equal(rate, Math.round(defaults[code] / defaults.USD * scale));
    assert.equal(apply(amount, rate, code, "USD"), expected, code);
    const resolved = resolveTransactionExchangeSnapshot({
      accountCurrencyCode: "USD", typedCurrencyCode: code,
      typedAmountMinorUnitsAbs: amount, type: "expense",
    });
    assert.equal(resolved.amountMinorUnits, -expected);
    assert.equal(resolved.originalAmountMinorUnits, amount);
    assert.equal(resolved.exchangeRateScaled, rate);
    assert.equal(apply(-amount, rate, code, "USD"), -expected);
  }
});

test("P2-06: offline rates cover every catalog currency with no peso-parity placeholders", () => {
  const codes = Object.keys(CURRENCY_NAMES);
  for (const code of codes) {
    assert.ok(Number.isFinite(defaults[code]) && defaults[code] > 0, code);
    if (code !== "PHP") assert.notEqual(defaults[code], 10000, code);
    assert.equal(currency.convertCurrencyMinorUnits(100000, code, code), 100000);
  }
  assert.equal(snapshot("BMD", "USD"), scale, "USD-pegged additions retain the existing USD/PHP anchor");
  assert.ok(defaults.IRR < 1 && defaults.IRR > 0, "Sub-basis-point offline rates remain usable");
});

test("P2-06: all catalog pairs respect snapshot precision across zero-, two- and three-decimal currencies", () => {
  const codes = Object.keys(CURRENCY_NAMES);
  for (const from of codes) for (const to of codes) {
    if (from === to) continue;
    const fromExp = currency.getCurrencyMinorUnitExponent(from);
    const toExp = currency.getCurrencyMinorUnitExponent(to);
    const amount = 1000000 * 10 ** fromExp;
    const rate = snapshot(from, to);
    assert.ok(Number.isSafeInteger(rate) && rate > 0, from + "/" + to);
    const actual = apply(amount, rate, from, to);
    const direct = currency.convertCurrencyMinorUnits(amount, from, to);
    const tolerance = Math.ceil(amount * 10 ** (toExp - fromExp) / scale / 2) + 1;
    assert.ok(Math.abs(actual - direct) <= tolerance, from + "/" + to + ": " + actual + " vs " + direct);
  }
});

test("P2-06: explicit Map/object rates, custom bases, normalization and decimal overrides preserve conventions", () => {
  for (const rates of [{ KRW: 432.123456, USD: 600000 }, new Map([["KRW", 432.123456], ["USD", 600000]])]) {
    assert.equal(snapshot(" krw ", " usd ", rates), Math.round(432.123456 / 600000 * scale));
  }
  const usdBook = new Map([["USD", 10000], ["JPY", 10000 / 150]]);
  assert.equal(snapshot("JPY", "USD", usdBook, "USD"), 666667);
  assert.equal(apply(10000, snapshot("JPY", "USD", usdBook, "USD"), "JPY", "USD"), 6667);
  assert.ok(Math.abs(snapshot("KRW", "USD", undefined, "USD") - snapshot("KRW", "USD")) <= 1);
  const originalExp = currency.getCurrencyMinorUnitExponent("JPY");
  try {
    const before = snapshot("JPY", "USD");
    currency.setActiveCurrencyMinorUnitExponents({ JPY: 2, USD: 2 });
    assert.equal(snapshot("JPY", "USD"), before, "Snapshot is major-to-major, independent of minor units");
    assert.equal(apply(1000000, before, "JPY", "USD"), 6667);
  } finally {
    currency.setActiveCurrencyMinorUnitExponents({ ...currency.CURRENCY_DECIMALS, JPY: originalExp });
  }
});

test("P2-06: unavailable or invalid quotes fail clearly without assuming 1:1", () => {
  for (const rate of [0, -1, NaN, Infinity]) {
    assert.throws(() => snapshot("KRW", "USD", { KRW: rate }), /No exchange rate/);
    assert.throws(() => currency.convertCurrencyMinorUnits(50000, "KRW", "USD", { KRW: rate }), /No exchange rate/);
  }
  assert.throws(() => snapshot("UNKNOWN", "USD"), /No exchange rate/);
  assert.throws(() => snapshot("USD", "USD"), /identical currencies/);
  assert.throws(() => apply(1, snapshot("KRW", "USD"), "KRW", "USD"), /rounds to zero/);
});
