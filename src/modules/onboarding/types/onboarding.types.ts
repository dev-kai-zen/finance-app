export type WorkspaceMode = "personal" | "sample";
export type WorkspaceSetupStrategy = "manual" | "recommended";

export type WorkspaceState =
  | {
      status: "pending";
      mode: null;
      primaryCurrency: "PHP";
      setupStrategy: null;
    }
  | {
      status: "completed";
      mode: WorkspaceMode;
      primaryCurrency: "PHP";
      setupStrategy: WorkspaceSetupStrategy | null;
    };
