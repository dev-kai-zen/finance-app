import type { DbContext } from "@/infrastructure/database/client";
import { ACCOUNTS_GROUP_VIEW_MODE_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export type AccountsGroupViewMode = "expanded" | "collapsed";

export function getAccountsGroupViewMode(
  context?: DbContext,
): AccountsGroupViewMode {
  const storedViewMode = getSettingByKey(
    ACCOUNTS_GROUP_VIEW_MODE_SETTING_KEY,
    context,
  );

  return storedViewMode === "collapsed" ? "collapsed" : "expanded";
}

export function setAccountsGroupViewMode(
  viewMode: AccountsGroupViewMode,
  context?: DbContext,
): void {
  persistSettingsEntries(
    { [ACCOUNTS_GROUP_VIEW_MODE_SETTING_KEY]: viewMode },
    context,
  );
}

