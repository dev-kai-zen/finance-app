import { db, type DbContext } from "@/infrastructure/database/client";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import { isDevModeAllowed } from "@/utils/dev-mode";
import {
  DASHBOARD_LAYOUT_SETTING_KEY,
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

export type DashboardWidgetId =
  | "greeting"
  | "netWorth"
  | "quickActions"
  | "cashflow"
  | "accountsStrip"
  | "topCategories"
  | "recentTransactions";

export type DashboardLayoutPresetId =
  | "cashflowFocus"
  | "wealthOverview"
  | "completeView"
  | "minimalist";

export interface DashboardLayoutPreferences {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  showGreetingQuote: boolean;
  quoteBackgroundColor?: string | null;
  quoteTextColor?: string | null;
}

export const ALL_DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  "greeting",
  "netWorth",
  "quickActions",
  "cashflow",
  "accountsStrip",
  "topCategories",
  "recentTransactions",
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutPreferences = {
  order: [
    "greeting",
    "netWorth",
    "quickActions",
    "cashflow",
    "accountsStrip",
    "topCategories",
    "recentTransactions",
  ],
  hidden: ["accountsStrip", "topCategories"],
  showGreetingQuote: true,
  quoteBackgroundColor: null,
  quoteTextColor: null,
};

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

const ALL_EXPERIENCE_SETTING_KEYS: string[] = [
  ONBOARDING_SETUP_STRATEGY_KEY,
  DEVELOPER_MODE_SETTING_KEY,
  EXPERIENCE_HOME_SETTING_KEY,
  GUIDE_HELPER_SETTING_KEY,
  GENERAL_SEARCH_SETTING_KEY,
  DASHBOARD_LAYOUT_SETTING_KEY,
  ...Object.values(FORM_FIELD_SETTING_KEYS),
  ...Object.values(NAV_VISIBILITY_SETTING_KEYS),
  ...Object.values(PROMPT_SETTING_KEYS),
];

export interface ExperiencePreferencesSnapshot {
  developerMode: boolean;
  guideHelperEnabled: boolean;
  generalSearchEnabled: boolean;
  homeMode: HomeExperienceMode;
  dashboardLayout: DashboardLayoutPreferences;
  formFields: TransactionFormFieldPreferences;
  navVisibility: NavVisibilityPreferences;
  hiddenNavHrefs: string[];
}

let cachedSettingsDb: unknown = null;
let cachedSettingsMap: Record<string, string> | null = null;
let cachedSnapshot: ExperiencePreferencesSnapshot | null = null;

export function invalidateExperiencePreferencesCache(): void {
  cachedSettingsMap = null;
  cachedSnapshot = null;
}

subscribeToDatabaseReplacement(invalidateExperiencePreferencesCache);

function getExperienceSettingsMap(
  context?: DbContext,
): Record<string, string> {
  if (context) {
    return getSettingsByKey(ALL_EXPERIENCE_SETTING_KEYS, context);
  }
  const currentDb = db;
  if (cachedSettingsMap !== null && cachedSettingsDb === currentDb) {
    return cachedSettingsMap;
  }
  const map = getSettingsByKey(ALL_EXPERIENCE_SETTING_KEYS);
  cachedSettingsDb = currentDb;
  cachedSettingsMap = map;
  cachedSnapshot = null;
  return map;
}

function getExperienceSettingValue(
  key: string,
  context?: DbContext,
): string | null {
  if (context) {
    return getSettingByKey(key, context);
  }
  const map = getExperienceSettingsMap();
  return map[key] ?? null;
}

export function subscribeToExperiencePreferences(
  listener: ExperienceListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  invalidateExperiencePreferencesCache();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export function isGuidedWorkspace(context?: DbContext): boolean {
  const strategy = getExperienceSettingValue(
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
  return (
    getExperienceSettingValue(DEVELOPER_MODE_SETTING_KEY, context) === "true"
  );
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
  const raw = getExperienceSettingValue(EXPERIENCE_HOME_SETTING_KEY, context);
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
  const raw = getExperienceSettingValue(GUIDE_HELPER_SETTING_KEY, context);
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
  const raw = getExperienceSettingValue(GENERAL_SEARCH_SETTING_KEY, context);
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
  const raw = getExperienceSettingValue(key, context);
  return parseStoredBoolean(raw, missingDefaultForGuided(context));
}

export function getTransactionFormFieldPreferences(
  context?: DbContext,
): TransactionFormFieldPreferences {
  const map = context
    ? getSettingsByKey(Object.values(FORM_FIELD_SETTING_KEYS), context)
    : getExperienceSettingsMap();
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
  const raw = getExperienceSettingValue(key, context);
  return parseStoredBoolean(raw, missingDefaultForGuided(context));
}

export function getNavVisibilityPreferences(
  context?: DbContext,
): NavVisibilityPreferences {
  const map = context
    ? getSettingsByKey(Object.values(NAV_VISIBILITY_SETTING_KEYS), context)
    : getExperienceSettingsMap();
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
    getExperienceSettingValue(PROMPT_SETTING_KEYS[promptKey], context) === "true"
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

function isValidWidgetId(value: unknown): value is DashboardWidgetId {
  return (
    typeof value === "string" &&
    (ALL_DASHBOARD_WIDGET_IDS as string[]).includes(value)
  );
}

export function getDashboardLayoutPreferences(
  context?: DbContext,
): DashboardLayoutPreferences {
  const raw = getExperienceSettingValue(DASHBOARD_LAYOUT_SETTING_KEY, context);
  if (!raw) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutPreferences>;
    const rawOrder = Array.isArray(parsed.order)
      ? parsed.order.filter(isValidWidgetId)
      : [];
    const seen = new Set<DashboardWidgetId>(rawOrder);
    const mergedOrder: DashboardWidgetId[] = [...rawOrder];
    for (const id of ALL_DASHBOARD_WIDGET_IDS) {
      if (!seen.has(id)) {
        if (id === "quickActions") {
          const netWorthIdx = mergedOrder.indexOf("netWorth");
          if (netWorthIdx !== -1) {
            mergedOrder.splice(netWorthIdx + 1, 0, id);
            continue;
          }
        }
        mergedOrder.push(id);
      }
    }
    const hidden = (
      Array.isArray(parsed.hidden)
        ? Array.from(new Set(parsed.hidden.filter(isValidWidgetId)))
        : DEFAULT_DASHBOARD_LAYOUT.hidden
    ).filter((id) => id !== "greeting");
    const showGreetingQuote =
      typeof parsed.showGreetingQuote === "boolean"
        ? parsed.showGreetingQuote
        : DEFAULT_DASHBOARD_LAYOUT.showGreetingQuote;
    const quoteBackgroundColor =
      typeof parsed.quoteBackgroundColor === "string" && parsed.quoteBackgroundColor.trim()
        ? parsed.quoteBackgroundColor.trim()
        : null;
    const quoteTextColor =
      typeof parsed.quoteTextColor === "string" && parsed.quoteTextColor.trim()
        ? parsed.quoteTextColor.trim()
        : null;

    return {
      order: mergedOrder,
      hidden,
      showGreetingQuote,
      quoteBackgroundColor,
      quoteTextColor,
    };
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function setDashboardLayoutPreferences(
  preferences: DashboardLayoutPreferences,
  context?: DbContext,
): void {
  const sanitized: DashboardLayoutPreferences = {
    ...preferences,
    hidden: (preferences.hidden ?? []).filter((id) => id !== "greeting"),
  };
  persistSettingsEntries(
    {
      [DASHBOARD_LAYOUT_SETTING_KEY]: JSON.stringify(sanitized),
    },
    context,
  );
  notifyListeners();
}

export function resolveDashboardLayoutPreset(
  presetId: DashboardLayoutPresetId,
  current: DashboardLayoutPreferences,
): DashboardLayoutPreferences {
  let nextLayout: DashboardLayoutPreferences;
  switch (presetId) {
    case "cashflowFocus":
      nextLayout = {
        order: [
          "greeting",
          "quickActions",
          "cashflow",
          "topCategories",
          "recentTransactions",
          "accountsStrip",
          "netWorth",
        ],
        hidden: ["netWorth"],
        showGreetingQuote: true,
        quoteBackgroundColor: current.quoteBackgroundColor ?? null,
        quoteTextColor: current.quoteTextColor ?? null,
      };
      break;
    case "wealthOverview":
      nextLayout = {
        order: [
          "greeting",
          "netWorth",
          "accountsStrip",
          "cashflow",
          "recentTransactions",
          "quickActions",
          "topCategories",
        ],
        hidden: ["quickActions", "topCategories"],
        showGreetingQuote: true,
        quoteBackgroundColor: current.quoteBackgroundColor ?? null,
        quoteTextColor: current.quoteTextColor ?? null,
      };
      break;
    case "completeView":
      nextLayout = {
        order: [
          "greeting",
          "netWorth",
          "quickActions",
          "cashflow",
          "accountsStrip",
          "topCategories",
          "recentTransactions",
        ],
        hidden: [],
        showGreetingQuote: true,
        quoteBackgroundColor: current.quoteBackgroundColor ?? null,
        quoteTextColor: current.quoteTextColor ?? null,
      };
      break;
    case "minimalist":
      nextLayout = {
        order: [
          "greeting",
          "cashflow",
          "recentTransactions",
          "quickActions",
          "netWorth",
          "accountsStrip",
          "topCategories",
        ],
        hidden: ["quickActions", "netWorth", "accountsStrip", "topCategories"],
        showGreetingQuote: false,
        quoteBackgroundColor: current.quoteBackgroundColor ?? null,
        quoteTextColor: current.quoteTextColor ?? null,
      };
      break;
  }
  return nextLayout;
}

export function applyDashboardLayoutPreset(
  presetId: DashboardLayoutPresetId,
  context?: DbContext,
): DashboardLayoutPreferences {
  const current = getDashboardLayoutPreferences(context);
  const nextLayout = resolveDashboardLayoutPreset(presetId, current);
  setDashboardLayoutPreferences(nextLayout, context);
  return nextLayout;
}

export function getExperiencePreferencesSnapshot(
  context?: DbContext,
): ExperiencePreferencesSnapshot {
  if (!context && cachedSnapshot !== null && cachedSettingsDb === db) {
    return cachedSnapshot;
  }
  const snapshot: ExperiencePreferencesSnapshot = {
    developerMode: getDeveloperModeEnabled(context),
    guideHelperEnabled: getGuideHelperEnabled(context),
    generalSearchEnabled: getGeneralSearchEnabled(context),
    homeMode: getHomeExperienceMode(context),
    dashboardLayout: getDashboardLayoutPreferences(context),
    formFields: getTransactionFormFieldPreferences(context),
    navVisibility: getNavVisibilityPreferences(context),
    hiddenNavHrefs: getHiddenNavHrefs(context),
  };
  if (!context) {
    cachedSnapshot = snapshot;
  }
  return snapshot;
}
