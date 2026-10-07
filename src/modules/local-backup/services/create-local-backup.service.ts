import type {
  LocalBackupFile,
  LocalBackupKind,
} from "@/modules/local-backup/types/backup.types";
import { saveLocalBackupFile } from "@/modules/local-backup/repositories/local-backup-files.repository";
import { createBackupArchive } from "./create-backup-archive.service";

export async function createLocalBackup(
  passphrase: string | null,
  kind: LocalBackupKind = "manual",
): Promise<LocalBackupFile> {
  const archive = await createBackupArchive(passphrase);
  return saveLocalBackupFile(archive.bytes, archive.createdAt, kind);
}
