import { db, type DbContext } from "@/infrastructure/database/client";
import {
  requireAccount,
  requirePocketForAccount,
} from "@/modules/accounts";
import { requireCategory } from "@/modules/categories";
import {
  findScheduledTransaction,
  insertScheduledTransaction,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";
import { scheduledTransactionInputSchema } from "../schemas/scheduled-transaction.schema";
import type {
  SaveScheduledTransactionInput,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import { calculateScheduleOccurrence } from "../utils/recurrence";

export function saveScheduledTransaction(
  input: SaveScheduledTransactionInput,
  id?: string,
): ScheduledTransaction {
  return db.transaction((tx) =>
    saveScheduledTransactionInContext(input, id, tx),
  );
}

function saveScheduledTransactionInContext(
  rawInput: SaveScheduledTransactionInput,
  id: string | undefined,
  context: DbContext,
): ScheduledTransaction {
  const parsed = scheduledTransactionInputSchema.parse(rawInput);
  const input: SaveScheduledTransactionInput = {
    ...parsed,
    amountCents: Math.abs(parsed.amountCents),
    name: parsed.name?.trim() || null,
    note: parsed.note?.trim() || null,
    intervalCount: parsed.frequency === "once" ? 1 : parsed.intervalCount,
    endMode: parsed.frequency === "once" ? "never" : parsed.endMode,
    maxOccurrences:
      parsed.frequency !== "once" && parsed.endMode === "after_count"
        ? parsed.maxOccurrences
        : null,
    endsOn:
      parsed.frequency !== "once" && parsed.endMode === "on_date"
        ? parsed.endsOn
        : null,
  };

  const account = requireAccount(input.accountId, context);
  if (input.pocketId) {
    requirePocketForAccount(input.pocketId, account.id, context);
  }
  if (input.transactionType === "transfer") {
    const destination = requireAccount(input.toAccountId!, context);
    if (input.toPocketId) {
      requirePocketForAccount(input.toPocketId, destination.id, context);
    }
  } else {
    requireCategory(input.categoryId!, context);
  }

  const existing = id ? findScheduledTransaction(id, context) : null;
  if (id && !existing) {
    throw new Error("Scheduled transaction was not found.");
  }

  const nextOccurrenceNumber = existing?.nextOccurrenceNumber ?? 1;
  const anchorOccurrenceNumber = existing ? nextOccurrenceNumber : 1;
  const next = calculateScheduleOccurrence(
    { ...input, anchorOccurrenceNumber },
    nextOccurrenceNumber,
  );
  if (!next) {
    throw new Error("The ending rule must include the schedule's start date.");
  }

  const now = new Date();
  const values = {
    status:
      existing?.status === "paused" ? ("paused" as const) : ("active" as const),
    transactionType: input.transactionType,
    accountId: input.accountId,
    pocketId: input.pocketId ?? null,
    categoryId:
      input.transactionType === "transfer" ? null : input.categoryId ?? null,
    toAccountId:
      input.transactionType === "transfer" ? input.toAccountId ?? null : null,
    toPocketId:
      input.transactionType === "transfer" ? input.toPocketId ?? null : null,
    amountCents: input.amountCents,
    name: input.name ?? null,
    note: input.note ?? null,
    frequency: input.frequency,
    intervalCount: input.intervalCount,
    startsAt: input.startsAt,
    timeZone: input.timeZone,
    endMode: input.endMode,
    maxOccurrences: input.maxOccurrences ?? null,
    endsOn: input.endsOn ?? null,
    weekendPolicy: input.weekendPolicy,
    autoPost: input.autoPost,
    anchorOccurrenceNumber,
    nextOccurrenceNumber,
    nextNominalAt: next.nominalAt,
    nextEffectiveAt: next.effectiveAt ?? next.nominalAt,
    updatedAt: now,
  };

  if (existing) {
    updateScheduledTransactionRecord(existing.id, values, context);
    return findScheduledTransaction(existing.id, context)!;
  }

  return insertScheduledTransaction(
    { ...values, createdAt: now },
    context,
  );
}

