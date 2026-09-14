import { db } from "@/infrastructure/database/client";
import { accountInputSchema, type AccountInput } from "@/modules/accounts/schemas/account.schema";
import { findAccountsByAccountTypeId, insertAccount, newAccountRecordId, updateAccountRecord } from "@/modules/accounts/repositories/accounts.repository";
import { localDateInput, parseOpeningAmount, parseOpeningDate } from "@/modules/accounts/utils/account-input";
import { requireAccount, requireAccountType } from "@/modules/accounts/services/account-rules";

export function saveAccount(input: AccountInput, id?: string): string {
  const value = accountInputSchema.parse(input);
  return db.transaction((tx) => {
    const existing = id ? requireAccount(id, tx) : null;
    const type = requireAccountType(value.accountTypeId, tx);
    if (type.isArchived && existing?.accountTypeId !== type.id) throw new Error("Choose an active account type.");
    const openingBalanceMinorUnits = parseOpeningAmount(value.openingAmount);
    const openingBalanceAt = existing && localDateInput(existing.openingBalanceAt) === value.openingDate
      ? existing.openingBalanceAt : parseOpeningDate(value.openingDate);
    if (existing && existing.currencyCode !== "PHP" &&
      (existing.openingBalanceMinorUnits !== openingBalanceMinorUnits || existing.openingBalanceAt.getTime() !== openingBalanceAt.getTime())) {
      throw new Error("Opening balances for existing non-PHP accounts are read-only in this phase.");
    }
    const now = new Date();
    const sortOrder = existing && existing.accountTypeId === type.id ? existing.sortOrder
      : Math.max(-1, ...findAccountsByAccountTypeId(type.id, tx).map((a) => a.sortOrder)) + 1;
    const note = value.note?.trim() ? value.note.trim() : null;
    const values = {
      name: value.name,
      note,
      accountTypeId: type.id,
      openingBalanceMinorUnits,
      openingBalanceAt,
      sortOrder,
      updatedAt: now,
    };
    if (existing) {
      updateAccountRecord(existing.id, values, tx);
      return existing.id;
    }
    const newId = newAccountRecordId(tx);
    insertAccount({ ...values, id: newId, currencyCode: "PHP", createdAt: now }, tx);
    return newId;
  });
}
