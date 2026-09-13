import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";
import type { AccountType } from "@/modules/accounts/types/account.types";

export function isProtectedAccountType(type: AccountType) {
  return type.isSystem || Object.values(SYSTEM_ACCOUNT_TYPE_IDS).some((id) => id === type.id);
}
