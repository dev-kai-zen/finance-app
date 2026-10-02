import { File } from "expo-file-system";

import { db, type DbContext } from "@/infrastructure/database/client";
import {
  completeSyncOperation,
  deleteGoogleDriveAttachmentFile,
  downloadGoogleDriveAttachmentFile,
  enqueueSyncOperation,
  failSyncOperation,
  listDueSyncOperations,
  retrySyncOperationsForEntity,
  uploadGoogleDriveAttachmentFile,
} from "@/infrastructure/sync";
import { withGoogleDriveAccessToken } from "@/modules/backup";
import {
  deleteTransactionAttachmentRecord,
  countTransactionAttachmentsByOwner,
  findTransactionAttachmentById,
  insertTransactionAttachment,
  listTransactionAttachmentsByOwner,
  listTransactionAttachmentsByOwnersIncludingDeleted,
  softDeleteTransactionAttachment,
  updateTransactionAttachmentSync,
} from "../repositories/transaction-attachments.repository";
import {
  findTransactionById,
  findTransactionsByGroupId,
} from "../repositories/transactions.repository";
import type {
  TransactionAttachment,
  TransactionAttachmentChanges,
  TransactionAttachmentDraft,
} from "../types/transaction.types";
import {
  calculateTransactionAttachmentSha256,
  deleteTransactionAttachmentLocalFile,
  discardPreparedTransactionAttachments,
  getTransactionAttachmentLocalUri,
  isTransactionAttachmentAvailableLocally,
  prepareTransactionAttachments,
  type PreparedTransactionAttachment,
} from "./transaction-attachment-storage.service";

const ATTACHMENT_SYNC_ENTITY = "transaction_attachment";

interface AttachmentSyncPayload {
  driveFileId?: string | null;
  storageKey?: string;
}

export interface PreparedAttachmentChanges {
  added: PreparedTransactionAttachment[];
  removedIds: string[];
}

export async function prepareAttachmentChanges(
  changes?: TransactionAttachmentChanges,
): Promise<PreparedAttachmentChanges> {
  return {
    added: await prepareTransactionAttachments(changes?.added ?? []),
    removedIds: [...new Set(changes?.removedIds ?? [])],
  };
}

export function applyAttachmentChangesInContext(
  transactionId: string,
  changes: PreparedAttachmentChanges,
  context: DbContext,
): TransactionAttachment[] {
  const ownerId = resolveAttachmentOwnerTransactionId(transactionId, context);

  for (const prepared of changes.added) {
    const attachment = insertTransactionAttachment(
      { ...prepared.record, transactionId: ownerId },
      context,
    );
    enqueueSyncOperation(
      {
        entityType: ATTACHMENT_SYNC_ENTITY,
        entityId: attachment.id,
        operation: "upload",
        payload: {},
      },
      context,
    );
  }

  const removed: TransactionAttachment[] = [];
  for (const id of changes.removedIds) {
    const attachment = findTransactionAttachmentById(id, context);
    if (!attachment || attachment.deletedAt) continue;
    if (attachment.transactionId !== ownerId) {
      throw new Error("An attachment does not belong to this transaction.");
    }
    softDeleteTransactionAttachment(id, new Date(), context);
    enqueueSyncOperation(
      {
        entityType: ATTACHMENT_SYNC_ENTITY,
        entityId: id,
        operation: "delete",
        payload: {
          driveFileId: attachment.driveFileId,
          storageKey: attachment.storageKey,
        } satisfies AttachmentSyncPayload,
      },
      context,
    );
    removed.push(attachment);
  }

  return removed;
}

export async function discardPreparedAttachmentChanges(
  changes: PreparedAttachmentChanges,
): Promise<void> {
  await discardPreparedTransactionAttachments(changes.added);
}

export function finalizeRemovedAttachmentFiles(
  removed: readonly TransactionAttachment[],
): void {
  for (const attachment of removed) {
    deleteTransactionAttachmentLocalFile(attachment.storageKey);
  }
}

export function listTransactionAttachments(
  transactionId: string,
  options: { limit?: number; offset?: number } = {},
): { items: TransactionAttachment[]; totalCount: number } {
  const ownerId = resolveAttachmentOwnerTransactionId(transactionId, db);
  return {
    items: listTransactionAttachmentsByOwner(
      ownerId,
      { limit: options.limit ?? 50, offset: options.offset ?? 0 },
    ),
    totalCount: countTransactionAttachmentsByOwner(ownerId),
  };
}

export async function addTransactionAttachments(
  transactionId: string,
  drafts: readonly TransactionAttachmentDraft[],
): Promise<void> {
  const prepared = await prepareAttachmentChanges({
    added: [...drafts],
    removedIds: [],
  });
  try {
    db.transaction((tx) => {
      applyAttachmentChangesInContext(transactionId, prepared, tx);
    });
  } catch (error) {
    await discardPreparedAttachmentChanges(prepared);
    throw error;
  }
  triggerTransactionAttachmentSync();
}

export function removeTransactionAttachment(id: string): void {
  let removed: TransactionAttachment[] = [];
  db.transaction((tx) => {
    const attachment = findTransactionAttachmentById(id, tx);
    if (!attachment || attachment.deletedAt) return;
    removed = applyAttachmentChangesInContext(
      attachment.transactionId,
      { added: [], removedIds: [id] },
      tx,
    );
  });
  finalizeRemovedAttachmentFiles(removed);
  triggerTransactionAttachmentSync();
}

export function queueTransactionAttachmentDeletionsInContext(
  transactionIds: readonly string[],
  context: DbContext,
): TransactionAttachment[] {
  const attachments = listTransactionAttachmentsByOwnersIncludingDeleted(
    transactionIds,
    context,
  );
  for (const attachment of attachments) {
    enqueueSyncOperation(
      {
        entityType: ATTACHMENT_SYNC_ENTITY,
        entityId: attachment.id,
        operation: "delete",
        payload: {
          driveFileId: attachment.driveFileId,
          storageKey: attachment.storageKey,
        } satisfies AttachmentSyncPayload,
      },
      context,
    );
  }
  return attachments;
}

export async function getAvailableTransactionAttachmentUri(
  id: string,
): Promise<string> {
  const attachment = findTransactionAttachmentById(id);
  if (!attachment || attachment.deletedAt) {
    throw new Error("This attachment is no longer available.");
  }
  const localUri = getTransactionAttachmentLocalUri(attachment.storageKey);
  if (isTransactionAttachmentAvailableLocally(attachment)) return localUri;
  if (!attachment.driveFileId) {
    throw new Error("This attachment has not been uploaded and is missing locally.");
  }

  await withGoogleDriveAccessToken((accessToken) =>
    downloadGoogleDriveAttachmentFile(
      accessToken,
      attachment.driveFileId!,
      localUri,
    ),
  );
  const downloaded = new File(localUri);
  const sha256 = await calculateTransactionAttachmentSha256(downloaded);
  if (sha256 !== attachment.sha256) {
    if (downloaded.exists) downloaded.delete();
    throw new Error("The downloaded attachment failed its integrity check.");
  }
  return localUri;
}

let activeSync: Promise<void> | null = null;

export function syncPendingTransactionAttachments(): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = runPendingSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export function triggerTransactionAttachmentSync(): void {
  void syncPendingTransactionAttachments().catch(() => {
    // Offline, signed-out, and configuration failures leave operations queued.
  });
}

export function retryTransactionAttachmentSync(id: string): void {
  const attachment = findTransactionAttachmentById(id);
  if (!attachment || attachment.deletedAt) return;
  retrySyncOperationsForEntity(ATTACHMENT_SYNC_ENTITY, id);
  updateTransactionAttachmentSync(id, {
    syncStatus: "pending",
    lastSyncError: null,
  });
  triggerTransactionAttachmentSync();
}

async function runPendingSync(): Promise<void> {
  const operations = listDueSyncOperations<AttachmentSyncPayload>(
    ATTACHMENT_SYNC_ENTITY,
  );
  if (operations.length === 0) return;

  await withGoogleDriveAccessToken(async (accessToken) => {
    for (const operation of operations) {
      try {
        if (operation.operation === "upload") {
          const attachment = findTransactionAttachmentById(operation.entityId);
          if (!attachment || attachment.deletedAt || attachment.driveFileId) {
            completeSyncOperation(operation.id);
            continue;
          }
          const localUri = getTransactionAttachmentLocalUri(
            attachment.storageKey,
          );
          updateTransactionAttachmentSync(attachment.id, {
            syncStatus: "syncing",
            lastSyncError: null,
          });
          const remote = await uploadGoogleDriveAttachmentFile(accessToken, {
            attachmentId: attachment.id,
            transactionId: attachment.transactionId,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sha256: attachment.sha256,
            localUri,
          });
          updateTransactionAttachmentSync(attachment.id, {
            syncStatus: "synced",
            driveFileId: remote.id,
            lastSyncError: null,
          });
          completeSyncOperation(operation.id);
        } else {
          const attachment = findTransactionAttachmentById(operation.entityId);
          const driveFileId =
            operation.payload.driveFileId ?? attachment?.driveFileId ?? null;
          if (driveFileId) {
            await deleteGoogleDriveAttachmentFile(accessToken, driveFileId);
          }
          const storageKey =
            operation.payload.storageKey ?? attachment?.storageKey;
          if (storageKey) deleteTransactionAttachmentLocalFile(storageKey);
          if (attachment) deleteTransactionAttachmentRecord(attachment.id);
          completeSyncOperation(operation.id);
        }
      } catch (error) {
        const message = getErrorMessage(error);
        const attemptCount = operation.attemptCount + 1;
        failSyncOperation(operation.id, attemptCount, message);
        if (operation.operation === "upload") {
          const attachment = findTransactionAttachmentById(operation.entityId);
          if (attachment && !attachment.deletedAt) {
            updateTransactionAttachmentSync(attachment.id, {
              syncStatus: "failed",
              lastSyncError: message,
            });
          }
        }
      }
    }
  });
}

function resolveAttachmentOwnerTransactionId(
  transactionId: string,
  context: DbContext,
): string {
  const transaction = findTransactionById(transactionId, context);
  if (!transaction) {
    throw new Error(`Transaction with ID ${transactionId} was not found.`);
  }
  if (!transaction.transactionGroupId) return transaction.id;
  const legs = findTransactionsByGroupId(transaction.transactionGroupId, context);
  return (legs.find((leg) => leg.amountCents < 0) ?? legs[0] ?? transaction).id;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Attachment synchronization failed.";
}
