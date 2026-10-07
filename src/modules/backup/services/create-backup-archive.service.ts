import Constants from "expo-constants";

import { createDatabaseSnapshot } from "@/infrastructure/database";
import { createDatabaseBackup } from "@/modules/backup/utils/backup-format";

export interface CreatedBackupArchive {
  bytes: Uint8Array;
  createdAt: Date;
}

export async function createBackupArchive(
  passphrase: string | null,
  createdAt = new Date(),
): Promise<CreatedBackupArchive> {
  const snapshot = await createDatabaseSnapshot();
  const bytes = await createDatabaseBackup(
    snapshot,
    passphrase,
    Constants.expoConfig?.version ?? "unknown",
    createdAt,
  );

  return { bytes, createdAt };
}
