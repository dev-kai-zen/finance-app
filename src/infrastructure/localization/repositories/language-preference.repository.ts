import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";

export function readLanguagePreferenceValue(
  key: string,
  context: DbContext = db,
): string | null {
  return (
    context
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .get()?.value ?? null
  );
}

export function writeLanguagePreferenceValue(
  key: string,
  value: string,
  context: DbContext = db,
  now = new Date(),
): void {
  context
    .insert(settings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: now },
    })
    .run();
}
