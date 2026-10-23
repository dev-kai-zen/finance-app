import type { DbContext } from "@/infrastructure/database/client";
import { TRANSACTION_VIEW_MODE_SETTING_KEY } from "../constants/settings.constants";
import {
  getSettingByKey,
} from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

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
  persistSettingsEntries(
    { [TRANSACTION_VIEW_MODE_SETTING_KEY]: viewMode },
    context,
  );
}
