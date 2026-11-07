import {
  DEFAULT_SOURCE_NAME,
  HEADER_ALIASES,
} from "../constants/data-import.constants";
import type {
  ColumnMappingConfig,
  ImportType,
  KaizenFieldKey,
} from "../types/data-import.types";

/**
 * Normalizes header string for comparison by lowercasing and trimming spaces/underscores/dashes.
 */
function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s-]+/g, " ");
}

/**
 * Automatically suggests column mappings based on known header aliases.
 * Enforces rule: one file column can fill only one Kaizen field.
 */
export function suggestColumnMappings(
  headers: string[],
  importType: ImportType,
): ColumnMappingConfig {
  const config: ColumnMappingConfig = {
    dateFormat: "auto",
    numberFormat: "auto",
    amountLayout: "single",
    transferStyle: "single_row",
    typeMap: {},
    sourceName: DEFAULT_SOURCE_NAME,
  };

  const usedColumns = new Set<string>();

  const tryMatch = (fieldKey: KaizenFieldKey): string | undefined => {
    const aliases = HEADER_ALIASES[fieldKey] || [];
    for (const rawCol of headers) {
      if (usedColumns.has(rawCol)) continue;
      const normalizedCol = normalizeHeaderName(rawCol);
      for (const alias of aliases) {
        if (normalizedCol === alias) {
          usedColumns.add(rawCol);
          return rawCol;
        }
      }
    }
    return undefined;
  };

  if (importType === "transactions") {
    config.dateColumn = tryMatch("date");
    config.amountColumn = tryMatch("amount");
    config.moneyOutColumn = tryMatch("money_out");
    config.moneyInColumn = tryMatch("money_in");
    config.typeColumn = tryMatch("type");
    config.accountColumn = tryMatch("account");
    config.toAccountColumn = tryMatch("to_account");
    config.currencyColumn = tryMatch("currency");
    config.categoryColumn = tryMatch("category");
    config.subcategoryColumn = tryMatch("subcategory");
    config.nameColumn = tryMatch("name");
    config.noteColumn = tryMatch("note");
    config.labelsColumn = tryMatch("labels");
    config.sourceIdColumn = tryMatch("source_id");
    config.timeColumn = tryMatch("time");

    if (!config.amountColumn && (config.moneyOutColumn || config.moneyInColumn)) {
      config.amountLayout = "separate";
    }
  } else {
    // Accounts only
    config.accountColumn = tryMatch("account");
    config.accountTypeColumn = tryMatch("account_type");
    config.currencyColumn = tryMatch("currency");
    config.openingBalanceColumn = tryMatch("opening_balance");
    config.balanceDateColumn = tryMatch("balance_date");
    config.noteColumn = tryMatch("note");
  }

  return config;
}

/**
 * Helper to update a column mapping, reassigning if the column was already mapped elsewhere.
 */
export function reassignColumnMapping(
  current: ColumnMappingConfig,
  targetField: KaizenFieldKey,
  selectedColumn: string | undefined, // undefined or "" means "Not mapped"
): ColumnMappingConfig {
  const next: ColumnMappingConfig = { ...current };

  const fieldToKeyMap: Record<KaizenFieldKey, keyof ColumnMappingConfig> = {
    date: "dateColumn",
    time: "timeColumn",
    amount: "amountColumn",
    money_out: "moneyOutColumn",
    money_in: "moneyInColumn",
    type: "typeColumn",
    account: "accountColumn",
    to_account: "toAccountColumn",
    currency: "currencyColumn",
    category: "categoryColumn",
    subcategory: "subcategoryColumn",
    name: "nameColumn",
    note: "noteColumn",
    labels: "labelsColumn",
    source_id: "sourceIdColumn",
    account_type: "accountTypeColumn",
    opening_balance: "openingBalanceColumn",
    balance_date: "balanceDateColumn",
  };

  if (selectedColumn) {
    // Clear any other field that was using selectedColumn
    for (const [fKey, prop] of Object.entries(fieldToKeyMap)) {
      if (fKey !== targetField && next[prop] === selectedColumn) {
        delete next[prop];
      }
    }
  }

  const propName = fieldToKeyMap[targetField];
  if (selectedColumn) {
    (next as any)[propName] = selectedColumn;
  } else {
    delete next[propName];
  }

  return next;
}

