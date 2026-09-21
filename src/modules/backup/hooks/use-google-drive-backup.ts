import { useCallback, useEffect, useState } from "react";

import type {
  BackupFile,
  BackupNotice,
  BackupOperation,
  GoogleDriveUser,
} from "@/modules/backup/types/backup.types";
import { createGoogleDriveBackup } from "@/modules/backup/services/create-google-drive-backup.service";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getGoogleDriveConfigurationError,
  restoreGoogleDriveSession,
} from "@/modules/backup/services/google-drive-auth.service";
import { listGoogleDriveBackups } from "@/modules/backup/services/list-google-drive-backups.service";
import {
  consumeRestoreNotice,
  restoreGoogleDriveBackup,
} from "@/modules/backup/services/restore-google-drive-backup.service";

export function useGoogleDriveBackup() {
  const [user, setUser] = useState<GoogleDriveUser | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [operation, setOperation] = useState<BackupOperation>("loading");
  const [notice, setNotice] = useState<BackupNotice | null>(() => {
    const message = consumeRestoreNotice();
    return message ? { variant: "success", message } : null;
  });
  const configurationError = getGoogleDriveConfigurationError();

  const run = useCallback(
    async <T,>(
      nextOperation: BackupOperation,
      operationFn: () => Promise<T>,
    ): Promise<T | null> => {
      setOperation(nextOperation);
      setNotice(null);
      try {
        return await operationFn();
      } catch (error) {
        setNotice({ variant: "error", message: getErrorMessage(error) });
        return null;
      } finally {
        setOperation("idle");
      }
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const result = await run("loading", listGoogleDriveBackups);
    if (result) setBackups(result);
  }, [run]);

  useEffect(() => {
    let active = true;

    if (configurationError) {
      setOperation("idle");
      return () => {
        active = false;
      };
    }

    restoreGoogleDriveSession()
      .then(async (restoredUser) => {
        if (!active) return;
        setUser(restoredUser);
        if (restoredUser) {
          const files = await listGoogleDriveBackups();
          if (active) setBackups(files);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({ variant: "error", message: getErrorMessage(error) });
        }
      })
      .finally(() => {
        if (active) setOperation("idle");
      });

    return () => {
      active = false;
    };
  }, [configurationError]);

  const connect = useCallback(async (): Promise<void> => {
    const connectedUser = await run("connecting", connectGoogleDrive);
    if (!connectedUser) return;
    setUser(connectedUser);

    const files = await run("loading", listGoogleDriveBackups);
    if (files) setBackups(files);
  }, [run]);

  const disconnect = useCallback(async (): Promise<void> => {
    const completed = await run("disconnecting", async () => {
      await disconnectGoogleDrive();
      return true;
    });
    if (!completed) return;
    setUser(null);
    setBackups([]);
  }, [run]);

  const createBackup = useCallback(
    async (passphrase: string): Promise<boolean> => {
      const backup = await run("creating", () =>
        createGoogleDriveBackup(passphrase),
      );
      if (!backup) return false;
      setBackups((current) => [
        backup,
        ...current.filter(({ id }) => id !== backup.id),
      ]);
      setNotice({
        variant: "success",
        message: "Encrypted backup saved to Google Drive.",
      });
      return true;
    },
    [run],
  );

  const restoreBackup = useCallback(
    async (fileId: string, passphrase: string): Promise<boolean> => {
      const completed = await run("restoring", async () => {
        await restoreGoogleDriveBackup(fileId, passphrase);
        return true;
      });
      return completed === true;
    },
    [run],
  );

  return {
    backups,
    configurationError,
    notice,
    operation,
    user,
    clearNotice: () => setNotice(null),
    connect,
    createBackup,
    disconnect,
    refresh,
    restoreBackup,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The Google Drive backup operation failed.";
}
