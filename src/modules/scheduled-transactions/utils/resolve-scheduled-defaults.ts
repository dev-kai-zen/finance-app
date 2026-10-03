import type { AccountListItem, PocketListItem } from "@/modules/accounts";
import type { ScheduledTransactionType } from "../types/scheduled-transaction.types";

export interface ScheduledDefaultLocation {
  accountId: string;
  pocketId: string | null;
}

export interface ResolveScheduledDefaultLocationParams {
  transactionType: ScheduledTransactionType;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  defaultExpenseAccountId?: string | null;
  defaultExpensePocketId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultIncomePocketId?: string | null;
}

export function resolveScheduledDefaultLocation({
  transactionType,
  accounts,
  pockets,
  defaultExpenseAccountId,
  defaultExpensePocketId,
  defaultIncomeAccountId,
  defaultIncomePocketId,
}: ResolveScheduledDefaultLocationParams): ScheduledDefaultLocation {
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const targetAccountId =
    transactionType === "income"
      ? defaultIncomeAccountId
      : defaultExpenseAccountId;
  const targetPocketId =
    transactionType === "income"
      ? defaultIncomePocketId
      : defaultExpensePocketId;

  if (targetAccountId) {
    const defaultAccount = activeAccounts.find((a) => a.id === targetAccountId);
    if (defaultAccount) {
      const defaultPocket = targetPocketId
        ? pockets.find(
            (p) =>
              p.id === targetPocketId &&
              p.accountId === defaultAccount.id &&
              !p.isArchived,
          )
        : null;
      return {
        accountId: defaultAccount.id,
        pocketId: defaultPocket ? defaultPocket.id : null,
      };
    }
  }

  const fallbackAccount = activeAccounts[0] ?? accounts[0];
  return {
    accountId: fallbackAccount?.id ?? "",
    pocketId: null,
  };
}
