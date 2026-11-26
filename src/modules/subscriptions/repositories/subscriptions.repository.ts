import {
  asc,
  desc,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  categories,
  merchants,
  pockets,
  subscriptionPayments,
  subscriptions,
  type NewSubscriptionPaymentRecord,
  type NewSubscriptionRecord,
  type SubscriptionPaymentRecord,
  type SubscriptionRecord,
} from "@/infrastructure/database/schema";
import type {
  SubscriptionItem,
  SubscriptionStatus,
} from "../types/subscription.types";
import {
  calculateMonthlyBurnRate,
  getDaysUntilRenewal,
} from "../utils/renewal-calculator";

export function generateSubscriptionId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  )!.id;
}

function parseLeadDays(json: string | null): number[] {
  if (!json) return [1, 3];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [1, 3];
  } catch {
    return [1, 3];
  }
}

export function mapSubscriptionRow(
  row: {
    subscription: SubscriptionRecord;
    accountName: string | null;
    pocketName?: string | null;
    categoryName: string | null;
    categoryIcon: string | null;
    merchantName: string | null;
  },
  now = new Date(),
): SubscriptionItem {
  const sub = row.subscription;
  const targetDate =
    sub.status === "trial" && sub.trialEndsAt
      ? sub.trialEndsAt
      : sub.nextRenewalDate;
  const daysUntil = getDaysUntilRenewal(targetDate, now);
  const monthlyBurn = calculateMonthlyBurnRate(
    sub.amountMinorUnits,
    sub.billingCycle as any,
    sub.billingCycleInterval,
  );

  return {
    id: sub.id,
    name: sub.name,
    status: sub.status as SubscriptionStatus,
    amountMinorUnits: sub.amountMinorUnits,
    currencyCode: sub.currencyCode,
    billingCycle: sub.billingCycle as any,
    billingCycleInterval: sub.billingCycleInterval,
    firstBillingDate: sub.firstBillingDate,
    nextRenewalDate: sub.nextRenewalDate,
    trialEndsAt: sub.trialEndsAt,
    cancelledAt: sub.cancelledAt,
    accountId: sub.accountId,
    accountName: row.accountName,
    pocketId: sub.pocketId,
    pocketName: row.pocketName ?? null,
    categoryId: sub.categoryId,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    categoryColor: null,
    merchantId: sub.merchantId,
    merchantName: row.merchantName,
    scheduleId: sub.scheduleId,
    endsOn: sub.endsOn,
    autoPost: sub.autoPost,
    reminderLeadDays: parseLeadDays(sub.reminderLeadDays),
    cancellationUrl: sub.cancellationUrl,
    notes: sub.notes,
    color: sub.color,
    icon: sub.icon,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    archivedAt: sub.archivedAt,
    monthlyBurnRateMinorUnits: monthlyBurn,
    daysUntilRenewal: daysUntil,
    isOverdue: daysUntil < 0 && (sub.status === "active" || sub.status === "trial"),
  };
}

export function listSubscriptions(
  options: { includeArchived?: boolean } = {},
  context: DbContext = db,
): SubscriptionItem[] {
  const query = context
    .select({
      subscription: subscriptions,
      accountName: accounts.name,
      pocketName: pockets.name,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      merchantName: merchants.name,
    })
    .from(subscriptions)
    .leftJoin(accounts, eq(subscriptions.accountId, accounts.id))
    .leftJoin(pockets, eq(subscriptions.pocketId, pockets.id))
    .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
    .leftJoin(merchants, eq(subscriptions.merchantId, merchants.id))
    .orderBy(
      asc(subscriptions.nextRenewalDate),
      desc(subscriptions.updatedAt),
    );

  const rows = options.includeArchived
    ? query.all()
    : query.where(isNull(subscriptions.archivedAt)).all();

  const now = new Date();
  return rows.map((r) => mapSubscriptionRow(r, now));
}

export function findSubscriptionById(
  id: string,
  context: DbContext = db,
): SubscriptionItem | null {
  const row = context
    .select({
      subscription: subscriptions,
      accountName: accounts.name,
      pocketName: pockets.name,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      merchantName: merchants.name,
    })
    .from(subscriptions)
    .leftJoin(accounts, eq(subscriptions.accountId, accounts.id))
    .leftJoin(pockets, eq(subscriptions.pocketId, pockets.id))
    .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
    .leftJoin(merchants, eq(subscriptions.merchantId, merchants.id))
    .where(eq(subscriptions.id, id))
    .get();

  if (!row) return null;
  return mapSubscriptionRow(row);
}

export function getAllSubscriptionIds(context: DbContext = db): string[] {
  const rows = context
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .all();
  return rows.map((r) => r.id);
}

export function insertSubscription(
  record: NewSubscriptionRecord,
  context: DbContext = db,
): void {
  context.insert(subscriptions).values(record).run();
}

export function updateSubscriptionRecord(
  id: string,
  updates: Partial<NewSubscriptionRecord>,
  context: DbContext = db,
): void {
  context
    .update(subscriptions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .run();
}

export function archiveSubscriptionRecord(
  id: string,
  context: DbContext = db,
): void {
  context
    .update(subscriptions)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .run();
}

export function restoreSubscriptionRecord(
  id: string,
  context: DbContext = db,
): void {
  context
    .update(subscriptions)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .run();
}

export function hasSubscriptionPayments(
  subscriptionId: string,
  context: DbContext = db,
): boolean {
  const row = context
    .select({ id: subscriptionPayments.id })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.subscriptionId, subscriptionId))
    .get();
  return Boolean(row);
}

export function permanentlyDeleteSubscriptionRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(subscriptions).where(eq(subscriptions.id, id)).run();
}

export function insertSubscriptionPaymentRecord(
  record: NewSubscriptionPaymentRecord,
  context: DbContext = db,
): void {
  context.insert(subscriptionPayments).values(record).run();
}

export function listSubscriptionPaymentsBySubscriptionId(
  subscriptionId: string,
  context: DbContext = db,
): SubscriptionPaymentRecord[] {
  return context
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.subscriptionId, subscriptionId))
    .orderBy(desc(subscriptionPayments.paidAt))
    .all();
}
