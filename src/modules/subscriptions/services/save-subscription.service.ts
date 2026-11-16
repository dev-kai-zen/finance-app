import { db, type DbContext } from "@/infrastructure/database/client";
import type { NewSubscriptionRecord } from "@/infrastructure/database/schema";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import {
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

function resolveUpcomingRenewal(
  firstBillingDate: Date,
  billingCycle: BillingCycle,
  intervalCount: number,
  explicitRenewal?: Date,
): Date {
  if (explicitRenewal) return explicitRenewal;

  const now = new Date();
  let candidate = new Date(firstBillingDate.getTime());

  // If firstBillingDate is today or in the future, that is the next renewal
  if (candidate.getTime() >= now.getTime()) {
    return candidate;
  }

  // Roll forward until it is in the future or today
  while (candidate.getTime() < now.getTime()) {
    candidate = calculateNextRenewal(candidate, billingCycle, intervalCount);
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
    categoryId: input.categoryId || null,
    merchantId: input.merchantId || null,
    scheduleId: null,
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
