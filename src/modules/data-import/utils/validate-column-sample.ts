import type { ImportCatalog, ImportField, ImportOptions } from "../types/import.types";
import { parseImportDate } from "./csv";
import type { TranslationKey } from "@/infrastructure/localization/translations/en";

export interface ColumnSampleValidationResult {
  warningKey: TranslationKey;
  warningParams?: Record<string, string | number>;
  suggestedFormat?: "ymd" | "dmy" | "mdy";
  suggestedDecimal?: "." | ",";
}

const TIME_REGEX = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[AaPp][Mm])?$|^(?:0?[1-9]|1[0-2]):[0-5]\d(?::[0-5]\d)?\s*[AaPp][Mm]$/;
const DATE_LIKE_REGEX = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
const NUMBER_LIKE_REGEX = /^[+-]?[\$€£¥₱₹]?\s*\d+(?:[.,]\d+)*\s*[\$€£¥₱₹]?$/;

/**
 * Validates the first row sample of a mapped CSV column against expected field rules.
 * Returns null if the sample appears valid, or a warning result describing the mismatch.
 */
export function validateColumnSample(
  field: ImportField,
  sample: string,
  options: ImportOptions,
  catalog?: ImportCatalog | null,
): ColumnSampleValidationResult | null {
  const trimmed = sample.trim();
  if (!trimmed) return null;

  if (field === "date" || field === "balanceDate") {
    try {
      parseImportDate(trimmed, options.dateFormat);
      return null;
    } catch {
      // Find whether it parses with another supported date format
      const inferred = (["ymd", "dmy", "mdy"] as const).find((format) => {
        try {
          parseImportDate(trimmed, format);
          return true;
        } catch {
          return false;
        }
      });

      const formatLabel = options.dateFormat === "ymd" ? "YYYY-MM-DD" : options.dateFormat === "dmy" ? "DD/MM/YYYY" : "MM/DD/YYYY";

      return {
        warningKey: "dataImport.wizard.formatMismatchDate",
        warningParams: { format: formatLabel, value: trimmed.slice(0, 50) },
        suggestedFormat: inferred,
      };
    }
  }

  if (field === "amount" || field === "debit" || field === "credit") {
    const cleaned = trimmed.replace(/^[\$€£¥₱₹A-Za-z\s]+|[\$€£¥₱₹A-Za-z\s]+$/g, "");
    if ((field === "debit" || field === "credit") && (cleaned.startsWith("-") || trimmed.startsWith("-"))) {
      return {
        warningKey: "dataImport.wizard.formatMismatchDebitCredit",
        warningParams: { value: trimmed.slice(0, 50) },
      };
    }

    const dotPattern = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
    const commaPattern = /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;

    const currentMatches = options.decimal === "." ? dotPattern.test(cleaned) : commaPattern.test(cleaned);
    if (currentMatches) return null;

    const oppositeMatches = options.decimal === "." ? commaPattern.test(cleaned) : dotPattern.test(cleaned);
    if (oppositeMatches) {
      return {
        warningKey: "dataImport.wizard.formatMismatchDecimal",
        warningParams: { char: options.decimal === "." ? "," : "." },
        suggestedDecimal: options.decimal === "." ? "," : ".",
      };
    }

    return {
      warningKey: "dataImport.wizard.formatMismatchAmount",
      warningParams: { value: trimmed.slice(0, 50) },
    };
  }

  if (field === "time") {
    if (TIME_REGEX.test(trimmed)) return null;
    return {
      warningKey: "dataImport.wizard.formatMismatchTime",
      warningParams: { value: trimmed.slice(0, 50) },
    };
  }

  if (field === "currency") {
    const code = trimmed.toUpperCase();
    if (catalog?.currencies?.includes(code) || /^[A-Z]{3}$/.test(code)) return null;
    return {
      warningKey: "dataImport.wizard.formatMismatchCurrency",
      warningParams: { value: trimmed.slice(0, 50) },
    };
  }

  if (field === "type") {
    if (NUMBER_LIKE_REGEX.test(trimmed) || DATE_LIKE_REGEX.test(trimmed)) {
      return {
        warningKey: "dataImport.wizard.formatMismatchType",
        warningParams: { value: trimmed.slice(0, 50) },
      };
    }
    return null;
  }

  if (field === "account" || field === "toAccount") {
    if (NUMBER_LIKE_REGEX.test(trimmed) || DATE_LIKE_REGEX.test(trimmed)) {
      return {
        warningKey: "dataImport.wizard.formatMismatchAccount",
        warningParams: { value: trimmed.slice(0, 50) },
      };
    }
    return null;
  }

  if (field === "category" || field === "subcategory") {
    if (NUMBER_LIKE_REGEX.test(trimmed) || DATE_LIKE_REGEX.test(trimmed)) {
      return {
        warningKey: "dataImport.wizard.formatMismatchCategory",
        warningParams: { value: trimmed.slice(0, 50) },
      };
    }
    return null;
  }

  return null;
}

