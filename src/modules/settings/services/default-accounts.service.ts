import type { DbContext } from "@/infrastructure/database/client";
import { DEFAULT_ACCOUNT_SETTINGS_KEYS } from "../constants/settings.constants";
import {
  getSettingsByKey,
  saveSettingsEntries,
} from "../repositories/settings.repository";

export interface DefaultAccountsConfig {
  defaultExpenseAccountId: string | null;
  defaultExpensePocketId: string | null;
  defaultIncomeAccountId: string | null;
  defaultIncomePocketId: string | null;
}

type DefaultAccountsListener = () => void;
const listeners = new Set<DefaultAccountsListener>();

export function subscribeToDefaultAccounts(
  listener: DefaultAccountsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export function getDefaultAccounts(
  context?: DbContext,
): DefaultAccountsConfig {
  const keys = [
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpenseAccountId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpensePocketId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId,
  ];
  const map = getSettingsByKey(keys, context);

  return {
    defaultExpenseAccountId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpenseAccountId] ?? null,
    defaultExpensePocketId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpensePocketId] ?? null,
    defaultIncomeAccountId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId] ?? null,
    defaultIncomePocketId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId] ?? null,
  };
}

export function setDefaultExpenseAccount(
  accountId: string | null,
  pocketId: string | null = null,
  context?: DbContext,
): void {
  saveSettingsEntries(
    {
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpenseAccountId]: accountId,
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpensePocketId]: accountId ? pocketId : null,
    },
    context,
  );
  notifyListeners();
}

export function setDefaultIncomeAccount(
  accountId: string | null,
  pocketId: string | null = null,
  context?: DbContext,
): void {
  saveSettingsEntries(
    {
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId]: accountId,
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId]: accountId ? pocketId : null,
    },
    context,
  );
  notifyListeners();
}
