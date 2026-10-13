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
import { syncTransactionSplitEntriesInContext } from "./sync-transaction-split-entries.service";
import { assertSplitEntriesValid } from "../utils/split-transaction-rules";

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
  const splitEntries = input.splitEntries ?? [];
  const isSplit = splitEntries.length >= 2;
  if (!isSplit && !input.categoryId) {
    throw new Error("Category is required for recording a transaction.");
  }
  if (isSplit && input.installment) {
    throw new Error("Installment purchases cannot be split across categories.");
  }
  if (input.type !== "income" && input.type !== "expense") {
    throw new Error("Transaction type must be income or expense.");
  }
    const account = requireAccount(input.accountId, context);
    if (!isSplit && input.categoryId) {
      const category = requireCategory(input.categoryId, context);
      if (category.type !== input.type) {
        throw new Error(
          `Category "${category.name}" does not match the transaction type.`,
        );
      }
    }
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

    if (isSplit) {
      assertSplitEntriesValid(
        resolved.amountMinorUnits,
        input.type,
        splitEntries,
      );
    }

    const transaction = insertTransaction(
      {
        accountId: input.accountId,
        categoryId: isSplit ? null : (input.categoryId ?? null),
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
    if (isSplit) {
      syncTransactionSplitEntriesInContext(
        transaction.id,
        resolved.amountMinorUnits,
        input.type,
        splitEntries,
        context,
      );
    }
    if (input.installment) {
      createCreditCardInstallmentPlan(transaction, input.installment, context);
    }
    if (input.labelIds && input.labelIds.length > 0) {
      assignTransactionLabels(transaction.id, input.labelIds, context);
    }
    reconcileCreditCardBillingInContext(new Date(), context);
    return transaction;
}
