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
