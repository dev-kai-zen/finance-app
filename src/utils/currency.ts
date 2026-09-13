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

  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const baseNumber = `${majorFormatted}.${minorFormatted}`;

  const sign = isNegative ? "-" : options?.showPositiveSign && isPositive ? "+" : "";

  const positiveColor = options?.positiveColor ?? PHP_CURRENCY_COLORS.positive;
  const negativeColor = options?.negativeColor ?? PHP_CURRENCY_COLORS.negative;
  const zeroColor = options?.zeroColor ?? PHP_CURRENCY_COLORS.neutral;

  const color = isPositive
    ? positiveColor
    : isNegative
      ? negativeColor
      : zeroColor;

  const colorKey: "success" | "danger" | "neutral" = isPositive
    ? "success"
    : isNegative
      ? "danger"
      : "neutral";

  return {
    formatted: `${sign}₱${baseNumber}`,
    formattedWithSign: `${isNegative ? "-" : isPositive ? "+" : ""}₱${baseNumber}`,
    amountText: `${sign}${baseNumber}`,
    color,
    colorKey,
    isPositive,
    isNegative,
    isZero,
    sign,
  };
}

/**
 * Format an integer amount in minor units (centavos/cents) as a formatted currency string.
 * Uses integer math to avoid floating point precision pitfalls.
 *
 * @param amountMinorUnits - Amount in integer minor units (e.g. 150000 for ₱1,500.00)
 * @param currencyCode - Currency code, defaults to 'PHP'
 * @param showSign - Whether to explicitly include a '+' for positive amounts
 */
export function formatCurrency(
  amountMinorUnits: number,
  currencyCode: string = "PHP",
  showSign: boolean = false,
): string {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const symbol = currencyCode === "PHP" ? "₱" : `${currencyCode} `;

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && amountMinorUnits > 0) {
    sign = "+";
  }

  return `${sign}${symbol}${majorFormatted}.${minorFormatted}`;
}
