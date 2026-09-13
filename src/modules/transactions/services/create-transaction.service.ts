import { db } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import { findCategoryById } from "@/modules/categories/repositories/categories.repository";
import { insertTransaction } from "../repositories/transactions.repository";
import type { CreateTransactionInput, Transaction } from "../types/transaction.types";

export function createTransaction(input: CreateTransactionInput): Transaction {
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

  return db.transaction((tx) => {
    const account = findAccountById(input.accountId, tx);
    if (!account) {
      throw new Error(`Account not found: ${input.accountId}`);
    }

    const category = findCategoryById(input.categoryId, tx);
    if (!category) {
      throw new Error(`Category not found: ${input.categoryId}`);
    }

    return insertTransaction(
      {
        accountId: input.accountId,
        categoryId: input.categoryId,
        transferAccountId: null,
        type: input.type,
        amountCents: input.amountCents,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt),
      },
      tx,
    );
  });
}
