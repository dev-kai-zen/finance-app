import { db, type DbContext } from "@/infrastructure/database/client";
import {
  clearAccountWorkspace,
  createInitialAccount,
  createRecommendedAccounts,
  createSampleAccounts,
  hasAccountWorkspaceData,
  type InitialAccountInput,
} from "@/modules/accounts";
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  saveDefaultCurrencyCode,
} from "@/modules/currencies/services/currency-preferences.service";
import { applyGuidedWorkspaceSimpleDefaults } from "@/modules/settings/services/experience-preferences.service";
import {
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
} from "@/modules/settings/services/default-accounts.service";
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
  const values = getOnboardingSettings();
  const status = values[ONBOARDING_SETTING_KEYS.status];
  const mode = values[ONBOARDING_SETTING_KEYS.workspaceMode];

  if (status === "completed" && isWorkspaceMode(mode)) {
    return completedState(
      mode,
      parseSetupStrategy(values[ONBOARDING_SETTING_KEYS.setupStrategy]),
      values[ONBOARDING_SETTING_KEYS.primaryCurrency],
    );
  }

  // Databases created before onboarding existed must remain immediately usable.
  if (hasAccountWorkspaceData()) {
    saveCompletedSettings("personal", null);
    return completedState("personal", null);
  }

  return {
    status: "pending",
    mode: null,
    primaryCurrency: "PHP",
    setupStrategy: null,
  };
}

export async function completeManualSetup(): Promise<WorkspaceState> {
  const now = new Date();

  await db.transaction(async (tx) => {
    clearSampleWorkspaceIfNeeded(tx);
    await prepareWorkspaceCategories("manual", tx, now);
    saveCompletedSettings("personal", "manual", tx, now);
  });

  return completedState("personal", "manual");
}

export interface GuidedWorkspaceInput {
  currencyCode: string;
  account: InitialAccountInput;
}

export async function completeGuidedSetup(
  input: GuidedWorkspaceInput,
): Promise<WorkspaceState> {
  const now = new Date();
  let accountId = "";

  await db.transaction(async (tx) => {
    clearSampleWorkspaceIfNeeded(tx);
    await prepareWorkspaceCategories("essentials", tx, now);
    accountId = createInitialAccount(
      input.account,
      tx,
      now,
      input.currencyCode,
    );
    saveDefaultCurrencyCode(input.currencyCode, tx, now);
    applyGuidedWorkspaceSimpleDefaults(tx);
    setDefaultExpenseAccount(accountId, null, tx);
    setDefaultIncomeAccount(accountId, null, tx);
    saveCompletedSettings(
      "personal",
      "guided",
      tx,
      now,
      input.currencyCode,
    );
  });

  saveCurrencyPreferences(getCurrencyPreferences());

  return completedState("personal", "guided", input.currencyCode);
}

export async function completeRecommendedSetup(): Promise<WorkspaceState> {
  const now = new Date();

  await db.transaction(async (tx) => {
    clearSampleWorkspaceIfNeeded(tx);
    await prepareWorkspaceCategories("recommended", tx, now);
    createRecommendedAccounts(tx, now);
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
  await db.transaction(async (tx) => {
    await prepareWorkspaceCategories("recommended", tx, now);
    const accountIds = createSampleAccounts(tx, now);
    createSampleTransactions(accountIds, tx, now);
    saveCompletedSettings("sample", null, tx, now);
  });

  return completedState("sample", null);
}

function clearSampleWorkspaceIfNeeded(context: DbContext): void {
  const values = getOnboardingSettings(context);
  if (values[ONBOARDING_SETTING_KEYS.workspaceMode] !== "sample") return;

  clearScheduledTransactionWorkspace(context);
  clearTransactionWorkspace(context);
  clearGoalWorkspace(context);
  clearAccountWorkspace(context);
  clearCustomWorkspaceCategories(context);
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

function parseSetupStrategy(
  value: string | undefined,
): WorkspaceSetupStrategy | null {
  return value === "manual" ||
    value === "recommended" ||
    value === "guided"
    ? value
    : null;
}
