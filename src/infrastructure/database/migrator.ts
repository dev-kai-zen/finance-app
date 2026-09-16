import { useEffect, useReducer } from "react";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { AppDatabase, sqliteDatabase } from "./client";

interface MigrationJournalEntry {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface MigrationsConfig {
  journal: {
    entries: MigrationJournalEntry[];
  };
  migrations: Record<string, string>;
}

export interface MigrationState {
  success: boolean;
  error?: Error;
}

/**
 * Executes database migrations safely following SQLite's documented
 * 12-step table reorganization procedure:
 *
 * 1. Checks and disables foreign-key enforcement OUTSIDE any active transaction.
 * 2. Runs the Drizzle migration batch (which opens a transaction).
 * 3. Runs PRAGMA foreign_key_check to verify relational integrity.
 * 4. Re-enables foreign-key enforcement OUTSIDE the transaction in a finally block.
 */
export async function runSafeMigrations(
  database: AppDatabase,
  config: MigrationsConfig,
): Promise<void> {
  const fkRow = sqliteDatabase.getFirstSync<{ foreign_keys: number }>(
    "PRAGMA foreign_keys;",
  );
  const wasFkEnabled = fkRow?.foreign_keys === 1;

  if (wasFkEnabled) {
    sqliteDatabase.execSync("PRAGMA foreign_keys = OFF;");
  }

  try {
    await migrate(database, config);

    if (wasFkEnabled) {
      const violations = sqliteDatabase.getAllSync<{
        table: string;
        rowid: number;
        parent: string;
        fkid: number;
      }>("PRAGMA foreign_key_check;");

      if (violations.length > 0) {
        throw new Error(
          `Foreign key constraint violations detected after migration: ${JSON.stringify(
            violations,
          )}`,
        );
      }
    }
  } catch (err) {
    console.error("[MIGRATIONS] runSafeMigrations caught error:", err);
    throw err;
  } finally {
    if (wasFkEnabled) {
      sqliteDatabase.execSync("PRAGMA foreign_keys = ON;");
    }
  }
}

type MigrationAction =
  | { type: "migrating" }
  | { type: "migrated"; payload: boolean }
  | { type: "error"; payload: Error };

function migrationReducer(
  state: MigrationState,
  action: MigrationAction,
): MigrationState {
  switch (action.type) {
    case "migrating":
      return { success: false, error: undefined };
    case "migrated":
      return { success: action.payload, error: undefined };
    case "error":
      return { success: false, error: action.payload };
    default:
      return state;
  }
}

export function useAppMigrations(
  database: AppDatabase,
  config: MigrationsConfig,
): MigrationState {
  const [state, dispatch] = useReducer(migrationReducer, {
    success: false,
    error: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    dispatch({ type: "migrating" });

    runSafeMigrations(database, config)
      .then(() => {
        if (isMounted) {
          dispatch({ type: "migrated", payload: true });
        }
      })
      .catch((error: unknown) => {
        console.error("[MIGRATIONS] Migration failed:", error);
        if (isMounted) {
          dispatch({
            type: "error",
            payload:
              error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database, config]);

  return state;
}
