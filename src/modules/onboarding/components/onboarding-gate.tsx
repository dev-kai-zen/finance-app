import React, { type PropsWithChildren } from "react";

import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";

export function OnboardingGate({ children }: PropsWithChildren) {
  const { state, personalSetupRequested } = useWorkspace();

  if (state.status === "pending" || personalSetupRequested) {
    const { OnboardingScreen } =
      require("@/modules/onboarding/screens/onboarding-screen") as typeof import("@/modules/onboarding/screens/onboarding-screen");
    return <OnboardingScreen />;
  }

  return children;
}
