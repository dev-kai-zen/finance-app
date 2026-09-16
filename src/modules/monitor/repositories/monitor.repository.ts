import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, sqliteDatabase } from "@/infrastructure/database/client";
import type {
  ColumnInfo,
  QueryResult,
  TableDataResult,
  TableInfo,
} from "../types/monitor.types";

export function getAllTables(): TableInfo[] {
  try {
    const tables = sqliteDatabase.getAllSync<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;",
    );

    const result: TableInfo[] = [];

    for (const table of tables) {
      try {
        const countRow = sqliteDatabase.getFirstSync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM "${table.name}";`,
        );
        const columns = sqliteDatabase.getAllSync<ColumnInfo>(
          `PRAGMA table_info("${table.name}");`,
        );

        result.push({
          name: table.name,
          rowCount: countRow?.count ?? 0,
          columns,
          sql: table.sql || "",
        });
      } catch {
        result.push({
          name: table.name,
          rowCount: 0,
          columns: [],
          sql: table.sql || "",
        });
      }
    }

    return result;
  } catch (err) {
    console.error("Failed to query SQLite tables:", err);
    return [];
  }
}

export function getTableData(
  tableName: string,
  limit = 50,
  offset = 0,
): TableDataResult {
  try {
    const countRow = sqliteDatabase.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM "${tableName}";`,
    );
    const totalCount = countRow?.count ?? 0;

    const rows = sqliteDatabase.getAllSync<any>(
      `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset};`,
    );

    let columns: string[] = [];
    if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    } else {
      const colInfo = sqliteDatabase.getAllSync<ColumnInfo>(
        `PRAGMA table_info("${tableName}");`,
      );
      columns = colInfo.map((c) => c.name);
    }

    return {
      rows,
      columns,
      totalCount,
    };
  } catch (err) {
    console.error(`Failed to fetch records for table ${tableName}:`, err);
    return {
      rows: [],
      columns: [],
      totalCount: 0,
    };
  }
}

export function executeRawQuery(rawSql: string): QueryResult {
  const trimmed = rawSql.trim();
  if (!trimmed) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
    };
  }

  const start = Date.now();
  const upper = trimmed.toUpperCase();

  if (
    upper.startsWith("SELECT") ||
    upper.startsWith("PRAGMA") ||
    upper.startsWith("EXPLAIN")
  ) {
    const rows = sqliteDatabase.getAllSync<any>(trimmed);
    const executionTimeMs = Date.now() - start;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
    };
  } else {
    const res = sqliteDatabase.runSync(trimmed);
    const executionTimeMs = Date.now() - start;

    return {
      columns: ["changes", "lastInsertRowId"],
      rows: [{ changes: res.changes, lastInsertRowId: res.lastInsertRowId }],
      rowCount: res.changes,
      executionTimeMs,
    };
  }
}

const VACUUM_MAX_ATTEMPTS = 5;
const VACUUM_RETRY_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableVacuumError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("SQL statements in progress") ||
    message.includes("database is locked") ||
    message.includes("SQLITE_BUSY")
  );
}

export async function vacuumDatabase(): Promise<void> {
  try {
    await sqliteDatabase.runAsync("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // Best effort: flush WAL pages before vacuuming.
  }

  const vacuumConnection = SQLite.openDatabaseSync(DATABASE_NAME, {
    useNewConnection: true,
  });

  try {
    await vacuumConnection.runAsync("PRAGMA busy_timeout = 5000;");

    let lastError: unknown;
    for (let attempt = 0; attempt < VACUUM_MAX_ATTEMPTS; attempt += 1) {
      try {
        await vacuumConnection.runAsync("VACUUM;");
        return;
      } catch (error) {
        lastError = error;
        const canRetry =
          isRetryableVacuumError(error) && attempt < VACUUM_MAX_ATTEMPTS - 1;
        if (!canRetry) {
          throw error;
        }
        await delay(VACUUM_RETRY_DELAY_MS * (attempt + 1));
      }
    }

    throw lastError;
  } finally {
    await vacuumConnection.closeAsync();
  }
}
