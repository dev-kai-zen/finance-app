import { randomUUID } from "expo-crypto";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import {
  NOTES_ATTACHMENTS_FOLDER_NAME,
  NOTES_ROOT_FOLDER_NAME,
} from "../constants/notes.constants";
import type {
  NoteAttachment,
  NoteAttachmentDraft,
} from "../types/note.types";
import type { NewNoteAttachmentRecord } from "../repositories/note-attachments.repository";

const DISK_SPACE_RESERVE_BYTES = 5 * 1024 * 1024; // 5 MB reserve
const HASH_CHUNK_BYTES = 1024 * 1024; // 1 MB chunk

export interface PreparedNoteAttachment {
  record: Omit<NewNoteAttachmentRecord, "noteId">;
  localUri: string;
}

export function getNotesAttachmentsDirectory(): Directory {
  return new Directory(
    Paths.document,
    NOTES_ROOT_FOLDER_NAME,
    NOTES_ATTACHMENTS_FOLDER_NAME,
  );
}

export async function prepareNoteAttachments(
  drafts: readonly NoteAttachmentDraft[],
): Promise<PreparedNoteAttachment[]> {
  if (drafts.length === 0) return [];
  const directory = getNotesAttachmentsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const prepared: PreparedNoteAttachment[] = [];

  try {
    for (const draft of drafts) {
      const source = new File(draft.uri);
      if (!source.exists) {
        throw new Error(`The selected image is no longer available: ${draft.name}`);
      }
      const sizeBytes = source.size;
      if (
        sizeBytes > Math.max(0, Paths.availableDiskSpace - DISK_SPACE_RESERVE_BYTES)
      ) {
        throw new Error(
          `There is not enough device storage to attach ${draft.name}.`,
        );
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
          mimeType: draft.mimeType || "image/jpeg",
          sizeBytes,
          sha256: await calculateNoteAttachmentSha256(destination),
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
    return prepared;
  } catch (error) {
    await discardPreparedNoteAttachments(prepared);
    throw error;
  }
}

export async function discardPreparedNoteAttachments(
  prepared: readonly PreparedNoteAttachment[],
): Promise<void> {
  for (const attachment of prepared) {
    deleteAttachmentFileByUri(attachment.localUri);
  }
}

export function getNoteAttachmentLocalUri(storageKey: string): string {
  const directory = getNotesAttachmentsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  return new File(directory, storageKey).uri;
}

export function isNoteAttachmentAvailableLocally(
  attachment: Pick<NoteAttachment, "storageKey">,
): boolean {
  return new File(getNotesAttachmentsDirectory(), attachment.storageKey).exists;
}

export function deleteNoteAttachmentLocalFile(storageKey: string): void {
  deleteAttachmentFileByUri(getNoteAttachmentLocalUri(storageKey));
}

export function clearNoteAttachmentStorage(): void {
  if (process.env.EXPO_OS === "web") return;
  const directory = getNotesAttachmentsDirectory();
  if (directory.exists) directory.delete();
}

function deleteAttachmentFileByUri(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function calculateNoteAttachmentSha256(file: File): Promise<string> {
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
  return (normalized || "photo").slice(0, 220);
}

function resolveExtension(name: string, mimeType: string): string {
  const match = name.match(/\.[a-z0-9]{1,10}$/i);
  if (match) return match[0].toLowerCase();
  const known: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return known[mimeType] ?? ".jpg";
}
