import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  accountTypes,
  accounts,
} from "@/infrastructure/database/schema";

export type AccountGroup = "asset" | "liability";

export type AccountType = InferSelectModel<typeof accountTypes>;
export type NewAccountType = InferInsertModel<typeof accountTypes>;

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type AccountListItem = Account & {
  accountType: AccountType | null;
  currentBalanceMinorUnits: number;
};

export type DeleteAccountTypeResult = {
  deletedAccountTypeId: string;
};
