export type WorkspaceMode = "personal" | "sample";
export type WorkspaceSetupStrategy = "manual" | "recommended" | "guided";

export type WorkspaceState =
  | {
      status: "pending";
      mode: null;
      primaryCurrency: string;
      setupStrategy: null;
    }
  | {
      status: "completed";
      mode: WorkspaceMode;
      primaryCurrency: string;
      setupStrategy: WorkspaceSetupStrategy | null;
    };
