import type {
  NetWorthGrowthDateRange,
  NetWorthGrowthPreset,
} from "../types/net-worth-growth.types";
import { formatShortDate, parseDateKeyToDate, toDateKey } from "./reports-dates";

export function getNetWorthDateRange(
  preset: NetWorthGrowthPreset,
  options: {
    customDateA?: string;
    customDateB?: string;
  } = {},
): NetWorthGrowthDateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case "6m": {
      const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: "Last 6 Months",
      };
    }

    case "1y": {
      const startDate = new Date(currentYear, currentMonth - 11, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: "Last 1 Year (12M)",
      };
    }

    case "all": {
      const startDate = new Date(currentYear - 2, currentMonth, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: "All Available History",
      };
    }

    case "custom": {
      const nowKey = toDateKey(now);
      const aKey = options.customDateA ?? nowKey;
      const bKey = options.customDateB ?? nowKey;
      const startDate = parseDateKeyToDate(aKey);
      startDate.setHours(0, 0, 0, 0);
      const endDate = parseDateKeyToDate(bKey);
      endDate.setHours(23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`,
      };
    }
  }
}

/**
 * Generates monthly historical cutoff timestamps between startDate and endDate.
 */
export function getHistoricalCutoffDates(startDate: Date, endDate: Date): Date[] {
  const cutoffs: Date[] = [];
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  let curYear = startYear;
  let curMonth = startMonth;

  while (curYear < endYear || (curYear === endYear && curMonth < endMonth)) {
    // End of that month
    cutoffs.push(new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999));
    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  // Final point: as of endDate (today / cutoff)
  cutoffs.push(new Date(endDate));

  return cutoffs;
}
