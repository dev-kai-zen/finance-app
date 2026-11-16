import type { BillingCycle } from "../types/subscription.types";

/**
 * Calculates the next renewal date based on billing cycle and interval.
 */
export function calculateNextRenewal(
  currentDate: Date,
  billingCycle: BillingCycle,
  intervalCount = 1,
): Date {
  const safeInterval = Math.max(1, intervalCount);
  const next = new Date(currentDate.getTime());

  switch (billingCycle) {
    case "weekly":
      next.setDate(next.getDate() + 7 * safeInterval);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + safeInterval);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3 * safeInterval);
      break;
    case "semi_annual":
      next.setMonth(next.getMonth() + 6 * safeInterval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + safeInterval);
      break;
  }

  return next;
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
