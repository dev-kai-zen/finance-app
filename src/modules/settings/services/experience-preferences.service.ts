import type { DbContext } from "@/infrastructure/database/client";
import { isDevModeAllowed } from "@/utils/dev-mode";
import {
  DEVELOPER_MODE_SETTING_KEY,
  EXPERIENCE_HOME_SETTING_KEY,
  GUIDE_HELPER_SETTING_KEY,
  GENERAL_SEARCH_SETTING_KEY,
  FORM_FIELD_SETTING_KEYS,
  GUIDED_SETUP_STRATEGY,
  NAV_HREF_BY_VISIBILITY_KEY,
  NAV_VISIBILITY_SETTING_KEYS,
  ONBOARDING_SETUP_STRATEGY_KEY,
  PROMPT_SETTING_KEYS,
  type NavVisibilityKey,
} from "../constants/settings.constants";
import {
  getSettingByKey,
  getSettingsByKey,
} from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export { isDevModeAllowed };

export type FormFieldPreferenceKey = keyof typeof FORM_FIELD_SETTING_KEYS;
export type HomeExperienceMode = "simple" | "detailed";

export interface TransactionFormFieldPreferences {
  transactionName: boolean;
  split: boolean;
  attachments: boolean;
  labels: boolean;
  note: boolean;
  quickPresets: boolean;
  exactTime: boolean;
  installments: boolean;
}

export interface NavVisibilityPreferences {
  calendar: boolean;
  creditCards: boolean;
  categories: boolean;
  budgets: boolean;
  goals: boolean;
  reports: boolean;
  notes: boolean;
}

type ExperienceListener = () => void;
const listeners = new Set<ExperienceListener>();

export function subscribeToExperiencePreferences(
  listener: ExperienceListener,
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

export function isGuidedWorkspace(context?: DbContext): boolean {
  const strategy = getSettingByKey(
    ONBOARDING_SETUP_STRATEGY_KEY,
    context,
  );
  return strategy === GUIDED_SETUP_STRATEGY;
}

function parseStoredBoolean(
  raw: string | null | undefined,
  missingDefault: boolean,
): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return missingDefault;
}

function missingDefaultForGuided(context?: DbContext): boolean {
  return !isGuidedWorkspace(context);
}

export function getDeveloperModeEnabled(context?: DbContext): boolean {
  if (!isDevModeAllowed()) {
    return false;
  }
  return getSettingByKey(DEVELOPER_MODE_SETTING_KEY, context) === "true";
}

export function setDeveloperModeEnabled(
  enabled: boolean,
  context?: DbContext,
): void {
  if (!isDevModeAllowed()) {
    return;
  }
  persistSettingsEntries(
    {
      [DEVELOPER_MODE_SETTING_KEY]: enabled ? "true" : "false",
    },
    context,
  );
  notifyListeners();
}

export function getHomeExperienceMode(context?: DbContext): HomeExperienceMode {
  const raw = getSettingByKey(EXPERIENCE_HOME_SETTING_KEY, context);
  if (raw === "simple" || raw === "detailed") return raw;
  return isGuidedWorkspace(context) ? "simple" : "detailed";
}

export function setHomeExperienceMode(
  mode: HomeExperienceMode,
  context?: DbContext,
): void {
  persistSettingsEntries(
    { [EXPERIENCE_HOME_SETTING_KEY]: mode },
    context,
  );
  notifyListeners();
}

export function getGuideHelperEnabled(context?: DbContext): boolean {
  const raw = getSettingByKey(GUIDE_HELPER_SETTING_KEY, context);
  return parseStoredBoolean(raw, true);
}

export function setGuideHelperEnabled(
  enabled: boolean,
  context?: DbContext,
): void {
  persistSettingsEntries(
    {
      [GUIDE_HELPER_SETTING_KEY]: enabled ? "true" : "false",
    },
    context,
  );
  notifyListeners();
}

export function getGeneralSearchEnabled(context?: DbContext): boolean {
  const raw = getSettingByKey(GENERAL_SEARCH_SETTING_KEY, context);
  return parseStoredBoolean(raw, true);
}

export function setGeneralSearchEnabled(
  enabled: boolean,
  context?: DbContext,
): void {
  persistSettingsEntries(
    {
      [GENERAL_SEARCH_SETTING_KEY]: enabled ? "true" : "false",
    },
    context,
  );
  notifyListeners();
}

export function isTransactionFormFieldEnabled(
  field: FormFieldPreferenceKey,
  context?: DbContext,
): boolean {
  const key = FORM_FIELD_SETTING_KEYS[field];
  const raw = getSettingByKey(key, context);
  return parseStoredBoolean(raw, missingDefaultForGuided(context));
}

export function getTransactionFormFieldPreferences(
  context?: DbContext,
): TransactionFormFieldPreferences {
  const keys = Object.values(FORM_FIELD_SETTING_KEYS);
  const map = getSettingsByKey(keys, context);
  const missingDefault = missingDefaultForGuided(context);

  return {
    transactionName: parseStoredBoolean(
      map[FORM_FIELD_SETTING_KEYS.transactionName],
      missingDefault,
    ),
    split: parseStoredBoolean(map[FORM_FIELD_SETTING_KEYS.split], missingDefault),
    attachments: parseStoredBoolean(
      map[FORM_FIELD_SETTING_KEYS.attachments],
      missingDefault,
    ),
    labels: parseStoredBoolean(map[FORM_FIELD_SETTING_KEYS.labels], missingDefault),
    note: parseStoredBoolean(map[FORM_FIELD_SETTING_KEYS.note], missingDefault),
    quickPresets: parseStoredBoolean(
      map[FORM_FIELD_SETTING_KEYS.quickPresets],
      missingDefault,
    ),
    exactTime: parseStoredBoolean(
      map[FORM_FIELD_SETTING_KEYS.exactTime],
      missingDefault,
    ),
    installments: parseStoredBoolean(
      map[FORM_FIELD_SETTING_KEYS.installments],
      missingDefault,
    ),
  };
}

export function setTransactionFormFieldEnabled(
  field: FormFieldPreferenceKey,
  enabled: boolean,
  context?: DbContext,
): void {
  persistSettingsEntries(
    { [FORM_FIELD_SETTING_KEYS[field]]: enabled ? "true" : "false" },
    context,
  );
  notifyListeners();
}

export function setTransactionFormFieldPreferences(
  preferences: Partial<TransactionFormFieldPreferences>,
  context?: DbContext,
): void {
  const entries: Record<string, string> = {};
  for (const [field, enabled] of Object.entries(preferences) as Array<
    [FormFieldPreferenceKey, boolean | undefined]
  >) {
    if (enabled === undefined) continue;
    entries[FORM_FIELD_SETTING_KEYS[field]] = enabled ? "true" : "false";
  }
  if (Object.keys(entries).length === 0) return;
  persistSettingsEntries(entries, context);
  notifyListeners();
}

export function isNavItemVisible(
  navKey: NavVisibilityKey,
  context?: DbContext,
): boolean {
  const key = NAV_VISIBILITY_SETTING_KEYS[navKey];
  const raw = getSettingByKey(key, context);
  return parseStoredBoolean(raw, missingDefaultForGuided(context));
}

export function getNavVisibilityPreferences(
  context?: DbContext,
): NavVisibilityPreferences {
  const keys = Object.values(NAV_VISIBILITY_SETTING_KEYS);
  const map = getSettingsByKey(keys, context);
  const missingDefault = missingDefaultForGuided(context);

  return {
    calendar: parseStoredBoolean(
      map[NAV_VISIBILITY_SETTING_KEYS.calendar],
      missingDefault,
    ),
    creditCards: parseStoredBoolean(
      map[NAV_VISIBILITY_SETTING_KEYS.creditCards],
      missingDefault,
    ),
    categories: parseStoredBoolean(
      map[NAV_VISIBILITY_SETTING_KEYS.categories],
      missingDefault,
    ),
    budgets: parseStoredBoolean(
      map[NAV_VISIBILITY_SETTING_KEYS.budgets],
      missingDefault,
    ),
    goals: parseStoredBoolean(map[NAV_VISIBILITY_SETTING_KEYS.goals], missingDefault),
    reports: parseStoredBoolean(
      map[NAV_VISIBILITY_SETTING_KEYS.reports],
      missingDefault,
    ),
    notes: parseStoredBoolean(map[NAV_VISIBILITY_SETTING_KEYS.notes], missingDefault),
  };
}

export function setNavItemVisible(
  navKey: NavVisibilityKey,
  visible: boolean,
  context?: DbContext,
): void {
  persistSettingsEntries(
    { [NAV_VISIBILITY_SETTING_KEYS[navKey]]: visible ? "true" : "false" },
    context,
  );
  notifyListeners();
}

export function getHiddenNavHrefs(context?: DbContext): string[] {
  const prefs = getNavVisibilityPreferences(context);
  return (Object.keys(NAV_HREF_BY_VISIBILITY_KEY) as NavVisibilityKey[])
    .filter((key) => !prefs[key])
    .map((key) => NAV_HREF_BY_VISIBILITY_KEY[key]);
}

export function applyGuidedWorkspaceSimpleDefaults(context: DbContext): void {
  const formOff = Object.fromEntries(
    Object.values(FORM_FIELD_SETTING_KEYS).map((key) => [key, "false"]),
  );
  const navOff = Object.fromEntries(
    Object.values(NAV_VISIBILITY_SETTING_KEYS).map((key) => [key, "false"]),
  );
  persistSettingsEntries(
    {
      ...formOff,
      ...navOff,
      [EXPERIENCE_HOME_SETTING_KEY]: "simple",
    },
    context,
  );
  notifyListeners();
}

export function isPromptDismissed(
  promptKey: keyof typeof PROMPT_SETTING_KEYS,
  context?: DbContext,
): boolean {
  return (
    getSettingByKey(PROMPT_SETTING_KEYS[promptKey], context) === "true"
  );
}

export function setPromptDismissed(
  promptKey: keyof typeof PROMPT_SETTING_KEYS,
  dismissed: boolean,
  context?: DbContext,
): void {
  persistSettingsEntries(
    {
      [PROMPT_SETTING_KEYS[promptKey]]: dismissed ? "true" : "false",
    },
    context,
  );
  notifyListeners();
}
