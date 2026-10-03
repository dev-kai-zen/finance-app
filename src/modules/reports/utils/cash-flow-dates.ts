import type { CashFlowDateRange, CashFlowPeriodPreset } from "../types/cash-flow.types";
import { formatShortDate, parseDateKeyToDate, toDateKey } from "./reports-dates";

export function getCashFlowDateRange(
  preset: CashFlowPeriodPreset,
  options: {
    customDateA?: string;
    customDateB?: string;
  } = {},
): CashFlowDateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case "6m": {
      // 5 months prior + current month = 6 months
      const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: "Last 6 Months",
      };
    }

    case "12m": {
      // 11 months prior + current month = 12 months
      const startDate = new Date(currentYear, currentMonth - 11, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: "Last 12 Months",
      };
    }

    case "ytd": {
      const startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: `Year-to-Date (${currentYear})`,
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
