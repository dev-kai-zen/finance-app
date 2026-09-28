import { db, type DbContext } from "@/infrastructure/database/client";
import {
  clearAccountWorkspace,
  createRecommendedAccounts,
  createSampleAccounts,
  hasAccountWorkspaceData,
} from "@/modules/accounts";
import {
  clearCustomWorkspaceCategories,
  prepareWorkspaceCategories,
} from "@/modules/categories";
import {
  clearTransactionWorkspace,
  createSampleTransactions,
} from "@/modules/transactions";
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

  clearTransactionWorkspace(context);
  clearAccountWorkspace(context);
  clearCustomWorkspaceCategories(context);
}

function saveCompletedSettings(
  mode: WorkspaceMode,
  setupStrategy: WorkspaceSetupStrategy | null,
  context: DbContext = db,
  now = new Date(),
): void {
  saveOnboardingSettings(
    {
      [ONBOARDING_SETTING_KEYS.status]: "completed",
      [ONBOARDING_SETTING_KEYS.workspaceMode]: mode,
      [ONBOARDING_SETTING_KEYS.setupStrategy]: setupStrategy ?? "",
      [ONBOARDING_SETTING_KEYS.primaryCurrency]: "PHP",
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
): WorkspaceState {
  return { status: "completed", mode, primaryCurrency: "PHP", setupStrategy };
}

function isWorkspaceMode(value: string | undefined): value is WorkspaceMode {
  return value === "personal" || value === "sample";
}

function parseSetupStrategy(
  value: string | undefined,
): WorkspaceSetupStrategy | null {
  return value === "manual" || value === "recommended" ? value : null;
}
