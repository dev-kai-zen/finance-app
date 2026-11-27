export interface LinkedAccountItemLike {
  id: string;
  currencyCode?: string | null;
  currentBalanceMinorUnits?: number | null;
}

export interface LinkedPocketItemLike {
  id: string;
  accountId: string;
  currentBalanceMinorUnits?: number | null;
}

export interface CalculateLinkedBalanceParams {
  goalCurrencyCode?: string | null;
  selectedAccounts: LinkedAccountItemLike[];
  selectedPockets: LinkedPocketItemLike[];
  accountMap?: Map<string, { currencyCode?: string | null }> | null;
}

/**
 * Pure calculation helper ensuring exact parity between:
 * 1. getGoalsWithProgress (production read service)
 * 2. GoalFormModal (totalLinkedBalance preview)
 * 3. GoalAccountPickerModal (totalSelectedBalance footer preview)
 *
 * Enforces:
 * - Currency compatibility: Only matching accounts/pockets contribute.
 * - Parent-child deduplication: Pockets whose parent account is linked do not double-count.
 * - Non-negative floor: Clamps negative ledger balances to 0 for goal progress.
 */
export function calculateLinkedFundsBalance({
  goalCurrencyCode,
  selectedAccounts,
  selectedPockets,
  accountMap,
}: CalculateLinkedBalanceParams): number {
  const linkedAccountIdsSet = new Set(selectedAccounts.map((a) => a.id));

  // Accounts sum: only include accounts matching the goal currency
  const accountsSum = selectedAccounts.reduce((sum, acc) => {
    const currency = acc.currencyCode ?? accountMap?.get(acc.id)?.currencyCode;
    if (goalCurrencyCode && currency && currency !== goalCurrencyCode) {
      return sum;
    }
    return sum + Math.max(0, acc.currentBalanceMinorUnits ?? 0);
  }, 0);

  // Pockets sum: exclude pockets whose parent account is already in selectedAccounts to avoid double counting,
  // and only include pockets matching the goal currency
  const nonDuplicatedPockets = selectedPockets.filter(
    (p) => !linkedAccountIdsSet.has(p.accountId),
  );

  const pocketsSum = nonDuplicatedPockets.reduce((sum, pocket) => {
    const parentCurrency = accountMap?.get(pocket.accountId)?.currencyCode;
    if (goalCurrencyCode && parentCurrency && parentCurrency !== goalCurrencyCode) {
      return sum;
    }
    return sum + Math.max(0, pocket.currentBalanceMinorUnits ?? 0);
  }, 0);

  return accountsSum + pocketsSum;
}
