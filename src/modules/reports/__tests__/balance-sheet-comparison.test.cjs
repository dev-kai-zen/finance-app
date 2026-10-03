const test = require("node:test");
const assert = require("node:assert/strict");

const REPORT_COLORS = {
  positiveGreen: "#10B981",
  negativeRed: "#EF4444",
  neutralMuted: "#64748B",
};

function formatPhpNumber(amountMinorUnits) {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;
  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";
  return `${sign}₱${majorFormatted}.${minorFormatted}`;
}

function calculateVariance({ prevMinorUnits, currentMinorUnits, isLiability }) {
  if (isLiability) {
    const prevDebt = Math.abs(prevMinorUnits);
    const currentDebt = Math.abs(currentMinorUnits);
    const debtDiff = currentDebt - prevDebt;

    if (debtDiff < 0) {
      // Debt decreased: Favorable! (Green, Down arrow ▼, negative sign -)
      const absDiff = Math.abs(debtDiff);
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: debtDiff,
        isFavorable: true,
        direction: "down",
        symbol: "▼",
        color: REPORT_COLORS.positiveGreen,
        formattedDiff: `-${formatPhpNumber(absDiff)}`,
      };
    } else if (debtDiff > 0) {
      // Debt increased: Unfavorable! (Red, Up arrow ▲, positive sign +)
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: debtDiff,
        isFavorable: false,
        direction: "up",
        symbol: "▲",
        color: REPORT_COLORS.negativeRed,
        formattedDiff: `+${formatPhpNumber(debtDiff)}`,
      };
    } else {
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: 0,
        isFavorable: true,
        direction: "neutral",
        symbol: "",
        color: REPORT_COLORS.neutralMuted,
        formattedDiff: formatPhpNumber(0),
      };
    }
  }

  // Asset or Net Worth
  const diff = currentMinorUnits - prevMinorUnits;
  if (diff > 0) {
    // Asset increased: Favorable! (Green, Up arrow ▲, positive sign +)
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: diff,
      isFavorable: true,
      direction: "up",
      symbol: "▲",
      color: REPORT_COLORS.positiveGreen,
      formattedDiff: `+${formatPhpNumber(diff)}`,
    };
  } else if (diff < 0) {
    // Asset decreased: Unfavorable! (Red, Down arrow ▼, negative sign -)
    const absDiff = Math.abs(diff);
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: diff,
      isFavorable: false,
      direction: "down",
      symbol: "▼",
      color: REPORT_COLORS.negativeRed,
      formattedDiff: `-${formatPhpNumber(absDiff)}`,
    };
  } else {
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: 0,
      isFavorable: true,
      direction: "neutral",
      symbol: "",
      color: REPORT_COLORS.neutralMuted,
      formattedDiff: formatPhpNumber(0),
    };
  }
}

test("Asset variance: increase has Green color, positive + sign, and ▲", () => {
  const result = calculateVariance({
    prevMinorUnits: 1000000, // ₱10,000.00
    currentMinorUnits: 1500000, // ₱15,000.00
    isLiability: false,
  });

  assert.equal(result.diffMinorUnits, 500000);
  assert.equal(result.symbol, "▲");
  assert.equal(result.color, REPORT_COLORS.positiveGreen);
  assert.equal(result.formattedDiff, "+₱5,000.00");
  assert.equal(result.isFavorable, true);
});

test("Asset variance: decrease has Red color, negative - sign, and ▼", () => {
  const result = calculateVariance({
    prevMinorUnits: 1500000, // ₱15,000.00
    currentMinorUnits: 1000000, // ₱10,000.00
    isLiability: false,
  });

  assert.equal(result.diffMinorUnits, -500000);
  assert.equal(result.symbol, "▼");
  assert.equal(result.color, REPORT_COLORS.negativeRed);
  assert.equal(result.formattedDiff, "-₱5,000.00");
  assert.equal(result.isFavorable, false);
});

test("Liability variance: debt decrease has Green color, negative - sign, and ▼", () => {
  const result = calculateVariance({
    prevMinorUnits: -2500000, // -₱25,000.00 debt
    currentMinorUnits: -2000000, // -₱20,000.00 debt
    isLiability: true,
  });

  assert.equal(result.diffMinorUnits, -500000);
  assert.equal(result.symbol, "▼");
  assert.equal(result.color, REPORT_COLORS.positiveGreen);
  assert.equal(result.formattedDiff, "-₱5,000.00");
  assert.equal(result.isFavorable, true);
});

test("Liability variance: debt increase has Red color, positive + sign, and ▲", () => {
  const result = calculateVariance({
    prevMinorUnits: -2000000, // -₱20,000.00 debt
    currentMinorUnits: -2500000, // -₱25,000.00 debt
    isLiability: true,
  });

  assert.equal(result.diffMinorUnits, 500000);
  assert.equal(result.symbol, "▲");
  assert.equal(result.color, REPORT_COLORS.negativeRed);
  assert.equal(result.formattedDiff, "+₱5,000.00");
  assert.equal(result.isFavorable, false);
});

test("Zero variance: neutral muted color with no arrow", () => {
  const result = calculateVariance({
    prevMinorUnits: 500000,
    currentMinorUnits: 500000,
    isLiability: false,
  });

  assert.equal(result.diffMinorUnits, 0);
  assert.equal(result.symbol, "");
  assert.equal(result.color, REPORT_COLORS.neutralMuted);
  assert.equal(result.formattedDiff, "₱0.00");
});
