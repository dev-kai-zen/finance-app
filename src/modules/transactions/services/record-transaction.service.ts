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
): Promise<Transaction | TransferResult> {
  const prepared = await prepareAttachmentChanges(attachmentChanges);
  try {
    const committed = db.transaction((tx) => {
      const result = recordTransactionCommandInContext(command, tx);
      const ownerId =
        command.kind === "transaction"
          ? (result as Transaction).id
          : (result as TransferResult).outLeg.id;
      const removed = applyAttachmentChangesInContext(ownerId, prepared, tx);
      return { result, removed };
    });
    finalizeRemovedAttachmentFiles(committed.removed);
    triggerTransactionAttachmentSync();
    return committed.result;
  } catch (error) {
    await discardPreparedAttachmentChanges(prepared);
    throw error;
  }
}

export function recordTransactionInContext(
  command: Extract<RecordTransactionCommand, { kind: "transaction" }>,
  context: DbContext,
): Transaction;
export function recordTransactionInContext(
  command: Extract<RecordTransactionCommand, { kind: "transfer" }>,
  context: DbContext,
): TransferResult;
export function recordTransactionInContext(
  command: RecordTransactionCommand,
  context: DbContext,
): Transaction | TransferResult {
  return recordTransactionCommandInContext(command, context);
}

function recordTransactionCommandInContext(
  command: RecordTransactionCommand,
  context: DbContext,
): Transaction | TransferResult {
  const result =
    command.kind === "transaction"
      ? createTransactionInContext(command.input, context)
      : createTransferInContext(command.input, context);

  const saveRequest = command.preset?.saveRequest;
  if (saveRequest) {
    if (command.kind === "transaction") {
      const input = command.input;
      const transactionName = input.name?.trim() ?? "";
      saveTransactionPresetInContext(
          {
            transactionName,
            type: input.type,
            accountId: input.accountId,
            pocketId: input.pocketId ?? null,
            categoryId: input.categoryId,
            toAccountId: null,
            toPocketId: null,
            amountCents: saveRequest.includeAmount ? input.amountCents : null,
            note: input.note ?? null,
          },
          saveRequest.existingPresetId ?? undefined,
        context,
      );
    } else {
      const input = command.input;
      const transactionName = input.name?.trim() ?? "";
      saveTransactionPresetInContext(
          {
            transactionName,
            type: "transfer",
            accountId: input.fromAccountId,
            pocketId: input.fromPocketId ?? null,
            categoryId: null,
            toAccountId: input.toAccountId,
            toPocketId: input.toPocketId ?? null,
            amountCents: saveRequest.includeAmount
              ? Math.abs(input.amountCents)
              : null,
            note: input.note ?? null,
          },
          saveRequest.existingPresetId ?? undefined,
        context,
      );
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
