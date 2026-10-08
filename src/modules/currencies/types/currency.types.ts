export interface Currency {
  code: string;
  name: string;
  symbol: string;
  minorUnitExponent: number;
  sortOrder: number;
  isActive: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrencyListItem extends Currency {
  /** Shown when referenced by accounts, goals, or default currency (not conversion rates alone). */
  isUsed: boolean;
  /** Locks edit/delete when referenced by accounts, goals, or default currency. */
  isLocked: boolean;
}

export type CurrencyUsageReasonKind =
  | "accounts"
  | "goals"
  | "exchange_rates"
  | "default_currency";

export interface CurrencyUsageReason {
  kind: CurrencyUsageReasonKind;
  count: number;
}

export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  minorUnitExponent: number;
}

export interface UpdateCurrencyInput {
  code: string;
  name?: string;
  symbol?: string;
  minorUnitExponent?: number;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rateBasisPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertExchangeRateInput {
  baseCurrency: string;
  quoteCurrency: string;
  rateBasisPoints: number;
}
