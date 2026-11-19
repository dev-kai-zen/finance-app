import { db, type DbContext } from "@/infrastructure/database/client";
import {
  listFundGroupAccounts,
  listFundGroupPockets,
  listFundGroups,
} from "@/modules/accounts/repositories/fund-groups.repository";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import type {
  FundGroupListItem,
  FundGroupMemberItem,
  FundGroupsWorkspace,
} from "@/modules/accounts/types/fund-group.types";

export interface GetFundGroupsWorkspacePreloaded {
  accounts?: AccountListItem[];
  pockets?: PocketListItem[];
}

export function getFundGroupsWorkspace(
  context: DbContext = db,
  preloaded?: GetFundGroupsWorkspacePreloaded,
): FundGroupsWorkspace {
  const accounts =
    preloaded?.accounts ??
    getAccountsWithBalances(context, { includeManagementFlags: false });
  const pockets =
    preloaded?.pockets ??
    getPocketsWithBalances(context, { includeManagementFlags: false });
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const pocketById = new Map(pockets.map((pocket) => [pocket.id, pocket]));
  const accountMemberships = listFundGroupAccounts(context);
  const pocketMemberships = listFundGroupPockets(context);

  const accountIdsByGroupId = new Map<string, string[]>();
  for (const membership of accountMemberships) {
    let bucket = accountIdsByGroupId.get(membership.fundGroupId);
    if (!bucket) {
      bucket = [];
      accountIdsByGroupId.set(membership.fundGroupId, bucket);
    }
    bucket.push(membership.accountId);
  }

  const pocketIdsByGroupId = new Map<string, string[]>();
  for (const membership of pocketMemberships) {
    let bucket = pocketIdsByGroupId.get(membership.fundGroupId);
    if (!bucket) {
      bucket = [];
      pocketIdsByGroupId.set(membership.fundGroupId, bucket);
    }
    bucket.push(membership.pocketId);
  }

  const groups: FundGroupListItem[] = listFundGroups(context).map((group) => {
    const accountIds = accountIdsByGroupId.get(group.id) ?? [];
    const pocketIds = pocketIdsByGroupId.get(group.id) ?? [];

    const accountMembers = accountIds.flatMap<FundGroupMemberItem>((accountId) => {
      const account = accountById.get(accountId);
      return account
        ? [{
            id: account.id,
            kind: "account",
            name: account.name,
            parentName: null,
            currencyCode: account.currencyCode,
            currentBalanceMinorUnits: account.currentBalanceMinorUnits,
            isArchived: account.isArchived,
          }]
        : [];
    });
    const pocketMembers = pocketIds.flatMap<FundGroupMemberItem>((pocketId) => {
      const pocket = pocketById.get(pocketId);
      const parent = pocket ? accountById.get(pocket.accountId) : undefined;
      return pocket && parent
        ? [{
            id: pocket.id,
            kind: "pocket",
            name: pocket.name,
            parentName: parent.name,
            currencyCode: parent.currencyCode,
            currentBalanceMinorUnits: pocket.currentBalanceMinorUnits,
            isArchived: pocket.isArchived || parent.isArchived,
          }]
        : [];
    });
    const members = [...accountMembers, ...pocketMembers];

    const totalsByCurrency = members
      .filter((member) => !member.isArchived)
      .reduce<Record<string, number>>((totals, member) => {
        totals[member.currencyCode] =
          (totals[member.currencyCode] ?? 0) + member.currentBalanceMinorUnits;
        return totals;
      }, {});

    return {
      ...group,
      accountIds,
      pocketIds,
      members,
      totalsByCurrency,
      archivedMemberCount: members.filter((member) => member.isArchived).length,
    };
  });

  return { groups, accounts, pockets };
}
