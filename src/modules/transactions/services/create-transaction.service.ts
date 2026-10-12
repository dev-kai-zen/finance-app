import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount, requirePocketForAccount } from "@/modules/accounts";
import { requireCategory } from "@/modules/categories";
import {
  createCreditCardInstallmentPlan,
  reconcileCreditCardBillingInContext,
} from "@/modules/credit-cards";
import { insertTransaction } from "../repositories/transactions.repository";
import { assignTransactionLabels } from "@/modules/labels";
import type { CreateTransactionInput, Transaction } from "../types/transaction.types";
import { resolveTransactionExchangeSnapshot } from "./transaction-exchange-snapshot.service";

export function createTransaction(input: CreateTransactionInput): Transaction {
  return db.transaction((tx) => createTransactionInContext(input, tx));
}

export function createTransactionInContext(
  input: CreateTransactionInput,
  context: DbContext,
): Transaction {
  if (!input.accountId) {
    throw new Error("Account is required for recording a transaction.");
  }
  if (!input.categoryId) {
    throw new Error("Category is required for recording a transaction.");
  }
  if (input.type !== "income" && input.type !== "expense") {
    throw new Error("Transaction type must be income or expense.");
  }
    const account = requireAccount(input.accountId, context);
    requireCategory(input.categoryId, context);
    if (input.pocketId) {
      requirePocketForAccount(input.pocketId, account.id, context);
    }

    const typedAbs =
      input.typedAmountMinorUnitsAbs ?? Math.abs(input.amountMinorUnits);
    const resolved = resolveTransactionExchangeSnapshot({
      accountCurrencyCode: account.currencyCode,
      typedCurrencyCode: input.currencyCode ?? account.currencyCode,
      typedAmountMinorUnitsAbs: typedAbs,
      signedAccountAmountMinorUnits: input.signedAccountAmountMinorUnits,
      exchangeRateScaled: input.exchangeRateScaled,
      lastEdited: input.exchangeLastEdited,
      type: input.type,
    });

    const transaction = insertTransaction(
      {
        accountId: input.accountId,
        categoryId: input.categoryId,
        pocketId: input.pocketId ?? null,
        transactionGroupId: null,
        type: input.type,
        currencyCode: resolved.currencyCode,
        amountMinorUnits: resolved.amountMinorUnits,
        originalAmountMinorUnits: resolved.originalAmountMinorUnits,
        exchangeRateScaled: resolved.exchangeRateScaled,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt),
      },
      context,
    );
    if (input.installment) {
      createCreditCardInstallmentPlan(transaction, input.installment, context);
    }
    if (input.labelIds && input.labelIds.length > 0) {
      assignTransactionLabels(transaction.id, input.labelIds, context);
    }
    reconcileCreditCardBillingInContext(new Date(), context);
    return transaction;
}
