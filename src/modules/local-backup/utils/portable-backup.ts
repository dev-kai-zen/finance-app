import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const MAGIC = new TextEncoder().encode("KAIZENF2");
export const MAX_PORTABLE_BACKUP_BYTES = 32 * 1024 * 1024;
export const BACKUP_CHUNK_BYTES = 64 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
export interface BackupAttachment {
  id: string;
  kind: "note" | "transaction";
  storageKey: string;
  sizeBytes: number;
  sha256: string;
}
export interface AttachmentPayload extends BackupAttachment { bytes: Uint8Array }
export const yieldBackupWork = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export function validateAttachment(entry: BackupAttachment): void {
  if (!entry || typeof entry.id !== "string" || entry.id.length === 0 || entry.id.length > 180 || !["note", "transaction"].includes(entry.kind) ||
      typeof entry.storageKey !== "string" || !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,179}$/.test(entry.storageKey) ||
      entry.storageKey.includes("..") || !Number.isSafeInteger(entry.sizeBytes) || entry.sizeBytes < 0 ||
      typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
    throw new Error("The backup contains an invalid attachment.");
  }
}

export async function hashBackupBytes(bytes: Uint8Array): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < bytes.length; offset += BACKUP_CHUNK_BYTES) {
    hash.update(bytes.subarray(offset, offset + BACKUP_CHUNK_BYTES));
    await yieldBackupWork();
  }
  return bytesToHex(hash.digest());
}

export async function copyBackupBytes(target: Uint8Array, source: Uint8Array, offset: number): Promise<void> {
  for (let index = 0; index < source.length; index += BACKUP_CHUNK_BYTES) {
    target.set(source.subarray(index, index + BACKUP_CHUNK_BYTES), offset + index);
    await yieldBackupWork();
  }
}

export function isPortableBackup(bytes: Uint8Array): boolean {
  return MAGIC.every((byte, index) => bytes[index] === byte);
}

export async function packPortableBackup(
  database: Uint8Array,
  attachments: readonly BackupAttachment[],
  readInto: (entry: BackupAttachment, destination: Uint8Array) => Promise<void>,
): Promise<Uint8Array> {
  if (database.length === 0) throw new Error("The backup database is empty.");
  const keys = new Set<string>();
  for (const entry of attachments) {
    validateAttachment(entry);
    const key = entry.kind + "/" + entry.storageKey;
    if (keys.has(key)) throw new Error("The backup contains duplicate attachments.");
    keys.add(key);
  }
  const manifest = new TextEncoder().encode(JSON.stringify({ version: 2, databaseBytes: database.length, attachments }));
  const size = 12 + manifest.length + database.length + attachments.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (manifest.length > MAX_MANIFEST_BYTES) throw new Error("There are too many attachment details for one backup.");
  if (size > MAX_PORTABLE_BACKUP_BYTES) {
    throw new Error("This backup exceeds the supported 32 MiB portable backup size.");
  }
  const output = new Uint8Array(size);
  output.set(MAGIC);
  new DataView(output.buffer).setUint32(8, manifest.length);
  output.set(manifest, 12);
  let offset = 12 + manifest.length;
  await copyBackupBytes(output, database, offset);
  offset += database.length;
  for (const entry of attachments) {
    const destination = output.subarray(offset, offset + entry.sizeBytes);
    await readInto(entry, destination);
    if (await hashBackupBytes(destination) !== entry.sha256) throw new Error("An attachment changed while backing up. Please try again.");
    offset += entry.sizeBytes;
    await yieldBackupWork();
  }
  return output;
}

export async function unpackPortableBackup(payload: Uint8Array): Promise<{ database: Uint8Array; attachments: AttachmentPayload[] }> {
  if (!isPortableBackup(payload) || payload.length < 12 || payload.length > MAX_PORTABLE_BACKUP_BYTES) throw new Error("The portable backup is invalid or too large.");
  const length = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(8);
  if (length > MAX_MANIFEST_BYTES || length === 0 || length + 12 >= payload.length) throw new Error("The attachment manifest is invalid.");
  const manifest = JSON.parse(new TextDecoder().decode(payload.subarray(12, 12 + length)));
  if (!manifest || manifest.version !== 2 || !Array.isArray(manifest.attachments) || !Number.isSafeInteger(manifest.databaseBytes) || manifest.databaseBytes <= 0) throw new Error("The attachment manifest is invalid.");
  let offset = 12 + length + manifest.databaseBytes;
  if (offset > payload.length) throw new Error("The backup database is incomplete.");
  const database = payload.subarray(12 + length, offset);
  const attachments: AttachmentPayload[] = [];
  const keys = new Set<string>();
  for (const entry of manifest.attachments as BackupAttachment[]) {
    validateAttachment(entry);
    const key = entry.kind + "/" + entry.storageKey;
    if (keys.has(key) || entry.sizeBytes > payload.length - offset) throw new Error("The backup contains duplicate or incomplete attachments.");
    keys.add(key);
    const bytes = payload.subarray(offset, offset + entry.sizeBytes);
    if (await hashBackupBytes(bytes) !== entry.sha256) throw new Error("An attachment failed its backup checksum.");
    attachments.push({ ...entry, bytes });
    offset += entry.sizeBytes;
    await yieldBackupWork();
  }
  if (offset !== payload.length) throw new Error("The backup has unexpected attachment data.");
  return { database, attachments };
}
