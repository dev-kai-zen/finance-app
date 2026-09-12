import * as SQLite from 'expo-sqlite';
import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
const sqlite = SQLite.openDatabaseSync('finance.db',{enableChangeListener:true});
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');
export const db = drizzle(sqlite,{schema});
export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;