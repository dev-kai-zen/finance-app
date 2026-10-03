import type { ComparisonDateRange, ComparisonPreset } from "../types/reports.types";

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKeyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/**
 * Returns the end of a given month (23:59:59.999)
 */
export function getEndOfMonth(year: number, monthIndex: number): Date {
  // monthIndex + 1 with day 0 gives the last day of monthIndex
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
}

export function getComparisonDateRange(
  preset: ComparisonPreset,
  options: {
    momYear?: number;
    momMonth?: number; // 0-indexed
    customDateA?: string; // YYYY-MM-DD
    customDateB?: string; // YYYY-MM-DD
  } = {},
): ComparisonDateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case "prev-vs-today": {
      // Previous month end: last day of monthIndex - 1
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
      const year = options.momYear ?? currentYear;
      // Default to previous month if today is early in current month, or selected month
      const month = options.momMonth ?? (currentMonth > 0 ? currentMonth - 1 : 11);
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
      // End of prior year: Dec 31
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

    case "custom": {
      const nowKey = toDateKey(now);
      const aKey = options.customDateA ?? nowKey;
      const bKey = options.customDateB ?? nowKey;
      const prevDate = parseDateKeyToDate(aKey);
      const currentDate = parseDateKeyToDate(bKey);
      return {
        prevDate,
        currentDate,
        prevLabel: formatShortDate(prevDate),
        currentLabel: formatShortDate(currentDate),
      };
    }
  }
}
