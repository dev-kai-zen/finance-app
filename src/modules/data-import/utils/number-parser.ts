import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import type { NumberFormatType } from "../types/data-import.types";

export interface NumberAnalysisResult {
  isValid: boolean;
  detectedFormat?: NumberFormatType;
  parsedMajor?: number;
  explanation?: string;
}

/**
 * Analyzes a raw number/amount string to detect whether it uses dot-decimal or comma-decimal.
 */
export function analyzeFirstRowNumber(rawValue: string): NumberAnalysisResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { isValid: false };
  }

  // Strip currency symbols, spaces, parentheses
  let isNegative = false;
  let s = trimmed;

  if (s.startsWith("(") && s.endsWith(")")) {
    isNegative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("-")) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  // Strip non-digit characters except commas and dots
  s = s.replace(/[^0-9,.]/g, "");
  if (!s) return { isValid: false };

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // e.g. 1,234.56 vs 1.234,56
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastDot > lastComma) {
      // Dot is decimal, e.g. 1,234.56
      const cleaned = s.replace(/,/g, "");
      const num = parseFloat(cleaned) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "dot_decimal",
        parsedMajor: num,
        explanation: "Amounts use dot (.) for decimals (e.g. 1,234.56).",
      };
    } else {
      // Comma is decimal, e.g. 1.234,56
      const cleaned = s.replace(/\./g, "").replace(",", ".");
      const num = parseFloat(cleaned) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "comma_decimal",
        parsedMajor: num,
        explanation: "Amounts use comma (,) for decimals (e.g. 1.234,56).",
      };
    }
  }

  if (hasComma && !hasDot) {
    // Only comma, e.g. "12,50" or "1,250"
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely comma decimal: 12,50
      const cleaned = s.replace(",", ".");
      const num = parseFloat(cleaned) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "comma_decimal",
        parsedMajor: num,
        explanation: "Amounts use comma (,) for decimals.",
      };
    } else {
      // Likely thousands separator or whole number
      const cleaned = s.replace(/,/g, "");
      const num = parseFloat(cleaned) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "dot_decimal",
        parsedMajor: num,
        explanation: "Amounts use dot (.) for decimals.",
      };
    }
  }

  if (hasDot && !hasComma) {
    // Only dot, e.g. "12.50" or "1.250"
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Standard decimal dot
      const num = parseFloat(s) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "dot_decimal",
        parsedMajor: num,
        explanation: "Amounts use dot (.) for decimals (e.g. 1,234.56).",
      };
    } else if (parts.length === 2 && parts[1].length === 3) {
      // Ambiguous between 1.250 (thousand) or 1.250 (3 decimals)
      const num = parseFloat(s) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "dot_decimal",
        parsedMajor: num,
        explanation: "Amounts use dot (.) for decimals.",
      };
    } else {
      // Dot thousands, e.g. 1.000.000
      const cleaned = s.replace(/\./g, "");
      const num = parseFloat(cleaned) * (isNegative ? -1 : 1);
      return {
        isValid: Number.isFinite(num),
        detectedFormat: "comma_decimal",
        parsedMajor: num,
        explanation: "Amounts use comma (,) for decimals.",
      };
    }
  }

  // Pure integer
  const num = parseInt(s, 10) * (isNegative ? -1 : 1);
  return {
    isValid: Number.isFinite(num),
    detectedFormat: "dot_decimal",
    parsedMajor: num,
  };
}

/**
 * Parses raw number text into integer minor units according to currency and number format.
 */
export function parseNumberToMinorUnits(
  rawValue: string,
  currencyCode: string,
  format: NumberFormatType = "dot_decimal",
): { minorUnits: number; decimalCount: number } | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  let isNegative = false;
  let s = trimmed;

  if (s.startsWith("(") && s.endsWith(")")) {
    isNegative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("-")) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  s = s.replace(/[^0-9,.]/g, "");
  if (!s) return null;

  let standardDecimalStr: string;
  let decimalCount = 0;

  if (format === "comma_decimal") {
    // Comma is decimal, dot is thousands
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    const decimalIndex = cleaned.indexOf(".");
    if (decimalIndex >= 0) {
      decimalCount = cleaned.length - decimalIndex - 1;
    }
    standardDecimalStr = cleaned;
  } else {
    // Dot is decimal, comma is thousands (default)
    const cleaned = s.replace(/,/g, "");
    const decimalIndex = cleaned.indexOf(".");
    if (decimalIndex >= 0) {
      decimalCount = cleaned.length - decimalIndex - 1;
    }
    standardDecimalStr = cleaned;
  }

  const major = parseFloat(standardDecimalStr);
  if (!Number.isFinite(major)) return null;

  const exponent = getCurrencyMinorUnitExponent(currencyCode);
  const factor = 10 ** exponent;

  const minorUnits = Math.round(major * factor) * (isNegative ? -1 : 1);

  if (Math.abs(minorUnits) > Number.MAX_SAFE_INTEGER) {
    return null;
  }

  return { minorUnits, decimalCount };
}

