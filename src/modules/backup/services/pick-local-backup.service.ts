import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import type { LocalRestoreCandidate } from "@/modules/backup/types/backup.types";
import { inspectDatabaseBackup } from "@/modules/backup/utils/backup-format";

export async function pickLocalBackupForRestore(): Promise<LocalRestoreCandidate | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const file = new File(asset.uri);
  const info = inspectDatabaseBackup(await file.bytes());
  return {
    name: asset.name,
    uri: asset.uri,
    createdAt: info.createdAt,
    passwordProtected: info.passwordProtected,
  };
}
