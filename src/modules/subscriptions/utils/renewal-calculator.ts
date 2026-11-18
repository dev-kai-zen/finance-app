import type { BillingCycle } from "../types/subscription.types";

/**
 * Calculates the next renewal date based on billing cycle and interval.
 * Clamps days to prevent JavaScript Date month rollover (e.g. Jan 31 -> Feb 28).
 * Accepts an optional anchorDay (e.g. from the original subscription firstBillingDate)
 * so that subsequent months with 31 days restore back to day 31.
 */
export function calculateNextRenewal(
  currentDate: Date,
  billingCycle: BillingCycle,
  intervalCount = 1,
  anchorDay?: number,
): Date {
  const safeInterval = Math.max(1, intervalCount);
  const baseDay = anchorDay ?? currentDate.getDate();

  switch (billingCycle) {
    case "weekly": {
      const next = new Date(currentDate.getTime());
      next.setDate(next.getDate() + 7 * safeInterval);
      return next;
    }
    case "monthly": {
      const totalMonths =
        currentDate.getFullYear() * 12 + currentDate.getMonth() + safeInterval;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(baseDay, lastDay);
      return new Date(
        targetYear,
        targetMonth,
        targetDay,
        currentDate.getHours(),
        currentDate.getMinutes(),
        currentDate.getSeconds(),
        currentDate.getMilliseconds(),
      );
    }
    case "quarterly": {
      const totalMonths =
        currentDate.getFullYear() * 12 +
        currentDate.getMonth() +
        3 * safeInterval;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(baseDay, lastDay);
      return new Date(
        targetYear,
        targetMonth,
        targetDay,
        currentDate.getHours(),
        currentDate.getMinutes(),
        currentDate.getSeconds(),
        currentDate.getMilliseconds(),
      );
    }
    case "semi_annual": {
      const totalMonths =
        currentDate.getFullYear() * 12 +
        currentDate.getMonth() +
        6 * safeInterval;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = ((totalMonths % 12) + 12) % 12;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(baseDay, lastDay);
      return new Date(
        targetYear,
        targetMonth,
        targetDay,
        currentDate.getHours(),
        currentDate.getMinutes(),
        currentDate.getSeconds(),
        currentDate.getMilliseconds(),
      );
    }
    case "yearly": {
      const targetYear = currentDate.getFullYear() + safeInterval;
      const targetMonth = currentDate.getMonth();
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(baseDay, lastDay);
      return new Date(
        targetYear,
        targetMonth,
        targetDay,
        currentDate.getHours(),
        currentDate.getMinutes(),
        currentDate.getSeconds(),
        currentDate.getMilliseconds(),
      );
    }
  }
}

/**
 * Computes calendar days until the renewal date relative to now.
 * 0 = today, 1 = tomorrow, < 0 = overdue.
 */
export function getDaysUntilRenewal(renewalDate: Date, now = new Date()): number {
  const startOfDayNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDayRenewal = new Date(
    renewalDate.getFullYear(),
    renewalDate.getMonth(),
    renewalDate.getDate(),
  ).getTime();

  const diffMs = startOfDayRenewal - startOfDayNow;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes an amount into an equivalent monthly burn rate minor units.
 */
export function calculateMonthlyBurnRate(
  amountMinorUnits: number,
  billingCycle: BillingCycle,
  intervalCount = 1,
): number {
  if (amountMinorUnits <= 0) return 0;
  const safeInterval = Math.max(1, intervalCount);

  switch (billingCycle) {
    case "weekly":
      // (amount * 52 weeks) / (12 months * interval)
      return Math.round((amountMinorUnits * 52) / (12 * safeInterval));
    case "monthly":
      return Math.round(amountMinorUnits / safeInterval);
    case "quarterly":
      return Math.round(amountMinorUnits / (3 * safeInterval));
    case "semi_annual":
      return Math.round(amountMinorUnits / (6 * safeInterval));
    case "yearly":
      return Math.round(amountMinorUnits / (12 * safeInterval));
  }
}

/**
 * Calculates projected annual expense from monthly burn rate.
 */
export function calculateYearlyProjection(monthlyBurnRateMinorUnits: number): number {
  return Math.round(monthlyBurnRateMinorUnits * 12);
}
