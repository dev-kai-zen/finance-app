import { CURRENCY_SYMBOLS } from "@/utils/currency";

export const CURRENCY_PREFERENCE_KEYS = {
  defaultCurrency: "currency_default_code",
  displayCurrency: "currency_display_symbol",
  colorAmounts: "currency_color_amounts",
  negativeFormat: "currency_negative_format",
  decimalDigits: "currency_decimal_digits",
  decimalFormat: "currency_decimal_format",
} as const;

export const SUPPORTED_CURRENCY_CODES = Object.keys(CURRENCY_SYMBOLS).sort();

export const CURRENCY_NAMES: Record<string, string> = {
  AED: "UAE Dirham",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  EUR: "Euro",
  GBP: "British Pound",
  HKD: "Hong Kong Dollar",
  IDR: "Indonesian Rupiah",
  INR: "Indian Rupee",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
  MYR: "Malaysian Ringgit",
  NZD: "New Zealand Dollar",
  PHP: "Philippine Peso",
  SAR: "Saudi Riyal",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  TWD: "New Taiwan Dollar",
  USD: "US Dollar",
  VND: "Vietnamese Dong",
};

