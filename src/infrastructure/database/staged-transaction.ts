import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { DATABASE_NAME, sqliteDatabase, type AppDatabase } from "./client";
import { withDatabaseSnapshotLock, withSnapshotDatabase } from "./snapshot";
import * as schema from "./schema";

export class StagedDatabaseChangedError extends Error {}

/**
 * Run domain work against a private copy, then replay its parameterized writes
 * atomically on a separate native connection. The caller can yield while staging.
 * No live transaction remains open while JS prepares/validates the import.
 */
export async function withStagedDatabaseTransaction<T>(
  prepare: (context: AppDatabase) => Promise<T>,
): Promise<T> {
  return withDatabaseSnapshotLock(async () => {
    const writer = await SQLite.openDatabaseAsync(DATABASE_NAME, { useNewConnection: true, enableChangeListener: true });
    let transactionOpen = false, committed = false, busyTimeout: number | undefined, primaryError: unknown;
    try {
      await writer.execAsync("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 0;");
      const version = async () => (await writer.getFirstAsync<{ data_version: number }>("PRAGMA data_version;"))!.data_version;
      const initialVersion = await version();
      const snapshot = await writer.serializeAsync();
      if (await version() !== initialVersion) throw new StagedDatabaseChangedError();
      const writes: { sql: string; params: SQLite.SQLiteBindValue[] }[] = [];
      const result = await withSnapshotDatabase(snapshot, async (_context, native) => {
        await native.execAsync("PRAGMA foreign_keys = ON;");
        const staged = drizzle(native, { schema, logger: {
          logQuery(query, params) {
            if (/^\s*(insert|update|delete|replace)\b/i.test(query)) {
              writes.push({ sql: query, params: params as SQLite.SQLiteBindValue[] });
            }
          },
        } });
        await native.execAsync("BEGIN;");
        try {
          const result = await prepare(staged);
          await native.execAsync("COMMIT;");
          return result;
        } catch (error) {
          await native.execAsync("ROLLBACK;");
          throw error;
        }
      });
      // Synchronous writers on the UI connection must fail promptly with SQLITE_BUSY,
      // rather than blocking the JS thread behind this native transaction.
      busyTimeout = sqliteDatabase.getFirstSync<{ timeout: number }>("PRAGMA busy_timeout;")!.timeout;
      sqliteDatabase.execSync("PRAGMA busy_timeout = 0;");
      await writer.execAsync("BEGIN IMMEDIATE;");
      transactionOpen = true;
      if (await version() !== initialVersion) throw new StagedDatabaseChangedError();
      for (const write of writes) await writer.runAsync(write.sql, write.params);
      await writer.execAsync("COMMIT;");
      transactionOpen = false;
      committed = true;
      return result;
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        if (transactionOpen) await writer.execAsync("ROLLBACK;");
      } catch (error) {
        if (!primaryError) throw error;
      } finally {
        if (busyTimeout !== undefined) sqliteDatabase.execSync(`PRAGMA busy_timeout = ${busyTimeout};`);
        // A cleanup error after COMMIT must not tell the user that their import failed.
        try { await writer.closeAsync(); } catch (error) { if (!committed && !primaryError) throw error; }
      }
    }
  });
}
