import { deleteAllLocalBackupFiles } from "../repositories/local-backup-files.repository";

export function clearLocalBackupStorage(): void {
  deleteAllLocalBackupFiles();
}
