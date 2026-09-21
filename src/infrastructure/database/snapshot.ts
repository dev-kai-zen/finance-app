import * as SQLite from "expo-sqlite";

import migrations from "../../../drizzle/migrations";
import { db, sqliteDatabase } from "./client";
import { runSafeMigrations } from "./migrator";

const REQUIRED_TABLES = [
  "account_types",
  "accounts",
  "categories",
  "credit_card_details",
  "hex_colors",
  "pockets",
  "settings",
  "transactions",
] as const;

export async function createDatabaseSnapshot(): Promise<Uint8Array> {
  await sqliteDatabase.execAsync("PRAGMA wal_checkpoint(PASSIVE);");
  return sqliteDatabase.serializeAsync();
}

export async function replaceDatabaseFromSnapshot(
  snapshot: Uint8Array,
): Promise<void> {
  const replacement = await SQLite.deserializeDatabaseAsync(snapshot);
  const rollbackBytes = await createDatabaseSnapshot();
  let rollback: SQLite.SQLiteDatabase | null = null;

  try {
    validateSnapshot(replacement);

    await SQLite.backupDatabaseAsync({
      sourceDatabase: replacement,
      destDatabase: sqliteDatabase,
    });

    await runSafeMigrations(db, migrations);
    validateSnapshot(sqliteDatabase);
    await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
    await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
  } catch (error) {
    rollback = await SQLite.deserializeDatabaseAsync(rollbackBytes);
    await SQLite.backupDatabaseAsync({
      sourceDatabase: rollback,
      destDatabase: sqliteDatabase,
    });
    await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL;");
    await sqliteDatabase.execAsync("PRAGMA foreign_keys = ON;");
    throw error;
  } finally {
    await replacement.closeAsync();
    await rollback?.closeAsync();
  }
}

function validateSnapshot(database: SQLite.SQLiteDatabase): void {
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
  const missingTables = REQUIRED_TABLES.filter((name) => !tableNames.has(name));

  if (missingTables.length > 0) {
    throw new Error(
      `The backup is not a Kaizen Finance database. Missing: ${missingTables.join(", ")}.`,
    );
  }
}
