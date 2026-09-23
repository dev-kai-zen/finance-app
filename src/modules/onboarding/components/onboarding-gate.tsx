import type { PropsWithChildren } from "react";

import { OnboardingScreen } from "@/modules/onboarding/screens/onboarding-screen";
import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";

export function OnboardingGate({ children }: PropsWithChildren) {
  const { state, personalSetupRequested } = useWorkspace();

  if (state.status === "pending" || personalSetupRequested) {
    return <OnboardingScreen />;
  }

  return children;
}
