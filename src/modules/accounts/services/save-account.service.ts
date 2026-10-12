import { db } from "@/infrastructure/database/client";
import { accountInputSchema, type AccountInput } from "@/modules/accounts/schemas/account.schema";
import { findAccountsByAccountTypeId, insertAccount, newAccountRecordId, updateAccountRecord } from "@/modules/accounts/repositories/accounts.repository";
import {
  deleteCreditCardDetails,
  upsertCreditCardDetails,
} from "@/modules/accounts/repositories/credit-card-details.repository";
import { listPocketsForAccount } from "@/modules/accounts/repositories/pockets.repository";
import {
  localDateInput,
  parseBillingDay,
  parseCreditLimit,
  parseMaintainingAmount,
  parseOpeningAmount,
  parseOpeningDate,
} from "@/modules/accounts/utils/account-input";
import { requireAccount, requireAccountType } from "@/modules/accounts/services/account-rules";
import {
  isCreditCardAccountType,
  supportsPockets,
} from "@/modules/accounts/utils/pocket-eligibility";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import { canChangeAccountCurrency } from "@/modules/accounts/services/can-change-account-currency.service";

function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase();
}

export function saveAccount(input: AccountInput, id?: string): string {
  const value = accountInputSchema.parse(input);
  return db.transaction((tx) => {
    const existing = id ? requireAccount(id, tx) : null;
    let currencyCode: string;
    if (existing) {
      const existingCurrency = normalizeCurrencyCode(existing.currencyCode);
      if (value.currencyCode === undefined) {
        currencyCode = existingCurrency;
      } else {
        const requestedCurrency = normalizeCurrencyCode(value.currencyCode);
        if (requestedCurrency !== existingCurrency) {
          if (!canChangeAccountCurrency(existing.id, tx)) {
            throw new Error(
              "Cannot change currency after transactions have been recorded for this account.",
            );
          }
          currencyCode = requestedCurrency;
        } else {
          currencyCode = existingCurrency;
        }
      }
    } else {
      currencyCode = normalizeCurrencyCode(value.currencyCode ?? "PHP");
    }
    const type = requireAccountType(value.accountTypeId, tx);
    const creditCardType = isCreditCardAccountType(type.id, type.name);
    if (creditCardType && !value.creditCardDetails) {
      throw new Error("Enter the credit card limit, statement day, and payment due day.");
    }
    const creditCardValues = value.creditCardDetails
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
    const pocketEligible = supportsPockets(type.id, type.accountGroup, type.name);
    if (value.pocketEnabled && !pocketEligible) {
      throw new Error("Pockets are not available for Credit Card accounts.");
    }
    if (
      existing &&
      (!pocketEligible || !value.pocketEnabled) &&
      listPocketsForAccount(existing.id, tx).some((pocket) => !pocket.isArchived)
    ) {
      throw new Error(
        "Archive every active pocket before disabling pockets for this account.",
      );
    }
    let openingBalanceMinorUnits = parseOpeningAmount(
      value.openingAmount,
      currencyCode,
    );
    let openingBalanceAt = existing && localDateInput(existing.openingBalanceAt) === value.openingDate
      ? existing.openingBalanceAt : parseOpeningDate(value.openingDate);
    if (existing?.startingBalanceLocked) {
      if (
        existing.openingBalanceMinorUnits !== openingBalanceMinorUnits ||
        existing.openingBalanceAt.getTime() !== openingBalanceAt.getTime()
      ) {
        throw new Error("Starting balance is locked and can no longer be changed.");
      }
      openingBalanceMinorUnits = existing.openingBalanceMinorUnits;
      openingBalanceAt = existing.openingBalanceAt;
    }
    const maintainingBalanceMinorUnits = value.maintainingAmount?.trim()
      ? parseMaintainingAmount(value.maintainingAmount, currencyCode)
      : null;
    const now = new Date();
    const sortOrder = existing && existing.accountTypeId === type.id ? existing.sortOrder
      : Math.max(-1, ...findAccountsByAccountTypeId(type.id, tx).map((a) => a.sortOrder)) + 1;
    const note = value.note?.trim() ? value.note.trim() : null;
    const iconKey = value.iconKey?.trim() ? value.iconKey.trim() : null;
    const values = {
      name: value.name,
      note,
      iconKey,
      accountTypeId: type.id,
      openingBalanceMinorUnits,
      openingBalanceAt,
      hideFromSelection: value.hideFromSelection,
      hideFromReports: value.hideFromReports,
      pocketEnabled: pocketEligible && value.pocketEnabled,
      maintainingBalanceMinorUnits,
      sortOrder,
      updatedAt: now,
    };
    let accountId: string;
    if (existing) {
      updateAccountRecord(
        existing.id,
        {
          ...values,
          currencyCode,
        },
        tx,
      );
      accountId = existing.id;
    } else {
      accountId = newAccountRecordId(tx);
      insertAccount(
        {
          ...values,
          id: accountId,
          currencyCode,
          startingBalanceLocked: false,
          createdAt: now,
        },
        tx,
      );
    }

    if (creditCardType && creditCardValues) {
      upsertCreditCardDetails(
        { accountId, ...creditCardValues },
        tx,
      );
    } else {
      deleteCreditCardDetails(accountId, tx);
    }

    reconcileCreditCardBillingInContext(new Date(), tx);
    return accountId;
  });
}
