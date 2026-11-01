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
    ensureFundGroupsSchema();
    await migrate(database, config);
    ensureKaiKnowledgeTables();
    ensureFundGroupsSchema();
    ensureDefaultHexColors();

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

function ensureFundGroupsSchema(): void {
  try {
    const tableInfo = sqliteDatabase.getAllSync<{ name: string }>(
      "PRAGMA table_info(fund_groups);",
    );
    const hasMemberKind = tableInfo.some((col) => col.name === "member_kind");
    if (!hasMemberKind) return;

    // 1. Drop any old indexes that could reference member_kind
    sqliteDatabase.execSync(`
      DROP INDEX IF EXISTS fund_groups_member_kind_idx;
      DROP INDEX IF EXISTS fund_groups_sort_index;
      DROP INDEX IF EXISTS fund_groups_name_normalized_unique;
    `);

    // 2. Create replacement table matching Drizzle's canonical schema
    sqliteDatabase.execSync(`
      DROP TABLE IF EXISTS fund_groups_new;
      CREATE TABLE fund_groups_new (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        name_normalized TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CONSTRAINT fund_groups_sort_order_check CHECK (sort_order >= 0)
      );
    `);

    // 3. Migrate user data without member_kind
    sqliteDatabase.execSync(`
      INSERT INTO fund_groups_new (id, name, name_normalized, sort_order, created_at, updated_at)
      SELECT id, name, name_normalized, COALESCE(sort_order, 0), created_at, updated_at
      FROM fund_groups;
    `);

    // 4. Swap tables
    sqliteDatabase.execSync(`
      DROP TABLE fund_groups;
      ALTER TABLE fund_groups_new RENAME TO fund_groups;
    `);

    // 5. Recreate canonical indexes
    sqliteDatabase.execSync(`
      CREATE UNIQUE INDEX IF NOT EXISTS fund_groups_name_normalized_unique ON fund_groups (name_normalized);
      CREATE INDEX IF NOT EXISTS fund_groups_sort_index ON fund_groups (sort_order, name);
    `);

    // 6. Guarantee junction tables exist if restoring an older backup
    sqliteDatabase.execSync(`
      CREATE TABLE IF NOT EXISTS fund_group_accounts (
        fund_group_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        PRIMARY KEY(fund_group_id, account_id),
        FOREIGN KEY (fund_group_id) REFERENCES fund_groups(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS fund_group_accounts_account_unique ON fund_group_accounts (account_id);
      CREATE INDEX IF NOT EXISTS fund_group_accounts_group_sort_index ON fund_group_accounts (fund_group_id, sort_order);

      CREATE TABLE IF NOT EXISTS fund_group_pockets (
        fund_group_id TEXT NOT NULL,
        pocket_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        PRIMARY KEY(fund_group_id, pocket_id),
        FOREIGN KEY (fund_group_id) REFERENCES fund_groups(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY (pocket_id) REFERENCES pockets(id) ON UPDATE NO ACTION ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS fund_group_pockets_pocket_unique ON fund_group_pockets (pocket_id);
      CREATE INDEX IF NOT EXISTS fund_group_pockets_group_sort_index ON fund_group_pockets (fund_group_id, sort_order);
    `);
  } catch (err) {
    console.error("[MIGRATIONS] ensureFundGroupsSchema caught error:", err);
  }
}

function ensureDefaultHexColors(): void {
  try {
    const defaultColors = [
      { id: "color_blue", name: "Blue", hex: "#2563EB" },
      { id: "color_teal", name: "Teal", hex: "#0D9488" },
      { id: "color_green", name: "Green", hex: "#16A34A" },
      { id: "color_lime", name: "Lime", hex: "#84CC16" },
      { id: "color_amber", name: "Amber", hex: "#D97706" },
      { id: "color_orange", name: "Orange", hex: "#EA580C" },
      { id: "color_red", name: "Red", hex: "#DC2626" },
      { id: "color_purple", name: "Purple", hex: "#9333EA" },
      { id: "color_indigo", name: "Indigo", hex: "#4F46E5" },
      { id: "color_pink", name: "Pink", hex: "#DB2777" },
      { id: "color_slate", name: "Slate", hex: "#64748B" },
      { id: "color_emerald", name: "Emerald", hex: "#10B981" },
      { id: "color_cyan", name: "Cyan", hex: "#06B6D4" },
      { id: "color_violet", name: "Violet", hex: "#8B5CF6" },
      { id: "color_rose", name: "Rose", hex: "#F43F5E" },
      { id: "color_sky", name: "Sky", hex: "#0EA5E9" },
      { id: "color_fuchsia", name: "Fuchsia", hex: "#D946EF" },
      { id: "color_gold", name: "Gold", hex: "#EAB308" },
    ];

    const now = Date.now();
    for (const c of defaultColors) {
      sqliteDatabase.runSync(
        `INSERT OR IGNORE INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?);`,
        [c.id, c.name, c.hex, now, now],
      );
    }
  } catch (err) {
    console.warn("[MIGRATIONS] ensureDefaultHexColors caught warning:", err);
  }
}


