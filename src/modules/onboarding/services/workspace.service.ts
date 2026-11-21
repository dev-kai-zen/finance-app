import { db, type DbContext } from "@/infrastructure/database/client";
import {
  clearAccountWorkspace,
  createInitialAccount,
  createRecommendedAccounts,
  createSampleAccounts,
  getFirstActiveAccountId,
  hasAccountWorkspaceData,
  RECOMMENDED_ACCOUNT_IDS,
  type InitialAccountInput,
} from "@/modules/accounts";
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  saveDefaultCurrencyCode,
} from "@/modules/currencies/services/currency-preferences.service";
import {
  applyGuidedWorkspaceSimpleDefaults,
  invalidateExperiencePreferencesCache,
} from "@/modules/settings/services/experience-preferences.service";
import {
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
} from "@/modules/settings/services/default-accounts.service";
import { setUserNickname } from "@/modules/settings/services/user-profile.service";
import { logTelemetryEvent } from "@/infrastructure/telemetry";
import {
  clearCustomWorkspaceCategories,
  prepareWorkspaceCategories,
} from "@/modules/categories";
import {
  clearTransactionWorkspace,
  createSampleTransactions,
} from "@/modules/transactions";
import { clearScheduledTransactionWorkspace } from "@/modules/scheduled-transactions";
import { clearGoalWorkspace } from "@/modules/goals";
import {
  ONBOARDING_SETTING_KEYS,
  SAMPLE_DATA_VERSION,
} from "@/modules/onboarding/constants/onboarding.constants";
import {
  getOnboardingSettings,
  saveOnboardingSettings,
} from "@/modules/onboarding/repositories/onboarding.repository";
import type {
  WorkspaceMode,
  WorkspaceSetupStrategy,
  WorkspaceState,
} from "@/modules/onboarding/types/onboarding.types";

export function initializeWorkspaceState(): WorkspaceState {
  return readWorkspaceStateFromDatabase();
}

/**
 * After a backup restore replaces the local database, align onboarding workspace
 * state with the restored data so the app exits Get Started when appropriate.
 */
export function finalizeRestoredWorkspace(context: DbContext = db): WorkspaceState {
  const state = readWorkspaceStateFromDatabase(context);
  if (state.status === "completed") {
    return state;
  }

  if (hasAccountWorkspaceData(context)) {
    const currency = getCurrencyPreferences(context).defaultCurrency ?? "PHP";
    saveCompletedSettings("personal", null, context, new Date(), currency);
    return completedState("personal", null, currency);
  }

  return state;
}

function readWorkspaceStateFromDatabase(context: DbContext = db): WorkspaceState {
  const values = getOnboardingSettings(context);
  const status = values[ONBOARDING_SETTING_KEYS.status];
  const mode = values[ONBOARDING_SETTING_KEYS.workspaceMode];

  if (status === "completed" && isWorkspaceMode(mode)) {
    return completedState(
      mode,
      parseSetupStrategy(values[ONBOARDING_SETTING_KEYS.setupStrategy]),
      values[ONBOARDING_SETTING_KEYS.primaryCurrency],
    );
  }

  // Databases created before onboarding existed (where status was never written)
  // must remain immediately usable, whereas an explicit "pending" status means
  // onboarding is still in progress (e.g. accounts were just imported on the
  // Guided Setup import step, but Finish Setup has not run yet).
  if (status !== "pending" && hasAccountWorkspaceData(context)) {
    saveCompletedSettings("personal", null, context);
    return completedState("personal", null);
  }

  const pendingCurrency = values[ONBOARDING_SETTING_KEYS.primaryCurrency];
  return {
    status: "pending",
    mode: null,
    primaryCurrency:
      pendingCurrency && pendingCurrency.length === 3 ? pendingCurrency : "PHP",
    setupStrategy: null,
  };
}

export async function completeManualSetup(): Promise<WorkspaceState> {
  const now = new Date();

  await db.transaction((tx) => {
    clearSampleWorkspaceIfNeeded(tx);
    prepareWorkspaceCategories("manual", tx, now);
    saveCompletedSettings("personal", "manual", tx, now);
  });

  return completedState("personal", "manual");
}

export type GuidedAccountStrategy = "custom" | "recommended" | "manual" | "import";

export interface GuidedWorkspaceInput {
  currencyCode: string;
  account?: InitialAccountInput;
  accountStrategy?: GuidedAccountStrategy;
  nickname?: string;
}

export async function completeGuidedSetup(
  input: GuidedWorkspaceInput,
): Promise<WorkspaceState> {
  const now = new Date();
  const strategy =
    input.accountStrategy ?? (input.account ? "custom" : "recommended");
  let accountId = "";

  await db.transaction((tx) => {
    clearSampleWorkspaceIfNeeded(tx);

    if (strategy === "recommended") {
      prepareWorkspaceCategories("recommended", tx, now);
      createRecommendedAccounts(tx, now, input.currencyCode);
      setDefaultExpenseAccount(RECOMMENDED_ACCOUNT_IDS.cash, null, tx);
      setDefaultIncomeAccount(RECOMMENDED_ACCOUNT_IDS.bank, null, tx);
    } else if (strategy === "manual") {
      prepareWorkspaceCategories("manual", tx, now);
    } else if (strategy === "import") {
      prepareWorkspaceCategories("recommended", tx, now);
      const defaultId = getFirstActiveAccountId(tx);
      if (defaultId) {
        setDefaultExpenseAccount(defaultId, null, tx);
        setDefaultIncomeAccount(defaultId, null, tx);
      }
    } else {
      prepareWorkspaceCategories("recommended", tx, now);
      if (input.account) {
        accountId = createInitialAccount(
          input.account,
          tx,
          now,
          input.currencyCode,
        );
        setDefaultExpenseAccount(accountId, null, tx);
        setDefaultIncomeAccount(accountId, null, tx);
      }
    }

    saveDefaultCurrencyCode(input.currencyCode, tx, now);
    applyGuidedWorkspaceSimpleDefaults(tx);
    if (input.nickname && input.nickname.trim()) {
      setUserNickname(input.nickname.trim(), tx, now);
    }
    saveCompletedSettings(
      "personal",
      strategy === "custom" ? "guided" : strategy,
      tx,
      now,
      input.currencyCode,
    );
  });

  saveCurrencyPreferences(getCurrencyPreferences());

  return completedState(
    "personal",
    strategy === "custom" ? "guided" : strategy,
    input.currencyCode,
  );
}

export async function completeRecommendedSetup(): Promise<WorkspaceState> {
  const now = new Date();

  await db.transaction((tx) => {
    clearSampleWorkspaceIfNeeded(tx);
    prepareWorkspaceCategories("recommended", tx, now);
    createRecommendedAccounts(tx, now);
    setDefaultExpenseAccount(RECOMMENDED_ACCOUNT_IDS.cash, null, tx);
    setDefaultIncomeAccount(RECOMMENDED_ACCOUNT_IDS.bank, null, tx);
    saveCompletedSettings("personal", "recommended", tx, now);
  });

  return completedState("personal", "recommended");
}

export async function loadSampleWorkspace(): Promise<WorkspaceState> {
  const current = initializeWorkspaceState();
  if (current.status === "completed" && current.mode === "sample") {
    return current;
  }
  if (current.status === "completed") {
    throw new Error(
      "Sample data can only be loaded before a personal workspace is created.",
    );
  }

  const now = new Date();
  await db.transaction((tx) => {
    prepareWorkspaceCategories("recommended", tx, now);
    const accountIds = createSampleAccounts(tx, now);
    createSampleTransactions(accountIds, tx, now);
    saveCompletedSettings("sample", null, tx, now);
  });

  return completedState("sample", null);
}

export function clearSampleWorkspaceIfNeeded(
  context: DbContext,
  options?: { preserveAccountTypes?: boolean },
): void {
  const values = getOnboardingSettings(context);
  if (values[ONBOARDING_SETTING_KEYS.workspaceMode] !== "sample") return;

  clearScheduledTransactionWorkspace(context);
  clearTransactionWorkspace(context);
  clearGoalWorkspace(context);
  clearAccountWorkspace(context, options);
  clearCustomWorkspaceCategories(context);
  saveOnboardingSettings(
    {
      [ONBOARDING_SETTING_KEYS.status]: "pending",
      [ONBOARDING_SETTING_KEYS.workspaceMode]: "",
      [ONBOARDING_SETTING_KEYS.sampleVersion]: "0",
    },
    context,
  );
}

function saveCompletedSettings(
  mode: WorkspaceMode,
  setupStrategy: WorkspaceSetupStrategy | null,
  context: DbContext = db,
  now = new Date(),
  primaryCurrency = "PHP",
): void {
  saveOnboardingSettings(
    {
      [ONBOARDING_SETTING_KEYS.status]: "completed",
      [ONBOARDING_SETTING_KEYS.workspaceMode]: mode,
      [ONBOARDING_SETTING_KEYS.setupStrategy]: setupStrategy ?? "",
      [ONBOARDING_SETTING_KEYS.primaryCurrency]: primaryCurrency,
      [ONBOARDING_SETTING_KEYS.sampleVersion]:
        mode === "sample" ? String(SAMPLE_DATA_VERSION) : "0",
    },
    context,
    now,
  );
  invalidateExperiencePreferencesCache();
  if (mode === "personal") {
    logTelemetryEvent("onboarding_completed", {
      setup_strategy: setupStrategy ?? "personal",
    });
  }
}

function completedState(
  mode: WorkspaceMode,
  setupStrategy: WorkspaceSetupStrategy | null,
  primaryCurrency = "PHP",
): WorkspaceState {
  const currency =
    primaryCurrency && primaryCurrency.length === 3 ? primaryCurrency : "PHP";
  return {
    status: "completed",
    mode,
    primaryCurrency: currency,
    setupStrategy,
  };
}

function isWorkspaceMode(value: string | undefined): value is WorkspaceMode {
  return value === "personal" || value === "sample";
}

export function markOnboardingPendingInContext(
  context: DbContext,
  primaryCurrency?: string,
): void {
  const patch: Record<string, string> = {
    [ONBOARDING_SETTING_KEYS.status]: "pending",
    [ONBOARDING_SETTING_KEYS.workspaceMode]: "",
    [ONBOARDING_SETTING_KEYS.sampleVersion]: "0",
  };
  if (primaryCurrency && primaryCurrency.length === 3) {
    patch[ONBOARDING_SETTING_KEYS.primaryCurrency] = primaryCurrency.toUpperCase();
  }
  saveOnboardingSettings(patch, context);
}

function parseSetupStrategy(
  value: string | undefined,
): WorkspaceSetupStrategy | null {
  return value === "manual" ||
    value === "recommended" ||
    value === "guided" ||
    value === "import"
    ? value
    : null;
}
