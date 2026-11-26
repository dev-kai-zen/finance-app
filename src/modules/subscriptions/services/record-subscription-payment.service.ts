import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import { resolveScheduleOccurrencePaidInContext } from "@/modules/scheduled-transactions";
import { getDefaultExpenseCategoryId } from "@/modules/categories";
import { subscriptionFormSchema } from "../schemas/subscription.schema";
import { recordTransactionInContext } from "@/modules/transactions";
import { findAccountById } from "@/modules/accounts";
import {
  findSubscriptionById,
  generateSubscriptionId,
  insertSubscriptionPaymentRecord,
  updateSubscriptionRecord,
} from "../repositories/subscriptions.repository";
import { calculateNextRenewal } from "../utils/renewal-calculator";

export interface RecordSubscriptionPaymentResult {
  transactionId: string;
  nextRenewalDate: Date;
}

export function recordSubscriptionPayment(
  subscriptionId: string,
  options: {
    accountId?: string;
    pocketId?: string | null;
    paidAt?: Date;
    amountMinorUnits?: number;
    note?: string;
  } = {},
): RecordSubscriptionPaymentResult {
  const result = db.transaction((tx) =>
    recordSubscriptionPaymentInContext(subscriptionId, options, tx),
  );
  DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED");
  return result;
}

export function recordSubscriptionPaymentInContext(
  subscriptionId: string,
  options: {
    accountId?: string;
    pocketId?: string | null;
    paidAt?: Date;
    amountMinorUnits?: number;
    note?: string;
  },
  context: DbContext,
): RecordSubscriptionPaymentResult {
  const subscription = findSubscriptionById(subscriptionId, context);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const accountId = options.accountId || subscription.accountId;
  if (!accountId) {
    throw new Error(
      `Please select a payment account for subscription "${subscription.name}".`,
    );
  }

  const pocketId =
    options.pocketId !== undefined ? options.pocketId : subscription.pocketId;

  const paidDate = options.paidAt || new Date();
  const paymentAmount =
    options.amountMinorUnits !== undefined
      ? Math.abs(options.amountMinorUnits)
      : subscription.amountMinorUnits;

  subscriptionFormSchema.shape.amountMinorUnits.parse(paymentAmount);
  const categoryId = subscription.categoryId ?? getDefaultExpenseCategoryId(context);
  if (!categoryId) {
    throw new Error("Create an expense category before recording a subscription payment.");
  }

  const paymentAccount = findAccountById(accountId, context);
  const effectivePaymentCurrency =
    accountId === subscription.accountId && paymentAccount?.currencyCode
      ? paymentAccount.currencyCode
      : subscription.currencyCode;

  // 1. Post expense transaction into general ledger via transactions service
  const txRecord = recordTransactionInContext(
    {
      kind: "transaction",
      input: {
        accountId,
        pocketId,
        categoryId,
        type: "expense",
        amountMinorUnits: -paymentAmount,
        currencyCode: effectivePaymentCurrency,
        occurredAt: paidDate,
        name: subscription.name,
        note: options.note || subscription.notes || `Subscription payment: ${subscription.name}`,
      },
    },
    context,
  );

  // 2. Insert subscription payment audit record
  const paymentRecordId = generateSubscriptionId(context);
  insertSubscriptionPaymentRecord(
    {
      id: paymentRecordId,
      subscriptionId: subscription.id,
      transactionId: txRecord.id,
      paidAt: paidDate,
      amountMinorUnits: paymentAmount,
      createdAt: new Date(),
    },
    context,
  );

  // 3. Roll next renewal date forward
  const anchorDate =
    subscription.status === "trial" && subscription.trialEndsAt
      ? subscription.trialEndsAt
      : subscription.firstBillingDate;

  const nextRenewal = calculateNextRenewal(
    subscription.nextRenewalDate,
    subscription.billingCycle,
    subscription.billingCycleInterval,
    anchorDate.getDate(),
  );

  updateSubscriptionRecord(
    subscription.id,
    {
      status: subscription.status === "trial" ? "active" : subscription.status,
      nextRenewalDate: nextRenewal,
      categoryId,
      updatedAt: new Date(),
    },
    context,
  );

  // 4. Synchronize linked schedule to clear "Needs attention" in Scheduled Transactions
  if (subscription.scheduleId) {
    resolveScheduleOccurrencePaidInContext(
      subscription.scheduleId,
      txRecord.id,
      paidDate,
      context,
    );
  }

  return {
    transactionId: txRecord.id,
    nextRenewalDate: nextRenewal,
  };
}

export function handleSubscriptionScheduleExecutedInContext(
  subscriptionId: string,
  transactionId: string,
  paidAt: Date,
  amountMinorUnits: number,
  context: DbContext,
): void {
  const subscription = findSubscriptionById(subscriptionId, context);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  const paymentRecordId = generateSubscriptionId(context);
  insertSubscriptionPaymentRecord(
    {
      id: paymentRecordId,
      subscriptionId: subscription.id,
      transactionId,
      paidAt,
      amountMinorUnits,
      createdAt: new Date(),
    },
    context,
  );

  const anchorDate =
    subscription.status === "trial" && subscription.trialEndsAt
      ? subscription.trialEndsAt
      : subscription.firstBillingDate;

  const nextRenewal = calculateNextRenewal(
    subscription.nextRenewalDate,
    subscription.billingCycle,
    subscription.billingCycleInterval,
    anchorDate.getDate(),
  );

  updateSubscriptionRecord(
    subscription.id,
    {
      status: subscription.status === "trial" ? "active" : subscription.status,
      nextRenewalDate: nextRenewal,
      updatedAt: new Date(),
    },
    context,
  );
}
