import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import { resolveScheduleOccurrencePaidInContext } from "@/modules/scheduled-transactions";
import { recordTransactionInContext } from "@/modules/transactions";
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

  // 1. Post expense transaction into general ledger via transactions service
  const txRecord = recordTransactionInContext(
    {
      kind: "transaction",
      input: {
        accountId,
        pocketId,
        categoryId: subscription.categoryId,
        type: "expense",
        amountMinorUnits: -paymentAmount,
        currencyCode: subscription.currencyCode,
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
  const nextRenewal = calculateNextRenewal(
    subscription.nextRenewalDate,
    subscription.billingCycle,
    subscription.billingCycleInterval,
    subscription.firstBillingDate.getDate(),
  );

  updateSubscriptionRecord(
    subscription.id,
    {
      nextRenewalDate: nextRenewal,
      updatedAt: new Date(),
    },
    context,
  );

  // 4. Synchronize linked schedule to clear "Needs attention" in Scheduled Transactions
  if (subscription.scheduleId) {
    try {
      resolveScheduleOccurrencePaidInContext(
        subscription.scheduleId,
        txRecord.id,
        paidDate,
        context,
      );
    } catch {
      // Continue even if schedule sync encounters an issue
    }
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
  if (!subscription) return;

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

  const nextRenewal = calculateNextRenewal(
    subscription.nextRenewalDate,
    subscription.billingCycle,
    subscription.billingCycleInterval,
    subscription.firstBillingDate.getDate(),
  );

  updateSubscriptionRecord(
    subscription.id,
    {
      nextRenewalDate: nextRenewal,
      updatedAt: new Date(),
    },
    context,
  );
}
