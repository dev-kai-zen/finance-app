import { db, type DbContext } from "@/infrastructure/database/client";
import { findAccountById, requirePocketForAccount } from "@/modules/accounts";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import {
  deleteTransaction,
  findTransactionsByGroupId,
  insertTransaction,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import { assignTransactionLabels } from "@/modules/labels";
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
  if (!input.amountMinorUnits || input.amountMinorUnits <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (!Number.isInteger(input.amountMinorUnits)) {
    throw new Error("Transfer amount must be an integer in minor units (centavos).");
  }

  const legs = findTransactionsByGroupId(input.transactionGroupId, context);
  const transferLegs = legs.filter((leg) => leg.type === "transfer");
  if (transferLegs.length !== 2) {
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

  const outLeg = transferLegs.find((leg) => leg.amountMinorUnits < 0) ?? transferLegs[0];
  const inLeg = transferLegs.find((leg) => leg.amountMinorUnits > 0) ?? transferLegs[1];
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
  if (fromAccount.currencyCode !== toAccount.currencyCode) {
    throw new Error(
      "Cross-currency transfers are not supported yet. Choose accounts with the same currency.",
    );
  }
  const amount = Math.abs(input.amountMinorUnits);
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
      amountMinorUnits: -amount,
    },
    context,
  );

  updateTransactionRecord(
    inLeg.id,
    {
      ...sharedPatch,
      accountId: input.toAccountId,
      pocketId: input.toPocketId ?? null,
      amountMinorUnits: amount,
    },
    context,
  );

  const existingFeeLeg = legs.find((leg) => leg.type === "expense");

  if (input.fee && input.fee.amountMinorUnits > 0) {
    if (!input.fee.accountId) {
      throw new Error("Fee account is required.");
    }
    if (!input.fee.categoryId) {
      throw new Error("Fee category is required.");
    }
    if (!Number.isInteger(input.fee.amountMinorUnits)) {
      throw new Error("Fee amount must be an integer in minor units (centavos).");
    }
    const feeAccount = findAccountById(input.fee.accountId, context);
    if (!feeAccount) {
      throw new Error(`Fee account not found: ${input.fee.accountId}`);
    }
    if (input.fee.pocketId) {
      requirePocketForAccount(input.fee.pocketId, feeAccount.id, context, {
        allowArchived: existingFeeLeg?.pocketId === input.fee.pocketId,
      });
    }

    const feeAmount = Math.abs(input.fee.amountMinorUnits);
    const feeName = name ? `${name} Fee` : "Transfer Fee";

    if (existingFeeLeg) {
      updateTransactionRecord(
        existingFeeLeg.id,
        {
          accountId: input.fee.accountId,
          pocketId: input.fee.pocketId ?? null,
          categoryId: input.fee.categoryId,
          amountMinorUnits: -feeAmount,
          name: feeName,
          note,
          occurredAt,
          type: "expense",
        },
        context,
      );
    } else {
      insertTransaction(
        {
          accountId: input.fee.accountId,
          categoryId: input.fee.categoryId,
          pocketId: input.fee.pocketId ?? null,
          transactionGroupId: input.transactionGroupId,
          type: "expense",
          amountMinorUnits: -feeAmount,
          name: feeName,
          note,
          occurredAt,
        },
        context,
      );
    }
  } else if (existingFeeLeg) {
    deleteTransaction(existingFeeLeg.id, context);
  }

  if (input.labelIds !== undefined) {
    assignTransactionLabels(outLeg.id, input.labelIds, context);
    assignTransactionLabels(inLeg.id, input.labelIds, context);
    const updatedFeeLeg = findTransactionsByGroupId(input.transactionGroupId, context).find(
      (tx) => tx.type === "expense",
    );
    if (updatedFeeLeg) {
      assignTransactionLabels(updatedFeeLeg.id, input.labelIds, context);
    }
  }

  reconcileCreditCardBillingInContext(new Date(), context);
  return outLeg.id;
}
