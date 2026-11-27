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

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEndOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
}

function getComparisonDateRange(preset, options = {}) {
  const now = options.referenceDate ?? new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case "prev-vs-today": {
      const prevDate = getEndOfMonth(currentYear, currentMonth - 1);
      const currentDate = new Date(
        currentYear,
        currentMonth,
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      return {
        prevDate,
        currentDate,
        prevLabel: `${formatShortDate(prevDate)} (Last Month)`,
        currentLabel: `${formatShortDate(currentDate)} (Today)`,
      };
    }

    case "mom": {
      const defaultPrevDate = new Date(currentYear, currentMonth - 1, 1);
      const year = options.momYear ?? defaultPrevDate.getFullYear();
      const month = options.momMonth ?? defaultPrevDate.getMonth();
      const currMoM = getEndOfMonth(year, month);
      const prevMoM = getEndOfMonth(year, month - 1);
      return {
        prevDate: prevMoM,
        currentDate: currMoM,
        prevLabel: formatShortDate(prevMoM),
        currentLabel: formatShortDate(currMoM),
      };
    }

    case "ytd": {
      const prevDate = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999);
      const currentDate = new Date(
        currentYear,
        currentMonth,
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      return {
        prevDate,
        currentDate,
        prevLabel: `${formatShortDate(prevDate)} (Dec 31)`,
        currentLabel: `${formatShortDate(currentDate)} (Today)`,
      };
    }
  }
}

test("REP-F05: January MoM default correctly compares prior year December vs November", () => {
  // Controlled January clock: January 15, 2026
  const janClock = new Date(2026, 0, 15);
  const range = getComparisonDateRange("mom", { referenceDate: janClock });

  // Prior completed month is Dec 2025, compared with Nov 2025
  assert.equal(range.currentDate.getFullYear(), 2025);
  assert.equal(range.currentDate.getMonth(), 11); // December
  assert.equal(range.currentDate.getDate(), 31);
  assert.equal(range.currentLabel, "Dec 31, 2025");

  assert.equal(range.prevDate.getFullYear(), 2025);
  assert.equal(range.prevDate.getMonth(), 10); // November
  assert.equal(range.prevDate.getDate(), 30);
  assert.equal(range.prevLabel, "Nov 30, 2025");
});

test("REP-F05: February MoM default compares Jan 31 vs Dec 31 of prior year", () => {
  // Controlled February clock: February 15, 2026
  const febClock = new Date(2026, 1, 15);
  const range = getComparisonDateRange("mom", { referenceDate: febClock });

  assert.equal(range.currentDate.getFullYear(), 2026);
  assert.equal(range.currentDate.getMonth(), 0); // January
  assert.equal(range.currentDate.getDate(), 31);
  assert.equal(range.currentLabel, "Jan 31, 2026");

  assert.equal(range.prevDate.getFullYear(), 2025);
  assert.equal(range.prevDate.getMonth(), 11); // December
  assert.equal(range.prevDate.getDate(), 31);
  assert.equal(range.prevLabel, "Dec 31, 2025");
});

test("REP-F05: Leap year February MoM end date is Feb 29", () => {
  // Controlled March clock in leap year: March 10, 2024
  const marchClock = new Date(2024, 2, 10);
  const range = getComparisonDateRange("mom", { referenceDate: marchClock });

  assert.equal(range.currentDate.getFullYear(), 2024);
  assert.equal(range.currentDate.getMonth(), 1); // February
  assert.equal(range.currentDate.getDate(), 29); // Leap day
  assert.equal(range.currentLabel, "Feb 29, 2024");

  assert.equal(range.prevDate.getFullYear(), 2024);
  assert.equal(range.prevDate.getMonth(), 0); // January
  assert.equal(range.prevDate.getDate(), 31);
  assert.equal(range.prevLabel, "Jan 31, 2024");
});

test("REP-F05: Explicit MoM selection preserves specified year and month", () => {
  // Explicit selection: January 2026 (momYear: 2026, momMonth: 0)
  const range = getComparisonDateRange("mom", {
    momYear: 2026,
    momMonth: 0,
  });

  assert.equal(range.currentDate.getFullYear(), 2026);
  assert.equal(range.currentDate.getMonth(), 0); // January 2026
  assert.equal(range.currentDate.getDate(), 31);
  assert.equal(range.currentLabel, "Jan 31, 2026");

  assert.equal(range.prevDate.getFullYear(), 2025);
  assert.equal(range.prevDate.getMonth(), 11); // December 2025
  assert.equal(range.prevDate.getDate(), 31);
  assert.equal(range.prevLabel, "Dec 31, 2025");
});
