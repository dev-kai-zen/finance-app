import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount, requirePocketForAccount } from "@/modules/accounts";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import {
  generateId,
  insertTransaction,
} from "../repositories/transactions.repository";
import type { CreateTransferInput, TransferResult } from "../types/transaction.types";

export function createTransfer(input: CreateTransferInput): TransferResult {
  return db.transaction((tx) => createTransferInContext(input, tx));
}

export function createTransferInContext(
  input: CreateTransferInput,
  context: DbContext,
): TransferResult {
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

    const fromAccount = requireAccount(input.fromAccountId, context);
    const toAccount = requireAccount(input.toAccountId, context);
    if (input.fromPocketId) {
      requirePocketForAccount(input.fromPocketId, fromAccount.id, context);
    }
    if (input.toPocketId) {
      requirePocketForAccount(input.toPocketId, toAccount.id, context);
    }

    const groupId = generateId(context);
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
      context,
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
      context,
    );

    reconcileCreditCardBillingInContext(new Date(), context);
    return { transactionGroupId: groupId, outLeg, inLeg };
}
