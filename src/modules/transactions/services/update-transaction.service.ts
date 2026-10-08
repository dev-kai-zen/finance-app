import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findTransactionById,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import { assignTransactionLabels } from "@/modules/labels";
import type {
  CreateTransactionInput,
  TransactionAttachmentChanges,
} from "../types/transaction.types";
import { requirePocketForAccount } from "@/modules/accounts";
import {
  getInstallmentPlanForTransaction,
  reconcileCreditCardBillingInContext,
} from "@/modules/credit-cards";
import {
  applyAttachmentChangesInContext,
  discardPreparedAttachmentChanges,
  finalizeRemovedAttachmentFiles,
  prepareAttachmentChanges,
  triggerTransactionAttachmentSync,
} from "./transaction-attachments.service";

export async function updateTransaction(
  id: string,
  input: CreateTransactionInput,
  attachmentChanges?: TransactionAttachmentChanges,
): Promise<void> {
  const prepared = await prepareAttachmentChanges(attachmentChanges);
  try {
    const removed = db.transaction((tx) => {
      updateTransactionInContext(id, input, tx);
      return applyAttachmentChangesInContext(id, prepared, tx);
    });
    finalizeRemovedAttachmentFiles(removed);
    triggerTransactionAttachmentSync();
  } catch (error) {
    await discardPreparedAttachmentChanges(prepared);
    throw error;
  }
}

export function updateTransactionInContext(
  id: string,
  input: CreateTransactionInput,
  context: DbContext,
): void {
  if (!id) throw new Error("Transaction ID is required to update.");
  if (!input.accountId) throw new Error("Account is required.");
  if (!input.categoryId) throw new Error("Category is required.");
  if (!input.amountMinorUnits || !Number.isInteger(input.amountMinorUnits)) {
    throw new Error(
      "Transaction amount must be a non-zero integer in minor units (centavos).",
    );
  }

    const existing = findTransactionById(id, context);
    if (!existing) throw new Error(`Transaction with ID ${id} was not found.`);
    const installmentPlan = getInstallmentPlanForTransaction(id, context);
    if (
      installmentPlan &&
      (existing.accountId !== input.accountId ||
        existing.amountMinorUnits !== input.amountMinorUnits ||
        existing.occurredAt.getTime() !== input.occurredAt.getTime())
    ) {
      throw new Error(
        "Account, amount, and date cannot be changed after creating an installment plan.",
      );
    }
    if (input.pocketId) {
      requirePocketForAccount(input.pocketId, input.accountId, context, {
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
        amountMinorUnits: input.amountMinorUnits,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt,
      },
      context,
    );
    if (input.labelIds !== undefined) {
      assignTransactionLabels(id, input.labelIds, context);
    }
    reconcileCreditCardBillingInContext(new Date(), context);
}
