import { randomUUID } from "expo-crypto";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type {
  TransactionAttachment,
  TransactionAttachmentDraft,
} from "../types/transaction.types";
import type { NewTransactionAttachmentRecord } from "../repositories/transaction-attachments.repository";

const ATTACHMENTS_DIRECTORY_NAME = "transaction-attachments";
const DISK_SPACE_RESERVE_BYTES = 5 * 1024 * 1024;
const HASH_CHUNK_BYTES = 1024 * 1024;

export interface PreparedTransactionAttachment {
  record: Omit<NewTransactionAttachmentRecord, "transactionId">;
  localUri: string;
}

export async function prepareTransactionAttachments(
  drafts: readonly TransactionAttachmentDraft[],
): Promise<PreparedTransactionAttachment[]> {
  if (drafts.length === 0) return [];
  const directory = getAttachmentsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const prepared: PreparedTransactionAttachment[] = [];

  try {
    for (const draft of drafts) {
      const source = new File(draft.uri);
      if (!source.exists) {
        throw new Error(`The selected file is no longer available: ${draft.name}`);
      }
      const sizeBytes = source.size;
      if (sizeBytes > Math.max(0, Paths.availableDiskSpace - DISK_SPACE_RESERVE_BYTES)) {
        throw new Error(`There is not enough device storage for ${draft.name}.`);
      }

      const id = randomUUID();
      const storageKey = `${id}${resolveExtension(draft.name, draft.mimeType)}`;
      const destination = new File(directory, storageKey);
      await source.copy(destination, { overwrite: false });
      const createdAt = new Date();
      prepared.push({
        localUri: destination.uri,
        record: {
          id,
          originalName: normalizeFileName(draft.name),
          storageKey,
          mimeType: draft.mimeType || "application/octet-stream",
          sizeBytes,
          sha256: await calculateTransactionAttachmentSha256(destination),
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
    return prepared;
  } catch (error) {
    await discardPreparedTransactionAttachments(prepared);
    throw error;
  }
}

export async function discardPreparedTransactionAttachments(
  prepared: readonly PreparedTransactionAttachment[],
): Promise<void> {
  for (const attachment of prepared) {
    deleteAttachmentFileByUri(attachment.localUri);
  }
}

export function getTransactionAttachmentLocalUri(storageKey: string): string {
  const directory = getAttachmentsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  return new File(directory, storageKey).uri;
}

export function isTransactionAttachmentAvailableLocally(
  attachment: Pick<TransactionAttachment, "storageKey">,
): boolean {
  return new File(getAttachmentsDirectory(), attachment.storageKey).exists;
}

export function deleteTransactionAttachmentLocalFile(storageKey: string): void {
  deleteAttachmentFileByUri(getTransactionAttachmentLocalUri(storageKey));
}

function getAttachmentsDirectory(): Directory {
  return new Directory(Paths.document, ATTACHMENTS_DIRECTORY_NAME);
}

function deleteAttachmentFileByUri(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function calculateTransactionAttachmentSha256(
  file: File,
): Promise<string> {
  const handle = file.open(FileMode.ReadOnly);
  const hasher = sha256.create();
  try {
    while ((handle.offset ?? 0) < (handle.size ?? file.size)) {
      const remaining = (handle.size ?? file.size) - (handle.offset ?? 0);
      const chunk = handle.readBytes(Math.min(HASH_CHUNK_BYTES, remaining));
      if (chunk.byteLength === 0) break;
      hasher.update(chunk);
    }
    return bytesToHex(hasher.digest());
  } finally {
    handle.close();
  }
}

function normalizeFileName(value: string): string {
  const normalized = value.replace(/[\\/\u0000-\u001f]/g, "_").trim();
  return (normalized || "attachment").slice(0, 220);
}

function resolveExtension(name: string, mimeType: string): string {
  const match = name.match(/\.[a-z0-9]{1,10}$/i);
  if (match) return match[0].toLowerCase();
  const known: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
  };
  return known[mimeType] ?? "";
}
