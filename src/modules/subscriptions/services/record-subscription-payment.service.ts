import { db, type DbContext } from "@/infrastructure/database/client";
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
    paidAt?: Date;
    amountMinorUnits?: number;
    note?: string;
  } = {},
): RecordSubscriptionPaymentResult {
  return db.transaction((tx) =>
    recordSubscriptionPaymentInContext(subscriptionId, options, tx),
  );
}

export function recordSubscriptionPaymentInContext(
  subscriptionId: string,
  options: {
    accountId?: string;
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
  );

  updateSubscriptionRecord(
    subscription.id,
    {
      nextRenewalDate: nextRenewal,
      updatedAt: new Date(),
    },
    context,
  );

  return {
    transactionId: txRecord.id,
    nextRenewalDate: nextRenewal,
  };
}
