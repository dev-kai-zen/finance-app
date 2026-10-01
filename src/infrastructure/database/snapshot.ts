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
] as const;

export async function createDatabaseSnapshot(): Promise<Uint8Array> {
  await sqliteDatabase.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
  return normalizeSerializedDatabaseForMemory(
    await sqliteDatabase.serializeAsync(),
  );
}

export async function replaceDatabaseFromSnapshot(
  snapshot: Uint8Array,
): Promise<void> {
  const replacement = await SQLite.deserializeDatabaseAsync(
    normalizeSerializedDatabaseForMemory(snapshot),
  );
  const rollbackBytes = await createDatabaseSnapshot();
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

    await runSafeMigrations(db, migrations);
    validateSnapshot(sqliteDatabase, CURRENT_REQUIRED_TABLES);
    await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
    await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
  } catch (error) {
    if (replacementStarted) {
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
    }
    throw error;
  } finally {
    await replacement.closeAsync();
    await rollback?.closeAsync();
  }
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
