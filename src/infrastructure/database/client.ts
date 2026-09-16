import * as SQLite from "expo-sqlite";
import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

export const DATABASE_NAME = "finance.db";

const sqlite = SQLite.openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});
sqlite.execSync("PRAGMA journal_mode = WAL;");
sqlite.execSync("PRAGMA foreign_keys = ON;");

export const sqliteDatabase = sqlite;
export const db = drizzle(sqlite, { schema });
export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];
export type DbContext = AppDatabase | DatabaseTransaction;
