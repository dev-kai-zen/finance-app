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
  isUsed: boolean;
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
