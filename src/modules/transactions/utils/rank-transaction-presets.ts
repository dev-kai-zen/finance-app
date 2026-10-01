import type { TransactionPreset } from "../types/transaction-preset.types";

export function normalizePresetSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function matchRank(preset: TransactionPreset, query: string): number {
  const transactionName = normalizePresetSearch(preset.transactionName);
  if (transactionName === query) return 0;
  if (transactionName.startsWith(query)) return 1;
  if (transactionName.split(" ").some((word) => word.startsWith(query))) return 2;
  if (transactionName.includes(query)) return 3;
  return Number.POSITIVE_INFINITY;
}

export function rankTransactionPresets(
  presets: readonly TransactionPreset[],
  value: string,
  limit = 5,
): TransactionPreset[] {
  const query = normalizePresetSearch(value);
  if (query.length < 2) return [];

  return presets
    .map((preset) => ({ preset, rank: matchRank(preset, query) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      const leftUsed = left.preset.lastUsedAt?.getTime() ?? 0;
      const rightUsed = right.preset.lastUsedAt?.getTime() ?? 0;
      if (leftUsed !== rightUsed) return rightUsed - leftUsed;
      if (left.preset.usageCount !== right.preset.usageCount) {
        return right.preset.usageCount - left.preset.usageCount;
      }
      return left.preset.sortOrder - right.preset.sortOrder;
    })
    .slice(0, limit)
    .map(({ preset }) => preset);
}
