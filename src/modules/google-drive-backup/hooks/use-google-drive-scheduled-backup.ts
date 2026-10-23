import { useCallback, useState } from "react";

import { configureGoogleDriveScheduledBackup } from "@/modules/google-drive-backup/services/configure-google-drive-scheduled-backup.service";
import {
  getGoogleDriveScheduledBackupConfig,
  getGoogleDriveScheduledBackupLastRunAt,
} from "@/modules/google-drive-backup/repositories/google-drive-scheduled-backup-settings.repository";
import type {
  GoogleDriveScheduledBackupConfig,
  GoogleDriveScheduledBackupOperation,
} from "@/modules/google-drive-backup/types/google-drive-backup.types";

export function useGoogleDriveScheduledBackup() {
  const [config, setConfig] = useState<GoogleDriveScheduledBackupConfig>(() =>
    getGoogleDriveScheduledBackupConfig(),
  );
  const [lastRunAt, setLastRunAt] = useState<Date | null>(() =>
    getGoogleDriveScheduledBackupLastRunAt(),
  );
  const [operation, setOperation] =
    useState<GoogleDriveScheduledBackupOperation>("idle");

  const refresh = useCallback(() => {
    setConfig(getGoogleDriveScheduledBackupConfig());
    setLastRunAt(getGoogleDriveScheduledBackupLastRunAt());
  }, []);

  const updateConfig = useCallback(
    async (nextConfig: GoogleDriveScheduledBackupConfig): Promise<void> => {
      setOperation("configuring");
      try {
        await configureGoogleDriveScheduledBackup(nextConfig);
        setConfig(nextConfig);
        setLastRunAt(getGoogleDriveScheduledBackupLastRunAt());
      } finally {
        setOperation("idle");
      }
    },
    [],
  );

  return {
    config,
    lastRunAt,
    operation,
    refresh,
    updateConfig,
  };
}
