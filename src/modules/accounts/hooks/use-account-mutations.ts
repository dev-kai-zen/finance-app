import { useRef, useState } from "react";
import { lockAccountStartingBalance } from "@/modules/accounts/services/lock-account-starting-balance.service";
import { saveAccount } from "@/modules/accounts/services/save-account.service";
import { saveAccountType } from "@/modules/accounts/services/save-account-type.service";
import { setAccountArchived } from "@/modules/accounts/services/archive-account.service";
import { deleteAccountType } from "@/modules/accounts/services/delete-account-type.service";
import {
  moveAccount,
  reorderAccountsList,
  reorderAccountTypesList,
} from "@/modules/accounts/services/reorder-accounts.service";
import { accountErrorMessage, type AccountInput, type AccountTypeInput } from "@/modules/accounts/schemas/account.schema";
import { savePocket } from "@/modules/accounts/services/save-pocket.service";
import { movePocketFunds } from "@/modules/accounts/services/move-pocket-funds.service";
import { setPocketArchived } from "@/modules/accounts/services/archive-pocket.service";
import type { MovePocketFundsInput, PocketInput } from "@/modules/accounts/types/account.types";

export function useAccountMutations(onSuccess: () => void) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (operation: () => unknown): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await Promise.resolve();
      operation();
      onSuccess();
      return true;
    } catch (cause) {
      setError(accountErrorMessage(cause));
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return {
    pending, error, clearError: () => setError(null),
    saveAccount: (input: AccountInput, id?: string) => run(() => saveAccount(input, id)),
    lockStartingBalance: (id: string) => run(() => lockAccountStartingBalance(id)),
    saveType: (input: AccountTypeInput, id?: string) => run(() => saveAccountType(input, id)),
    archiveAccount: (id: string, archived: boolean) => run(() => setAccountArchived(id, archived)),
    savePocket: (input: PocketInput, id?: string) => run(() => savePocket(input, id)),
    movePocketFunds: (input: MovePocketFundsInput) => run(() => movePocketFunds(input)),
    archivePocket: (id: string, archived: boolean) => run(() => setPocketArchived(id, archived)),
    deleteType: (id: string) => run(() => deleteAccountType(id)),
    moveAccount: (id: string, direction: -1 | 1) => run(() => moveAccount(id, direction)),
    reorderAccounts: (orderedIds: string[]) => run(() => reorderAccountsList(orderedIds)),
    reorderAccountTypes: (orderedIds: string[]) => run(() => reorderAccountTypesList(orderedIds)),
  };
}
export type AccountMutations = ReturnType<typeof useAccountMutations>;
