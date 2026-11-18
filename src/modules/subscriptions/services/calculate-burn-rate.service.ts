import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import type {
  SubscriptionBurnRateSummary,
  SubscriptionItem,
} from "../types/subscription.types";
import {
  calculateMonthlyBurnRate,
  calculateYearlyProjection,
} from "../utils/renewal-calculator";

export function calculateBurnRateSummary(
  subscriptions: SubscriptionItem[],
  baseCurrency = DEFAULT_BASE_CURRENCY,
  ratesMap?: Map<string, number> | Record<string, number>,
): SubscriptionBurnRateSummary {
  let totalMonthlyBurn = 0;
  let activeCount = 0;
  let trialCount = 0;
  let pausedCount = 0;
  let upcomingCount7Days = 0;

  for (const item of subscriptions) {
    if (item.archivedAt) continue;

    if (item.status === "active" || item.status === "trial") {
      const burn = calculateMonthlyBurnRate(
        item.amountMinorUnits,
        item.billingCycle,
        item.billingCycleInterval,
      );
      const convertedBurn = convertCurrencyMinorUnits(
        burn,
        item.currencyCode || baseCurrency,
        baseCurrency,
        ratesMap,
      );
      totalMonthlyBurn += convertedBurn;

      if (item.status === "active") activeCount += 1;
      if (item.status === "trial") trialCount += 1;

      if (item.daysUntilRenewal >= 0 && item.daysUntilRenewal <= 7) {
        upcomingCount7Days += 1;
      }
    } else if (item.status === "paused") {
      pausedCount += 1;
    }
  }

  return {
    totalMonthlyBurnRateMinorUnits: totalMonthlyBurn,
    totalYearlyProjectedMinorUnits: calculateYearlyProjection(totalMonthlyBurn),
    activeCount,
    trialCount,
    pausedCount,
    upcomingCount7Days,
    currencyCode: baseCurrency,
  };
}
