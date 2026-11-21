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
    }

    section.data.push(tx);
    section.count += 1;
    if (tx.type !== "transfer") {
      if (!section.hasNonTransfer) {
        section.currencyCode = tx.currencyCode || defaultCurrency;
      } else if (tx.currencyCode && tx.currencyCode !== section.currencyCode) {
        section.currencyCode = defaultCurrency;
      }
      section.hasNonTransfer = true;
      const delta = Math.abs(tx.amountMinorUnits);
      section.netMinorUnits += tx.type === "income" ? delta : -delta;
    }
  }

  return sections;
}
