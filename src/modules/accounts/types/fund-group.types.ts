import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  fundGroupAccounts,
  fundGroupPockets,
  fundGroups,
} from "@/infrastructure/database/schema";
import type { AccountListItem, PocketListItem } from "./account.types";

export type FundGroup = InferSelectModel<typeof fundGroups>;
export type NewFundGroup = InferInsertModel<typeof fundGroups>;
export type FundGroupAccount = InferSelectModel<typeof fundGroupAccounts>;
export type FundGroupPocket = InferSelectModel<typeof fundGroupPockets>;

export interface FundGroupInput {
  name: string;
  accountIds: string[];
  pocketIds: string[];
}

export interface FundGroupMemberItem {
  id: string;
  kind: "account" | "pocket";
  name: string;
  parentName: string | null;
  currencyCode: string;
  currentBalanceMinorUnits: number;
  isArchived: boolean;
}

export interface FundGroupListItem extends FundGroup {
  accountIds: string[];
  pocketIds: string[];
  members: FundGroupMemberItem[];
  totalsByCurrency: Record<string, number>;
  archivedMemberCount: number;
}

export interface FundGroupsWorkspace {
  groups: FundGroupListItem[];
  accounts: AccountListItem[];
  pockets: PocketListItem[];
}
