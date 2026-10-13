import type { TransactionType } from "../types/transaction.types";

export interface SplitEntryInput {
  categoryId: string;
  amountMinorUnits: number;
  note?: string | null;
}

export function assertSplitEntriesValid(
  parentAmountMinorUnits: number,
  type: TransactionType,
  entries: SplitEntryInput[],
): void {
  if (type !== "income" && type !== "expense") {
    throw new Error("Only income and expense transactions can be split.");
  }
  if (entries.length < 2) {
    throw new Error("Split transactions need at least two category lines.");
  }

  const parentAbs = Math.abs(parentAmountMinorUnits);
  if (!Number.isInteger(parentAbs) || parentAbs <= 0) {
    throw new Error("Split parent amount must be a positive integer in minor units.");
  }

  let sum = 0;
  for (const entry of entries) {
    if (!entry.categoryId?.trim()) {
      throw new Error("Each split line needs a category.");
    }
    if (!Number.isInteger(entry.amountMinorUnits) || entry.amountMinorUnits <= 0) {
      throw new Error("Each split line amount must be a positive integer in minor units.");
    }
    sum += entry.amountMinorUnits;
  }

  if (sum !== parentAbs) {
    throw new Error(
      "Split line amounts must add up to the transaction total.",
    );
  }
}

export function formatSplitCategorySummary(
  entryLabels: string[],
): string {
  if (entryLabels.length === 0) {
    return "Split";
  }
  if (entryLabels.length === 1) {
    return entryLabels[0]!;
  }
  if (entryLabels.length === 2) {
    return `${entryLabels[0]} · ${entryLabels[1]}`;
  }
  return `${entryLabels[0]} +${entryLabels.length - 1}`;
}
