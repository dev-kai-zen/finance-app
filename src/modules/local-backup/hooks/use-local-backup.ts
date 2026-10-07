import { useCallback, useEffect, useState } from "react";

import {
  getAutomaticBackupConfig,
} from "@/modules/local-backup/repositories/local-backup-settings.repository";
import { listLocalBackupFiles } from "@/modules/local-backup/repositories/local-backup-files.repository";
import { configureAutomaticLocalBackup } from "@/modules/local-backup/services/configure-automatic-local-backup.service";
import { createLocalBackup } from "@/modules/local-backup/services/create-local-backup.service";
import { deleteLocalBackup } from "@/modules/local-backup/services/delete-local-backup.service";
import { pickLocalBackupForRestore } from "@/modules/local-backup/services/pick-local-backup.service";
import {
  consumeLocalRestoreNotice,
  restoreLocalBackup,
} from "@/modules/local-backup/services/restore-local-backup.service";
import { shareLocalBackup } from "@/modules/local-backup/services/share-local-backup.service";
import type {
  AutomaticBackupConfig,
  BackupNotice,
  LocalBackupFile,
  LocalBackupOperation,
  LocalRestoreCandidate,
} from "@/modules/local-backup/types/backup.types";

export function useLocalBackup() {
  const [backups, setBackups] = useState<LocalBackupFile[]>([]);
  const [config, setConfig] = useState<AutomaticBackupConfig>(() =>
    getAutomaticBackupConfig(),
  );
  const [operation, setOperation] =
    useState<LocalBackupOperation>("loading");
  const [notice, setNotice] = useState<BackupNotice | null>(() => {
    const message = consumeLocalRestoreNotice();
    return message ? { variant: "success", message } : null;
  });

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setBackups(await listLocalBackupFiles());
      setConfig(getAutomaticBackupConfig());
    } catch (error) {
      setNotice({ variant: "error", message: getErrorMessage(error) });
    } finally {
      setOperation("idle");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBackup = useCallback(
    async (passphrase: string | null): Promise<boolean> => {
      setOperation("creating");
      setNotice(null);
      try {
        const created = await createLocalBackup(passphrase);
        await refresh();
        setNotice({
          variant: "success",
          message: `${passphrase ? "Password-protected" : "Unprotected"} backup saved in this app (${formatFileSize(created.size)}). Export a copy if you want it to survive an uninstall.`,
        });
        return true;
      } catch (error) {
        setNotice({ variant: "error", message: getErrorMessage(error) });
        return false;
      } finally {
        setOperation("idle");
      }
    },
    [refresh],
  );

  const pickBackup = useCallback(async (): Promise<LocalRestoreCandidate | null> => {
    setOperation("importing");
    setNotice(null);
    try {
      return await pickLocalBackupForRestore();
    } catch (error) {
      setNotice({ variant: "error", message: getErrorMessage(error) });
      return null;
    } finally {
      setOperation("idle");
    }
  }, []);

  const restoreBackup = useCallback(
    async (
      candidate: LocalRestoreCandidate,
      passphrase: string | null,
    ): Promise<boolean> => {
      setOperation("restoring");
      setNotice(null);
      try {
        await restoreLocalBackup(candidate.uri, passphrase);
        return true;
      } catch (error) {
        setNotice({ variant: "error", message: getErrorMessage(error) });
        return false;
      } finally {
        setOperation("idle");
      }
    },
    [],
  );

  const exportBackup = useCallback(async (file: LocalBackupFile): Promise<void> => {
    setOperation("exporting");
    setNotice(null);
    try {
      await shareLocalBackup(file.uri, file.name);
    } catch (error) {
      setNotice({ variant: "error", message: getErrorMessage(error) });
    } finally {
      setOperation("idle");
    }
  }, []);

  const removeBackup = useCallback(
    async (file: LocalBackupFile): Promise<boolean> => {
      setOperation("deleting");
      setNotice(null);
      try {
        deleteLocalBackup(file.uri);
        await refresh();
        return true;
      } catch (error) {
        setNotice({ variant: "error", message: getErrorMessage(error) });
        return false;
      } finally {
        setOperation("idle");
      }
    },
    [refresh],
  );

  const updateAutomaticConfig = useCallback(
    async (nextConfig: AutomaticBackupConfig): Promise<void> => {
      setOperation("configuring");
      setNotice(null);
      try {
        await configureAutomaticLocalBackup(nextConfig);
        setConfig(nextConfig);
        await refresh();
        setNotice({
          variant: "success",
          message: nextConfig.enabled
            ? `Automatic ${nextConfig.frequency} backups are enabled. They run when the app becomes active and a backup is due.`
            : "Automatic backups are off.",
        });
      } catch (error) {
        setNotice({ variant: "error", message: getErrorMessage(error) });
      } finally {
        setOperation("idle");
      }
    },
    [refresh],
  );

  return {
    backups,
    config,
    notice,
    operation,
    clearNotice: () => setNotice(null),
    createBackup,
    exportBackup,
    pickBackup,
    refresh,
    removeBackup,
    restoreBackup,
    updateAutomaticConfig,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The local backup operation failed.";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
