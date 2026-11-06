import { desc } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { importBatches, importRecords } from "@/infrastructure/database/schema";

export function listImportHistory(context: DbContext = db) {
  return context.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(30).all();
}
export function listImportedSourceKeys(context: DbContext = db): string[] {
  return context.select({ key: importRecords.sourceKey }).from(importRecords).all().map((r) => r.key);
}
export function insertImportBatch(value: typeof importBatches.$inferInsert, context: DbContext): void {
  context.insert(importBatches).values(value).run();
}
export function insertImportRecord(value: typeof importRecords.$inferInsert, context: DbContext): void {
  context.insert(importRecords).values(value).run();
}
