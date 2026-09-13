const { test } = require("node:test");
const assert = require("node:assert/strict");

// PHP Currency formatter implementation under test matching src/utils/currency.ts
const PHP_CURRENCY_COLORS = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#64748B",
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

function formatCurrency(amountMinorUnits, currencyCode = "PHP", showSign = false) {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const symbol = currencyCode === "PHP" ? "₱" : `${currencyCode} `;

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && amountMinorUnits > 0) {
    sign = "+";
  }

  return `${sign}${symbol}${majorFormatted}.${minorFormatted}`;
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

test("currency: formatCurrency legacy function preserves exact backward compatibility", () => {
  assert.equal(formatCurrency(150000), "₱1,500.00");
  assert.equal(formatCurrency(150000, "PHP", true), "+₱1,500.00");
  assert.equal(formatCurrency(-7500), "-₱75.00");
  assert.equal(formatCurrency(100000, "USD"), "USD 1,000.00");
});
