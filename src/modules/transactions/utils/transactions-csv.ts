import {
  EXCHANGE_RATE_SNAPSHOT_SCALE,
  getCurrencyMinorUnitExponent,
  normalizeExchangeRateScaled,
} from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export const TRANSACTION_CSV_HEADERS = [
  "Date",
  "Time",
  "Type",
  "Name",
  "Amount",
  "Currency",
  "Account",
  "Pocket",
  "Category",
  "Labels",
  "Note",
  "Transfer Account",
  "Transfer Pocket",
  "Transfer Fee",
  "Fee Account",
  "Original Amount",
  "Original Currency",
  "Exchange Rate",
  "Transaction ID",
] as const;

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatMinorUnitsForCsv(
  minorUnits: number,
  currencyCode: string,
): string {
  const exponent = getCurrencyMinorUnitExponent(currencyCode);
  const divisor = 10 ** exponent;
  const abs = Math.abs(minorUnits);
  const sign = minorUnits < 0 ? "-" : "";
  const whole = Math.floor(abs / divisor);
  if (exponent === 0) {
    return `${sign}${whole}`;
  }
  const fraction = String(abs % divisor).padStart(exponent, "0");
  return `${sign}${whole}.${fraction}`;
}

function formatLocalDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalTime(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function exportAmountMinorUnits(transaction: TransactionListItem): number {
  if (transaction.type === "transfer") {
    return Math.abs(transaction.amountMinorUnits);
  }
  return transaction.amountMinorUnits;
}

function exportAmountCurrency(transaction: TransactionListItem): string {
  return transaction.accountCurrency?.trim().toUpperCase() || transaction.currencyCode;
}

function formatExchangeRateForCsv(rateScaled: number | null | undefined): string {
  const normalized = normalizeExchangeRateScaled(rateScaled ?? null);
  if (normalized === null) {
    return "";
  }
  return String(normalized / EXCHANGE_RATE_SNAPSHOT_SCALE);
}

function originalAmountColumns(
  transaction: TransactionListItem,
): [string, string] {
  if (
    transaction.originalAmountMinorUnits === null ||
    transaction.originalAmountMinorUnits === undefined
  ) {
    return ["", ""];
  }
  const typedCurrency = transaction.currencyCode.trim().toUpperCase();
  const accountCurrency = exportAmountCurrency(transaction);
  if (typedCurrency === accountCurrency) {
    return ["", ""];
  }
  return [
    formatMinorUnitsForCsv(
      transaction.originalAmountMinorUnits,
      typedCurrency,
    ),
    typedCurrency,
  ];
}

export function transactionToCsvRow(transaction: TransactionListItem): string[] {
  const occurredAt = new Date(transaction.occurredAt);
  const amountCurrency = exportAmountCurrency(transaction);
  const [originalAmount, originalCurrency] =
    originalAmountColumns(transaction);
  const labels =
    transaction.labels?.map((label) => label.name).join("; ") ?? "";

  const categoryCell =
    transaction.isSplit && transaction.splitEntries?.length
      ? transaction.splitEntries
          .map((entry) => {
            const label = entry.categoryName ?? "Category";
            const amount = formatMinorUnitsForCsv(
              entry.amountMinorUnits,
              amountCurrency,
            );
            return `${label} (${amount})`;
          })
          .join(" | ")
      : (transaction.categoryName ?? "");

  const transferFee =
    transaction.transferFeeAmountMinorUnits != null
      ? formatMinorUnitsForCsv(
          Math.abs(transaction.transferFeeAmountMinorUnits),
          amountCurrency,
        )
      : "";

  return [
    formatLocalDate(occurredAt),
    formatLocalTime(occurredAt),
    transaction.type,
    transaction.name?.trim() ?? "",
    formatMinorUnitsForCsv(exportAmountMinorUnits(transaction), amountCurrency),
    amountCurrency,
    transaction.accountName,
    transaction.pocketName ?? "",
    categoryCell,
    labels,
    transaction.note?.trim() ?? "",
    transaction.transferAccountName ?? "",
    transaction.transferPocketName ?? "",
    transferFee,
    transaction.transferFeeAccountName ?? "",
    originalAmount,
    originalCurrency,
    formatExchangeRateForCsv(transaction.exchangeRateScaled),
    transaction.id,
  ];
}

export function buildTransactionsCsv(rows: readonly TransactionListItem[]): string {
  const lines = [
    TRANSACTION_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      transactionToCsvRow(row).map((cell) => escapeCsvCell(cell)).join(","),
    ),
  ];
  return lines.join("\r\n");
}

export function createTransactionsCsvFileName(now = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
  return `transactions-${stamp}.csv`;
}
