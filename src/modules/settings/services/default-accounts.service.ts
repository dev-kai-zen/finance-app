import { db, type DbContext } from "@/infrastructure/database/client";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import { DEFAULT_ACCOUNT_SETTINGS_KEYS } from "../constants/settings.constants";
import {
  getSettingsByKey,
} from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export interface DefaultAccountsConfig {
  defaultExpenseAccountId: string | null;
  defaultExpensePocketId: string | null;
  defaultIncomeAccountId: string | null;
  defaultIncomePocketId: string | null;
}

type DefaultAccountsListener = () => void;
const listeners = new Set<DefaultAccountsListener>();

let cachedDefaultsDb: unknown = null;
let cachedDefaults: DefaultAccountsConfig | null = null;

function invalidateDefaultAccountsCache(): void {
  cachedDefaults = null;
}

subscribeToDatabaseReplacement(invalidateDefaultAccountsCache);

export function subscribeToDefaultAccounts(
  listener: DefaultAccountsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  invalidateDefaultAccountsCache();
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
  if (!context && cachedDefaults !== null && cachedDefaultsDb === db) {
    return cachedDefaults;
  }
  const keys = [
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpenseAccountId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpensePocketId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId,
    DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId,
  ];
  const map = getSettingsByKey(keys, context);

  const result: DefaultAccountsConfig = {
    defaultExpenseAccountId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpenseAccountId] ?? null,
    defaultExpensePocketId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultExpensePocketId] ?? null,
    defaultIncomeAccountId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId] ?? null,
    defaultIncomePocketId:
      map[DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId] ?? null,
  };
  if (!context) {
    cachedDefaultsDb = db;
    cachedDefaults = result;
  }
  return result;
}

export function setDefaultExpenseAccount(
  accountId: string | null,
  pocketId: string | null = null,
  context?: DbContext,
): void {
  persistSettingsEntries(
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
  persistSettingsEntries(
    {
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomeAccountId]: accountId,
      [DEFAULT_ACCOUNT_SETTINGS_KEYS.defaultIncomePocketId]: accountId ? pocketId : null,
    },
    context,
  );
  notifyListeners();
}
