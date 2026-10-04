/**
 * Dedicated calculation functions for Credit Card Monitoring and Account Views.
 *
 * Fundamental formulas:
 * 1. Billed: Sum of unpaid statement balances (opening statement + cycle statements)
 * 2. Unbilled: Sum of unbilled purchases and active installment principal, minus unallocated payments/credits
 * 3. Outstanding: Billed + Unbilled (Total current debt owed)
 * 4. Available Limit: Credit Limit - Outstanding
 * 5. Utilization %: (Outstanding / Credit Limit) * 100
 */

/**
 * Calculates the total billed amount from issued statements with unpaid balances.
 */
export function calculateCreditCardBilled(
  statements: Array<{ remainingAmountMinorUnits: number }>,
): number {
  return Math.max(
    0,
    statements.reduce(
      (sum, statement) => sum + statement.remainingAmountMinorUnits,
      0,
    ),
  );
}

/**
 * Calculates the total unbilled amount from active unbilled activity items
 * (one-time purchases and installment remaining principals), minus any unallocated credits/payments.
 */
export function calculateCreditCardUnbilled(
  unbilledItems: Array<{ amountMinorUnits: number }>,
  unallocatedCreditsMinorUnits = 0,
): number {
  const unbilledGross = unbilledItems.reduce(
    (sum, item) => sum + item.amountMinorUnits,
    0,
  );
  return Math.max(0, unbilledGross - unallocatedCreditsMinorUnits);
}

/**
 * Calculates the total outstanding balance (total current debt) owed on the credit card.
 * Outstanding = Billed + Unbilled.
 */
export function calculateCreditCardOutstanding(
  billedMinorUnits: number,
  unbilledMinorUnits: number,
): number {
  return Math.max(0, billedMinorUnits + unbilledMinorUnits);
}

/**
 * Calculates the remaining available credit limit.
 * Available Limit = Credit Limit - Outstanding Debt.
 */
export function calculateCreditCardAvailableLimit(
  creditLimitMinorUnits: number,
  outstandingMinorUnits: number,
): number {
  return Math.max(0, creditLimitMinorUnits - outstandingMinorUnits);
}

/**
 * Calculates the credit utilization percentage.
 * Utilization = (Outstanding / Credit Limit) * 100.
 */
export function calculateCreditCardUtilization(
  creditLimitMinorUnits: number,
  outstandingMinorUnits: number,
): number {
  if (creditLimitMinorUnits <= 0) return 0;
  return (outstandingMinorUnits / creditLimitMinorUnits) * 100;
}

// Aliases matching user naming preferences
export const CreditCardBilledComputation = calculateCreditCardBilled;
export const CreditCardUnbilledComputation = calculateCreditCardUnbilled;
export const CreditCardOutstandingComputation = calculateCreditCardOutstanding;
export const CreditCardAvailableLimitComputation = calculateCreditCardAvailableLimit;
export const CreditCardUtilizationComputation = calculateCreditCardUtilization;
