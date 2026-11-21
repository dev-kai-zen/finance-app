import { yieldBackupWork } from "../utils/portable-backup";
import { randomUUID } from "expo-crypto";
import { Directory, File, FileMode, Paths } from "expo-file-system";

import type {
  LocalBackupFile,
  LocalBackupKind,
} from "@/modules/local-backup/types/backup.types";
import { inspectDatabaseBackup, inspectDatabaseBackupHeader } from "@/modules/local-backup/utils/backup-format";

const LOCAL_BACKUPS_DIRECTORY = "local-backups";
const BACKUP_FILE_PREFIX = "kaizen-finance";

export function isLocalBackupStorageAvailable(): boolean {
  return process.env.EXPO_OS !== "web";
}

export async function listLocalBackupFiles(): Promise<LocalBackupFile[]> {
  const directory = getLocalBackupsDirectory();
  if (!directory.exists) return [];

  const files = directory.list().filter(
    (entry): entry is File => entry instanceof File && entry.name.toLowerCase().endsWith(".kfb"),
  );
  const backups: LocalBackupFile[] = [];
  for (let index = 0; index < files.length; index++) {
    backups.push(await readLocalBackupMetadata(files[index]));
    if (index % 8 === 7) await yieldBackupWork();
  }

  return backups.sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

export async function saveLocalBackupFile(
  bytes: Uint8Array,
  createdAt: Date,
  kind: LocalBackupKind,
): Promise<LocalBackupFile> {
  assertLocalBackupStorageAvailable();
  const directory = getLocalBackupsDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const info = inspectDatabaseBackup(bytes);
  const name = createBackupFileName(kind, createdAt);
  const destination = new File(directory, name);
  const temporary = new File(Paths.cache, `${name}.${randomUUID()}.tmp`);

  try {
    temporary.create({ intermediates: true, overwrite: true });
    temporary.write(bytes);
    await temporary.move(destination);
  } catch (error) {
    if (temporary.exists) temporary.delete();
    throw error;
  }

  return {
    id: destination.uri,
    uri: destination.uri,
    name,
    createdAt,
    size: destination.size,
    kind,
    passwordProtected: info.passwordProtected,
    attachmentCoverage: info.attachmentCoverage,
    valid: true,
  };
}

export async function readLocalBackupFile(uri: string): Promise<Uint8Array> {
  assertLocalBackupStorageAvailable();
  const file = new File(uri);
  if (!file.exists) throw new Error("That backup file is no longer available.");
  return file.bytes();
}

export function deleteLocalBackupFile(uri: string): void {
  assertLocalBackupStorageAvailable();
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function deleteAllLocalBackupFiles(): void {
  if (!isLocalBackupStorageAvailable()) return;
  const directory = getLocalBackupsDirectory();
  if (directory.exists) directory.delete();
}

export async function pruneAutomaticLocalBackups(
  retainCount: number,
): Promise<void> {
  const automaticBackups = (await listLocalBackupFiles()).filter(
    ({ kind }) => kind === "automatic",
  );

  automaticBackups.slice(Math.max(0, retainCount)).forEach(({ uri }) => {
    deleteLocalBackupFile(uri);
  });
}

function getLocalBackupsDirectory(): Directory {
  assertLocalBackupStorageAvailable();
  return new Directory(Paths.document, LOCAL_BACKUPS_DIRECTORY);
}

async function readLocalBackupMetadata(file: File): Promise<LocalBackupFile> {
  try {
    const info = readLocalBackupInfo(file.uri);
    return {
      id: file.uri,
      uri: file.uri,
      name: file.name,
      createdAt: info.createdAt,
      size: file.size,
      kind: getBackupKind(file.name),
      passwordProtected: info.passwordProtected,
      attachmentCoverage: info.attachmentCoverage,
      valid: true,
    };
  } catch {
    return {
      id: file.uri,
      uri: file.uri,
      name: file.name,
      createdAt: new Date(file.lastModified ?? file.creationTime ?? 0),
      size: file.size,
      kind: getBackupKind(file.name),
      passwordProtected: null,
      valid: false,
    };
  }
}

function createBackupFileName(kind: LocalBackupKind, createdAt: Date): string {
  const timestamp = createdAt.toISOString().replaceAll(":", "-");
  const suffix = randomUUID().slice(0, 8);
  return `${BACKUP_FILE_PREFIX}-${kind}-${timestamp}-${suffix}.kfb`;
}

function getBackupKind(name: string): LocalBackupKind {
  if (name.startsWith(`${BACKUP_FILE_PREFIX}-automatic-`)) return "automatic";
  if (name.startsWith(`${BACKUP_FILE_PREFIX}-safety-`)) return "safety";
  return "manual";
}

function assertLocalBackupStorageAvailable(): void {
  if (!isLocalBackupStorageAvailable()) {
    throw new Error("Local backups are available in the iOS and Android apps.");
  }
}

export function readLocalBackupInfo(uri: string) {
  const file = new File(uri);
  const handle = file.open(FileMode.ReadOnly);
  try {
    const prefix = handle.readBytes(12);
    if (prefix.length !== 12) throw new Error("The backup header is incomplete.");
    const length = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength).getUint32(8);
    if (length === 0 || length > 64 * 1024) throw new Error("The backup header is invalid.");
    const header = handle.readBytes(length);
    if (header.length !== length) throw new Error("The backup header is incomplete.");
    const bytes = new Uint8Array(12 + length);
    bytes.set(prefix); bytes.set(header, 12);
    return inspectDatabaseBackupHeader(bytes, file.size);
  } finally { handle.close(); }
}
