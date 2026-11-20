import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import migrations from "../../../../drizzle/migrations";
import * as schema from "@/infrastructure/database/schema";
import {
  announceDatabaseReplacement,
  db,
  runSafeMigrations,
  setDatabaseReplacing,
  sqliteDatabase,
  withDatabaseSnapshotLock,
} from "@/infrastructure/database";
import {
  cancelDebouncedQuickSync,
  clearQuickSyncRemoteTracking,
} from "@/infrastructure/sync";
import { deleteAllUserData } from "../repositories/reset-data.repository";
import { invalidateExperiencePreferencesCache } from "./experience-preferences.service";

export async function resetAppData(): Promise<void> {
  return withDatabaseSnapshotLock(async () => {
    setDatabaseReplacing(true);
    try {
      const { resetGoogleDriveConnectionForAppReset } =
        require("@/modules/google-drive-backup") as typeof import("@/modules/google-drive-backup");
      await resetGoogleDriveConnectionForAppReset();

      const fkRow = sqliteDatabase.getFirstSync<{ foreign_keys: number }>(
        "PRAGMA foreign_keys;",
      );
      const wasFkEnabled = fkRow?.foreign_keys === 1;

      if (wasFkEnabled) {
        sqliteDatabase.execSync("PRAGMA foreign_keys = OFF;");
      }

      try {
        db.transaction((tx) => {
          deleteAllUserData(tx);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("malformed") || message.includes("corrupt")) {
          await recoverMalformedDatabase();
        } else {
          throw error;
        }
      } finally {
        if (wasFkEnabled) {
          try {
            sqliteDatabase.execSync("PRAGMA foreign_keys = ON;");
          } catch {
            // Best effort foreign key re-enable
          }
        }
      }

      cancelDebouncedQuickSync();
      clearQuickSyncRemoteTracking();
      invalidateExperiencePreferencesCache();
      clearAppManagedFiles();
      setTimeout(() => {
        cancelDebouncedQuickSync();
        clearQuickSyncRemoteTracking();
        announceDatabaseReplacement();
      }, 0);
    } finally {
      setDatabaseReplacing(false);
    }
  });
}

async function recoverMalformedDatabase(): Promise<void> {
  const cleanDb = await SQLite.openDatabaseAsync(":memory:");
  try {
    const cleanDrizzle = drizzle(cleanDb, { schema });
    await runSafeMigrations(cleanDrizzle, migrations, { forceFullCheck: true });
    await SQLite.backupDatabaseAsync({
      sourceDatabase: cleanDb,
      sourceDatabaseName: "main",
      destDatabase: sqliteDatabase,
      destDatabaseName: "main",
    });
    await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
    await sqliteDatabase.execAsync("PRAGMA busy_timeout = 5000;");
    await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
    await sqliteDatabase.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
  } finally {
    await cleanDb.closeAsync();
  }
}

function clearAppManagedFiles(): void {
  const { clearLocalBackupStorage } =
    require("@/modules/local-backup") as typeof import("@/modules/local-backup");
  const { clearNoteAttachmentStorage } =
    require("@/modules/notes") as typeof import("@/modules/notes");
  const { clearTransactionAttachmentStorage } =
    require("@/modules/transactions") as typeof import("@/modules/transactions");

  const cleanups = [
    clearLocalBackupStorage,
    clearNoteAttachmentStorage,
    clearTransactionAttachmentStorage,
  ];

  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      console.warn("[RESET DATA] App-managed file cleanup failed.", error);
    }
  }
}
