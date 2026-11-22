import { desc, inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { importBatches, importRecords } from "@/infrastructure/database/schema";

export function listImportHistory(context: DbContext = db) {
  return context.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(30).all();
}
export function listImportedSourceKeys(keys: string[], context: DbContext = db): string[] {
  if (!keys.length) return [];
  const found: string[] = [];
  for (let offset = 0; offset < keys.length; offset += 500) {
    found.push(...context.select({ key: importRecords.sourceKey }).from(importRecords)
      .where(inArray(importRecords.sourceKey, keys.slice(offset, offset + 500))).all().map((r) => r.key));
  }
  return found;
}
export function insertImportBatch(value: typeof importBatches.$inferInsert, context: DbContext): void {
  context.insert(importBatches).values(value).run();
}
export function insertImportRecord(value: typeof importRecords.$inferInsert, context: DbContext): void {
  context.insert(importRecords).values(value).run();
}
