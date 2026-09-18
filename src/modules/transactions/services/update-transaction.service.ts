import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import type { CreateTransactionInput } from "../types/transaction.types";
import { requirePocketForAccount } from "@/modules/accounts";

export function updateTransaction(
  id: string,
  input: CreateTransactionInput,
): void {
  if (!id) throw new Error("Transaction ID is required to update.");
  if (!input.accountId) throw new Error("Account is required.");
  if (!input.categoryId) throw new Error("Category is required.");
  if (!input.amountCents || !Number.isInteger(input.amountCents)) {
    throw new Error(
      "Transaction amount must be a non-zero integer in minor units (centavos).",
    );
  }

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) throw new Error(`Transaction with ID ${id} was not found.`);
    if (input.pocketId) {
      requirePocketForAccount(input.pocketId, input.accountId, tx, {
        allowArchived: existing.pocketId === input.pocketId,
      });
    }

    updateTransactionRecord(
      id,
      {
        accountId: input.accountId,
        categoryId: input.categoryId,
        pocketId: input.pocketId ?? null,
        type: input.type,
        amountCents: input.amountCents,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt,
      },
      tx,
    );
  });
}
