import NetInfo from "@react-native-community/netinfo";

import { isScheduledBackupDue } from "@/utils/backup-schedule";
import { getCurrentProStatus } from "@/modules/pro";
import {
  getGoogleDriveScheduledBackupConfig,
  getGoogleDriveScheduledBackupLastRunAt,
  saveGoogleDriveScheduledBackupLastRunAt,
} from "../repositories/google-drive-scheduled-backup-settings.repository";
import { createGoogleDriveBackup } from "./create-google-drive-backup.service";
import { restoreGoogleDriveSession } from "./google-drive-auth.service";

let activeScheduledBackup: Promise<boolean> | null = null;

export function runGoogleDriveScheduledBackupIfDue(): Promise<boolean> {
  if (activeScheduledBackup) return activeScheduledBackup;

  activeScheduledBackup = performScheduledBackup().finally(() => {
    activeScheduledBackup = null;
  });
  return activeScheduledBackup;
}

async function performScheduledBackup(): Promise<boolean> {
  const isPro = getCurrentProStatus().isPro;
  if (!isPro) return false;

  const config = getGoogleDriveScheduledBackupConfig();
  if (!config.enabled) return false;

  const lastRunAt = getGoogleDriveScheduledBackupLastRunAt();
  if (!isScheduledBackupDue(lastRunAt, config)) {
    return false;
  }

  const user = await restoreGoogleDriveSession().catch(() => null);
  if (!user) return false;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return false;
  }

  await createGoogleDriveBackup(null);
  saveGoogleDriveScheduledBackupLastRunAt(new Date());
  return true;
}
