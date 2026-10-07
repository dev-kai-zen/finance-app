import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

import type {
  LocalBackupFile,
  LocalBackupKind,
} from "@/modules/local-backup/types/backup.types";
import { inspectDatabaseBackup } from "@/modules/local-backup/utils/backup-format";

const LOCAL_BACKUPS_DIRECTORY = "local-backups";
const BACKUP_FILE_PREFIX = "kaizen-finance";

export function isLocalBackupStorageAvailable(): boolean {
  return process.env.EXPO_OS !== "web";
}

export async function listLocalBackupFiles(): Promise<LocalBackupFile[]> {
  const directory = getLocalBackupsDirectory();
  if (!directory.exists) return [];

  const backups = await Promise.all(
    directory
      .list()
      .filter(
        (entry): entry is File =>
          entry instanceof File && entry.name.toLowerCase().endsWith(".kfb"),
      )
      .map(readLocalBackupMetadata),
  );

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
    const info = inspectDatabaseBackup(await file.bytes());
    return {
      id: file.uri,
      uri: file.uri,
      name: file.name,
      createdAt: info.createdAt,
      size: file.size,
      kind: getBackupKind(file.name),
      passwordProtected: info.passwordProtected,
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
