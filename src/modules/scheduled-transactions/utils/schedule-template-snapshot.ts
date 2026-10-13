import type {
  ScheduledTransaction,
  ScheduledTransactionType,
} from "../types/scheduled-transaction.types";

export interface ScheduledTemplateSnapshot {
  transactionType: ScheduledTransactionType;
  accountId: string;
  pocketId: string | null;
  categoryId: string | null;
  toAccountId: string | null;
  toPocketId: string | null;
  amountMinorUnits: number;
  name: string | null;
  note: string | null;
}

export function buildScheduleTemplateSnapshot(
  schedule: Pick<
    ScheduledTransaction,
    | "transactionType"
    | "accountId"
    | "pocketId"
    | "categoryId"
    | "toAccountId"
    | "toPocketId"
    | "amountMinorUnits"
    | "name"
    | "note"
  >,
): ScheduledTemplateSnapshot {
  return {
    transactionType: schedule.transactionType,
    accountId: schedule.accountId,
    pocketId: schedule.pocketId,
    categoryId: schedule.categoryId,
    toAccountId: schedule.toAccountId,
    toPocketId: schedule.toPocketId,
    amountMinorUnits: schedule.amountMinorUnits,
    name: schedule.name,
    note: schedule.note,
  };
}

export function serializeScheduleTemplateSnapshot(
  schedule: Parameters<typeof buildScheduleTemplateSnapshot>[0],
): string {
  return JSON.stringify(buildScheduleTemplateSnapshot(schedule));
}
