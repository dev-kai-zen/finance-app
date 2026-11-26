import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import type { NewSubscriptionRecord } from "@/infrastructure/database/schema";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import { findAccountById } from "@/modules/accounts";
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
import { subscriptionFormSchema } from "../schemas/subscription.schema";
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

function toDateKey(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function didSubscriptionRecurrenceChange(
  existing: SubscriptionItem,
  input: SaveSubscriptionInput,
  interval: number,
): boolean {
  if (existing.billingCycle !== input.billingCycle) return true;
  if ((existing.billingCycleInterval || 1) !== interval) return true;
  if (toDateKey(existing.firstBillingDate) !== toDateKey(input.firstBillingDate)) return true;
  if (existing.status !== input.status) return true;
  if (
    Boolean(existing.trialEndsAt) !== Boolean(input.trialEndsAt) ||
    (existing.trialEndsAt && input.trialEndsAt && toDateKey(existing.trialEndsAt) !== toDateKey(input.trialEndsAt))
  ) {
    return true;
  }
  return false;
}

function resolveUpcomingRenewal(
  firstBillingDate: Date,
  billingCycle: BillingCycle,
  intervalCount: number,
  explicitRenewal?: Date,
): Date {
  if (explicitRenewal) return explicitRenewal;

  const todayKey = toDateKey(new Date());
  let candidate = new Date(firstBillingDate.getTime());
  const anchorDay = firstBillingDate.getDate();

  // If firstBillingDate is today or in the future, that is the next renewal
  if (toDateKey(candidate) >= todayKey) {
    return candidate;
  }

  // Roll forward until it is in the future or today
  while (toDateKey(candidate) < todayKey) {
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
    trialEndsAt?: Date | null;
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
    const scheduleStartsAt =
      sub.status === "trial" && sub.trialEndsAt
        ? sub.trialEndsAt
        : sub.firstBillingDate;

    const schedInput: SaveScheduledTransactionInput = {
      transactionType: "expense",
      accountId: sub.accountId,
      pocketId: sub.pocketId ?? null,
      categoryId: sub.categoryId ?? null,
      amountMinorUnits: -Math.abs(sub.amountMinorUnits),
      name: sub.name.trim(),
      note: sub.notes?.trim() || null,
      frequency,
      intervalCount: schedInterval,
      startsAt: scheduleStartsAt,
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
    DeviceEventEmitter.emit("FINANCE_APP_SCHEDULE_CATCH_UP_REQUESTED");
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
  subscriptionFormSchema.parse(input);
  const subscriptionId = existingId || generateSubscriptionId(context);
  const now = new Date();

  const interval = Math.max(1, input.billingCycleInterval || 1);
  const existing = existingId ? findSubscriptionById(existingId, context) : null;

  const nextRenewalDateValue =
    input.nextRenewalDate
      ? input.nextRenewalDate
      : existing && !didSubscriptionRecurrenceChange(existing, input, interval)
        ? existing.nextRenewalDate
        : input.status === "trial" && input.trialEndsAt
          ? input.trialEndsAt
          : resolveUpcomingRenewal(
              input.firstBillingDate,
              input.billingCycle,
              interval,
            );
  const nextRenewal =
    nextRenewalDateValue instanceof Date
      ? nextRenewalDateValue
      : new Date(nextRenewalDateValue);

  const reminderLeadDaysJson = JSON.stringify(
    input.reminderLeadDays && input.reminderLeadDays.length > 0
      ? input.reminderLeadDays
      : [1, 3],
  );

  const linkedScheduleId = syncSubscriptionScheduleInContext(
    {
      id: subscriptionId,
      name: input.name,
      status: input.status,
      amountMinorUnits: input.amountMinorUnits,
      billingCycle: input.billingCycle,
      billingCycleInterval: interval,
      firstBillingDate: input.firstBillingDate,
      trialEndsAt: input.trialEndsAt || null,
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

  let effectiveCurrency = input.currencyCode || DEFAULT_BASE_CURRENCY;
  if (input.accountId) {
    const linkedAccount = findAccountById(input.accountId, context);
    if (linkedAccount?.currencyCode) {
      effectiveCurrency = linkedAccount.currencyCode;
    }
  }

  const record: NewSubscriptionRecord = {
    id: subscriptionId,
    name: input.name.trim(),
    status: input.status,
    amountMinorUnits: Math.abs(input.amountMinorUnits),
    currencyCode: effectiveCurrency,
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
    createdAt: existing?.createdAt ?? now,
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
