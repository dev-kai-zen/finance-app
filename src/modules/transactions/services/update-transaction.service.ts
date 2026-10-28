import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount } from "@/modules/accounts";
import {
  findTransactionById,
  updateTransactionRecord,
} from "../repositories/transactions.repository";
import { assignTransactionLabels } from "@/modules/labels";
import type {
  CreateTransactionInput,
  TransactionAttachmentChanges,
} from "../types/transaction.types";
import { resolveTransactionExchangeSnapshot } from "./transaction-exchange-snapshot.service";
import { requirePocketForAccount } from "@/modules/accounts";
import {
  applyTransactionInstallmentChanges,
  getInstallmentPlanEditState,
  reconcileCreditCardBillingInContext,
} from "@/modules/credit-cards";
import { requireCategory } from "@/modules/categories";
import { syncTransactionSplitEntriesInContext } from "./sync-transaction-split-entries.service";
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
  const splitEntries = input.splitEntries;
  const isSplitRequest =
    splitEntries != null && splitEntries.length >= 2;
  if (!isSplitRequest && !input.categoryId) {
    throw new Error("Category is required.");
  }
  if (isSplitRequest && input.installment) {
    throw new Error("Installment purchases cannot be split across categories.");
  }
    const existing = findTransactionById(id, context);
    if (!existing) throw new Error(`Transaction with ID ${id} was not found.`);
    const account = requireAccount(input.accountId, context);
    const typedAbsForInstallment =
      input.typedAmountMinorUnitsAbs ?? Math.abs(input.amountMinorUnits);
    const resolvedForInstallmentCheck = resolveTransactionExchangeSnapshot({
      accountCurrencyCode: account.currencyCode,
      typedCurrencyCode: input.currencyCode ?? account.currencyCode,
      typedAmountMinorUnitsAbs: typedAbsForInstallment,
      signedAmountMinorUnits: input.amountMinorUnits,
      signedAccountAmountMinorUnits: input.signedAccountAmountMinorUnits,
      exchangeRateScaled: input.exchangeRateScaled,
      lastEdited: input.exchangeLastEdited,
      type: input.type,
    });
    const installmentEditState = getInstallmentPlanEditState(id, context);
    if (
      installmentEditState.billedInstallmentCount > 0 &&
      (existing.accountId !== input.accountId ||
        existing.amountMinorUnits !== resolvedForInstallmentCheck.amountMinorUnits ||
        existing.occurredAt.getTime() !== input.occurredAt.getTime())
    ) {
      throw new Error(
        "Account, amount, and date cannot be changed after an installment has been billed on a statement.",
      );
    }
    if (input.pocketId) {
      requirePocketForAccount(input.pocketId, input.accountId, context, {
        allowArchived: existing.pocketId === input.pocketId,
      });
    }

    if (!isSplitRequest && input.categoryId) {
      const category = requireCategory(input.categoryId, context);
      if (category.type !== input.type) {
        throw new Error(
          `Category "${category.name}" does not match the transaction type.`,
        );
      }
    }

    const clearingSplit =
      splitEntries != null && splitEntries.length === 0;
    const parentCategoryId = isSplitRequest
      ? null
      : clearingSplit
        ? (input.categoryId ?? null)
        : (input.categoryId ?? existing.categoryId);

    updateTransactionRecord(
      id,
      {
        accountId: input.accountId,
        categoryId: parentCategoryId,
        pocketId: input.pocketId ?? null,
        type: input.type,
        currencyCode: resolvedForInstallmentCheck.currencyCode,
        amountMinorUnits: resolvedForInstallmentCheck.amountMinorUnits,
        originalAmountMinorUnits: resolvedForInstallmentCheck.originalAmountMinorUnits,
        exchangeRateScaled: resolvedForInstallmentCheck.exchangeRateScaled,
        name: input.name?.trim() || null,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt,
      },
      context,
    );
    if (input.labelIds !== undefined) {
      assignTransactionLabels(id, input.labelIds, context);
    }
    if (splitEntries !== undefined) {
      syncTransactionSplitEntriesInContext(
        id,
        resolvedForInstallmentCheck.amountMinorUnits,
        input.type,
        splitEntries,
        context,
      );
    }
    const updated = findTransactionById(id, context);
    if (!updated) {
      throw new Error(`Transaction with ID ${id} was not found after update.`);
    }
    applyTransactionInstallmentChanges(updated, input.installment, context);
    reconcileCreditCardBillingInContext(new Date(), context);
}
