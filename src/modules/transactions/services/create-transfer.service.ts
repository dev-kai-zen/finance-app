import { db } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import { requirePocketForAccount } from "@/modules/accounts";
import {
  generateId,
  insertTransaction,
} from "../repositories/transactions.repository";
import type { CreateTransferInput, TransferResult } from "../types/transaction.types";

export function createTransfer(input: CreateTransferInput): TransferResult {
  if (!input.fromAccountId) {
    throw new Error("Source account ('From') is required.");
  }
  if (!input.toAccountId) {
    throw new Error("Destination account ('To') is required.");
  }
  if (
    input.fromAccountId === input.toAccountId &&
    (input.fromPocketId ?? null) === (input.toPocketId ?? null)
  ) {
    throw new Error("Choose different pockets when transferring within one account.");
  }
  if (!input.amountCents || input.amountCents <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (!Number.isInteger(input.amountCents)) {
    throw new Error("Transfer amount must be an integer in minor units (centavos).");
  }

  return db.transaction((tx) => {
    const fromAccount = findAccountById(input.fromAccountId, tx);
    if (!fromAccount) {
      throw new Error(`Source account not found: ${input.fromAccountId}`);
    }

    const toAccount = findAccountById(input.toAccountId, tx);
    if (!toAccount) {
      throw new Error(`Destination account not found: ${input.toAccountId}`);
    }
    if (input.fromPocketId) {
      requirePocketForAccount(input.fromPocketId, fromAccount.id, tx);
    }
    if (input.toPocketId) {
      requirePocketForAccount(input.toPocketId, toAccount.id, tx);
    }

    const groupId = generateId(tx);
    const occurredAt =
      input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
    const name = input.name?.trim() || null;
    const note = input.note?.trim() || null;
    const amount = Math.abs(input.amountCents);

    const outLeg = insertTransaction(
      {
        accountId: input.fromAccountId,
        categoryId: null,
        pocketId: input.fromPocketId ?? null,
        transactionGroupId: groupId,
        type: "transfer",
        amountCents: -amount,
        name,
        note,
        occurredAt,
      },
      tx,
    );

    const inLeg = insertTransaction(
      {
        accountId: input.toAccountId,
        categoryId: null,
        pocketId: input.toPocketId ?? null,
        transactionGroupId: groupId,
        type: "transfer",
        amountCents: amount,
        name,
        note,
        occurredAt,
      },
      tx,
    );

    return { transactionGroupId: groupId, outLeg, inLeg };
  });
}
