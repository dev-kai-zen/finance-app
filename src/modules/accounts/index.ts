import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const AccountsScreen = deferComponent(
  () => require("./screens/accounts-screen").AccountsScreen,
  "AccountsScreen",
) as typeof import("./screens/accounts-screen").AccountsScreen;

export const useAccounts = deferFunction(
  () => require("./hooks/use-accounts").useAccounts,
) as typeof import("./hooks/use-accounts").useAccounts;

export const useFundGroups = deferFunction(
  () => require("./hooks/use-fund-groups").useFundGroups,
) as typeof import("./hooks/use-fund-groups").useFundGroups;

export const getAccountsWithBalances = deferFunction(
  () =>
    require("./services/get-accounts-with-balances.service")
      .getAccountsWithBalances,
) as typeof import("./services/get-accounts-with-balances.service").getAccountsWithBalances;

export const getCreditCardDetails = deferFunction(
  () =>
    require("./services/get-credit-card-details.service").getCreditCardDetails,
) as typeof import("./services/get-credit-card-details.service").getCreditCardDetails;

export const getAvailablePocketBalance = deferFunction(
  () =>
    require("./services/get-pockets-with-balances.service")
      .getAvailablePocketBalance,
) as typeof import("./services/get-pockets-with-balances.service").getAvailablePocketBalance;

export const getPocketsWithBalances = deferFunction(
  () =>
    require("./services/get-pockets-with-balances.service")
      .getPocketsWithBalances,
) as typeof import("./services/get-pockets-with-balances.service").getPocketsWithBalances;

export const requirePocketForAccount = deferFunction(
  () => require("./services/pocket-rules").requirePocketForAccount,
) as typeof import("./services/pocket-rules").requirePocketForAccount;

export const savePocket = deferFunction(
  () => require("./services/save-pocket.service").savePocket,
) as typeof import("./services/save-pocket.service").savePocket;

export const clearAccountWorkspace = deferFunction(
  () =>
    require("./services/workspace-accounts.service").clearAccountWorkspace,
) as typeof import("./services/workspace-accounts.service").clearAccountWorkspace;

export const createInitialAccount = deferFunction(
  () =>
    require("./services/workspace-accounts.service").createInitialAccount,
) as typeof import("./services/workspace-accounts.service").createInitialAccount;

export const createRecommendedAccounts = deferFunction(
  () =>
    require("./services/workspace-accounts.service").createRecommendedAccounts,
) as typeof import("./services/workspace-accounts.service").createRecommendedAccounts;

export const createSampleAccounts = deferFunction(
  () =>
    require("./services/workspace-accounts.service").createSampleAccounts,
) as typeof import("./services/workspace-accounts.service").createSampleAccounts;

export const hasAccountWorkspaceData = deferFunction(
  () =>
    require("./services/workspace-accounts.service").hasAccountWorkspaceData,
) as typeof import("./services/workspace-accounts.service").hasAccountWorkspaceData;

export const setPocketArchived = deferFunction(
  () => require("./services/archive-pocket.service").setPocketArchived,
) as typeof import("./services/archive-pocket.service").setPocketArchived;

export const deleteAccountType = deferFunction(
  () => require("./services/delete-account-type.service").deleteAccountType,
) as typeof import("./services/delete-account-type.service").deleteAccountType;

export type {
  InitialAccountInput,
  InitialAccountTemplate,
  SampleAccountIds,
} from "./services/workspace-accounts.service";
export {
  SYSTEM_ACCOUNT_TYPE_IDS,
  FALLBACK_ACCOUNT_TYPE_BY_GROUP,
} from "./constants/account-types.constants";
export type {
  Account,
  AccountType,
  AccountGroup,
  AccountListItem,
  CreditCardDetails,
  DeleteAccountTypeResult,
  Pocket,
  PocketInput,
  PocketListItem,
} from "./types/account.types";
export type {
  FundGroup,
  FundGroupInput,
  FundGroupListItem,
  FundGroupMemberItem,
  FundGroupsWorkspace,
} from "./types/fund-group.types";
