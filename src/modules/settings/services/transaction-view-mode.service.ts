import type { DbContext } from "@/infrastructure/database/client";
import { TRANSACTION_VIEW_MODE_SETTING_KEY } from "../constants/settings.constants";
import {
  getSettingByKey,
  saveSettingsEntries,
} from "../repositories/settings.repository";

export type TransactionViewMode = "compact" | "detailed";

export function getTransactionViewMode(
  context?: DbContext,
): TransactionViewMode {
  const storedViewMode = getSettingByKey(
    TRANSACTION_VIEW_MODE_SETTING_KEY,
    context,
  );

  return storedViewMode === "detailed" ? "detailed" : "compact";
}

export function setTransactionViewMode(
  viewMode: TransactionViewMode,
  context?: DbContext,
): void {
  saveSettingsEntries(
    { [TRANSACTION_VIEW_MODE_SETTING_KEY]: viewMode },
    context,
  );
}
