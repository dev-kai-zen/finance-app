import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import type { AccountListItem, PocketListItem } from "../types/account.types";

export const ACCOUNT_CSV_HEADERS = [
  "Account ID",
  "Account Name",
  "Account Type",
  "Account Group",
  "Currency",
  "Current Balance",
  "Opening Balance",
  "Opening Date",
  "Locked Starting Balance",
  "Maintaining Balance",
  "Credit Limit",
  "Statement Cutoff Day",
  "Payment Due Day",
  "Pockets Enabled",
  "Pockets Summary",
  "Hide From Selection",
  "Hide From Reports",
  "Archived",
  "Note",
  "Icon Key",
  "Sort Order",
  "Created At",
  "Updated At",
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

function formatLocalDateTime(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const hms = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${ymd} ${hms}`;
}

export function accountToCsvRow(
  account: AccountListItem,
  pockets: readonly PocketListItem[] = [],
): string[] {
  const currency = account.currencyCode.trim().toUpperCase();
  const currentBalance = formatMinorUnitsForCsv(
    account.currentBalanceMinorUnits,
    currency,
  );
  const openingBalance = formatMinorUnitsForCsv(
    account.openingBalanceMinorUnits,
    currency,
  );
  const openingDate = formatLocalDate(new Date(account.openingBalanceAt));

  const maintainingBalance =
    account.maintainingBalanceMinorUnits != null
      ? formatMinorUnitsForCsv(account.maintainingBalanceMinorUnits, currency)
      : "";

  const creditLimit =
    account.creditCardDetails?.creditLimitMinorUnits != null
      ? formatMinorUnitsForCsv(
          account.creditCardDetails.creditLimitMinorUnits,
          currency,
        )
      : "";

  const statementCutoffDay =
    account.creditCardDetails?.statementDay != null
      ? String(account.creditCardDetails.statementDay)
      : "";

  const paymentDueDay =
    account.creditCardDetails?.paymentDueDay != null
      ? String(account.creditCardDetails.paymentDueDay)
      : "";

  const accountPockets = pockets.filter((p) => p.accountId === account.id);
  const pocketsSummary =
    accountPockets.length > 0
      ? accountPockets
          .map(
            (p) =>
              `${p.name} (${formatMinorUnitsForCsv(p.currentBalanceMinorUnits, currency)})`,
          )
          .join("; ")
      : "";

  return [
    account.id,
    account.name.trim(),
    account.accountType?.name?.trim() ?? "",
    account.accountType?.accountGroup ?? "",
    currency,
    currentBalance,
    openingBalance,
    openingDate,
    account.startingBalanceLocked ? "true" : "false",
    maintainingBalance,
    creditLimit,
    statementCutoffDay,
    paymentDueDay,
    account.pocketEnabled ? "true" : "false",
    pocketsSummary,
    account.hideFromSelection ? "true" : "false",
    account.hideFromReports ? "true" : "false",
    account.isArchived ? "true" : "false",
    account.note?.trim() ?? "",
    account.iconKey ?? "",
    String(account.sortOrder),
    formatLocalDateTime(new Date(account.createdAt)),
    formatLocalDateTime(new Date(account.updatedAt)),
  ];
}

export function buildAccountsCsv(
  accounts: readonly AccountListItem[],
  pockets: readonly PocketListItem[] = [],
): string {
  const lines = [
    ACCOUNT_CSV_HEADERS.join(","),
    ...accounts.map((account) =>
      accountToCsvRow(account, pockets)
        .map((cell) => escapeCsvCell(cell))
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}

export function createAccountsCsvFileName(now = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
  return `accounts-${stamp}.csv`;
}
