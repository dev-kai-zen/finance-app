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
  SubscriptionStatus,
} from "../types/subscription.types";
import { calculateNextRenewal } from "../utils/renewal-calculator";
import {
  getScheduleBySubscriptionId,
  getScheduledTransaction,
  processDueSchedules,
  removeScheduledTransaction,
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

export function syncSubscriptionScheduleInContext(
  sub: {
    id: string;
    name: string;
    status: SubscriptionStatus;
    amountMinorUnits: number;
    billingCycle: BillingCycle;
    billingCycleInterval: number;
    firstBillingDate: Date;
    accountId: string | null;
    pocketId: string | null;
    categoryId: string | null;
    endsOn: Date | null;
    autoPost: boolean;
    notes: string | null;
    scheduleId: string | null;
  },
  context: DbContext,
): string | null {
  let linkedScheduleId = sub.scheduleId;
  if (!linkedScheduleId) {
    const foundSched = getScheduleBySubscriptionId(sub.id, context);
    if (foundSched) {
      linkedScheduleId = foundSched.id;
    }
  }

  if (sub.accountId) {
    const interval = Math.max(1, sub.billingCycleInterval || 1);
    const { frequency, intervalCount: schedInterval } = mapCycleToSchedule(
      sub.billingCycle,
      interval,
    );
    const schedInput: SaveScheduledTransactionInput = {
      transactionType: "expense",
      accountId: sub.accountId,
      pocketId: sub.pocketId ?? null,
      categoryId: sub.categoryId ?? null,
      amountMinorUnits: Math.abs(sub.amountMinorUnits),
      name: sub.name.trim(),
      note: sub.notes?.trim() || null,
      frequency,
      intervalCount: schedInterval,
      startsAt: sub.firstBillingDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      endMode: sub.endsOn ? "on_date" : "never",
      endsOn: sub.endsOn ? toDateKey(sub.endsOn) : null,
      weekendPolicy: "exact",
      autoPost: Boolean(sub.autoPost),
      subscriptionId: sub.id,
    };

    // Verify existing schedule actually exists in SQLite before passing id to update
    const existingSched = linkedScheduleId
      ? getScheduledTransaction(linkedScheduleId, context)
      : null;
    const targetScheduleId = existingSched ? existingSched.id : undefined;

    const savedSched = saveScheduledTransactionInContext(
      schedInput,
      targetScheduleId,
      context,
    );
    linkedScheduleId = savedSched.id;

    if (sub.status === "paused" || sub.status === "cancelled") {
      try {
        setScheduledTransactionPaused(linkedScheduleId, true, context);
      } catch {
        // Ignore if schedule record was not found
      }
    } else {
      try {
        setScheduledTransactionPaused(linkedScheduleId, false, context);
      } catch {
        // Ignore if schedule record was not found
      }
    }
  } else if (linkedScheduleId) {
    try {
      removeScheduledTransaction(linkedScheduleId, context);
    } catch {
      // Ignore if already deleted
    }
    linkedScheduleId = null;
  }

  return linkedScheduleId;
}

export function saveSubscription(
  input: SaveSubscriptionInput,
  id?: string,
): string {
  const result = db.transaction((tx) => saveSubscriptionInContext(input, id, tx));
  try {
    processDueSchedules(new Date());
  } catch {
    // Ignore
  }
  return result;
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

  const linkedScheduleId = syncSubscriptionScheduleInContext(
    {
      id: subscriptionId,
      name: input.name,
      status: input.status,
      amountMinorUnits: input.amountMinorUnits,
      billingCycle: input.billingCycle,
      billingCycleInterval: interval,
      firstBillingDate: input.firstBillingDate,
      accountId: input.accountId || null,
      pocketId: input.pocketId || null,
      categoryId: input.categoryId || null,
      endsOn: input.endsOn || null,
      autoPost: Boolean(input.autoPost),
      notes: input.notes || null,
      scheduleId: existing?.scheduleId || null,
    },
    context,
  );

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
