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

/** Scale for transaction snapshot rates: 1 major typed unit = rate × this value account major units. */
export const EXCHANGE_RATE_SNAPSHOT_SCALE = 100_000_000;

export function minorUnitsPerMajorUnit(currencyCode: string): bigint {
  const exponent = getCurrencyMinorUnitExponent(currencyCode);
  return BigInt(10) ** BigInt(exponent);
}

export function normalizeExchangeRateScaled(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  const rounded = Math.round(parsed);
  return rounded > 0 ? rounded : null;
}

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
  decimalFormat: DecimalFormat;
}

export const DEFAULT_CURRENCY_PREFERENCES: CurrencyPreferences = {
  defaultCurrency: DEFAULT_BASE_CURRENCY,
  displayCurrency: true,
  colorAmounts: true,
  negativeFormat: "minus",
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
  AED: "AED ",
  AFN: "؋",
  ALL: "L",
  AMD: "֏",
  ANG: "ƒ",
  AOA: "Kz",
  ARS: "$",
  AUD: "A$",
  AWG: "ƒ",
  AZN: "₼",
  BAM: "KM",
  BBD: "Bds$",
  BDT: "৳",
  BGN: "лв",
  BHD: ".د.ب",
  BIF: "FBu",
  BMD: "$",
  BND: "B$",
  BOB: "Bs.",
  BRL: "R$",
  BSD: "B$",
  BTN: "Nu.",
  BWP: "P",
  BYN: "Br",
  BZD: "BZ$",
  CAD: "CA$",
  CDF: "FC",
  CHF: "CHF ",
  CLP: "$",
  CNY: "¥",
  COP: "$",
  CRC: "₡",
  CUP: "₱",
  CVE: "$",
  CZK: "Kč",
  DJF: "Fdj",
  DKK: "kr",
  DOP: "RD$",
  DZD: "د.ج",
  EGP: "E£",
  ERN: "Nfk",
  ETB: "Br",
  EUR: "€",
  FJD: "FJ$",
  FKP: "£",
  GBP: "£",
  GEL: "₾",
  GHS: "GH₵",
  GIP: "£",
  GMD: "D",
  GNF: "FG",
  GTQ: "Q",
  GYD: "G$",
  HKD: "HK$",
  HNL: "L",
  HTG: "G",
  HUF: "Ft",
  IDR: "Rp",
  ILS: "₪",
  INR: "₹",
  IQD: "ع.د",
  IRR: "﷼",
  ISK: "kr",
  JMD: "J$",
  JOD: "د.ا",
  JPY: "¥",
  KES: "KSh",
  KGS: "с",
  KHR: "៛",
  KMF: "CF",
  KRW: "₩",
  KWD: "د.ك",
  KYD: "CI$",
  KZT: "₸",
  LAK: "₭",
  LBP: "L£",
  LKR: "Rs",
  LRD: "L$",
  LSL: "L",
  LYD: "ل.د",
  MAD: "د.م.",
  MDL: "L",
  MGA: "Ar",
  MKD: "ден",
  MMK: "K",
  MNT: "₮",
  MOP: "MOP$",
  MRU: "UM",
  MUR: "₨",
  MVR: "Rf",
  MWK: "MK",
  MXN: "Mex$",
  MYR: "RM",
  MZN: "MT",
  NAD: "N$",
  NGN: "₦",
  NIO: "C$",
  NOK: "kr",
  NPR: "₨",
  NZD: "NZ$",
  OMR: "ر.ع.",
  PAB: "B/.",
  PEN: "S/.",
  PGK: "K",
  PHP: "₱",
  PKR: "₨",
  PLN: "zł",
  PYG: "₲",
  QAR: "ر.ق",
  RON: "lei",
  RSD: "дин.",
  RUB: "₽",
  RWF: "FRw",
  SAR: "SAR ",
  SBD: "SI$",
  SCR: "₨",
  SDG: "ج.س.",
  SEK: "kr",
  SGD: "S$",
  SHP: "£",
  SLE: "Le",
  SOS: "Sh.So.",
  SRD: "Sr$",
  SSP: "£",
  STN: "Db",
  SYP: "£S",
  SZL: "L",
  THB: "฿",
  TJS: "SM",
  TMT: "T",
  TND: "د.ت",
  TOP: "T$",
  TRY: "₺",
  TTD: "TT$",
  TWD: "NT$",
  TZS: "TSh",
  UAH: "₴",
  UGX: "USh",
  USD: "$",
  UYU: "$U",
  UZS: "soʻm",
  VES: "Bs.",
  VND: "₫",
  VUV: "VT",
  WST: "WS$",
  XAF: "FCFA",
  XCD: "EC$",
  XOF: "CFA",
  XPF: "₣",
  YER: "﷼",
  ZAR: "R",
  ZMW: "ZK",
  ZWL: "Z$",
};

/**
 * Decimal places / minor unit exponents for supported currencies.
 * (e.g. USD and PHP have 2 decimals, JPY and KRW have 0 decimals).
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  AED: 2,
  AFN: 2,
  ALL: 2,
  AMD: 2,
  ANG: 2,
  AOA: 2,
  ARS: 2,
  AUD: 2,
  AWG: 2,
  AZN: 2,
  BAM: 2,
  BBD: 2,
  BDT: 2,
  BGN: 2,
  BHD: 3,
  BIF: 0,
  BMD: 2,
  BND: 2,
  BOB: 2,
  BRL: 2,
  BSD: 2,
  BTN: 2,
  BWP: 2,
  BYN: 2,
  BZD: 2,
  CAD: 2,
  CDF: 2,
  CHF: 2,
  CLP: 0,
  CNY: 2,
  COP: 2,
  CRC: 2,
  CUP: 2,
  CVE: 2,
  CZK: 2,
  DJF: 0,
  DKK: 2,
  DOP: 2,
  DZD: 2,
  EGP: 2,
  ERN: 2,
  ETB: 2,
  EUR: 2,
  FJD: 2,
  FKP: 2,
  GBP: 2,
  GEL: 2,
  GHS: 2,
  GIP: 2,
  GMD: 2,
  GNF: 0,
  GTQ: 2,
  GYD: 2,
  HKD: 2,
  HNL: 2,
  HTG: 2,
  HUF: 2,
  IDR: 0,
  ILS: 2,
  INR: 2,
  IQD: 3,
  IRR: 2,
  ISK: 0,
  JMD: 2,
  JOD: 3,
  JPY: 0,
  KES: 2,
  KGS: 2,
  KHR: 2,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  KYD: 2,
  KZT: 2,
  LAK: 2,
  LBP: 2,
  LKR: 2,
  LRD: 2,
  LSL: 2,
  LYD: 3,
  MAD: 2,
  MDL: 2,
  MGA: 2,
  MKD: 2,
  MMK: 2,
  MNT: 2,
  MOP: 2,
  MRU: 2,
  MUR: 2,
  MVR: 2,
  MWK: 2,
  MXN: 2,
  MYR: 2,
  MZN: 2,
  NAD: 2,
  NGN: 2,
  NIO: 2,
  NOK: 2,
  NPR: 2,
  NZD: 2,
  OMR: 3,
  PAB: 2,
  PEN: 2,
  PGK: 2,
  PHP: 2,
  PKR: 2,
  PLN: 2,
  PYG: 0,
  QAR: 2,
  RON: 2,
  RSD: 2,
  RUB: 2,
  RWF: 0,
  SAR: 2,
  SBD: 2,
  SCR: 2,
  SDG: 2,
  SEK: 2,
  SGD: 2,
  SHP: 2,
  SLE: 2,
  SOS: 2,
  SRD: 2,
  SSP: 2,
  STN: 2,
  SYP: 2,
  SZL: 2,
  THB: 2,
  TJS: 2,
  TMT: 2,
  TND: 3,
  TOP: 2,
  TRY: 2,
  TTD: 2,
  TWD: 2,
  TZS: 2,
  UAH: 2,
  UGX: 0,
  USD: 2,
  UYU: 2,
  UZS: 2,
  VES: 2,
  VND: 0,
  VUV: 0,
  WST: 2,
  XAF: 0,
  XCD: 2,
  XOF: 0,
  XPF: 0,
  YER: 2,
  ZAR: 2,
  ZMW: 2,
  ZWL: 2,
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
  // Additional estimates: ExchangeRate-API USD quotes, 2026-11-20, anchored to USD/PHP above.
  // https://open.er-api.com/v6/latest/USD (existing defaults above are preserved).
  AFN: 8984.321944,
  ALL: 7128.995208,
  AMD: 1622.18397,
  ANG: 326815.642458,
  AOA: 629.27895,
  ARS: 374.282793,
  AWG: 326815.642458,
  AZN: 344161.578272,
  BAM: 328415.152682,
  BBD: 292500,
  BDT: 4701.982369,
  BGN: 328415.152682,
  BHD: 1555851.06383,
  BIF: 194.605205,
  BMD: 585000,
  BND: 453191.514086,
  BOB: 49884.591784,
  BRL: 99266.951741,
  BSD: 585000,
  BTN: 6265.298171,
  BWP: 40433.714834,
  BYN: 195406.706492,
  BZD: 292500,
  CDF: 252.98851,
  CLP: 580.477422,
  COP: 174.867354,
  CRC: 1313.958496,
  CUP: 24375,
  CVE: 5825.278624,
  CZK: 26288.025629,
  DJF: 3291.676279,
  DKK: 85978.520067,
  DOP: 9687.430661,
  DZD: 4267.061071,
  EGP: 10870.657333,
  ERN: 39000,
  ETB: 3615.329352,
  FJD: 255465.989616,
  FKP: 767350.986341,
  GEL: 225685.040901,
  GHS: 49645.58568,
  GIP: 767350.986341,
  GMD: 7824.090584,
  GNF: 66.09784,
  GTQ: 76580.413558,
  GYD: 2798.536889,
  HNL: 21778.453046,
  HTG: 4465.062364,
  HUF: 1730.307254,
  ILS: 177174.046698,
  IQD: 386.359608,
  IRR: 0.322991,
  ISK: 4688.057721,
  JMD: 3692.510056,
  JOD: 825105.782793,
  KES: 4500.558035,
  KGS: 6690.560775,
  KHR: 143.853202,
  KMF: 1305.622877,
  KWD: 1880279.245574,
  KYD: 702000.2808,
  KZT: 1300.397951,
  LAK: 26.152654,
  LBP: 6.536313,
  LKR: 1758.679003,
  LRD: 3475.664446,
  LSL: 33558.665912,
  LYD: 90541.367732,
  MAD: 58723.513437,
  MDL: 31909.874732,
  MGA: 127.823112,
  MKD: 10468.551799,
  MMK: 278.622166,
  MNT: 162.252572,
  MOP: 72404.628252,
  MRU: 14427.769861,
  MUR: 12439.212651,
  MVR: 37902.031218,
  MWK: 335.764719,
  MXN: 30742.083953,
  MZN: 9173.228949,
  NAD: 33558.665912,
  NGN: 432.394671,
  NIO: 15907.673495,
  NOK: 60095.320424,
  NPR: 3915.811368,
  OMR: 1521468.307945,
  PAB: 585000,
  PEN: 170559.90297,
  PGK: 130166.178822,
  PKR: 2116.033925,
  PLN: 145085.579411,
  PYG: 93.382464,
  QAR: 160714.285714,
  RON: 120188.875277,
  RSD: 5462.195635,
  RUB: 7132.252728,
  RWF: 395.401011,
  SBD: 72877.798507,
  SCR: 41327.740925,
  SDG: 1143.579257,
  SEK: 57450.539505,
  SHP: 767350.986341,
  SLE: 25513.151244,
  SOS: 1024.693633,
  SRD: 15616.354279,
  SSP: 100.710252,
  STN: 26217.320614,
  SYP: 4806.02351,
  SZL: 33558.665912,
  TJS: 63535.209856,
  TMT: 167232.637179,
  TND: 191563.604356,
  TOP: 243980.663386,
  TRY: 11576.303493,
  TTD: 86450.233704,
  TZS: 220.185936,
  UAH: 12971.506788,
  UGX: 141.354215,
  UYU: 14412.63771,
  UZS: 48.882577,
  VES: 636.723467,
  VUV: 4844.993943,
  WST: 209996.780049,
  XAF: 979.217159,
  XCD: 216666.666667,
  XOF: 979.217159,
  XPF: 5382.666406,
  YER: 2474.690829,
  ZAR: 33602.110006,
  ZMW: 28360.286756,
  ZWL: 22017.478491,
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


/** Resolves an explicit quote or a default quote rebased to the requested rate-book base. */
function resolveBookRate(
  code: string,
  ratesMap: Map<string, number> | Record<string, number> | undefined,
  baseCurrency: string,
): number {
  const explicit = ratesMap instanceof Map ? ratesMap.get(code) : ratesMap?.[code];
  const quote = DEFAULT_EXCHANGE_RATES_TO_PHP_BPS[code];
  const base = DEFAULT_EXCHANGE_RATES_TO_PHP_BPS[baseCurrency];
  const rate = explicit ?? (code === baseCurrency ? 10_000 :
    quote && base ? quote / base * 10_000 : NaN);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No exchange rate available for ${code} against ${baseCurrency}.`);
  }
  return rate;
}

// Preserve sub-basis-point defaults without rounding money before the final conversion.
function bookRateToBigInt(rate: number): bigint {
  const precision = 100_000_000;
  const scaled = Number.isSafeInteger(rate)
    ? BigInt(rate) * BigInt(precision)
    : BigInt(Math.round(rate * precision));
  if (scaled <= 0n) throw new Error("Exchange rate is below the supported precision.");
  return scaled;
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

  const fromRate = resolveBookRate(fromCurrency, ratesMap, baseCurrency);
  const toRate = resolveBookRate(toCurrency, ratesMap, baseCurrency);

  const fromDecimals = getCurrencyMinorUnitExponent(fromCurrency);
  const toDecimals = getCurrencyMinorUnitExponent(toCurrency);
  const decimalDiff = toDecimals - fromDecimals;

  let scaledAmount = BigInt(amountMinorUnits) * bookRateToBigInt(fromRate);
  if (decimalDiff > 0) {
    scaledAmount *= BigInt(10 ** decimalDiff);
  }

  const divisor = bookRateToBigInt(toRate) * (decimalDiff < 0 ? BigInt(10 ** -decimalDiff) : 1n);

  if (divisor === 0n) {
    return amountMinorUnits;
  }

  const sign = scaledAmount < 0n ? -1n : 1n;
  const absScaled = scaledAmount < 0n ? -scaledAmount : scaledAmount;
  const result = ((absScaled + (divisor / 2n)) / divisor) * sign;

  return Number(result);
}

/**
 * Converts a typed amount to account minor units using a snapshot rate
 * (1 typed major unit = exchangeRateScaled / EXCHANGE_RATE_SNAPSHOT_SCALE account major units).
 */
export function applyExchangeRate(
  typedAmountMinorUnits: number,
  exchangeRateScaled: number,
  typedCurrencyCode: string,
  accountCurrencyCode: string,
): number {
  if (!Number.isInteger(typedAmountMinorUnits)) {
    throw new Error("Typed amount must be an integer in minor units.");
  }
  const normalizedRate = normalizeExchangeRateScaled(exchangeRateScaled);
  if (normalizedRate === null) {
    throw new Error("Exchange rate must be a positive integer at snapshot scale.");
  }

  const sign = typedAmountMinorUnits < 0 ? -1n : 1n;
  const absTyped = BigInt(Math.abs(typedAmountMinorUnits));
  const scale = BigInt(EXCHANGE_RATE_SNAPSHOT_SCALE);

  const numerator =
    absTyped *
    BigInt(normalizedRate) *
    minorUnitsPerMajorUnit(accountCurrencyCode);
  const denominator = minorUnitsPerMajorUnit(typedCurrencyCode) * scale;

  const absResult = (numerator + denominator / 2n) / denominator;
  const result = absResult * sign;
  const asNumber = Number(result);
  if (asNumber === 0) {
    throw new Error("Converted account amount rounds to zero.");
  }
  return asNumber;
}

/** Like applyExchangeRate but returns null instead of throwing (for UI labels). */
export function tryApplyExchangeRate(
  typedAmountMinorUnits: number,
  exchangeRateScaled: number,
  typedCurrencyCode: string,
  accountCurrencyCode: string,
): number | null {
  try {
    return applyExchangeRate(
      typedAmountMinorUnits,
      exchangeRateScaled,
      typedCurrencyCode,
      accountCurrencyCode,
    );
  } catch {
    return null;
  }
}

/**
 * Derives a snapshot rate from exact typed and account minor-unit amounts.
 */
export function deriveExchangeRate(
  accountAmountMinorUnits: number,
  typedAmountMinorUnits: number,
  typedCurrencyCode: string,
  accountCurrencyCode: string,
): number {
  const absAccount = Math.abs(accountAmountMinorUnits);
  const absTyped = Math.abs(typedAmountMinorUnits);
  if (!Number.isInteger(absAccount) || !Number.isInteger(absTyped) || absTyped === 0) {
    throw new Error("Cannot derive exchange rate from invalid amounts.");
  }
  if (absAccount === 0) {
    throw new Error("Account amount must be non-zero to derive an exchange rate.");
  }

  const scale = BigInt(EXCHANGE_RATE_SNAPSHOT_SCALE);

  const numerator =
    BigInt(absAccount) *
    minorUnitsPerMajorUnit(typedCurrencyCode) *
    scale;
  const denominator =
    BigInt(absTyped) * minorUnitsPerMajorUnit(accountCurrencyCode);

  const scaled = (numerator + denominator / 2n) / denominator;
  const asNumber = Number(scaled);
  if (!Number.isInteger(asNumber) || asNumber <= 0) {
    throw new Error("Derived exchange rate is invalid.");
  }
  return asNumber;
}

/**
 * Builds an 8-decimal snapshot rate for 1 typed major unit in account major units,
 * using the current rate book (basis points against baseCurrency).
 */
export function snapshotExchangeRateFromBook(
  typedCurrencyCode: string,
  accountCurrencyCode: string,
  ratesMap?: Map<string, number> | Record<string, number>,
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
): number {
  const typed = typedCurrencyCode.trim().toUpperCase();
  const account = accountCurrencyCode.trim().toUpperCase();
  if (typed === account) {
    throw new Error("Cannot snapshot rate for identical currencies.");
  }

  const base = baseCurrency.trim().toUpperCase();
  const typedRate = bookRateToBigInt(resolveBookRate(typed, ratesMap, base));
  const accountRate = bookRateToBigInt(resolveBookRate(account, ratesMap, base));
  // Snapshots express major-to-major units. applyExchangeRate handles minor-unit exponents.
  const scaled = Number(
    (typedRate * BigInt(EXCHANGE_RATE_SNAPSHOT_SCALE) + accountRate / 2n) / accountRate,
  );
  if (!Number.isSafeInteger(scaled) || scaled <= 0) {
    throw new Error(
      `No exchange rate available for ${typed} to ${account}.`,
    );
  }
  return scaled;
}

/** Formats a snapshot rate as a decimal string with up to 8 fractional digits (trailing zeros trimmed). */
export function parseExchangeRateDecimalToScaled(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d+)(?:\.(\d{0,8}))?$/.exec(trimmed);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fractionRaw = (match[2] ?? "").padEnd(8, "0").slice(0, 8);
  const fraction = BigInt(fractionRaw);
  const scaled = whole * BigInt(EXCHANGE_RATE_SNAPSHOT_SCALE) + fraction;
  const asNumber = Number(scaled);
  if (!Number.isInteger(asNumber) || asNumber <= 0) return null;
  return asNumber;
}

export function formatSnapshotExchangeRateDecimal(
  exchangeRateScaled: number,
): string {
  if (!Number.isInteger(exchangeRateScaled) || exchangeRateScaled <= 0) {
    return "";
  }
  const whole = Math.floor(exchangeRateScaled / EXCHANGE_RATE_SNAPSHOT_SCALE);
  const fraction = exchangeRateScaled % EXCHANGE_RATE_SNAPSHOT_SCALE;
  const fractionText = fraction
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");
  return fractionText.length > 0 ? `${whole}.${fractionText}` : `${whole}`;
}
