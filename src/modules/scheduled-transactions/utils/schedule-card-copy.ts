import type { TranslationKey } from "@/infrastructure/localization/translations";
import type { Account } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type { ScheduledTransaction } from "../types/scheduled-transaction.types";

type TranslateFn = (
  key: TranslationKey,
  options?: Record<string, string | number | boolean | null | undefined>,
) => string;

export function scheduleCardTitle(
  schedule: ScheduledTransaction,
  category: Category | undefined,
  t: TranslateFn,
): string {
  const trimmed = schedule.name?.trim();
  if (trimmed) return trimmed;
  if (category?.name) return category.name;
  if (schedule.transactionType === "transfer") {
    return t("scheduledTransactions.fallback.scheduledTransfer");
  }
  if (schedule.transactionType === "income") {
    return t("scheduledTransactions.fallback.scheduledIncome");
  }
  return t("scheduledTransactions.fallback.scheduledExpense");
}

export function scheduleAccountLine(
  schedule: ScheduledTransaction,
  source: Account | undefined,
  destination: Account | undefined,
  category: Category | undefined,
  t: TranslateFn,
): string {
  const unknown = t("scheduledTransactions.fallback.unknownAccount");
  if (schedule.transactionType === "transfer") {
    return `${source?.name ?? unknown} → ${destination?.name ?? unknown}`;
  }
  const noCategory = t("scheduledTransactions.fallback.noCategory");
  return `${source?.name ?? unknown} · ${category?.name ?? noCategory}`;
}

export function scheduleStatusLabel(
  schedule: Pick<ScheduledTransaction, "archivedAt" | "status">,
  t: TranslateFn,
): string {
  if (schedule.archivedAt) {
    return t("scheduledTransactions.status.archived");
  }
  if (schedule.status === "active") return t("scheduledTransactions.status.active");
  if (schedule.status === "paused") return t("scheduledTransactions.status.paused");
  return t("scheduledTransactions.status.completed");
}