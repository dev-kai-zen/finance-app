import { deleteLocalBackupFile } from "@/modules/local-backup/repositories/local-backup-files.repository";

export function deleteLocalBackup(uri: string): void {
  deleteLocalBackupFile(uri);
}
