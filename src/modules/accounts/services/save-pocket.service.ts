import { db } from "@/infrastructure/database/client";
import {
  findPocketById,
  findPocketByName,
  insertPocket,
  listPocketsForAccount,
  newPocketRecordId,
  updatePocketRecord,
} from "@/modules/accounts/repositories/pockets.repository";
import { pocketInputSchema } from "@/modules/accounts/schemas/pocket.schema";
import { requireAccount, requireAccountType } from "@/modules/accounts/services/account-rules";
import type { PocketInput } from "@/modules/accounts/types/account.types";
import { parseMaintainingAmount } from "@/modules/accounts/utils/account-input";
import { supportsPockets } from "@/modules/accounts/utils/pocket-eligibility";

export function savePocket(input: PocketInput, id?: string): string {
  const value = pocketInputSchema.parse(input);
  return db.transaction((tx) => {
    const account = requireAccount(value.accountId, tx);
    const accountType = requireAccountType(account.accountTypeId, tx);
    if (
      !supportsPockets(
        account.accountTypeId,
        accountType.accountGroup,
        accountType.name,
      )
    ) {
      throw new Error("Pockets are not available for Credit Card accounts.");
    }
    if (!account.pocketEnabled) {
      throw new Error("Enable pockets in the account settings before adding a pocket.");
    }

    const existing = id ? findPocketById(id, tx) : null;
    if (id && !existing) throw new Error(`Pocket not found: ${id}`);
    if (existing && existing.accountId !== account.id) {
      throw new Error("A pocket cannot be moved to another account.");
    }
    if (findPocketByName(account.id, value.name, existing?.id, tx)) {
      throw new Error(`A pocket named "${value.name.trim()}" already exists in this account.`);
    }

    const now = new Date();
    const targetAmountMinorUnits = value.targetAmount.trim()
      ? parseMaintainingAmount(value.targetAmount)
      : null;
    if (existing) {
      updatePocketRecord(
        existing.id,
        { name: value.name.trim(), targetAmountMinorUnits, updatedAt: now },
        tx,
      );
      return existing.id;
    }

    const pocketId = newPocketRecordId(tx);
    const sortOrder =
      Math.max(-1, ...listPocketsForAccount(account.id, tx).map((item) => item.sortOrder)) + 1;
    insertPocket(
      {
        id: pocketId,
        accountId: account.id,
        name: value.name.trim(),
        targetAmountMinorUnits,
        isArchived: false,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      },
      tx,
    );
    return pocketId;
  });
}
