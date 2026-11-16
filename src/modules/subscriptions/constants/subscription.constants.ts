import type { BillingCycle, SubscriptionFilter } from "../types/subscription.types";

export const DEFAULT_SUBSCRIPTION_LEAD_DAYS = [1, 3];

export const BILLING_CYCLE_OPTIONS: ReadonlyArray<{
  value: BillingCycle;
  labelKey: string;
}> = [
  { value: "weekly", labelKey: "subscriptions.cycleWeekly" },
  { value: "monthly", labelKey: "subscriptions.cycleMonthly" },
  { value: "quarterly", labelKey: "subscriptions.cycleQuarterly" },
  { value: "semi_annual", labelKey: "subscriptions.cycleSemiAnnual" },
  { value: "yearly", labelKey: "subscriptions.cycleYearly" },
];

export const SUBSCRIPTION_FILTER_OPTIONS: ReadonlyArray<{
  value: SubscriptionFilter;
  labelKey: string;
}> = [
  { value: "all", labelKey: "subscriptions.filterAll" },
  { value: "active", labelKey: "subscriptions.filterActive" },
  { value: "trial", labelKey: "subscriptions.filterTrial" },
  { value: "paused", labelKey: "subscriptions.filterPaused" },
  { value: "cancelled", labelKey: "subscriptions.filterCancelled" },
];
