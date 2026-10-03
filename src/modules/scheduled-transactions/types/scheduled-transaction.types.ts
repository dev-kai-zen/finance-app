export type ScheduleFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";
export type ScheduleEndMode = "never" | "after_count" | "on_date";
export type ScheduleWeekendPolicy =
  | "exact"
  | "next_weekday"
  | "previous_weekday"
  | "skip";
export type ScheduleStatus = "active" | "paused" | "completed";
export type ScheduleOccurrenceStatus = "due" | "posted" | "skipped" | "failed";
export type ScheduledTransactionType = "income" | "expense" | "transfer";

export interface ScheduledTransaction {
  id: string;
  status: ScheduleStatus;
  transactionType: ScheduledTransactionType;
  accountId: string;
  pocketId: string | null;
  categoryId: string | null;
  toAccountId: string | null;
  toPocketId: string | null;
  amountCents: number;
  name: string | null;
  note: string | null;
  frequency: ScheduleFrequency;
  intervalCount: number;
  startsAt: Date;
  timeZone: string;
  endMode: ScheduleEndMode;
  maxOccurrences: number | null;
  endsOn: string | null;
  weekendPolicy: ScheduleWeekendPolicy;
  autoPost: boolean;
  anchorOccurrenceNumber: number;
  nextOccurrenceNumber: number;
  nextNominalAt: Date | null;
  nextEffectiveAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledTransactionListItem extends ScheduledTransaction {
  accountName: string;
  accountCurrency: string;
  pocketName: string | null;
  categoryName: string | null;
  toAccountName: string | null;
  toPocketName: string | null;
}

export interface ScheduleOccurrence {
  id: string;
  scheduleId: string;
  sequenceNumber: number;
  nominalDueAt: Date;
  effectiveDueAt: Date | null;
  templateSnapshot: string;
  status: ScheduleOccurrenceStatus;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveScheduledTransactionInput {
  transactionType: ScheduledTransactionType;
  accountId: string;
  pocketId?: string | null;
  categoryId?: string | null;
  toAccountId?: string | null;
  toPocketId?: string | null;
  amountCents: number;
  name?: string | null;
  note?: string | null;
  frequency: ScheduleFrequency;
  intervalCount: number;
  startsAt: Date;
  timeZone: string;
  endMode: ScheduleEndMode;
  maxOccurrences?: number | null;
  endsOn?: string | null;
  weekendPolicy: ScheduleWeekendPolicy;
  autoPost: boolean;
}

export interface CalculatedScheduleOccurrence {
  sequenceNumber: number;
  nominalAt: Date;
  effectiveAt: Date | null;
  skippedForWeekend: boolean;
}
