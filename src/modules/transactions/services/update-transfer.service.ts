import { db } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import {
  findTransactionsByGroupId,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import type { UpdateTransferInput } from "../types/transaction.types";

export function updateTransfer(input: UpdateTransferInput): void {
  if (!input.transactionGroupId) {
    throw new Error("Transaction group ID is required.");
  }
  if (!input.fromAccountId) {
    throw new Error("Source account ('From') is required.");
  }
  if (!input.toAccountId) {
    throw new Error("Destination account ('To') is required.");
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Cannot transfer funds to the same account.");
  }
  if (!input.amountCents || input.amountCents <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (!Number.isInteger(input.amountCents)) {
    throw new Error("Transfer amount must be an integer in minor units (centavos).");
  }

  db.transaction((tx) => {
    const legs = findTransactionsByGroupId(input.transactionGroupId, tx);
    if (legs.length !== 2) {
      throw new Error(`Transfer group ${input.transactionGroupId} is incomplete.`);
    }

    const fromAccount = findAccountById(input.fromAccountId, tx);
    if (!fromAccount) {
      throw new Error(`Source account not found: ${input.fromAccountId}`);
    }

    const toAccount = findAccountById(input.toAccountId, tx);
    if (!toAccount) {
      throw new Error(`Destination account not found: ${input.toAccountId}`);
    }

    const outLeg = legs.find((leg) => leg.amountCents < 0) ?? legs[0];
    const inLeg = legs.find((leg) => leg.amountCents > 0) ?? legs[1];
    const amount = Math.abs(input.amountCents);
    const occurredAt =
      input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
    const name = input.name?.trim() || null;
    const note = input.note?.trim() || null;

    const sharedPatch = { name, note, occurredAt, type: "transfer" as const };

    updateTransactionRecord(
      outLeg.id,
      {
        ...sharedPatch,
        accountId: input.fromAccountId,
        amountCents: -amount,
      },
      tx,
    );

    updateTransactionRecord(
      inLeg.id,
      {
        ...sharedPatch,
        accountId: input.toAccountId,
        amountCents: amount,
      },
      tx,
    );
  });
}
