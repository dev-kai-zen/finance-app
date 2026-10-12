import { inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";

export function getCurrencyPreferenceEntries(
  keys: string[],
  context: DbContext = db,
): Record<string, string> {
  if (keys.length === 0) return {};

  const rows = context
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys))
    .all();

  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export function saveCurrencyPreferenceEntries(
  entries: Record<string, string>,
  context: DbContext = db,
  now = new Date(),
): void {
  for (const [key, value] of Object.entries(entries)) {
    context
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  }
}

