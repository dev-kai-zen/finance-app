import { convertCurrencyMinorUnits } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionSection {
  key: string;
  title: string;
  count: number;
  netMinorUnits: number;
  currencyCode: string;
  hasNonTransfer: boolean;
  isFlat: boolean;
  data: TransactionListItem[];
}

export function getDateGroupInfo(occurredAt: Date | string | undefined): {
  key: string;
  label: string;
} {
  if (!occurredAt) {
    return { key: "unknown", label: "Unknown Date" };
  }
  const date = new Date(occurredAt);
  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  if (isSameDay) {
    return { key, label: "Today" };
  }
  if (isYesterday) {
    return { key, label: "Yesterday" };
  }

  const label = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return { key, label };
}

/**
 * Builds SectionList sections for paginated transactions.
 * - Date-sorted feeds group transactions by calendar day with daily net totals.
 * - Amount-sorted feeds render a single flat section preserving strict SQLite
 *   amount order so loading Page 2+ never retro-merges smaller/larger rows into
 *   earlier date sections above the viewport (preventing upward scroll jumps).
 */
export function buildTransactionSections(
  transactions: TransactionListItem[],
  sortBy: "date" | "amount",
  defaultCurrency: string,
  exchangeRates?: Map<string, number> | Record<string, number>,
): TransactionSection[] {
  if (transactions.length === 0) {
    return [];
  }

  if (sortBy === "amount") {
    return [
      {
        key: "amount-sorted",
        title: "",
        count: transactions.length,
        netMinorUnits: 0,
        currencyCode: defaultCurrency,
        hasNonTransfer: false,
        isFlat: true,
        data: transactions,
      },
    ];
  }

  const sections: TransactionSection[] = [];
  const map = new Map<string, TransactionSection>();
  const currenciesBySection = new Map<string, Set<string>>();

  for (const tx of transactions) {
    const { key, label } = getDateGroupInfo(tx.occurredAt);
    let section = map.get(key);
    if (!section) {
      section = {
        key,
        title: label,
        count: 0,
        netMinorUnits: 0,
        currencyCode: defaultCurrency,
        hasNonTransfer: false,
        isFlat: false,
        data: [],
      };
      map.set(key, section);
      sections.push(section);
      currenciesBySection.set(key, new Set());
    }

    section.data.push(tx);
    section.count += 1;
    if (tx.type !== "transfer") {
      currenciesBySection.get(key)!.add(tx.accountCurrency || defaultCurrency);
      section.hasNonTransfer = true;
    }
  }

  for (const section of sections) {
    const currencies = currenciesBySection.get(section.key)!;
    section.currencyCode = currencies.size === 1
      ? currencies.values().next().value!
      : defaultCurrency;
    for (const tx of section.data) {
      if (tx.type === "transfer") continue;
      // Ledger amounts are already signed and denominated in the account's currency.
      section.netMinorUnits += currencies.size > 1
        ? convertCurrencyMinorUnits(
            tx.amountMinorUnits,
            tx.accountCurrency || defaultCurrency,
            defaultCurrency,
            exchangeRates,
          )
        : tx.amountMinorUnits;
    }
  }
  return sections;
}
