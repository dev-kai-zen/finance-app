import * as SQLite from "expo-sqlite";

import migrations from "../../../drizzle/migrations";
import { db, sqliteDatabase } from "./client";
import { runSafeMigrations } from "./migrator";

const LEGACY_REQUIRED_TABLES = [
  "account_types",
  "accounts",
  "categories",
  "credit_card_details",
  "hex_colors",
  "pockets",
  "settings",
  "transactions",
] as const;

const CURRENT_REQUIRED_TABLES = [
  ...LEGACY_REQUIRED_TABLES,
  "fund_groups",
  "fund_group_accounts",
  "fund_group_pockets",
  "transaction_presets",
  "transaction_schedules",
  "transaction_schedule_occurrences",
  "transaction_schedule_postings",
  "transaction_attachments",
  "sync_operations",
] as const;

let snapshotLock = Promise.resolve();
let isReplacing = false;

export function isDatabaseReplacing(): boolean {
  return isReplacing;
}

export function setDatabaseReplacing(replacing: boolean): void {
  isReplacing = replacing;
}

export async function withDatabaseSnapshotLock<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const previous = snapshotLock;
  let release: () => void = () => {};
  snapshotLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await previous;
    return await fn();
  } finally {
    release();
  }
}

async function executeWalCheckpoint(
  mode: "TRUNCATE" | "PASSIVE" = "TRUNCATE",
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sqliteDatabase.execAsync(`PRAGMA wal_checkpoint(${mode});`);
      return;
    } catch (error) {
      if (attempt === 2) {
        if (mode === "TRUNCATE") {
          try {
            await sqliteDatabase.execAsync("PRAGMA wal_checkpoint(PASSIVE);");
            return;
          } catch {
            // Fall through and throw original error
          }
        }
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 50 * Math.pow(2, attempt)),
      );
    }
  }
}

export async function createDatabaseSnapshot(): Promise<Uint8Array> {
  return withDatabaseSnapshotLock(async () => {
    await executeWalCheckpoint("TRUNCATE");
    return normalizeSerializedDatabaseForMemory(
      await sqliteDatabase.serializeAsync(),
    );
  });
}

export async function replaceDatabaseFromSnapshot(
  snapshot: Uint8Array,
): Promise<void> {
  return withDatabaseSnapshotLock(async () => {
    isReplacing = true;
    const replacement = await SQLite.deserializeDatabaseAsync(
      normalizeSerializedDatabaseForMemory(snapshot),
    );
    let rollbackBytes: Uint8Array | null = null;
    try {
      await executeWalCheckpoint("TRUNCATE");
      rollbackBytes = normalizeSerializedDatabaseForMemory(
        await sqliteDatabase.serializeAsync(),
      );
    } catch {
      // Best-effort rollback bytes capture
    }
    let rollback: SQLite.SQLiteDatabase | null = null;
    let replacementStarted = false;

    try {
      validateSnapshot(replacement, LEGACY_REQUIRED_TABLES);

      replacementStarted = true;
      await SQLite.backupDatabaseAsync({
        sourceDatabase: replacement,
        sourceDatabaseName: "main",
        destDatabase: sqliteDatabase,
        destDatabaseName: "main",
      });

      await runSafeMigrations(db, migrations, { forceFullCheck: true });
      validateSnapshot(sqliteDatabase, CURRENT_REQUIRED_TABLES);
      await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
      await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
      await executeWalCheckpoint("TRUNCATE");
    } catch (error) {
      if (replacementStarted && rollbackBytes) {
        try {
          rollback = await SQLite.deserializeDatabaseAsync(
            normalizeSerializedDatabaseForMemory(rollbackBytes),
          );
          await SQLite.backupDatabaseAsync({
            sourceDatabase: rollback,
            sourceDatabaseName: "main",
            destDatabase: sqliteDatabase,
            destDatabaseName: "main",
          });
          await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
          await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
          await executeWalCheckpoint("TRUNCATE");
        } catch {
          // Keep primary error on failed rollback
        }
      }
      throw error;
    } finally {
      isReplacing = false;
      await replacement.closeAsync();
      if (rollback) {
        await (rollback as SQLite.SQLiteDatabase).closeAsync();
      }
    }
  });
}

function normalizeSerializedDatabaseForMemory(
  snapshot: Uint8Array,
): Uint8Array {
  const sqliteHeader = "SQLite format 3\u0000";
  if (
    snapshot.byteLength < 100 ||
    new TextDecoder().decode(snapshot.slice(0, sqliteHeader.length)) !==
      sqliteHeader
  ) {
    throw new Error("The backup does not contain a valid SQLite database.");
  }

  const normalized = new Uint8Array(snapshot);
  // sqlite3_deserialize cannot access a WAL-mode image because an in-memory
  // database cannot open the corresponding -wal/-shm sidecars. A checkpoint
  // has already merged all pages, so mark the image as rollback-journal mode.
  normalized[18] = 1;
  normalized[19] = 1;
  return normalized;
}

function validateSnapshot(
  database: SQLite.SQLiteDatabase,
  requiredTables: readonly string[],
): void {
  const integrity = database.getFirstSync<{ integrity_check: string }>(
    "PRAGMA integrity_check;",
  );

  if (integrity?.integrity_check !== "ok") {
    throw new Error("The backup database failed its integrity check.");
  }

  const tableRows = database.getAllSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table';",
  );
  const tableNames = new Set(tableRows.map(({ name }) => name));
  const missingTables = requiredTables.filter((name) => !tableNames.has(name));

  if (missingTables.length > 0) {
    throw new Error(
      `The backup is not a Kaizen Finance database. Missing: ${missingTables.join(", ")}.`,
    );
  }
}
