/**
 * Standard colors for PHP Currency display.
 * Positive = Green, Negative = Red, Neutral = Slate/Muted.
 */
export const PHP_CURRENCY_COLORS = {
  positive: "#10B981", // Green (Success / Emerald)
  negative: "#EF4444", // Red (Danger / Coral)
  neutral: "#64748B",  // Muted (Slate)
} as const;

export interface FormatPhpOptions {
  showPositiveSign?: boolean;
  positiveColor?: string;
  negativeColor?: string;
  zeroColor?: string;
  defaultColor?: string;
}

export interface FormattedPhpCurrency {
  /** Full currency with symbol and conditional sign: e.g. "+₱1,500.00", "-₱250.00", "₱0.00" */
  formatted: string;
  /** Always includes '+' or '-' for non-zero: e.g. "+₱1,500.00" or "-₱250.00" */
  formattedWithSign: string;
  /** Number only with commas and sign: e.g. "+1,500.00" or "-250.00" */
  amountText: string;
  /** Theme-aware color hex: Green for positive, Red for negative, Muted for zero */
  color: string;
  /** Semantic token key: "success" | "danger" | "neutral" */
  colorKey: "success" | "danger" | "neutral";
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
  sign: "+" | "-" | "";
}

export const DEFAULT_BASE_CURRENCY = "PHP";

export type NegativeNumberFormat = "minus" | "parentheses";
export type DecimalFormat =
  | "automatic"
  | "comma-dot"
  | "dot-comma"
  | "space-dot"
  | "space-comma";

export interface CurrencyPreferences {
  defaultCurrency: string;
  displayCurrency: boolean;
  colorAmounts: boolean;
  negativeFormat: NegativeNumberFormat;
  decimalDigits: number;
  decimalFormat: DecimalFormat;
}

export const DEFAULT_CURRENCY_PREFERENCES: CurrencyPreferences = {
  defaultCurrency: DEFAULT_BASE_CURRENCY,
  displayCurrency: true,
  colorAmounts: true,
  negativeFormat: "minus",
  decimalDigits: 2,
  decimalFormat: "automatic",
};

let activeCurrencyPreferences = DEFAULT_CURRENCY_PREFERENCES;
let activeCurrencyLocale = "en-PH";

export function setActiveCurrencyFormattingPreferences(
  preferences: CurrencyPreferences,
  locale?: string,
): void {
  activeCurrencyPreferences = { ...preferences };
  if (locale) activeCurrencyLocale = locale;
}

export function getActiveCurrencyFormattingPreferences(): CurrencyPreferences {
  return activeCurrencyPreferences;
}

/**
 * Currency display symbols mapped by ISO 4217 code.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  SGD: "S$",
  CAD: "CA$",
  AUD: "A$",
  HKD: "HK$",
  THB: "฿",
  MYR: "RM",
  IDR: "Rp",
  VND: "₫",
  INR: "₹",
  CHF: "CHF ",
  NZD: "NZ$",
  AED: "AED ",
  SAR: "SAR ",
  TWD: "NT$",
};

/**
 * Decimal places / minor unit exponents for supported currencies.
 * (e.g. USD and PHP have 2 decimals, JPY and KRW have 0 decimals).
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  PHP: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CNY: 2,
  KRW: 0,
  SGD: 2,
  CAD: 2,
  AUD: 2,
  HKD: 2,
  THB: 2,
  MYR: 2,
  IDR: 0,
  VND: 0,
  INR: 2,
  CHF: 2,
  NZD: 2,
  AED: 2,
  SAR: 2,
  TWD: 2,
};

let activeMinorUnitExponents: Record<string, number> = { ...CURRENCY_DECIMALS };

export function setActiveCurrencyMinorUnitExponents(
  exponents: Record<string, number>,
): void {
  activeMinorUnitExponents = { ...exponents };
}

export function getCurrencyMinorUnitExponent(currencyCode: string): number {
  return (
    activeMinorUnitExponents[currencyCode] ??
    CURRENCY_DECIMALS[currencyCode] ??
    2
  );
}

/**
 * Default offline exchange rates against base currency (PHP).
 * Scale is 10,000 basis points (1.0000x = 10,000 bps).
 * Rate represents: how many PHP units equal 1 unit of foreign currency.
 */
export const DEFAULT_EXCHANGE_RATES_TO_PHP_BPS: Record<string, number> = {
  PHP: 10_000,
  USD: 585_000, // 58.50 PHP per 1 USD
  EUR: 635_000, // 63.50 PHP per 1 EUR
  GBP: 745_000, // 74.50 PHP per 1 GBP
  JPY: 3_900,   // 0.39 PHP per 1 JPY
  SGD: 435_000, // 43.50 PHP per 1 SGD
  CAD: 425_000, // 42.50 PHP per 1 CAD
  AUD: 385_000, // 38.50 PHP per 1 AUD
  HKD: 75_000,  // 7.50 PHP per 1 HKD
  CNY: 81_000,  // 8.10 PHP per 1 CNY
  KRW: 430,     // 0.043 PHP per 1 KRW
  THB: 16_500,  // 1.65 PHP per 1 THB
  MYR: 132_000, // 13.20 PHP per 1 MYR
  IDR: 36,      // 0.0036 PHP per 1 IDR
  VND: 23,      // 0.0023 PHP per 1 VND
  INR: 7_000,   // 0.70 PHP per 1 INR
  AED: 159_000, // 15.90 PHP per 1 AED
  SAR: 156_000, // 15.60 PHP per 1 SAR
  TWD: 18_200,  // 1.82 PHP per 1 TWD
  CHF: 655_000, // 65.50 PHP per 1 CHF
  NZD: 355_000, // 35.50 PHP per 1 NZD
};

/**
 * Format an integer amount in minor units (centavos) as PHP currency with proper commas,
 * sign handling, and automatic color mapping (green for positive, red for negative).
 *
 * @param amountMinorUnits - Amount in integer centavos (e.g. 150000 for ₱1,500.00, -25000 for -₱250.00)
 * @param options - Customization options for positive signs and theme colors
 */
export function formatPhpCurrency(
  amountMinorUnits: number,
  options?: FormatPhpOptions,
): FormattedPhpCurrency {
  const isNegative = amountMinorUnits < 0;
  const isZero = amountMinorUnits === 0;
  const isPositive = amountMinorUnits > 0;

  const sign = isNegative ? "-" : options?.showPositiveSign && isPositive ? "+" : "";

  const positiveColor = options?.positiveColor ?? PHP_CURRENCY_COLORS.positive;
  const negativeColor = options?.negativeColor ?? PHP_CURRENCY_COLORS.negative;
  const zeroColor = options?.zeroColor ?? PHP_CURRENCY_COLORS.neutral;

  const color = activeCurrencyPreferences.colorAmounts
    ? isPositive
      ? positiveColor
      : isNegative
        ? negativeColor
        : zeroColor
    : options?.defaultColor ?? zeroColor;

  const colorKey: "success" | "danger" | "neutral" = isPositive
    ? "success"
    : isNegative
      ? "danger"
      : "neutral";

  return {
    formatted: formatCurrency(
      amountMinorUnits,
      "PHP",
      Boolean(options?.showPositiveSign),
    ),
    formattedWithSign: formatCurrency(amountMinorUnits, "PHP", true),
    amountText: formatCurrency(
      amountMinorUnits,
      "PHP",
      Boolean(options?.showPositiveSign),
      { hideCurrency: true },
    ),
    color,
    colorKey,
    isPositive,
    isNegative,
    isZero,
    sign,
  };
}

export interface FormatCurrencyOptions {
  useCode?: boolean;
  hideCurrency?: boolean;
  preferences?: CurrencyPreferences;
  locale?: string;
}

/**
 * Format an integer amount in minor units (centavos/cents) as a formatted currency string.
 * Uses integer math to avoid floating point precision pitfalls.
 *
 * @param amountMinorUnits - Amount in integer minor units (e.g. 150000 for ₱1,500.00)
 * @param currencyCode - Currency code, defaults to 'PHP'
 * @param showSign - Whether to explicitly include a '+' for positive amounts
 * @param options - Optional formatting configuration (e.g. useCode to show 'USD ' instead of '$')
 */
export function formatCurrency(
  amountMinorUnits: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
  showSign: boolean = false,
  options?: FormatCurrencyOptions,
): string {
  const preferences = options?.preferences ?? activeCurrencyPreferences;
  const locale = options?.locale ?? activeCurrencyLocale;
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const sourceDecimals = getCurrencyMinorUnitExponent(currencyCode);
  const divisor = 10 ** sourceDecimals;
  const decimalDigits = sourceDecimals;
  const baseNumber = formatAbsoluteNumber(
    absMinorUnits / divisor,
    decimalDigits,
    preferences.decimalFormat,
    locale,
  );
  const showCurrency = preferences.displayCurrency && !options?.hideCurrency;
  const symbol = !showCurrency
    ? ""
    : options?.useCode
      ? `${currencyCode} `
      : CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `;
  const unsigned = `${symbol}${baseNumber}`;

  if (isNegative) {
    return preferences.negativeFormat === "parentheses"
      ? `(${unsigned})`
      : `-${unsigned}`;
  }
  return `${showSign && amountMinorUnits > 0 ? "+" : ""}${unsigned}`;
}

function formatAbsoluteNumber(
  value: number,
  decimalDigits: number,
  decimalFormat: DecimalFormat,
  locale: string,
): string {
  if (decimalFormat === "automatic") {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
      useGrouping: true,
    }).format(value);
  }

  const [integerPart, fractionPart = ""] = value
    .toFixed(decimalDigits)
    .split(".");
  const groupingSeparator = decimalFormat.startsWith("space")
    ? " "
    : decimalFormat === "dot-comma"
      ? "."
      : ",";
  const decimalSeparator = decimalFormat.endsWith("comma") ? "," : ".";
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    groupingSeparator,
  );
  return decimalDigits > 0
    ? `${groupedInteger}${decimalSeparator}${fractionPart}`
    : groupedInteger;
}

/**
 * Convert an amount in integer minor units from one currency to another using exchange rates.
 * Exchange rates are expressed in basis points against baseCurrency (e.g. PHP):
 * rate = (how many base units per 1 quote unit) * 10,000.
 *
 * @param amountMinorUnits - Amount in source currency's minor units (e.g. cents)
 * @param fromCurrency - Source currency code (e.g. "USD")
 * @param toCurrency - Target currency code (e.g. "PHP")
 * @param ratesMap - Optional map of currencyCode -> rateBasisPoints against baseCurrency.
 *                   If omitted or rate missing, falls back to DEFAULT_EXCHANGE_RATES_TO_PHP_BPS.
 * @param baseCurrency - Base currency of the exchange rates (defaults to "PHP")
 */
export function convertCurrencyMinorUnits(
  amountMinorUnits: number,
  fromCurrency: string,
  toCurrency: string,
  ratesMap?: Map<string, number> | Record<string, number>,
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
): number {
  if (fromCurrency === toCurrency || amountMinorUnits === 0) {
    return amountMinorUnits;
  }

  const getRate = (code: string): number => {
    if (ratesMap instanceof Map) {
      const val = ratesMap.get(code);
      if (val !== undefined) return val;
    } else if (ratesMap && typeof ratesMap === "object") {
      const val = ratesMap[code];
      if (val !== undefined) return val;
    }
    return DEFAULT_EXCHANGE_RATES_TO_PHP_BPS[code] ?? (code === baseCurrency ? 10_000 : 10_000);
  };

  const fromRate = getRate(fromCurrency);
  const toRate = getRate(toCurrency);

  const fromDecimals = getCurrencyMinorUnitExponent(fromCurrency);
  const toDecimals = getCurrencyMinorUnitExponent(toCurrency);
  const decimalDiff = toDecimals - fromDecimals;

  let scaledAmount = BigInt(amountMinorUnits) * BigInt(fromRate);
  if (decimalDiff > 0) {
    scaledAmount *= BigInt(10 ** decimalDiff);
  }

  const divisor = BigInt(toRate) * (decimalDiff < 0 ? BigInt(10 ** -decimalDiff) : 1n);

  if (divisor === 0n) {
    return amountMinorUnits;
  }

  const sign = scaledAmount < 0n ? -1n : 1n;
  const absScaled = scaledAmount < 0n ? -scaledAmount : scaledAmount;
  const result = ((absScaled + (divisor / 2n)) / divisor) * sign;

  return Number(result);
}
