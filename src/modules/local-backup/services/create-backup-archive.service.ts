import Constants from "expo-constants";
import { createPortableSnapshot } from "./backup-attachments.service";

import { createDatabaseSnapshot } from "@/infrastructure/database";
import { createDatabaseBackup } from "@/modules/local-backup/utils/backup-format";

export interface CreatedBackupArchive {
  attachmentCoverage: "included" | "legacy-records-only";
  bytes: Uint8Array;
  createdAt: Date;
}

export interface CreateBackupArchiveOptions {
  skipAttachments?: boolean;
}

export async function createBackupArchive(
  passphrase: string | null,
  createdAt = new Date(),
  options?: CreateBackupArchiveOptions,
): Promise<CreatedBackupArchive> {
  const snapshot = await createDatabaseSnapshot();
  let payload: Uint8Array = snapshot;
  let attachmentCoverage: "included" | "legacy-records-only" = "legacy-records-only";

  if (!options?.skipAttachments) {
    try {
      payload = await createPortableSnapshot(snapshot);
      attachmentCoverage = "included";
    } catch {
      // If local attachment files are missing or modified (e.g. user upgraded from v1.7.0,
      // or attachments exist in Drive but are not yet cached on this device),
      // safely fall back to a database-only snapshot ("legacy-records-only")
      // so financial records are never blocked from backing up or syncing.
      payload = snapshot;
      attachmentCoverage = "legacy-records-only";
    }
  }

  const bytes = await createDatabaseBackup(
    payload,
    passphrase,
    Constants.expoConfig?.version ?? "unknown",
    createdAt,
  );

  return { bytes, createdAt, attachmentCoverage };
}
