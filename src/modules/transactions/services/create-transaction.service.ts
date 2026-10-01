import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount, requirePocketForAccount } from "@/modules/accounts";
import { requireCategory } from "@/modules/categories";
import {
  createCreditCardInstallmentPlan,
  reconcileCreditCardBillingInContext,
} from "@/modules/credit-cards";
import { insertTransaction } from "../repositories/transactions.repository";
import type { CreateTransactionInput, Transaction } from "../types/transaction.types";

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
  if (!input.amountCents || input.amountCents === 0) {
    throw new Error("Transaction amount cannot be zero.");
  }
  if (!Number.isInteger(input.amountCents)) {
    throw new Error("Transaction amount must be an integer in minor units (centavos).");
  }

    const account = requireAccount(input.accountId, context);
    requireCategory(input.categoryId, context);
    if (input.pocketId) {
      requirePocketForAccount(input.pocketId, account.id, context);
    }

    const transaction = insertTransaction(
      {
        accountId: input.accountId,
        categoryId: input.categoryId,
        pocketId: input.pocketId ?? null,
        transactionGroupId: null,
        type: input.type,
        amountCents: input.amountCents,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt),
      },
      context,
    );
    if (input.installment) {
      createCreditCardInstallmentPlan(transaction, input.installment, context);
    }
    reconcileCreditCardBillingInContext(new Date(), context);
    return transaction;
}
