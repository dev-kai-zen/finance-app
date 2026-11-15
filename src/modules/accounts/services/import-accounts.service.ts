import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountsWithBalances } from "./get-accounts-with-balances.service";
import { listAccountTypes } from "../repositories/account-types.repository";
import { insertAccount, newAccountRecordId, findAccountsByAccountTypeId } from "../repositories/accounts.repository";
import { accountInputSchema, type AccountInput } from "../schemas/account.schema";
import { requireAccountType } from "./account-rules";
import { isCreditCardAccountType } from "../utils/pocket-eligibility";
import { parseOpeningAmount, parseOpeningDate } from "../utils/account-input";

export function getAccountImportCatalog(context: DbContext = db) {
  return {
    accounts: getAccountsWithBalances(context).map((a) => ({
      ...a, creditCard: isCreditCardAccountType(a.accountTypeId, a.accountType?.name ?? ""),
    })),
    accountTypes: listAccountTypes(context).map((t) => ({ ...t, creditCard: isCreditCardAccountType(t.id, t.name) })),
  };
}

/** Create only: existing opening balances are never adjusted by an import. */
export function createImportedAccount(input: AccountInput, context: DbContext): string {
  const value = accountInputSchema.parse(input);
  const type = requireAccountType(value.accountTypeId, context);
  if (isCreditCardAccountType(type.id, type.name)) throw new Error("Credit card import is not supported.");
  const currencyCode = (value.currencyCode ?? "PHP").toUpperCase();
  const now = new Date();
  const id = newAccountRecordId(context);
  insertAccount({
    id, name: value.name, accountTypeId: type.id, currencyCode,
    openingBalanceMinorUnits: parseOpeningAmount(value.openingAmount, currencyCode),
    openingBalanceAt: parseOpeningDate(value.openingDate), note: value.note || null,
    startingBalanceLocked: false, hideFromSelection: false, hideFromReports: false,
    pocketEnabled: false, sortOrder: Math.max(-1, ...findAccountsByAccountTypeId(type.id, context).map((a) => a.sortOrder)) + 1,
    createdAt: now, updatedAt: now,
  }, context);
  return id;
}
