import { randomUUID } from "expo-crypto";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import { hashFileIncrementally } from "@/infrastructure/files/hash-file";
import { withSnapshotDatabase } from "@/infrastructure/database";
import { getNoteBackupAttachments, getNoteBackupAttachmentUri, rebindNoteBackupAttachments } from "@/modules/notes";
import { getTransactionBackupAttachments, getTransactionBackupAttachmentUri, rebindTransactionBackupAttachments } from "@/modules/transactions";
import { BACKUP_CHUNK_BYTES, MAX_PORTABLE_BACKUP_BYTES, hashBackupBytes, packPortableBackup, validateAttachment, yieldBackupWork, type BackupAttachment } from "../utils/portable-backup";
import type { DecryptedBackup } from "../utils/backup-format";

function attachmentUri(entry: BackupAttachment): string {
  validateAttachment(entry);
  return entry.kind === "note" ? getNoteBackupAttachmentUri(entry.storageKey) : getTransactionBackupAttachmentUri(entry.storageKey);
}

async function readFileInto(entry: BackupAttachment, destination: Uint8Array): Promise<void> {
  const file = new File(attachmentUri(entry));
  if (!file.exists || file.size !== entry.sizeBytes) throw new Error("An attachment is missing or changed. Download missing attachments before backing up.");
  const handle = file.open(FileMode.ReadOnly);
  try {
    let offset = 0;
    while (offset < destination.length) {
      const chunk = handle.readBytes(Math.min(BACKUP_CHUNK_BYTES, destination.length - offset));
      if (!chunk.length) throw new Error("An attachment could not be read completely.");
      destination.set(chunk, offset);
      offset += chunk.length;
      await yieldBackupWork();
    }
    if (file.size !== entry.sizeBytes) throw new Error("An attachment changed while backing up.");
  } finally { handle.close(); }
}

export async function createPortableSnapshot(snapshot: Uint8Array): Promise<Uint8Array> {
  if (snapshot.length > MAX_PORTABLE_BACKUP_BYTES) throw new Error("This backup exceeds the supported 32 MiB portable backup size.");
  return withSnapshotDatabase(snapshot, async context => {
    const entries = [...await getNoteBackupAttachments(context), ...await getTransactionBackupAttachments(context)];
    return packPortableBackup(snapshot, entries, readFileInto);
  });
}

/**
 * Copy-on-write restore: install verified files under new UUID keys before
 * publishing the rewritten database. Never replace/delete existing files.
 * Interrupted installs can leave unreferenced files, but cannot break live data.
 */
export async function prepareBackupRestore(backup: DecryptedBackup, assertCurrent?: () => void): Promise<Uint8Array> {
  assertCurrent?.();
  if (backup.attachments === undefined) return backup.database;
  const attachments = backup.attachments;
  return withSnapshotDatabase(backup.database, async (context, database) => {
    const expected = [...await getNoteBackupAttachments(context), ...await getTransactionBackupAttachments(context)];
    const payloads = new Map(attachments.map(entry => [entry.kind + "/" + entry.id, entry]));
    if (expected.length !== attachments.length || payloads.size !== expected.length) throw new Error("The backup attachment manifest does not match its records.");
    for (const entry of expected) {
      const payload = payloads.get(entry.kind + "/" + entry.id);
      if (!payload || payload.storageKey !== entry.storageKey || payload.sizeBytes !== entry.sizeBytes || payload.sha256 !== entry.sha256) throw new Error("The backup attachment manifest does not match its records.");
    }
    const size = attachments.reduce((sum, entry) => sum + entry.sizeBytes, 0);
    if (Paths.availableDiskSpace < size + backup.database.length * 2 + 5 * 1024 * 1024) throw new Error("There is not enough device storage to restore this backup.");
    const staging = new Directory(Paths.cache, "backup-restore-" + randomUUID());
    staging.create({ intermediates: true });
    const noteKeys = new Map<string, string>(), transactionKeys = new Map<string, string>();
    const installed: File[] = [];
    try {
      for (const entry of attachments) {
        assertCurrent?.();
        validateAttachment(entry);
        if (await hashBackupBytes(entry.bytes) !== entry.sha256) throw new Error("An attachment failed its backup checksum.");
        const extension = /\.[a-zA-Z0-9]{1,10}$/.exec(entry.storageKey)?.[0] ?? "";
        const storageKey = randomUUID() + extension;
        const staged = new File(staging, storageKey);
        staged.create();
        const handle = staged.open(FileMode.WriteOnly);
        try {
          for (let offset = 0; offset < entry.bytes.length; offset += BACKUP_CHUNK_BYTES) {
            assertCurrent?.();
            handle.writeBytes(entry.bytes.subarray(offset, offset + BACKUP_CHUNK_BYTES));
            await yieldBackupWork();
          }
        } finally { handle.close(); }
        if (staged.size !== entry.sizeBytes || await hashFileIncrementally(staged) !== entry.sha256) throw new Error("A restored attachment failed verification.");
        const destination = new File(attachmentUri({ ...entry, storageKey }));
        // overwrite:false also protects against UUID collisions and concurrent installs.
        assertCurrent?.();
        await staged.move(destination, { overwrite: false });
        installed.push(destination);
        (entry.kind === "note" ? noteKeys : transactionKeys).set(entry.id, storageKey);
      }
      assertCurrent?.();
      await rebindNoteBackupAttachments(context, noteKeys);
      await rebindTransactionBackupAttachments(context, transactionKeys);
      assertCurrent?.();
      return await database.serializeAsync();
    } catch (error) {
      // Preparation has not published a DB, so these fresh paths have no live
      // references. Clean completed installs when preparation fails normally.
      for (const file of installed) {
        try { if (file.exists) file.delete(); } catch { /* Keep the primary error. */ }
      }
      throw error;
    } finally {
      // Once preparation returns, keep final files even if DB publication fails:
      // either the old or restored DB may remain live. A process interruption
      // before publication can leave harmless, unreferenced UUID files.
      try { if (staging.exists) staging.delete(); } catch { /* Disposable cache. */ }
    }
  });
}

export function legacyAttachmentNotice(backup: DecryptedBackup): string {
  return backup.attachments === undefined
    ? " This older backup contains attachment records only. Missing receipt or document files cannot be recovered from it."
    : "";
}
