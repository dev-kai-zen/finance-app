import type { BudgetFrequency } from "../types/budget.types";

export interface BudgetPeriodInfo {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  periodLabel: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Calculates start, end, and previous period dates along with user-facing labels
 * for any supported budget frequency.
 */
export function getBudgetPeriodInfo(
  frequency: BudgetFrequency,
  referenceDate: Date = new Date(),
  anchorStartDate?: Date,
): BudgetPeriodInfo {
  const d = new Date(referenceDate);

  if (frequency === "daily") {
    const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const prevDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(
      prevDate.getFullYear(),
      prevDate.getMonth(),
      prevDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const previousEndDate = new Date(
      prevDate.getFullYear(),
      prevDate.getMonth(),
      prevDate.getDate(),
      23,
      59,
      59,
      999,
    );

    const today = new Date();
    const isToday =
      today.getFullYear() === d.getFullYear() &&
      today.getMonth() === d.getMonth() &&
      today.getDate() === d.getDate();

    const periodLabel = isToday
      ? "Today"
      : `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  if (frequency === "weekly") {
    // Week starts Monday (ISO)
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

    const previousStartDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7, 0, 0, 0, 0);
    const previousEndDate = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - 7, 23, 59, 59, 999);

    const periodLabel = `${SHORT_MONTHS[monday.getMonth()]} ${monday.getDate()} - ${SHORT_MONTHS[sunday.getMonth()]} ${sunday.getDate()}`;

    return {
      startDate: monday,
      endDate: sunday,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  if (frequency === "biweekly") {
    // 14-day cycle anchored at anchorStartDate or Jan 1 of current year
    const anchor = anchorStartDate ? new Date(anchorStartDate) : new Date(d.getFullYear(), 0, 1);
    anchor.setHours(0, 0, 0, 0);

    const msInDay = 86400000;
    const diffMs = d.getTime() - anchor.getTime();
    const dayDiff = Math.floor(diffMs / msInDay);
    const cycleCount = Math.floor(dayDiff / 14);

    const startDate = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      anchor.getDate() + cycleCount * 14,
      0,
      0,
      0,
      0,
    );
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + 13,
      23,
      59,
      59,
      999,
    );
    const previousStartDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() - 14,
      0,
      0,
      0,
      0,
    );
    const previousEndDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() - 1,
      23,
      59,
      59,
      999,
    );

    const periodLabel = `${SHORT_MONTHS[startDate.getMonth()]} ${startDate.getDate()} - ${SHORT_MONTHS[endDate.getMonth()]} ${endDate.getDate()}`;

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  if (frequency === "semi_monthly") {
    const isFirstHalf = d.getDate() <= 15;

    if (isFirstHalf) {
      // 1st to 15th of current month
      const startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const endDate = new Date(d.getFullYear(), d.getMonth(), 15, 23, 59, 59, 999);

      // Previous period: 16th to end of previous month
      const prevMonth = d.getMonth() === 0 ? 11 : d.getMonth() - 1;
      const prevYear = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
      const previousStartDate = new Date(prevYear, prevMonth, 16, 0, 0, 0, 0);
      const previousEndDate = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);

      const periodLabel = `${SHORT_MONTHS[d.getMonth()]} 1 - 15`;

      return {
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
        periodLabel,
      };
    } else {
      // 16th to end of current month
      const startDate = new Date(d.getFullYear(), d.getMonth(), 16, 0, 0, 0, 0);
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      // Previous period: 1st to 15th of current month
      const previousStartDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const previousEndDate = new Date(d.getFullYear(), d.getMonth(), 15, 23, 59, 59, 999);

      const periodLabel = `${SHORT_MONTHS[d.getMonth()]} 16 - ${endDate.getDate()}`;

      return {
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
        periodLabel,
      };
    }
  }

  if (frequency === "quarterly") {
    const quarter = Math.floor(d.getMonth() / 3); // 0, 1, 2, 3
    const startMonth = quarter * 3;
    const startDate = new Date(d.getFullYear(), startMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(d.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);

    const prevStartMonth = startMonth - 3;
    const prevYear = prevStartMonth < 0 ? d.getFullYear() - 1 : d.getFullYear();
    const normalizedPrevMonth = (prevStartMonth + 12) % 12;

    const previousStartDate = new Date(prevYear, normalizedPrevMonth, 1, 0, 0, 0, 0);
    const previousEndDate = new Date(prevYear, normalizedPrevMonth + 3, 0, 23, 59, 59, 999);

    const periodLabel = `Q${quarter + 1} ${d.getFullYear()}`;

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  if (frequency === "yearly") {
    const startDate = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

    const previousStartDate = new Date(d.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const previousEndDate = new Date(d.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    const periodLabel = `${d.getFullYear()}`;

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  // Monthly & custom_monthly (default)
  const startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

  const prevMonth = d.getMonth() === 0 ? 11 : d.getMonth() - 1;
  const prevYear = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const previousStartDate = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
  const previousEndDate = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);

  const periodLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    periodLabel,
  };
}
