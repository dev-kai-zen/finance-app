import { formatPrivacyAmount } from "@/modules/settings";
import {
  getCurrencyMinorUnitExponent,
  type DecimalFormat,
} from "@/utils/currency";

export interface FormatReportAxisOptions {
  currencyCode?: string;
  isPrivate?: boolean;
  decimalFormat?: DecimalFormat;
}

/**
 * Formats minor unit amounts for chart Y-axes (e.g. 10k, 1.5M, -500),
 * taking into account currency minor unit exponent (JPY=0, PHP/USD=2, KWD=3),
 * decimal separator preferences (dot vs comma), and privacy masking.
 */
export function formatReportAxisAmount(
  minorUnits: number,
  options: FormatReportAxisOptions = {},
): string {
  const {
    currencyCode = "PHP",
    isPrivate = false,
    decimalFormat = "automatic",
  } = options;

  if (isPrivate) {
    return formatPrivacyAmount(String(minorUnits), true);
  }

  const exponent = getCurrencyMinorUnitExponent(currencyCode);
  const divisor = Math.pow(10, exponent);
  const majorUnits = minorUnits / divisor;
  const abs = Math.abs(majorUnits);
  const sign = majorUnits < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const decSep = decimalFormat.endsWith("comma") ? "," : ".";
    const num = (abs / 1_000_000).toFixed(1).replace(".", decSep);
    return `${sign}${num}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k`;
  }
  return `${sign}${Math.round(abs)}`;
}
