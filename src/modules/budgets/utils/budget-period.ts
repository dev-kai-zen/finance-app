import type { BudgetFrequency } from "../types/budget.types";

export interface BudgetPeriodInfo {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  periodLabel: string;
}

const MONTH_NAMES: Record<string, string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  fil: [
    "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo",
    "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre",
  ],
  es: [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ],
};

const SHORT_MONTHS: Record<string, string[]> = {
  en: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  fil: [
    "Ene", "Peb", "Mar", "Abr", "May", "Hun",
    "Hul", "Ago", "Set", "Okt", "Nob", "Dis",
  ],
  es: [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ],
};

const TODAY_LABELS: Record<string, string> = {
  en: "Today",
  fil: "Ngayong araw",
  es: "Hoy",
};

export function getLocalizedMonthNames(language: string = "en"): {
  full: string[];
  short: string[];
} {
  const lang = language in MONTH_NAMES ? language : "en";
  return {
    full: MONTH_NAMES[lang],
    short: SHORT_MONTHS[lang],
  };
}

/**
 * Calculates start, end, and previous period dates along with user-facing labels
 * for any supported budget frequency.
 */
export function getBudgetPeriodInfo(
  frequency: BudgetFrequency,
  referenceDate: Date = new Date(),
  anchorStartDate?: Date,
  language: string = "en",
): BudgetPeriodInfo {
  const lang = language in MONTH_NAMES ? language : "en";
  const d = new Date(referenceDate);

  if (frequency === "daily") {
    const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const prevDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
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
      ? TODAY_LABELS[lang]
      : `${SHORT_MONTHS[lang][d.getMonth()]} ${d.getDate()}`;

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

    const periodLabel = `${SHORT_MONTHS[lang][monday.getMonth()]} ${monday.getDate()} - ${SHORT_MONTHS[lang][sunday.getMonth()]} ${sunday.getDate()}`;

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
    const diffMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
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

    const periodLabel = `${SHORT_MONTHS[lang][startDate.getMonth()]} ${startDate.getDate()} - ${SHORT_MONTHS[lang][endDate.getMonth()]} ${endDate.getDate()}`;

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

      const periodLabel = `${SHORT_MONTHS[lang][d.getMonth()]} 1 - 15`;

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

      const periodLabel = `${SHORT_MONTHS[lang][d.getMonth()]} 16 - ${endDate.getDate()}`;

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

    const periodLabel = lang === "es" ? `T${quarter + 1} ${d.getFullYear()}` : `Q${quarter + 1} ${d.getFullYear()}`;

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

  const periodLabel = `${MONTH_NAMES[lang][d.getMonth()]} ${d.getFullYear()}`;

  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    periodLabel,
  };
}

export function formatBudgetPeriodLabel(
  frequency: BudgetFrequency,
  referenceDate: Date = new Date(),
  anchorStartDate?: Date,
  language: string = "en",
): string {
  return getBudgetPeriodInfo(frequency, referenceDate, anchorStartDate, language).periodLabel;
}
