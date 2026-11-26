import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";

export interface ForecastTransactionInput {
  type: string;
  amountMinorUnits: number;
  accountCurrency: string;
  deletedAt?: Date | string | null;
}

export interface ForecastScheduleOccurrenceInput {
  status: string;
  transactionType: string;
  amountMinorUnits: number;
  accountId?: string | null;
}

/**
 * Calculates the projected month-end net cash position.
 * Net Cashflow = Actual Month Net (non-transfers) + Pending Scheduled Net (due/upcoming non-transfers).
 */
export function calculateProjectedMonthEndNet(
  activeMonthTransactions: ForecastTransactionInput[],
  monthScheduleOccurrences: ForecastScheduleOccurrenceInput[],
  accountCurrencyMap: Map<string, string>,
  convertToDefaultCurrency: (amount: number, currency: string) => number,
): number {
  let monthPendingNet = 0;

  for (const occ of monthScheduleOccurrences) {
    if (occ.status === "due" || occ.status === "upcoming") {
      if (occ.transactionType !== "expense" && occ.transactionType !== "income") {
        continue;
      }
      const currency =
        (occ.accountId ? accountCurrencyMap.get(occ.accountId) : undefined) ??
        DEFAULT_BASE_CURRENCY;
      const convertedAmount = convertToDefaultCurrency(
        occ.amountMinorUnits,
        currency,
      );
      // Guarantee signed direction: expenses (bills) deduct, income adds
      const signedPending =
        occ.transactionType === "expense"
          ? -Math.abs(convertedAmount)
          : Math.abs(convertedAmount);
      monthPendingNet += signedPending;
    }
  }

  let monthActualNet = 0;
  for (const tx of activeMonthTransactions) {
    if (tx.type === "transfer" || tx.deletedAt) continue;
    const convertedAmount = convertToDefaultCurrency(
      tx.amountMinorUnits,
      tx.accountCurrency,
    );
    monthActualNet += convertedAmount;
  }

  return monthActualNet + monthPendingNet;
}
