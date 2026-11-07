import type {
  DateFormatPattern,
  NumberFormatType,
  ValueFormatKind,
} from "../types/data-import.types";
import {
  analyzeFirstRowDate,
  formatDateInWords,
  parseDateWithFormat,
} from "../utils/date-parser";
import { analyzeFirstRowNumber } from "../utils/number-parser";

export interface FirstRowFormatCheck {
  isMatch: boolean;
  warning?: string;
  reading?: string;
  exampleValue: string;
  isAmbiguousDate?: boolean;
  dateOption1?: { format: DateFormatPattern; reading: string; date: Date };
  dateOption2?: { format: DateFormatPattern; reading: string; date: Date };
  detectedDateFormat?: DateFormatPattern;
  detectedNumberFormat?: NumberFormatType;
  invalidLaterDateCount?: number;
}

/**
 * Inspects the first non-empty value of a column and validates its expected format.
 * If format does not match, sets warning:
 * “Format doesn’t match. We will match it based on the value in the first row.”
 */
export function checkFirstRowFormat(
  columnName: string,
  headers: string[],
  rows: string[][],
  expectedFormat: ValueFormatKind,
  activeCurrencyCodes: Set<string>,
  activeDateFormat: DateFormatPattern = "auto",
): FirstRowFormatCheck {
  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) {
    return { isMatch: false, exampleValue: "" };
  }

  // Find first non-empty value
  let firstVal = "";
  for (const row of rows) {
    const val = row[colIndex]?.trim();
    if (val) {
      firstVal = val;
      break;
    }
  }

  const exampleValue = firstVal.slice(0, 80);

  if (!firstVal) {
    return {
      isMatch: true,
      exampleValue: "",
    };
  }

  const mismatchWarning =
    "Format doesn’t match. We will match it based on the value in the first row.";

  switch (expectedFormat) {
    case "Date": {
      const analysis = analyzeFirstRowDate(firstVal);
      if (!analysis.isValid) {
        return {
          isMatch: false,
          warning: mismatchWarning,
          exampleValue,
        };
      }

      if (analysis.isAmbiguous) {
        return {
          isMatch: false,
          warning: mismatchWarning,
          exampleValue,
          isAmbiguousDate: true,
          dateOption1: analysis.option1,
          dateOption2: analysis.option2,
        };
      }

      // Check later rows if a pattern is known
      const patternToTest =
        activeDateFormat !== "auto" ? activeDateFormat : analysis.detectedFormat;

      let invalidLaterDateCount = 0;
      if (patternToTest && patternToTest !== "auto") {
        for (let r = 0; r < rows.length; r++) {
          const cell = rows[r][colIndex]?.trim();
          if (cell) {
            const parsed = parseDateWithFormat(cell, patternToTest);
            if (!parsed) {
              invalidLaterDateCount++;
            }
          }
        }
      }

      return {
        isMatch: true,
        exampleValue,
        detectedDateFormat: analysis.detectedFormat,
        reading: analysis.singleReading,
        invalidLaterDateCount,
      };
    }

    case "Number": {
      const analysis = analyzeFirstRowNumber(firstVal);
      if (!analysis.isValid) {
        return {
          isMatch: false,
          warning: mismatchWarning,
          exampleValue,
        };
      }

      return {
        isMatch: true,
        exampleValue,
        detectedNumberFormat: analysis.detectedFormat,
        reading: analysis.explanation,
      };
    }

    case "Time": {
      const isTime = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(firstVal);
      if (!isTime) {
        return {
          isMatch: false,
          warning: mismatchWarning,
          exampleValue,
        };
      }
      return {
        isMatch: true,
        exampleValue,
      };
    }

    case "Currency code": {
      const code = firstVal.toUpperCase();
      if (!activeCurrencyCodes.has(code)) {
        return {
          isMatch: false,
          warning: mismatchWarning,
          exampleValue,
        };
      }
      return {
        isMatch: true,
        exampleValue,
      };
    }

    case "Text":
    default: {
      return {
        isMatch: true,
        exampleValue,
      };
    }
  }
}

