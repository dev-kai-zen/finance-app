import { inArray } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";

export function getSettingsByKey(
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

export function getSettingByKey(
  key: string,
  context: DbContext = db,
): string | null {
  const rows = context
    .select({ value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [key]))
    .all();

  return rows[0]?.value ?? null;
}

export function saveSettingsEntries(
  entries: Record<string, string | null>,
  context: DbContext = db,
  now = new Date(),
): void {
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === "") {
      context.delete(settings).where(inArray(settings.key, [key])).run();
    } else {
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
}
