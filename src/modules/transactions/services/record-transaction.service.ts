import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findTransactionPresetById,
  updateTransactionPresetRecord,
} from "../repositories/transaction-presets.repository";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  Transaction,
  TransferResult,
  TransactionAttachmentChanges,
} from "../types/transaction.types";
import type { TransactionPresetSubmission } from "../types/transaction-preset.types";
import { createTransactionInContext } from "./create-transaction.service";
import { createTransferInContext } from "./create-transfer.service";
import { saveTransactionPresetInContext } from "./save-transaction-preset.service";
import {
  applyAttachmentChangesInContext,
  discardPreparedAttachmentChanges,
  finalizeRemovedAttachmentFiles,
  prepareAttachmentChanges,
  triggerTransactionAttachmentSync,
} from "./transaction-attachments.service";

import {
  checkAndNotifyBudgetThreshold,
  checkAndNotifyCreditLimit,
  checkAndNotifyGoalMilestones,
} from "@/modules/notifications";
import { logTelemetryEvent } from "@/infrastructure/telemetry";

export type RecordTransactionCommand =
  | {
      kind: "transaction";
      input: CreateTransactionInput;
      preset?: TransactionPresetSubmission;
    }
  | {
      kind: "transfer";
      input: CreateTransferInput;
      preset?: TransactionPresetSubmission;
    };

export function recordTransaction(
  command: Extract<RecordTransactionCommand, { kind: "transaction" }>,
  attachmentChanges?: TransactionAttachmentChanges,
): Promise<Transaction>;
export function recordTransaction(
  command: Extract<RecordTransactionCommand, { kind: "transfer" }>,
  attachmentChanges?: TransactionAttachmentChanges,
): Promise<TransferResult>;
export async function recordTransaction(
  command: RecordTransactionCommand,
  attachmentChanges?: TransactionAttachmentChanges,
  context: DbContext = db,
): Promise<Transaction | TransferResult> {
  const prepared = await prepareAttachmentChanges(attachmentChanges);
  let committed: {
    result: Transaction | TransferResult;
    removed: readonly ReturnType<typeof applyAttachmentChangesInContext>[number][];
  };

  try {
    const executeDb = (tx: DbContext) => {
      const result = recordTransactionCommandInContext(command, tx);
      const ownerId =
        command.kind === "transaction"
          ? (result as Transaction).id
          : (result as TransferResult).outLeg.id;
      const removed = applyAttachmentChangesInContext(ownerId, prepared, tx);
      return { result, removed };
    };

    if ("transaction" in context && typeof context.transaction === "function") {
      committed = context.transaction(executeDb);
    } else {
      committed = executeDb(context);
    }
  } catch (error) {
    // Only rollback newly prepared files if the database write failed to commit
    await discardPreparedAttachmentChanges(prepared);
    throw error;
  }

  // Database transaction committed. Post-commit cleanup:
  try {
    finalizeRemovedAttachmentFiles(committed.removed);
  } catch (cleanupError) {
    console.error("Failed to finalize removed attachment files:", cleanupError);
  }
  triggerTransactionAttachmentSync();

  if (command.kind === "transaction") {
    const tx = committed.result as Transaction;
    if (tx.categoryId) {
      void checkAndNotifyBudgetThreshold({
        categoryId: tx.categoryId,
        occurredAt: tx.occurredAt,
      });
    }
    if (tx.accountId) {
      void checkAndNotifyCreditLimit(tx.accountId);
    }
    void checkAndNotifyGoalMilestones();
  }

  logTelemetryEvent("transaction_created", {
    type: command.kind === "transfer" ? "transfer" : command.input.type,
    has_category:
      command.kind === "transaction" ? Boolean(command.input.categoryId) : false,
    has_labels:
      command.kind === "transaction"
        ? Boolean(command.input.labelIds?.length)
        : false,
    has_attachments: Boolean(attachmentChanges?.added?.length),
    is_split:
      command.kind === "transaction"
        ? Boolean(command.input.splitEntries?.length)
        : false,
  });

  return committed.result;
}

export function recordTransactionInContext(
  command: Extract<RecordTransactionCommand, { kind: "transaction" }>,
  context: DbContext,
  options?: { reconcileBilling?: boolean },
): Transaction;
export function recordTransactionInContext(
  command: Extract<RecordTransactionCommand, { kind: "transfer" }>,
  context: DbContext,
  options?: { reconcileBilling?: boolean },
): TransferResult;
export function recordTransactionInContext(
  command: RecordTransactionCommand,
  context: DbContext,
  options?: { reconcileBilling?: boolean },
): Transaction | TransferResult {
  return recordTransactionCommandInContext(command, context, options);
}

function recordTransactionCommandInContext(
  command: RecordTransactionCommand,
  context: DbContext,
  options?: { reconcileBilling?: boolean },
): Transaction | TransferResult {
  const result =
    command.kind === "transaction"
      ? createTransactionInContext(command.input, context, options)
      : createTransferInContext(command.input, context, options);

  const saveRequest = command.preset?.saveRequest;
  if (saveRequest) {
    if (command.kind === "transaction") {
      const input = command.input;
      const transactionName = input.name?.trim() ?? "";
      const txResult = result as Transaction;
      if (txResult.categoryId) {
        try {
          saveTransactionPresetInContext(
            {
              transactionName,
              type: input.type,
              accountId: input.accountId,
              pocketId: input.pocketId ?? null,
              categoryId: txResult.categoryId,
              toAccountId: null,
              toPocketId: null,
              amountMinorUnits: saveRequest.includeAmount
                ? Math.abs(txResult.amountMinorUnits)
                : null,
              note: input.note ?? null,
            },
            saveRequest.existingPresetId ?? undefined,
            context,
          );
        } catch (presetError) {
          console.warn("Failed to save optional quick preset:", presetError);
        }
      }
    } else {
      const input = command.input;
      const transactionName = input.name?.trim() ?? "";
      const trResult = result as TransferResult;
      if (trResult.outLeg.currencyCode === trResult.inLeg.currencyCode) {
        try {
          saveTransactionPresetInContext(
            {
              transactionName,
              type: "transfer",
              accountId: input.fromAccountId,
              pocketId: input.fromPocketId ?? null,
              categoryId: null,
              toAccountId: input.toAccountId,
              toPocketId: input.toPocketId ?? null,
              amountMinorUnits: saveRequest.includeAmount
                ? Math.abs(input.amountMinorUnits)
                : null,
              note: input.note ?? null,
            },
            saveRequest.existingPresetId ?? undefined,
            context,
          );
        } catch (presetError) {
          console.warn("Failed to save optional quick preset:", presetError);
        }
      }
    }
  } else if (command.preset?.appliedPresetId) {
    const preset = findTransactionPresetById(
      command.preset.appliedPresetId,
      context,
    );
    if (preset && !preset.deletedAt) {
      const now = new Date();
      updateTransactionPresetRecord(
        preset.id,
        {
          usageCount: preset.usageCount + 1,
          lastUsedAt: now,
          updatedAt: now,
        },
        context,
      );
    }
  }

  return result;
}
