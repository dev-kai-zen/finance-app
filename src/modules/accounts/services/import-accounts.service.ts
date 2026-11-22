import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountsWithBalances } from "./get-accounts-with-balances.service";
import { listAccountTypes } from "../repositories/account-types.repository";
import { insertAccount, newAccountRecordId, findAccountsByAccountTypeId } from "../repositories/accounts.repository";
import { upsertCreditCardDetails } from "../repositories/credit-card-details.repository";
import { accountInputSchema, type AccountInput } from "../schemas/account.schema";
import { requireAccountType } from "./account-rules";
import { isCreditCardAccountType } from "../utils/pocket-eligibility";
import { parseBillingDay, parseCreditLimit, parseOpeningAmount, parseOpeningDate } from "../utils/account-input";

export function getAccountImportCatalog(context: DbContext = db) {
  return {
    accounts: getAccountsWithBalances(context, { includeManagementFlags: false }).map((a) => ({
      ...a, creditCard: isCreditCardAccountType(a.accountTypeId, a.accountType?.name ?? ""),
    })),
    accountTypes: listAccountTypes(context).map((t) => ({ ...t, creditCard: isCreditCardAccountType(t.id, t.name) })),
  };
}

/** Create only: existing opening balances are never adjusted by an import. */
export function createImportedAccount(input: AccountInput, context: DbContext, options?: { isArchived?: boolean }): string {
  const value = accountInputSchema.parse(input);
  const type = requireAccountType(value.accountTypeId, context);
  const currencyCode = (value.currencyCode ?? "PHP").toUpperCase();
  const creditCardType = isCreditCardAccountType(type.id, type.name);
  if (creditCardType && !value.creditCardDetails) {
    throw new Error("Enter the credit card limit, statement day, and payment due day.");
  }
  const creditCardValues =
    creditCardType && value.creditCardDetails
      ? {
          creditLimitMinorUnits: parseCreditLimit(
            value.creditCardDetails.creditLimit,
            currencyCode,
          ),
          statementDay: parseBillingDay(
            value.creditCardDetails.statementDay,
            "Statement day",
          ),
          paymentDueDay: parseBillingDay(
            value.creditCardDetails.paymentDueDay,
            "Payment due day",
          ),
        }
      : null;
  const now = new Date();
  const id = newAccountRecordId(context);
  insertAccount({
    id, name: value.name, accountTypeId: type.id, currencyCode,
    openingBalanceMinorUnits: parseOpeningAmount(value.openingAmount, currencyCode),
    openingBalanceAt: parseOpeningDate(value.openingDate), note: value.note || null,
    startingBalanceLocked: false, hideFromSelection: false, hideFromReports: false,
    pocketEnabled: false, sortOrder: Math.max(-1, ...findAccountsByAccountTypeId(type.id, context).map((a) => a.sortOrder)) + 1,
    isArchived: options?.isArchived ?? false,
    createdAt: now, updatedAt: now,
  }, context);
  if (creditCardValues) {
    upsertCreditCardDetails({ accountId: id, ...creditCardValues }, context);
  }
  return id;
}
