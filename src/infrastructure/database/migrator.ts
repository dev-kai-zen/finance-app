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
    ensureKaiKnowledgeTables();

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

function ensureKaiKnowledgeTables(): void {
  try {
    sqliteDatabase.execSync(`
      CREATE TABLE IF NOT EXISTS category_keywords (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        language TEXT DEFAULT 'any',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS category_keywords_keyword_unique ON category_keywords (lower(keyword));
      CREATE INDEX IF NOT EXISTS category_keywords_category_id_index ON category_keywords (category_id);

      CREATE TABLE IF NOT EXISTS account_keywords (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        language TEXT DEFAULT 'any',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS account_keywords_keyword_unique ON account_keywords (lower(keyword));
      CREATE INDEX IF NOT EXISTS account_keywords_account_id_index ON account_keywords (account_id);

      CREATE TABLE IF NOT EXISTS action_keywords (
        id TEXT PRIMARY KEY NOT NULL,
        action_type TEXT NOT NULL,
        keyword TEXT NOT NULL,
        language TEXT DEFAULT 'any',
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS action_keywords_keyword_unique ON action_keywords (lower(keyword));
      CREATE INDEX IF NOT EXISTS action_keywords_action_type_index ON action_keywords (action_type);
    `);

    // Safely verify if account_keywords already has language column
    const tableInfo = sqliteDatabase.getAllSync<{ name: string }>(
      "PRAGMA table_info(account_keywords);",
    );
    const hasLanguage = tableInfo.some((col) => col.name === "language");
    if (!hasLanguage) {
      sqliteDatabase.execSync("ALTER TABLE account_keywords ADD COLUMN language TEXT DEFAULT 'any';");
    }
  } catch (err) {
    console.warn("[MIGRATIONS] ensureKaiKnowledgeTables caught warning:", err);
  }
}

