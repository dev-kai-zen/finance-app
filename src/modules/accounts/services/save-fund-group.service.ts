import { db } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import {
  findFundGroupById,
  findFundGroupByNormalizedName,
  insertFundGroup,
  listFundGroupAccounts,
  listFundGroupPockets,
  listFundGroups,
  newFundGroupRecordId,
  replaceFundGroupAccounts,
  replaceFundGroupPockets,
  updateFundGroupRecord,
} from "@/modules/accounts/repositories/fund-groups.repository";
import { findPocketById } from "@/modules/accounts/repositories/pockets.repository";
import {
  fundGroupInputSchema,
  normalizeFundGroupName,
} from "@/modules/accounts/schemas/fund-group.schema";
import type { FundGroupInput } from "@/modules/accounts/types/fund-group.types";

export function saveFundGroup(input: FundGroupInput, id?: string): string {
  const value = fundGroupInputSchema.parse(input);

  return db.transaction((tx) => {
    const existing = id ? findFundGroupById(id, tx) : null;
    if (id && !existing) throw new Error(`Fund Group not found: ${id}`);
    const name = value.name.trim();
    const nameNormalized = normalizeFundGroupName(name);
    if (findFundGroupByNormalizedName(nameNormalized, existing?.id, tx)) {
      throw new Error(`A Fund Group named "${name}" already exists.`);
    }

    const groupId = existing?.id ?? newFundGroupRecordId(tx);
    const accountMemberships = listFundGroupAccounts(tx);
    const pocketMemberships = listFundGroupPockets(tx);

    const selectedAccounts = new Map<string, ReturnType<typeof findAccountById>>();
    for (const accountId of value.accountIds) {
      const account = findAccountById(accountId, tx);
      if (!account) throw new Error(`Account not found: ${accountId}`);
      selectedAccounts.set(accountId, account);
      const assigned = accountMemberships.find(
        (membership) => membership.accountId === accountId,
      );
      if (assigned && assigned.fundGroupId !== groupId) {
        throw new Error(`"${account.name}" already belongs to another Fund Group.`);
      }
      if (account.isArchived && assigned?.fundGroupId !== groupId) {
        throw new Error(`Restore "${account.name}" before adding it to a Fund Group.`);
      }
    }

    for (const pocketId of value.pocketIds) {
      const pocket = findPocketById(pocketId, tx);
      if (!pocket) throw new Error(`Pocket not found: ${pocketId}`);
      const parent = findAccountById(pocket.accountId, tx);
      if (!parent) throw new Error(`Parent account not found for pocket: ${pocketId}`);
      if (selectedAccounts.has(parent.id)) {
        throw new Error(
          `Remove either "${parent.name}" or its "${pocket.name}" pocket to avoid counting the same money twice.`,
        );
      }
      const assigned = pocketMemberships.find(
        (membership) => membership.pocketId === pocketId,
      );
      if (assigned && assigned.fundGroupId !== groupId) {
        throw new Error(`"${pocket.name}" already belongs to another Fund Group.`);
      }
      if ((pocket.isArchived || parent.isArchived) && assigned?.fundGroupId !== groupId) {
        throw new Error(`Restore "${pocket.name}" before adding it to a Fund Group.`);
      }
    }

    const now = new Date();
    if (existing) {
      updateFundGroupRecord(
        groupId,
        { name, nameNormalized, updatedAt: now },
        tx,
      );
    } else {
      const sortOrder = Math.max(-1, ...listFundGroups(tx).map((group) => group.sortOrder)) + 1;
      insertFundGroup(
        {
          id: groupId,
          name,
          nameNormalized,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );
    }

    replaceFundGroupAccounts(groupId, value.accountIds, tx);
    replaceFundGroupPockets(groupId, value.pocketIds, tx);

    return groupId;
  });
}
