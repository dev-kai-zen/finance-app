import type { DbContext } from "@/infrastructure/database/client";
import { queueDebouncedQuickSync } from "@/infrastructure/sync";

import { saveReminderSettings } from "../repositories/reminder-settings.repository";
import type { ReminderSettings } from "../types/notification.types";

export function persistReminderSettings(
  updated: Partial<ReminderSettings>,
  context?: DbContext,
): void {
  saveReminderSettings(updated, context);
  queueDebouncedQuickSync(Object.keys(updated));
}
