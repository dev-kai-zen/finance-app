import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  accountTypes,
  accounts,
  pocketMovements,
  pockets,
} from "@/infrastructure/database/schema";

export type AccountGroup = "asset" | "liability";

export type AccountType = InferSelectModel<typeof accountTypes> & {
  color?: string | null;
};
export type NewAccountType = InferInsertModel<typeof accountTypes>;

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Pocket = InferSelectModel<typeof pockets>;
export type NewPocket = InferInsertModel<typeof pockets>;
export type PocketMovement = InferSelectModel<typeof pocketMovements>;
export type NewPocketMovement = InferInsertModel<typeof pocketMovements>;

export type PocketListItem = Pocket & {
  currentBalanceMinorUnits: number;
};

export type PocketInput = {
  accountId: string;
  name: string;
  targetAmount: string;
};

export type MovePocketFundsInput = {
  accountId: string;
  fromPocketId: string | null;
  toPocketId: string | null;
  amountMinorUnits: number;
  note?: string | null;
  occurredAt?: Date;
};

export type AccountListItem = Account & {
  accountType: AccountType | null;
  currentBalanceMinorUnits: number;
};

export type DeleteAccountTypeResult = {
  deletedAccountTypeId: string;
};
