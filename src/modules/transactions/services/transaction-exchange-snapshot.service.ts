import { getExchangeRateMap } from "@/modules/currencies";
import {
  applyExchangeRate,
  DEFAULT_BASE_CURRENCY,
  deriveExchangeRate,
  snapshotExchangeRateFromBook,
} from "@/utils/currency";

export type TransactionExchangeEditField = "typed" | "rate" | "account";

export interface ResolveTransactionExchangeInput {
  accountCurrencyCode: string;
  typedCurrencyCode: string;
  /** Absolute typed amount in typed currency minor units. */
  typedAmountMinorUnitsAbs: number;
  /** Signed account amount when user edited account field; otherwise omitted. */
  signedAccountAmountMinorUnits?: number;
  exchangeRateScaled?: number | null;
  lastEdited?: TransactionExchangeEditField;
  type: "income" | "expense";
}

export interface ResolvedTransactionExchange {
  currencyCode: string;
  amountMinorUnits: number;
  originalAmountMinorUnits: number | null;
  exchangeRateScaled: number | null;
}

function signForType(type: "income" | "expense", magnitude: number): number {
  return type === "expense" ? -Math.abs(magnitude) : Math.abs(magnitude);
}

export function resolveTransactionExchangeSnapshot(
  input: ResolveTransactionExchangeInput,
): ResolvedTransactionExchange {
  const account = input.accountCurrencyCode.trim().toUpperCase();
  const typed = input.typedCurrencyCode.trim().toUpperCase();
  const typedAbs = Math.abs(input.typedAmountMinorUnitsAbs);

  if (!Number.isInteger(typedAbs) || typedAbs === 0) {
    throw new Error("Transaction amount cannot be zero.");
  }

  if (typed === account) {
    return {
      currencyCode: account,
      amountMinorUnits: signForType(input.type, typedAbs),
      originalAmountMinorUnits: null,
      exchangeRateScaled: null,
    };
  }

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY);
  let rate = input.exchangeRateScaled ?? null;

  if (input.lastEdited === "account" && input.signedAccountAmountMinorUnits !== undefined) {
    const accountAbs = Math.abs(input.signedAccountAmountMinorUnits);
    if (!Number.isInteger(accountAbs) || accountAbs === 0) {
      throw new Error("Account amount must be a non-zero integer in minor units.");
    }
    rate = deriveExchangeRate(accountAbs, typedAbs, typed, account);
    return {
      currencyCode: typed,
      amountMinorUnits: signForType(input.type, accountAbs),
      originalAmountMinorUnits: typedAbs,
      exchangeRateScaled: rate,
    };
  }

  if (rate === null || rate === undefined) {
    rate = snapshotExchangeRateFromBook(typed, account, ratesMap, DEFAULT_BASE_CURRENCY);
  }

  const accountMagnitude = applyExchangeRate(typedAbs, rate, typed, account);
  return {
    currencyCode: typed,
    amountMinorUnits: signForType(input.type, accountMagnitude),
    originalAmountMinorUnits: typedAbs,
    exchangeRateScaled: rate,
  };
}
