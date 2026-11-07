import type { AccountListItem, AccountType } from "@/modules/accounts";
import { isCreditCardAccountType } from "@/modules/accounts/utils/pocket-eligibility";
import type { Category } from "@/modules/categories";
import type { CurrencyListItem } from "@/modules/currencies";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { LIMITS, MIN_VALID_YEAR, MAX_VALID_YEAR, UNSUPPORTED_COLUMN_NAMES } from "../constants/data-import.constants";
import type {
  AccountMatchDecision,
  CategoryMatchDecision,
  ColumnMappingConfig,
  ImportPreviewSummary,
  ImportType,
  NormalizedTransactionType,
  ParsedCsvFile,
  ParsedDataRow,
  RowStatus,
} from "../types/data-import.types";
import { parseDateWithFormat } from "../utils/date-parser";
import { parseNumberToMinorUnits } from "../utils/number-parser";
import { buildSourceIdentity } from "../utils/source-identity";
import { buildCategoryKey } from "./match-categories.service";

export interface BuildPreviewInput {
  parsedFile: ParsedCsvFile;
  importType: ImportType;
  config: ColumnMappingConfig;
  accountMatches: Record<string, AccountMatchDecision>;
  categoryMatches: Record<string, CategoryMatchDecision>;
  existingAccounts: AccountListItem[];
  existingCategories: Category[];
  activeCurrencies: CurrencyListItem[];
  availableAccountTypes: AccountType[];
  previouslyImportedIdentities: Set<string>;
  similarTransactionChecker?: (input: {
    type: string;
    accountId: string;
    destinationAccountId?: string | null;
    occurredAt: Date;
    amountMinorUnits: number;
    description?: string | null;
  }) => boolean;
  rowOverrides?: Record<number, Partial<ParsedDataRow>>;
  userExcludedRows?: Set<number>;
  userConfirmedSimilarRows?: Set<number>;
}

export interface BuildPreviewResult {
  rows: ParsedDataRow[];
  summary: ImportPreviewSummary;
  unpairedTransferWarning?: boolean;
}

export function buildImportPreview(input: BuildPreviewInput): BuildPreviewResult {
  const {
    parsedFile,
    importType,
    config,
    accountMatches,
    categoryMatches,
    existingAccounts,
    existingCategories,
    activeCurrencies,
    availableAccountTypes,
    previouslyImportedIdentities,
    similarTransactionChecker,
    rowOverrides = {},
    userExcludedRows = new Set(),
    userConfirmedSimilarRows = new Set(),
  } = input;

  const { headers, rawRows, fileHash } = parsedFile;

  const activeCurrencySet = new Set(activeCurrencies.map((c) => c.code.toUpperCase()));
  const existingAccountsById = new Map<string, AccountListItem>();
  for (const acc of existingAccounts) {
    existingAccountsById.set(acc.id, acc);
  }

  const existingCategoriesById = new Map<string, Category>();
  for (const cat of existingCategories) {
    existingCategoriesById.set(cat.id, cat);
  }

  // Column index lookups
  const dateColIdx = config.dateColumn ? headers.indexOf(config.dateColumn) : -1;
  const timeColIdx = config.timeColumn ? headers.indexOf(config.timeColumn) : -1;
  const amtColIdx = config.amountColumn ? headers.indexOf(config.amountColumn) : -1;
  const outColIdx = config.moneyOutColumn ? headers.indexOf(config.moneyOutColumn) : -1;
  const inColIdx = config.moneyInColumn ? headers.indexOf(config.moneyInColumn) : -1;
  const typeColIdx = config.typeColumn ? headers.indexOf(config.typeColumn) : -1;
  const accColIdx = config.accountColumn ? headers.indexOf(config.accountColumn) : -1;
  const toAccColIdx = config.toAccountColumn ? headers.indexOf(config.toAccountColumn) : -1;
  const currColIdx = config.currencyColumn ? headers.indexOf(config.currencyColumn) : -1;
  const catColIdx = config.categoryColumn ? headers.indexOf(config.categoryColumn) : -1;
  const subColIdx = config.subcategoryColumn ? headers.indexOf(config.subcategoryColumn) : -1;
  const nameColIdx = config.nameColumn ? headers.indexOf(config.nameColumn) : -1;
  const noteColIdx = config.noteColumn ? headers.indexOf(config.noteColumn) : -1;
  const labelsColIdx = config.labelsColumn ? headers.indexOf(config.labelsColumn) : -1;
  const srcIdColIdx = config.sourceIdColumn ? headers.indexOf(config.sourceIdColumn) : -1;

  // Accounts-only column lookups
  const accTypeColIdx = config.accountTypeColumn ? headers.indexOf(config.accountTypeColumn) : -1;
  const openBalColIdx = config.openingBalanceColumn ? headers.indexOf(config.openingBalanceColumn) : -1;
  const balDateColIdx = config.balanceDateColumn ? headers.indexOf(config.balanceDateColumn) : -1;

  // Track unsupported column names present in file with non-empty values
  const unsupportedIndices: number[] = [];
  for (let c = 0; c < headers.length; c++) {
    const normH = headers[c].trim().toLowerCase();
    if (UNSUPPORTED_COLUMN_NAMES.has(normH)) {
      unsupportedIndices.push(c);
    }
  }

  // Track original IDs in this file for duplicate ID detection
  const originalIdCounts = new Map<string, number>();
  for (let r = 0; r < rawRows.length; r++) {
    if (srcIdColIdx >= 0) {
      const origId = rawRows[r][srcIdColIdx]?.trim();
      if (origId) {
        originalIdCounts.set(origId, (originalIdCounts.get(origId) || 0) + 1);
      }
    }
  }

  // Track accounts-only duplicates
  const seenNewAccountNames = new Set<string>();

  const processedRows: ParsedDataRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 1;
    const raw = rawRows[i];
    const override = rowOverrides[rowNumber] || {};
    const userExcluded = userExcludedRows.has(rowNumber) || Boolean(override.userExcluded);
    const userConfirmedSimilar = userConfirmedSimilarRows.has(rowNumber) || Boolean(override.userConfirmedSimilar);

    const issues: string[] = [];
    let fixAction: string | undefined;

    // Build raw values map
    const rawValues: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rawValues[headers[c]] = raw[c] || "";
    }

    // Check column alignment
    if (raw.length !== headers.length) {
      issues.push("This row does not line up with the columns in your file.");
      fixAction = "Edit this row or choose to leave it out.";
    }

    // Check unsupported columns filled
    for (const uIdx of unsupportedIndices) {
      const uVal = raw[uIdx]?.trim();
      if (uVal) {
        issues.push(`This row uses an unsupported feature in column "${headers[uIdx]}" (${uVal}).`);
        fixAction = "Kaizen does not support pockets, splits, fees, or installments in import files. Leave this row out.";
      }
    }

    // Original record ID
    const origId = override.originalId !== undefined
      ? override.originalId
      : srcIdColIdx >= 0 ? raw[srcIdColIdx]?.trim() || undefined : undefined;

    if (origId && (originalIdCounts.get(origId) || 0) > 1) {
      issues.push(`The original ID "${origId}" appears more than once in this file.`);
      fixAction = "Ensure every record has a unique ID, or leave duplicate rows out.";
    }

    // Currency resolution
    let currencyCode: string;
    if (override.currencyCode) {
      currencyCode = override.currencyCode.trim().toUpperCase();
    } else if (currColIdx >= 0 && raw[currColIdx]?.trim()) {
      currencyCode = raw[currColIdx].trim().toUpperCase();
    } else {
      currencyCode = (config.defaultCurrencyCode || "PHP").trim().toUpperCase();
    }

    if (!activeCurrencySet.has(currencyCode)) {
      issues.push(`Currency "${currencyCode}" is not active in Kaizen.`);
      fixAction = "Choose an active currency code for this row or enable it in Settings.";
    }

    // Account name resolution
    let accountName: string;
    if (override.accountName !== undefined) {
      accountName = override.accountName.trim();
    } else if (accColIdx >= 0 && raw[accColIdx]?.trim()) {
      accountName = raw[accColIdx].trim();
    } else {
      accountName = (config.defaultAccountName || "").trim();
    }

    if (!accountName) {
      issues.push("Account name is missing.");
      fixAction = "Select or type an account name.";
    } else if (accountName.length > LIMITS.accountName) {
      issues.push(`Account name exceeds the maximum length of ${LIMITS.accountName} characters.`);
      fixAction = "Shorten the account name.";
    }

    // Source identity
    const sourceIdentity = buildSourceIdentity({
      importType,
      sourceName: config.sourceName || "CSV",
      accountName,
      originalId: origId,
      fileHash,
      rowNumber,
    });

    // Check previously imported
    if (previouslyImportedIdentities.has(sourceIdentity)) {
      // Must stay left out
      processedRows.push({
        rowNumber,
        rawValues,
        originalId: origId,
        sourceIdentity,
        accountName,
        currencyCode,
        status: "left_out",
        userExcluded: true,
        issues: ["This row was previously imported into Kaizen."],
        fixAction: "Previously imported rows cannot be imported again.",
      });
      continue;
    }

    if (importType === "accounts") {
      // Accounts-only flow
      const accTypeVal = override.accountType || (accTypeColIdx >= 0 ? raw[accTypeColIdx]?.trim() : "");
      const openBalVal = override.openingBalanceMinorUnits !== undefined
        ? override.openingBalanceMinorUnits
        : openBalColIdx >= 0 ? raw[openBalColIdx]?.trim() : "0";

      const balDateVal = override.balanceDate
        ? override.balanceDate
        : balDateColIdx >= 0 ? raw[balDateColIdx]?.trim() : "";

      let balanceDate: Date | undefined;
      if (override.balanceDate) {
        balanceDate = override.balanceDate;
      } else if (balDateVal) {
        balanceDate = parseDateWithFormat(String(balDateVal), config.dateFormat) || undefined;
        if (!balanceDate) {
          issues.push("Balance date cannot be read.");
          fixAction = "Enter a valid calendar date.";
        }
      } else {
        balanceDate = new Date();
      }

      let openingBalanceMinorUnits = 0;
      if (typeof openBalVal === "number") {
        openingBalanceMinorUnits = openBalVal;
      } else if (openBalVal) {
        const parsedBal = parseNumberToMinorUnits(String(openBalVal), currencyCode, config.numberFormat);
        if (!parsedBal) {
          issues.push("Opening balance is not a valid amount.");
          fixAction = "Enter a valid amount.";
        } else {
          openingBalanceMinorUnits = parsedBal.minorUnits;
        }
      }

      // Check account duplicate rules for accounts-only:
      // "importing an account that already exists is a duplicate and must be left out. Repeating the same new account name in that file is also a duplicate."
      const lowerName = accountName.toLowerCase();
      const existingDuplicate = existingAccounts.find(
        (a) => a.name.trim().toLowerCase() === lowerName && a.currencyCode.toUpperCase() === currencyCode,
      );

      if (existingDuplicate) {
        processedRows.push({
          rowNumber,
          rawValues,
          originalId: origId,
          sourceIdentity,
          accountName,
          currencyCode,
          accountType: accTypeVal,
          openingBalanceMinorUnits,
          balanceDate,
          status: "left_out",
          userExcluded: true,
          issues: ["An account with this name and currency already exists."],
          fixAction: "Existing accounts are not modified during accounts import.",
        });
        continue;
      }

      if (seenNewAccountNames.has(`${lowerName}:${currencyCode}`)) {
        processedRows.push({
          rowNumber,
          rawValues,
          originalId: origId,
          sourceIdentity,
          accountName,
          currencyCode,
          accountType: accTypeVal,
          openingBalanceMinorUnits,
          balanceDate,
          status: "left_out",
          userExcluded: true,
          issues: ["This account name appears more than once in your file."],
          fixAction: "Duplicate accounts within the same file are left out.",
        });
        continue;
      }

      seenNewAccountNames.add(`${lowerName}:${currencyCode}`);

      // Check account type validity
      if (accTypeVal) {
        const matchedType = availableAccountTypes.find(
          (t) => t.name.trim().toLowerCase() === accTypeVal.toLowerCase(),
        );
        if (matchedType && (isCreditCardAccountType(matchedType.id, matchedType.name) || matchedType.accountGroup === "liability")) {
          issues.push("Credit card and liability accounts are not supported.");
          fixAction = "Change the account type to an asset account.";
        }
      }

      const note = override.note !== undefined ? override.note : (noteColIdx >= 0 ? raw[noteColIdx]?.trim() : undefined);
      if (note && note.length > LIMITS.note) {
        issues.push(`Note exceeds the maximum length of ${LIMITS.note} characters.`);
        fixAction = "Shorten the note.";
      }

      const status: RowStatus = userExcluded ? "left_out" : issues.length > 0 ? "needs_attention" : "ready";

      processedRows.push({
        rowNumber,
        rawValues,
        originalId: origId,
        sourceIdentity,
        accountName,
        currencyCode,
        accountType: accTypeVal,
        openingBalanceMinorUnits,
        balanceDate,
        note,
        status,
        userExcluded,
        issues,
        fixAction,
      });

      continue;
    }

    // =========================================================================
    // TRANSACTION HISTORY FLOW
    // =========================================================================

    // Date resolution
    let date: Date | undefined;
    if (override.date) {
      date = override.date;
    } else if (dateColIdx >= 0 && raw[dateColIdx]?.trim()) {
      const rawDate = raw[dateColIdx].trim();
      const rawTime = timeColIdx >= 0 ? raw[timeColIdx]?.trim() : undefined;
      date = parseDateWithFormat(rawDate, config.dateFormat, rawTime) || undefined;
      if (!date) {
        issues.push("The date cannot be read with the selected date format.");
        fixAction = "Check the date format or edit this row's date.";
      } else {
        const yr = date.getFullYear();
        if (yr < MIN_VALID_YEAR || yr > MAX_VALID_YEAR) {
          issues.push(`Date year ${yr} must be between ${MIN_VALID_YEAR} and ${MAX_VALID_YEAR}.`);
          fixAction = "Correct the date year.";
        }
      }
    } else {
      issues.push("Transaction date is missing.");
      fixAction = "Select a date column or enter a date for this row.";
    }

    // Time resolution
    let timeStr: string | undefined;
    if (override.time !== undefined) {
      timeStr = override.time;
    } else if (timeColIdx >= 0 && raw[timeColIdx]?.trim()) {
      timeStr = raw[timeColIdx].trim();
    }

    // Destination account for transfers
    let toAccountName: string | undefined;
    if (override.toAccountName !== undefined) {
      toAccountName = override.toAccountName.trim();
    } else if (toAccColIdx >= 0 && raw[toAccColIdx]?.trim()) {
      toAccountName = raw[toAccColIdx].trim();
    }

    // Type and Amount resolution
    let type: NormalizedTransactionType = "expense";
    let amountMinorUnits = 0;

    const rawTypeVal = typeColIdx >= 0 ? raw[typeColIdx]?.trim().toLowerCase() : "";
    if (override.type) {
      type = override.type;
    } else if (rawTypeVal) {
      if (rawTypeVal === "income" || rawTypeVal === "deposit" || rawTypeVal === "credit") {
        type = "income";
      } else if (rawTypeVal === "expense" || rawTypeVal === "withdrawal" || rawTypeVal === "debit") {
        type = "expense";
      } else if (rawTypeVal === "transfer") {
        type = "transfer";
      } else if (config.typeMap[rawTypeVal]) {
        type = config.typeMap[rawTypeVal];
      } else {
        issues.push(`Unrecognized transaction type "${rawTypeVal}".`);
        fixAction = "Match this transaction type to Income, Expense, Transfer, or Leave out.";
      }
    } else if (config.transferStyle === "single_row" && toAccountName) {
      type = "transfer";
    }

    // Amount extraction
    if (override.amountMinorUnits !== undefined) {
      amountMinorUnits = override.amountMinorUnits;
    } else if (config.amountLayout === "separate") {
      const outVal = outColIdx >= 0 ? raw[outColIdx]?.trim() : "";
      const inVal = inColIdx >= 0 ? raw[inColIdx]?.trim() : "";

      if (outVal && !inVal) {
        const parsed = parseNumberToMinorUnits(outVal, currencyCode, config.numberFormat);
        if (!parsed || parsed.minorUnits === 0) {
          issues.push("Money out amount is zero or invalid.");
          fixAction = "Enter a valid positive number.";
        } else {
          amountMinorUnits = -Math.abs(parsed.minorUnits);
          if (!rawTypeVal && !override.type) type = "expense";
        }
      } else if (inVal && !outVal) {
        const parsed = parseNumberToMinorUnits(inVal, currencyCode, config.numberFormat);
        if (!parsed || parsed.minorUnits === 0) {
          issues.push("Money in amount is zero or invalid.");
          fixAction = "Enter a valid positive number.";
        } else {
          amountMinorUnits = Math.abs(parsed.minorUnits);
          if (!rawTypeVal && !override.type) type = "income";
        }
      } else if (!outVal && !inVal) {
        issues.push("Both money out and money in are empty.");
        fixAction = "Enter an amount for money out or money in.";
      } else {
        issues.push("Both money out and money in have amounts on the same row.");
        fixAction = "Choose which column represents this transaction or split into two rows.";
      }
    } else {
      // Single amount column
      const amtVal = amtColIdx >= 0 ? raw[amtColIdx]?.trim() : "";
      if (!amtVal) {
        issues.push("Amount is missing.");
        fixAction = "Enter an amount for this transaction.";
      } else {
        const parsed = parseNumberToMinorUnits(amtVal, currencyCode, config.numberFormat);
        if (!parsed || parsed.minorUnits === 0) {
          issues.push("Amount is zero or not a valid number.");
          fixAction = "Enter a valid non-zero amount.";
        } else {
          const exponent = getCurrencyMinorUnitExponent(currencyCode);
          if (parsed.decimalCount > exponent) {
            issues.push(`Amount has ${parsed.decimalCount} decimal places, but ${currencyCode} supports up to ${exponent}.`);
            fixAction = "Round or adjust the decimal places.";
          }

          if (type === "transfer") {
            amountMinorUnits = Math.abs(parsed.minorUnits);
          } else if (rawTypeVal) {
            // Respect explicit type
            amountMinorUnits = type === "income" ? Math.abs(parsed.minorUnits) : -Math.abs(parsed.minorUnits);
          } else {
            // Deduce type from sign
            if (parsed.minorUnits < 0) {
              type = "expense";
              amountMinorUnits = parsed.minorUnits;
            } else {
              type = "income";
              amountMinorUnits = parsed.minorUnits;
            }
          }
        }
      }
    }

    if (type === "leave_out") {
      // Row is explicitly left out via type mapping
      processedRows.push({
        rowNumber,
        rawValues,
        originalId: origId,
        sourceIdentity,
        date,
        time: timeStr,
        type,
        amountMinorUnits,
        currencyCode,
        accountName,
        status: "left_out",
        userExcluded: true,
        issues: ["Marked as leave out."],
        fixAction: "This row will not be imported.",
      });
      continue;
    }

    if (type === "transfer" && config.transferStyle === "single_row") {
      if (!toAccountName) {
        issues.push("Destination account is required for transfers.");
        fixAction = "Specify the destination account.";
      } else if (toAccountName.toLowerCase() === accountName.toLowerCase()) {
        issues.push("Source and destination accounts cannot be the same.");
        fixAction = "Choose different accounts for the transfer.";
      }
    }

    // Category matching (only for income & expense)
    let categoryName: string | undefined;
    let subcategoryName: string | undefined;
    let categoryDecision: CategoryMatchDecision | undefined;

    if (type === "income" || type === "expense") {
      categoryName = override.categoryName !== undefined
        ? override.categoryName.trim()
        : catColIdx >= 0 ? raw[catColIdx]?.trim() || undefined : undefined;

      subcategoryName = override.subcategoryName !== undefined
        ? override.subcategoryName.trim()
        : subColIdx >= 0 ? raw[subColIdx]?.trim() || undefined : undefined;

      if (categoryName?.includes("|") || subcategoryName?.includes("|")) {
        issues.push("Category values containing a vertical bar (|) are not supported.");
        fixAction = "Edit the category name to remove the | character.";
      }

      const catKey = buildCategoryKey(type, categoryName || "", subcategoryName);
      categoryDecision = categoryMatches[catKey] || categoryMatches[`${type}:`];
      if (!categoryDecision && categoryName) {
        // If no decision yet, check if valid
        issues.push(`Category "${categoryName}" needs to be matched.`);
        fixAction = "Match this category in the category matching step.";
      }
    }

    // Text fields & limits
    const description = override.description !== undefined
      ? override.description.trim()
      : nameColIdx >= 0 ? raw[nameColIdx]?.trim() || undefined : undefined;

    if (description && description.length > LIMITS.description) {
      issues.push(`Description exceeds the maximum length of ${LIMITS.description} characters.`);
      fixAction = "Shorten the description.";
    }

    const note = override.note !== undefined
      ? override.note.trim()
      : noteColIdx >= 0 ? raw[noteColIdx]?.trim() || undefined : undefined;

    if (note && note.length > LIMITS.note) {
      issues.push(`Note exceeds the maximum length of ${LIMITS.note} characters.`);
      fixAction = "Shorten the note.";
    }

    const rawLabels = override.labels
      ? override.labels.join(";")
      : labelsColIdx >= 0 ? raw[labelsColIdx]?.trim() || undefined : undefined;

    const labelsList = rawLabels ? rawLabels.split(";").map((l) => l.trim()).filter(Boolean) : undefined;
    if (labelsList) {
      for (const lbl of labelsList) {
        if (lbl.length > LIMITS.label) {
          issues.push(`Label "${lbl}" exceeds the maximum length of ${LIMITS.label} characters.`);
          fixAction = "Shorten the label name.";
        }
      }
    }

    // Account validation
    const accountDecision = accountMatches[accountName.toLowerCase()];
    if (!accountDecision) {
      issues.push(`Account "${accountName}" is not matched.`);
      fixAction = "Match this account in the account matching step.";
    } else if (accountDecision.mode === "existing") {
      const existingAcc = existingAccountsById.get(accountDecision.existingAccountId || "");
      if (existingAcc) {
        if (isCreditCardAccountType(existingAcc.accountTypeId, existingAcc.accountType?.name ?? "") || existingAcc.accountType?.accountGroup === "liability" || existingAcc.creditCardDetails !== null) {
          issues.push(`Account "${existingAcc.name}" is a credit card or liability, which is not supported.`);
          fixAction = "Match to a standard asset account.";
        }
        if (existingAcc.currencyCode.toUpperCase() !== currencyCode) {
          issues.push(`Currency mismatch: account uses ${existingAcc.currencyCode}, but row has ${currencyCode}.`);
          fixAction = "Transactions must use the same currency as their account.";
        }
        if (date && date.getTime() < existingAcc.openingBalanceAt.getTime()) {
          issues.push(`Transaction date is before the account's opening balance date (${existingAcc.openingBalanceAt.toLocaleDateString()}).`);
          fixAction = "Change the transaction date or adjust the account opening date.";
        }
      }
    } else if (accountDecision.mode === "new" && accountDecision.newAccount) {
      const newAcc = accountDecision.newAccount;
      if (newAcc.currencyCode.toUpperCase() !== currencyCode) {
        issues.push(`Currency mismatch: new account is in ${newAcc.currencyCode}, but row is in ${currencyCode}.`);
        fixAction = "Make sure the account and row currencies match.";
      }
      if (date && date.getTime() < newAcc.balanceDate.getTime()) {
        issues.push(`Transaction date is before the new account's starting balance date.`);
        fixAction = "Adjust the date.";
      }
    }

    // Similar purchase check
    let isSimilarExisting = false;
    const toAccountDecision = toAccountName ? accountMatches[toAccountName.toLowerCase()] : undefined;
    const toAccountId = toAccountDecision?.mode === "existing" ? toAccountDecision.existingAccountId : undefined;
    const accountId = accountDecision?.mode === "existing" ? accountDecision.existingAccountId : undefined;
    const categoryId = categoryDecision?.mode === "existing" || categoryDecision?.mode === "default_other" ? categoryDecision.existingCategoryId : undefined;

    if (
      similarTransactionChecker &&
      date &&
      amountMinorUnits !== 0 &&
      accountDecision?.existingAccountId &&
      issues.length === 0
    ) {
      const destId = toAccountId;
      const hasSimilar = similarTransactionChecker({
        type,
        accountId: accountDecision.existingAccountId,
        destinationAccountId: destId,
        occurredAt: date,
        amountMinorUnits,
        description,
      });

      if (hasSimilar) {
        isSimilarExisting = true;
        if (!userConfirmedSimilar) {
          issues.push("A similar purchase already exists in Kaizen on this date.");
          fixAction = "Confirm that this is a separate transaction to import it, or leave it out.";
        }
      }
    }

    const status: RowStatus = userExcluded ? "left_out" : issues.length > 0 ? "needs_attention" : "ready";

    processedRows.push({
      rowNumber,
      rawValues,
      originalId: origId,
      sourceIdentity,
      date,
      time: timeStr,
      type,
      amountMinorUnits,
      currencyCode,
      accountName,
      accountId,
      toAccountName,
      toAccountId,
      categoryName,
      subcategoryName,
      categoryId,
      description,
      note,
      labels: labelsList,
      status,
      userExcluded,
      issues,
      fixAction,
      isSimilarExisting,
      userConfirmedSimilar,
    });
  }

  // =========================================================================
  // PAIRED ROWS TRANSFER PAIRING LOGIC
  // =========================================================================
  let unpairedTransferWarning = false;

  if (importType === "transactions" && config.transferStyle === "paired_rows") {
    // Find all transfer candidate rows
    const transferRowIndices: number[] = [];
    for (let idx = 0; idx < processedRows.length; idx++) {
      const r = processedRows[idx];
      if (r.type === "transfer" && !r.userExcluded) {
        transferRowIndices.push(idx);
      }
    }

    if (transferRowIndices.length > 0 && transferRowIndices.length % 2 !== 0) {
      unpairedTransferWarning = true;
    }

    const matchedPairs = new Set<number>();

    for (let a = 0; a < transferRowIndices.length; a++) {
      const idxA = transferRowIndices[a];
      if (matchedPairs.has(idxA)) continue;
      const rowA = processedRows[idxA];
      if (!rowA.date) continue;

      const candidates: number[] = [];
      const calDayA = rowA.date.toDateString();
      const absAmtA = Math.abs(rowA.amountMinorUnits || 0);

      for (let b = a + 1; b < transferRowIndices.length; b++) {
        const idxB = transferRowIndices[b];
        if (matchedPairs.has(idxB)) continue;
        const rowB = processedRows[idxB];
        if (!rowB.date) continue;

        const calDayB = rowB.date.toDateString();
        const absAmtB = Math.abs(rowB.amountMinorUnits || 0);

        // Same calendar day, same absolute amount, different accounts
        if (
          calDayA === calDayB &&
          absAmtA === absAmtB &&
          rowA.accountName?.toLowerCase() !== rowB.accountName?.toLowerCase() &&
          rowA.currencyCode === rowB.currencyCode
        ) {
          candidates.push(idxB);
        }
      }

      if (candidates.length === 1) {
        const idxB = candidates[0];
        matchedPairs.add(idxA);
        matchedPairs.add(idxB);

        rowA.pairedRowNumber = processedRows[idxB].rowNumber;
        processedRows[idxB].pairedRowNumber = rowA.rowNumber;

        // One row becomes destination
        rowA.toAccountName = processedRows[idxB].accountName;
        rowA.toAccountId = processedRows[idxB].accountId;
        processedRows[idxB].toAccountName = rowA.accountName;
        processedRows[idxB].toAccountId = rowA.accountId;

        // Combine notes up to 1000 chars
        const combinedNotes = [rowA.note, processedRows[idxB].note].filter(Boolean).join(" | ").slice(0, LIMITS.note);
        rowA.note = combinedNotes;
        processedRows[idxB].note = combinedNotes;

        // Combine labels
        const allLabels = Array.from(new Set([...(rowA.labels || []), ...(processedRows[idxB].labels || [])]));
        rowA.labels = allLabels;
        processedRows[idxB].labels = allLabels;
      } else {
        // 0 or >1 candidates -> needs attention!
        rowA.status = "needs_attention";
        rowA.issues.push(
          candidates.length === 0
            ? "Transfer cannot be matched to an opposite row with the same accounts, amount, and calendar day."
            : "Multiple matching opposite transfer rows found. Transfer pairing is unclear.",
        );
        rowA.fixAction = "Check the transfer rows or switch transfer style in column matching.";
        unpairedTransferWarning = true;
      }
    }
  }

  // =========================================================================
  // SUMMARY CALCULATIONS
  // =========================================================================
  let readyCount = 0;
  let needsAttentionCount = 0;
  let leftOutCount = 0;
  let totalIncomeMinorUnits = 0;
  let totalExpenseMinorUnits = 0;
  const accountBalanceDeltas: Record<string, number> = {};
  let earliestDate: Date | undefined;
  let latestDate: Date | undefined;

  for (const r of processedRows) {
    if (r.status === "ready") {
      readyCount++;
      if (r.date) {
        if (!earliestDate || r.date < earliestDate) earliestDate = r.date;
        if (!latestDate || r.date > latestDate) latestDate = r.date;
      }

      if (importType === "transactions") {
        if (r.type === "income") {
          totalIncomeMinorUnits += Math.abs(r.amountMinorUnits || 0);
        } else if (r.type === "expense") {
          totalExpenseMinorUnits += Math.abs(r.amountMinorUnits || 0);
        }

        // Account deltas
        const accDec = accountMatches[(r.accountName || "").toLowerCase()];
        const accId = accDec?.existingAccountId || (accDec?.newAccount ? `new:${accDec.sourceName}` : undefined);
        if (accId) {
          const delta = r.amountMinorUnits || 0;
          accountBalanceDeltas[accId] = (accountBalanceDeltas[accId] || 0) + delta;
        }

        // Transfer destination delta
        if (r.type === "transfer" && r.toAccountName) {
          const toDec = accountMatches[r.toAccountName.toLowerCase()];
          const toId = toDec?.existingAccountId || (toDec?.newAccount ? `new:${toDec.sourceName}` : undefined);
          if (toId) {
            const inDelta = Math.abs(r.amountMinorUnits || 0);
            accountBalanceDeltas[toId] = (accountBalanceDeltas[toId] || 0) + inDelta;
          }
        }
      }
    } else if (r.status === "needs_attention") {
      needsAttentionCount++;
    } else {
      leftOutCount++;
    }
  }

  const canImport = readyCount > 0 && needsAttentionCount === 0;

  return {
    rows: processedRows,
    summary: {
      importType,
      totalDataRows: processedRows.length,
      readyCount,
      needsAttentionCount,
      leftOutCount,
      totalIncomeMinorUnits,
      totalExpenseMinorUnits,
      accountBalanceDeltas,
      earliestDate,
      latestDate,
      canImport,
    },
    unpairedTransferWarning,
  };
}

