import { db, type DbContext } from "@/infrastructure/database/client";
import type { NewSubscriptionRecord } from "@/infrastructure/database/schema";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import {
  findSubscriptionById,
  generateSubscriptionId,
  insertSubscription,
  updateSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import type {
  BillingCycle,
  SaveSubscriptionInput,
  SubscriptionItem,
} from "../types/subscription.types";
import { calculateNextRenewal } from "../utils/renewal-calculator";
import {
  permanentlyDeleteScheduledTransaction,
  saveScheduledTransactionInContext,
  setScheduledTransactionPaused,
  type SaveScheduledTransactionInput,
} from "@/modules/scheduled-transactions";

function mapCycleToSchedule(cycle: BillingCycle, intervalCount: number): {
  frequency: "weekly" | "monthly" | "yearly";
  intervalCount: number;
} {
  switch (cycle) {
    case "weekly":
      return { frequency: "weekly", intervalCount };
    case "monthly":
      return { frequency: "monthly", intervalCount };
    case "quarterly":
      return { frequency: "monthly", intervalCount: 3 * intervalCount };
    case "semi_annual":
      return { frequency: "monthly", intervalCount: 6 * intervalCount };
    case "yearly":
      return { frequency: "yearly", intervalCount };
  }
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveUpcomingRenewal(
  firstBillingDate: Date,
  billingCycle: BillingCycle,
  intervalCount: number,
  explicitRenewal?: Date,
): Date {
  if (explicitRenewal) return explicitRenewal;

  const now = new Date();
  let candidate = new Date(firstBillingDate.getTime());
  const anchorDay = firstBillingDate.getDate();

  // If firstBillingDate is today or in the future, that is the next renewal
  if (candidate.getTime() >= now.getTime()) {
    return candidate;
  }

  // Roll forward until it is in the future or today
  while (candidate.getTime() < now.getTime()) {
    candidate = calculateNextRenewal(
      candidate,
      billingCycle,
      intervalCount,
      anchorDay,
    );
  }

  return candidate;
}

export function saveSubscription(
  input: SaveSubscriptionInput,
  id?: string,
): string {
  return db.transaction((tx) => saveSubscriptionInContext(input, id, tx));
}

export function saveSubscriptionInContext(
  input: SaveSubscriptionInput,
  existingId: string | undefined,
  context: DbContext,
): string {
  const subscriptionId = existingId || generateSubscriptionId(context);
  const now = new Date();

  const interval = Math.max(1, input.billingCycleInterval || 1);
  const nextRenewal = resolveUpcomingRenewal(
    input.firstBillingDate,
    input.billingCycle,
    interval,
    input.nextRenewalDate,
  );

  const reminderLeadDaysJson = JSON.stringify(
    input.reminderLeadDays && input.reminderLeadDays.length > 0
      ? input.reminderLeadDays
      : [1, 3],
  );

  const existing = existingId ? findSubscriptionById(existingId, context) : null;

  let linkedScheduleId = existing?.scheduleId || null;
  if (input.accountId) {
    const { frequency, intervalCount: schedInterval } = mapCycleToSchedule(
      input.billingCycle,
      interval,
    );
    const schedInput: SaveScheduledTransactionInput = {
      transactionType: "expense",
      accountId: input.accountId,
      pocketId: input.pocketId ?? null,
      categoryId: input.categoryId ?? null,
      amountMinorUnits: Math.abs(input.amountMinorUnits),
      name: input.name.trim(),
      note: input.notes?.trim() || null,
      frequency,
      intervalCount: schedInterval,
      startsAt: input.firstBillingDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      endMode: input.endsOn ? "on_date" : "never",
      endsOn: input.endsOn ? toDateKey(input.endsOn) : null,
      weekendPolicy: "exact",
      autoPost: Boolean(input.autoPost),
      subscriptionId,
    };
    const savedSched = saveScheduledTransactionInContext(
      schedInput,
      linkedScheduleId || undefined,
      context,
    );
    linkedScheduleId = savedSched.id;

    if (input.status === "paused" || input.status === "cancelled") {
      try {
        setScheduledTransactionPaused(linkedScheduleId, true);
      } catch {
        // Ignore if schedule record was not found
      }
    }
  } else if (linkedScheduleId) {
    try {
      permanentlyDeleteScheduledTransaction(linkedScheduleId);
    } catch {
      // Ignore if already deleted
    }
    linkedScheduleId = null;
  }

  const record: NewSubscriptionRecord = {
    id: subscriptionId,
    name: input.name.trim(),
    status: input.status,
    amountMinorUnits: Math.abs(input.amountMinorUnits),
    currencyCode: input.currencyCode || DEFAULT_BASE_CURRENCY,
    billingCycle: input.billingCycle,
    billingCycleInterval: interval,
    firstBillingDate: input.firstBillingDate,
    nextRenewalDate: nextRenewal,
    trialEndsAt: input.trialEndsAt || null,
    cancelledAt: input.status === "cancelled" ? now : null,
    accountId: input.accountId || null,
    pocketId: input.pocketId || null,
    categoryId: input.categoryId || null,
    merchantId: input.merchantId || null,
    scheduleId: linkedScheduleId,
    endsOn: input.endsOn || null,
    autoPost: Boolean(input.autoPost),
    reminderLeadDays: reminderLeadDaysJson,
    cancellationUrl: input.cancellationUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    color: input.color || null,
    icon: input.icon || null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  if (existingId) {
    updateSubscriptionRecord(existingId, record, context);
  } else {
    insertSubscription(record, context);
  }

  return subscriptionId;
}
