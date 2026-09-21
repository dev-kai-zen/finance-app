import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";
import type { AccountGroup } from "@/modules/accounts/types/account.types";

export function isCreditCardAccountType(
  accountTypeId: string,
  accountTypeName: string | null | undefined,
): boolean {
  return (
    accountTypeId === SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_CREDIT_CARD ||
    accountTypeName?.trim().toLocaleLowerCase() === "credit card"
  );
}

export function supportsPockets(
  accountTypeId: string,
  accountGroup: AccountGroup | string | null | undefined,
  accountTypeName?: string | null,
): boolean {
  return (
    (accountGroup === "asset" || accountGroup === "liability") &&
    !isCreditCardAccountType(accountTypeId, accountTypeName)
  );
}
