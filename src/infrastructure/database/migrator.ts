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

export interface RunSafeMigrationsOptions {
  /**
   * Forces the full migration, legacy schema repair, default hex color seed, and
   * `PRAGMA foreign_key_check` pass even when the database matches the current tag.
   */
  forceFullCheck?: boolean;
}

const MAINTENANCE_SETTINGS_KEY = "__db_maintenance_tag";
const MAINTENANCE_REVISION = "v1";

function getLatestJournalEntry(
  config: MigrationsConfig,
): MigrationJournalEntry | null {
  const entries = config.journal.entries;
  if (!entries || entries.length === 0) {
    return null;
  }
  return entries[entries.length - 1] ?? null;
}

function isDatabaseUpToDate(
  targetSqlite: typeof sqliteDatabase,
  expectedMarker: string,
  latestWhen: number | null,
): boolean {
  try {
    const markerRow = targetSqlite.getFirstSync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ? LIMIT 1;",
      [MAINTENANCE_SETTINGS_KEY],
    );
    if (markerRow?.value !== expectedMarker) {
      return false;
    }

    if (latestWhen !== null) {
      const migrationRow = targetSqlite.getFirstSync<{ created_at: number }>(
        "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1;",
      );
      if (!migrationRow || Number(migrationRow.created_at) < latestWhen) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Executes database migrations safely following SQLite's documented
 * 12-step table reorganization procedure:
 *
 * 1. Fast-paths already-current databases unless `forceFullCheck` is set.
 * 2. Checks and disables foreign-key enforcement OUTSIDE any active transaction.
 * 3. Runs the Drizzle migration batch (which opens a transaction) and one-time repairs.
 * 4. Runs PRAGMA foreign_key_check to verify relational integrity.
 * 5. Persists the maintenance marker and re-enables foreign-key enforcement in finally.
 */
export async function runSafeMigrations(
  database: AppDatabase,
  config: MigrationsConfig,
  options?: RunSafeMigrationsOptions,
): Promise<void> {
  const targetSqlite =
    (database as unknown as { $client?: typeof sqliteDatabase }).$client ??
    sqliteDatabase;
  const latestEntry = getLatestJournalEntry(config);
  const expectedMarker = `${latestEntry?.tag ?? "none"}:${MAINTENANCE_REVISION}`;

  if (
    !options?.forceFullCheck &&
    isDatabaseUpToDate(targetSqlite, expectedMarker, latestEntry?.when ?? null)
  ) {
    return;
  }

  const fkRow = targetSqlite.getFirstSync<{ foreign_keys: number }>(
    "PRAGMA foreign_keys;",
  );
  const wasFkEnabled = fkRow?.foreign_keys === 1;

  if (wasFkEnabled) {
    targetSqlite.execSync("PRAGMA foreign_keys = OFF;");
  }

  try {
    ensureFundGroupsSchema(targetSqlite);
    await migrate(database, config);
    ensureKaiKnowledgeTables(targetSqlite);
    ensureFundGroupsSchema(targetSqlite);
    ensureDefaultHexColors(targetSqlite);

    if (wasFkEnabled) {
      const violations = targetSqlite.getAllSync<{
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

    try {
      const now = Date.now();
      targetSqlite.runSync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [MAINTENANCE_SETTINGS_KEY, expectedMarker, now],
      );
    } catch (err) {
      console.warn("[MIGRATIONS] Failed to persist maintenance marker:", err);
    }
  } catch (err) {
    console.error("[MIGRATIONS] runSafeMigrations caught error:", err);
    throw err;
  } finally {
    if (wasFkEnabled) {
      targetSqlite.execSync("PRAGMA foreign_keys = ON;");
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

function ensureKaiKnowledgeTables(
  targetSqlite: typeof sqliteDatabase = sqliteDatabase,
): void {
  try {
    targetSqlite.execSync(`
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
    const tableInfo = targetSqlite.getAllSync<{ name: string }>(
      "PRAGMA table_info(account_keywords);",
    );
    const hasLanguage = tableInfo.some((col) => col.name === "language");
    if (!hasLanguage) {
      targetSqlite.execSync("ALTER TABLE account_keywords ADD COLUMN language TEXT DEFAULT 'any';");
    }
  } catch (err) {
    console.warn("[MIGRATIONS] ensureKaiKnowledgeTables caught warning:", err);
  }
}

function ensureFundGroupsSchema(
  targetSqlite: typeof sqliteDatabase = sqliteDatabase,
): void {
  try {
    const tableInfo = targetSqlite.getAllSync<{ name: string }>(
      "PRAGMA table_info(fund_groups);",
    );
    const hasMemberKind = tableInfo.some((col) => col.name === "member_kind");
    if (!hasMemberKind) return;

    // 1. Drop any old indexes that could reference member_kind
    targetSqlite.execSync(`
      DROP INDEX IF EXISTS fund_groups_member_kind_idx;
      DROP INDEX IF EXISTS fund_groups_sort_index;
      DROP INDEX IF EXISTS fund_groups_name_normalized_unique;
    `);

    // 2. Create replacement table matching Drizzle's canonical schema
    targetSqlite.execSync(`
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
    targetSqlite.execSync(`
      INSERT INTO fund_groups_new (id, name, name_normalized, sort_order, created_at, updated_at)
      SELECT id, name, name_normalized, COALESCE(sort_order, 0), created_at, updated_at
      FROM fund_groups;
    `);

    // 4. Swap tables
    targetSqlite.execSync(`
      DROP TABLE fund_groups;
      ALTER TABLE fund_groups_new RENAME TO fund_groups;
    `);

    // 5. Recreate canonical indexes
    targetSqlite.execSync(`
      CREATE UNIQUE INDEX IF NOT EXISTS fund_groups_name_normalized_unique ON fund_groups (name_normalized);
      CREATE INDEX IF NOT EXISTS fund_groups_sort_index ON fund_groups (sort_order, name);
    `);

    // 6. Guarantee junction tables exist if restoring an older backup
    targetSqlite.execSync(`
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

function ensureDefaultHexColors(
  targetSqlite: typeof sqliteDatabase = sqliteDatabase,
): void {
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
      targetSqlite.runSync(
        `INSERT OR IGNORE INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?);`,
        [c.id, c.name, c.hex, now, now],
      );
    }
  } catch (err) {
    console.warn("[MIGRATIONS] ensureDefaultHexColors caught warning:", err);
  }
}


