import { db, type DbContext } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import { requirePocketForAccount } from "@/modules/accounts";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import {
  findTransactionsByGroupId,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import type {
  TransactionAttachmentChanges,
  UpdateTransferInput,
} from "../types/transaction.types";
import {
  applyAttachmentChangesInContext,
  discardPreparedAttachmentChanges,
  finalizeRemovedAttachmentFiles,
  prepareAttachmentChanges,
  triggerTransactionAttachmentSync,
} from "./transaction-attachments.service";

export async function updateTransfer(
  input: UpdateTransferInput,
  attachmentChanges?: TransactionAttachmentChanges,
): Promise<void> {
  const prepared = await prepareAttachmentChanges(attachmentChanges);
  try {
    const removed = db.transaction((tx) => {
      const ownerId = updateTransferInContext(input, tx);
      return applyAttachmentChangesInContext(ownerId, prepared, tx);
    });
    finalizeRemovedAttachmentFiles(removed);
    triggerTransactionAttachmentSync();
  } catch (error) {
    await discardPreparedAttachmentChanges(prepared);
    throw error;
  }
}

export function updateTransferInContext(
  input: UpdateTransferInput,
  context: DbContext,
): string {
  if (!input.transactionGroupId) {
    throw new Error("Transaction group ID is required.");
  }
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

    const legs = findTransactionsByGroupId(input.transactionGroupId, context);
    if (legs.length !== 2) {
      throw new Error(`Transfer group ${input.transactionGroupId} is incomplete.`);
    }

    const fromAccount = findAccountById(input.fromAccountId, context);
    if (!fromAccount) {
      throw new Error(`Source account not found: ${input.fromAccountId}`);
    }

    const toAccount = findAccountById(input.toAccountId, context);
    if (!toAccount) {
      throw new Error(`Destination account not found: ${input.toAccountId}`);
    }

    const outLeg = legs.find((leg) => leg.amountCents < 0) ?? legs[0];
    const inLeg = legs.find((leg) => leg.amountCents > 0) ?? legs[1];
    if (input.fromPocketId) {
      requirePocketForAccount(input.fromPocketId, fromAccount.id, context, {
        allowArchived: outLeg.pocketId === input.fromPocketId,
      });
    }
    if (input.toPocketId) {
      requirePocketForAccount(input.toPocketId, toAccount.id, context, {
        allowArchived: inLeg.pocketId === input.toPocketId,
      });
    }
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
        pocketId: input.fromPocketId ?? null,
        amountCents: -amount,
      },
      context,
    );

    updateTransactionRecord(
      inLeg.id,
      {
        ...sharedPatch,
        accountId: input.toAccountId,
        pocketId: input.toPocketId ?? null,
        amountCents: amount,
      },
      context,
    );
    reconcileCreditCardBillingInContext(new Date(), context);
    return outLeg.id;
}
