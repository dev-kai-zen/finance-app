import type {
  IncomeExpenseDateRange,
  IncomeExpensePeriodPreset,
} from "../types/income-expense.types";
import { formatShortDate, parseDateKeyToDate, toDateKey } from "./reports-dates";

export function getIncomeExpenseDateRange(
  preset: IncomeExpensePeriodPreset,
  options: {
    customDateA?: string;
    customDateB?: string;
  } = {},
): IncomeExpenseDateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case "this-month": {
      const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      const monthName = now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return {
        preset,
        startDate,
        endDate,
        label: `${monthName} (This Month)`,
      };
    }

    case "last-month": {
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const startDate = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
      const endDate = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
      const monthName = startDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return {
        preset,
        startDate,
        endDate,
        label: `${monthName} (Last Month)`,
      };
    }

    case "this-quarter": {
      const quarterIndex = Math.floor(currentMonth / 3);
      const startMonth = quarterIndex * 3;
      const endMonth = startMonth + 2;
      const startDate = new Date(currentYear, startMonth, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, endMonth + 1, 0, 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: `Q${quarterIndex + 1} ${currentYear}`,
      };
    }

    case "this-year": {
      const startDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      return {
        preset,
        startDate,
        endDate,
        label: `Year ${currentYear}`,
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
