import type { DbContext } from "@/infrastructure/database/client";
import { queueDebouncedQuickSync } from "@/infrastructure/sync";

import { saveSettingsEntries } from "../repositories/settings.repository";

export function persistSettingsEntries(
  entries: Record<string, string | null>,
  context?: DbContext,
  now?: Date,
): void {
  saveSettingsEntries(entries, context, now);
  queueDebouncedQuickSync(Object.keys(entries));
}
