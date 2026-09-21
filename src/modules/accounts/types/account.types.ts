import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  accountTypes,
  accounts,
  creditCardDetails,
  pockets,
} from "@/infrastructure/database/schema";

export type AccountGroup = "asset" | "liability";

export type AccountType = InferSelectModel<typeof accountTypes> & {
  color?: string | null;
};
export type NewAccountType = InferInsertModel<typeof accountTypes>;

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type CreditCardDetails = InferSelectModel<typeof creditCardDetails>;
export type NewCreditCardDetails = InferInsertModel<typeof creditCardDetails>;

export type Pocket = InferSelectModel<typeof pockets>;
export type NewPocket = InferInsertModel<typeof pockets>;

export type PocketListItem = Pocket & {
  currentBalanceMinorUnits: number;
};

export type PocketInput = {
  accountId: string;
  name: string;
  targetAmount: string;
};

export type AccountListItem = Account & {
  accountType: AccountType | null;
  creditCardDetails: CreditCardDetails | null;
  currentBalanceMinorUnits: number;
};

export type DeleteAccountTypeResult = {
  deletedAccountTypeId: string;
};
