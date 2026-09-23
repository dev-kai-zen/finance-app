import { db, type DbContext } from "@/infrastructure/database/client";
import {
  clearAccountWorkspace,
  createInitialAccount,
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
  PersonalSetupInput,
  WorkspaceMode,
  WorkspaceState,
} from "@/modules/onboarding/types/onboarding.types";

export function initializeWorkspaceState(): WorkspaceState {
  const values = getOnboardingSettings();
  const status = values[ONBOARDING_SETTING_KEYS.status];
  const mode = values[ONBOARDING_SETTING_KEYS.workspaceMode];

  if (status === "completed" && isWorkspaceMode(mode)) {
    return completedState(mode);
  }

  // Databases created before onboarding existed must remain immediately usable.
  if (hasAccountWorkspaceData()) {
    saveCompletedSettings("personal");
    return completedState("personal");
  }

  return { status: "pending", mode: null, primaryCurrency: "PHP" };
}

export async function completePersonalSetup(
  input: PersonalSetupInput,
): Promise<WorkspaceState> {
  const now = new Date();

  await db.transaction(async (tx) => {
    const values = getOnboardingSettings(tx);
    if (values[ONBOARDING_SETTING_KEYS.workspaceMode] === "sample") {
      clearTransactionWorkspace(tx);
      clearAccountWorkspace(tx);
      clearCustomWorkspaceCategories(tx);
    }

    await prepareWorkspaceCategories(input.categorySetup, tx, now);
    createInitialAccount(input.account, tx, now);
    saveCompletedSettings("personal", tx, now);
  });

  return completedState("personal");
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
    saveCompletedSettings("sample", tx, now);
  });

  return completedState("sample");
}

function saveCompletedSettings(
  mode: WorkspaceMode,
  context: DbContext = db,
  now = new Date(),
): void {
  saveOnboardingSettings(
    {
      [ONBOARDING_SETTING_KEYS.status]: "completed",
      [ONBOARDING_SETTING_KEYS.workspaceMode]: mode,
      [ONBOARDING_SETTING_KEYS.primaryCurrency]: "PHP",
      [ONBOARDING_SETTING_KEYS.sampleVersion]:
        mode === "sample" ? String(SAMPLE_DATA_VERSION) : "0",
    },
    context,
    now,
  );
}

function completedState(mode: WorkspaceMode): WorkspaceState {
  return { status: "completed", mode, primaryCurrency: "PHP" };
}

function isWorkspaceMode(value: string | undefined): value is WorkspaceMode {
  return value === "personal" || value === "sample";
}
