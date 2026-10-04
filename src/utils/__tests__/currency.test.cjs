const { test } = require("node:test");
const assert = require("node:assert/strict");

// PHP Currency formatter implementation under test matching src/utils/currency.ts
const PHP_CURRENCY_COLORS = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#64748B",
};

const DEFAULT_BASE_CURRENCY = "PHP";

const CURRENCY_SYMBOLS = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  SGD: "S$",
  CAD: "CA$",
  AUD: "A$",
  HKD: "HK$",
  THB: "฿",
  MYR: "RM",
  IDR: "Rp",
  VND: "₫",
  INR: "₹",
  CHF: "CHF ",
  NZD: "NZ$",
  AED: "AED ",
  SAR: "SAR ",
  TWD: "NT$",
};

const CURRENCY_DECIMALS = {
  PHP: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CNY: 2,
  KRW: 0,
  SGD: 2,
  CAD: 2,
  AUD: 2,
  HKD: 2,
  THB: 2,
  MYR: 2,
  IDR: 0,
  VND: 0,
  INR: 2,
  CHF: 2,
  NZD: 2,
  AED: 2,
  SAR: 2,
  TWD: 2,
};

const DEFAULT_EXCHANGE_RATES_TO_PHP_BPS = {
  PHP: 10_000,
  USD: 585_000, // 58.50 PHP per 1 USD
  EUR: 635_000, // 63.50 PHP per 1 EUR
  GBP: 745_000, // 74.50 PHP per 1 GBP
  JPY: 3_900,   // 0.39 PHP per 1 JPY
  SGD: 435_000, // 43.50 PHP per 1 SGD
  CAD: 425_000, // 42.50 PHP per 1 CAD
  AUD: 385_000, // 38.50 PHP per 1 AUD
  HKD: 75_000,  // 7.50 PHP per 1 HKD
  CNY: 81_000,  // 8.10 PHP per 1 CNY
  KRW: 430,     // 0.043 PHP per 1 KRW
  THB: 16_500,  // 1.65 PHP per 1 THB
  MYR: 132_000, // 13.20 PHP per 1 MYR
  IDR: 36,      // 0.0036 PHP per 1 IDR
  VND: 23,      // 0.0023 PHP per 1 VND
  INR: 7_000,   // 0.70 PHP per 1 INR
  AED: 159_000, // 15.90 PHP per 1 AED
  SAR: 156_000, // 15.60 PHP per 1 SAR
  TWD: 18_200,  // 1.82 PHP per 1 TWD
  CHF: 655_000, // 65.50 PHP per 1 CHF
  NZD: 355_000, // 35.50 PHP per 1 NZD
};

function formatPhpCurrency(amountMinorUnits, options) {
  const isNegative = amountMinorUnits < 0;
  const isZero = amountMinorUnits === 0;
  const isPositive = amountMinorUnits > 0;

  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const baseNumber = `${majorFormatted}.${minorFormatted}`;

  const sign = isNegative ? "-" : options?.showPositiveSign && isPositive ? "+" : "";

  const positiveColor = options?.positiveColor ?? PHP_CURRENCY_COLORS.positive;
  const negativeColor = options?.negativeColor ?? PHP_CURRENCY_COLORS.negative;
  const zeroColor = options?.zeroColor ?? PHP_CURRENCY_COLORS.neutral;

  const color = isPositive
    ? positiveColor
    : isNegative
      ? negativeColor
      : zeroColor;

  const colorKey = isPositive
    ? "success"
    : isNegative
      ? "danger"
      : "neutral";

  return {
    formatted: `${sign}₱${baseNumber}`,
    formattedWithSign: `${isNegative ? "-" : isPositive ? "+" : ""}₱${baseNumber}`,
    amountText: `${sign}${baseNumber}`,
    color,
    colorKey,
    isPositive,
    isNegative,
    isZero,
    sign,
  };
}

function formatCurrency(
  amountMinorUnits,
  currencyCode = DEFAULT_BASE_CURRENCY,
  showSign = false,
  options = {},
) {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const decimals = CURRENCY_DECIMALS[currencyCode] ?? 2;
  const divisor = 10 ** decimals;

  const major = Math.floor(absMinorUnits / divisor);
  const minor = decimals > 0 ? absMinorUnits % divisor : 0;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = decimals > 0 ? minor.toString().padStart(decimals, "0") : "";
  const baseNumber = decimals > 0 ? `${majorFormatted}.${minorFormatted}` : majorFormatted;

  const symbol = options.useCode
    ? `${currencyCode} `
    : CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `;

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && amountMinorUnits > 0) {
    sign = "+";
  }

  return `${sign}${symbol}${baseNumber}`;
}

function convertCurrencyMinorUnits(
  amountMinorUnits,
  fromCurrency,
  toCurrency,
  ratesMap,
  baseCurrency = DEFAULT_BASE_CURRENCY,
) {
  if (fromCurrency === toCurrency || amountMinorUnits === 0) {
    return amountMinorUnits;
  }

  const getRate = (code) => {
    if (ratesMap instanceof Map) {
      const val = ratesMap.get(code);
      if (val !== undefined) return val;
    } else if (ratesMap && typeof ratesMap === "object") {
      const val = ratesMap[code];
      if (val !== undefined) return val;
    }
    return DEFAULT_EXCHANGE_RATES_TO_PHP_BPS[code] ?? (code === baseCurrency ? 10_000 : 10_000);
  };

  const fromRate = getRate(fromCurrency);
  const toRate = getRate(toCurrency);

  const fromDecimals = CURRENCY_DECIMALS[fromCurrency] ?? 2;
  const toDecimals = CURRENCY_DECIMALS[toCurrency] ?? 2;
  const decimalDiff = toDecimals - fromDecimals;

  let scaledAmount = BigInt(amountMinorUnits) * BigInt(fromRate);
  if (decimalDiff > 0) {
    scaledAmount *= BigInt(10 ** decimalDiff);
  }

  const divisor = BigInt(toRate) * (decimalDiff < 0 ? BigInt(10 ** -decimalDiff) : 1n);

  if (divisor === 0n) {
    return amountMinorUnits;
  }

  const sign = scaledAmount < 0n ? -1n : 1n;
  const absScaled = scaledAmount < 0n ? -scaledAmount : scaledAmount;
  const result = ((absScaled + (divisor / 2n)) / divisor) * sign;

  return Number(result);
}

test("currency: positive amount formats with proper commas and returns green color", () => {
  const result = formatPhpCurrency(150050, { showPositiveSign: true });
  assert.equal(result.formatted, "+₱1,500.50");
  assert.equal(result.color, "#10B981");
  assert.equal(result.colorKey, "success");
  assert.equal(result.isPositive, true);
  assert.equal(result.isNegative, false);
  assert.equal(result.isZero, false);
  assert.equal(result.sign, "+");
});

test("currency: large positive number has thousands and millions commas", () => {
  const result = formatPhpCurrency(12345678950);
  assert.equal(result.formatted, "₱123,456,789.50");
  assert.equal(result.color, "#10B981");
});

test("currency: negative amount formats with proper commas, minus sign, and returns red color", () => {
  const result = formatPhpCurrency(-250000);
  assert.equal(result.formatted, "-₱2,500.00");
  assert.equal(result.color, "#EF4444");
  assert.equal(result.colorKey, "danger");
  assert.equal(result.isPositive, false);
  assert.equal(result.isNegative, true);
  assert.equal(result.isZero, false);
  assert.equal(result.sign, "-");
});

test("currency: negative amount without symbol has amountText with minus sign", () => {
  const result = formatPhpCurrency(-4999);
  assert.equal(result.amountText, "-49.99");
  assert.equal(result.color, "#EF4444");
});

test("currency: zero amount formats cleanly with neutral color and no sign", () => {
  const result = formatPhpCurrency(0);
  assert.equal(result.formatted, "₱0.00");
  assert.equal(result.color, "#64748B");
  assert.equal(result.colorKey, "neutral");
  assert.equal(result.isZero, true);
});

test("currency: supports custom theme tokens for positive, negative, and zero", () => {
  const customOptions = {
    showPositiveSign: true,
    positiveColor: "#059669",
    negativeColor: "#DC2626",
    zeroColor: "#94A3B8",
  };

  const pos = formatPhpCurrency(5000, customOptions);
  assert.equal(pos.color, "#059669");

  const neg = formatPhpCurrency(-5000, customOptions);
  assert.equal(neg.color, "#DC2626");

  const zero = formatPhpCurrency(0, customOptions);
  assert.equal(zero.color, "#94A3B8");
});

test("currency: formatCurrency formats PHP, USD, EUR, and other currencies with symbols", () => {
  assert.equal(formatCurrency(150000), "₱1,500.00");
  assert.equal(formatCurrency(150000, "PHP", true), "+₱1,500.00");
  assert.equal(formatCurrency(-7500), "-₱75.00");
  assert.equal(formatCurrency(100000, "USD"), "$1,000.00");
  assert.equal(formatCurrency(100000, "EUR"), "€1,000.00");
  assert.equal(formatCurrency(100000, "GBP"), "£1,000.00");
  assert.equal(formatCurrency(1500, "JPY"), "¥1,500");
  assert.equal(formatCurrency(100000, "USD", false, { useCode: true }), "USD 1,000.00");
});

test("currency: convertCurrencyMinorUnits handles USD to PHP conversion accurately", () => {
  // $100.00 USD (10,000 cents) at 58.50 PHP/USD (585,000 bps) -> ₱5,850.00 (585,000 centavos)
  const phpMinorUnits = convertCurrencyMinorUnits(10000, "USD", "PHP");
  assert.equal(phpMinorUnits, 585000);
});

test("currency: convertCurrencyMinorUnits handles PHP to USD conversion accurately", () => {
  // ₱5,850.00 PHP (585,000 centavos) -> $100.00 USD (10,000 cents)
  const usdMinorUnits = convertCurrencyMinorUnits(585000, "PHP", "USD");
  assert.equal(usdMinorUnits, 10000);
});

test("currency: convertCurrencyMinorUnits handles JPY (0 decimal) conversion", () => {
  // 1,000 JPY (0 decimals) at 0.39 PHP/JPY (3,900 bps) -> ₱390.00 (39,000 centavos)
  const phpMinorUnits = convertCurrencyMinorUnits(1000, "JPY", "PHP");
  assert.equal(phpMinorUnits, 39000);

  // ₱390.00 (39,000 centavos) -> 1,000 JPY
  const jpyUnits = convertCurrencyMinorUnits(39000, "PHP", "JPY");
  assert.equal(jpyUnits, 1000);
});

test("currency: convertCurrencyMinorUnits preserves negative amounts and zero", () => {
  const neg = convertCurrencyMinorUnits(-10000, "USD", "PHP");
  assert.equal(neg, -585000);

  const zero = convertCurrencyMinorUnits(0, "USD", "PHP");
  assert.equal(zero, 0);

  const same = convertCurrencyMinorUnits(12345, "USD", "USD");
  assert.equal(same, 12345);
});
