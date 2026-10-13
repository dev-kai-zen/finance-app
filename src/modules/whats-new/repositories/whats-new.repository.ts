import { inArray } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import { WHATS_NEW_LAST_SEEN_FINGERPRINT_KEY } from "@/modules/whats-new/constants/whats-new.constants";

export function getLastSeenAppFingerprint(
  context: DbContext = db,
): string | null {
  const rows = context
    .select({ value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [WHATS_NEW_LAST_SEEN_FINGERPRINT_KEY]))
    .all();

  return rows[0]?.value ?? null;
}

export function saveLastSeenAppFingerprint(
  fingerprint: string,
  context: DbContext = db,
  now = new Date(),
): void {
  context
    .insert(settings)
    .values({
      key: WHATS_NEW_LAST_SEEN_FINGERPRINT_KEY,
      value: fingerprint,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: fingerprint, updatedAt: now },
    })
    .run();
}
