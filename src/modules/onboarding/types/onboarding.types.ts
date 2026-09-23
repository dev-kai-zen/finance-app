import type {
  InitialAccountInput,
} from "@/modules/accounts";
import type { CategorySetup } from "@/modules/categories";

export type WorkspaceMode = "personal" | "sample";

export type WorkspaceState =
  | { status: "pending"; mode: null; primaryCurrency: "PHP" }
  | {
      status: "completed";
      mode: WorkspaceMode;
      primaryCurrency: "PHP";
    };

export interface PersonalSetupInput {
  account: InitialAccountInput;
  categorySetup: CategorySetup;
}
