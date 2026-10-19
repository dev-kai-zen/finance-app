import * as React from "react";

import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import {
  completeGuidedSetup as completeGuidedSetupService,
  completeManualSetup as completeManualSetupService,
  completeRecommendedSetup as completeRecommendedSetupService,
  finalizeRestoredWorkspace,
  initializeWorkspaceState,
  loadSampleWorkspace as loadSampleWorkspaceService,
  type GuidedWorkspaceInput,
} from "@/modules/onboarding/services/workspace.service";
import type { WorkspaceState } from "@/modules/onboarding/types/onboarding.types";

interface WorkspaceContextValue {
  state: WorkspaceState;
  busy: boolean;
  error: string | null;
  personalSetupRequested: boolean;
  cancelPersonalSetup: () => void;
  clearError: () => void;
  completeManualSetup: () => Promise<boolean>;
  completeRecommendedSetup: () => Promise<boolean>;
  completeGuidedSetup: (input: GuidedWorkspaceInput) => Promise<boolean>;
  loadSampleWorkspace: () => Promise<boolean>;
  requestPersonalSetup: () => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = React.useState<WorkspaceState>(() =>
    initializeWorkspaceState(),
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [personalSetupRequested, setPersonalSetupRequested] =
    React.useState(false);

  React.useEffect(() => {
    return subscribeToDatabaseReplacement(() => {
      setState(finalizeRestoredWorkspace());
      setPersonalSetupRequested(false);
      setError(null);
    });
  }, []);

  const run = React.useCallback(
    async (operation: () => Promise<WorkspaceState>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        setState(await operation());
        setPersonalSetupRequested(false);
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The workspace could not be prepared.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const value = React.useMemo<WorkspaceContextValue>(
    () => ({
      state,
      busy,
      error,
      personalSetupRequested,
      cancelPersonalSetup: () => {
        setError(null);
        setPersonalSetupRequested(false);
      },
      clearError: () => setError(null),
      completeManualSetup: () => run(completeManualSetupService),
      completeRecommendedSetup: () => run(completeRecommendedSetupService),
      completeGuidedSetup: (input) =>
        run(() => completeGuidedSetupService(input)),
      loadSampleWorkspace: () => run(loadSampleWorkspaceService),
      requestPersonalSetup: () => {
        setError(null);
        setPersonalSetupRequested(true);
      },
    }),
    [busy, error, personalSetupRequested, run, state],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = React.use(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return value;
}
