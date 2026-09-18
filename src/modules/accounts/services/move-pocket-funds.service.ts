import { db } from "@/infrastructure/database/client";
import {
  insertPocketMovement,
  newPocketRecordId,
} from "@/modules/accounts/repositories/pockets.repository";
import { requireAccount } from "@/modules/accounts/services/account-rules";
import { getAccountsWithBalances } from "@/modules/accounts/services/get-accounts-with-balances.service";
import {
  getAvailablePocketBalance,
  getPocketsWithBalances,
} from "@/modules/accounts/services/get-pockets-with-balances.service";
import { requirePocketForAccount } from "@/modules/accounts/services/pocket-rules";
import type { MovePocketFundsInput } from "@/modules/accounts/types/account.types";

export function movePocketFunds(input: MovePocketFundsInput): string {
  if (!input.accountId) throw new Error("Account is required.");
  if (!Number.isSafeInteger(input.amountMinorUnits) || input.amountMinorUnits <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  if (!input.fromPocketId && !input.toPocketId) {
    throw new Error("Choose at least one pocket.");
  }
  if (input.fromPocketId === input.toPocketId) {
    throw new Error("Choose two different locations.");
  }

  return db.transaction((tx) => {
    const account = requireAccount(input.accountId, tx);
    const fromPocket = input.fromPocketId
      ? requirePocketForAccount(input.fromPocketId, account.id, tx)
      : null;
    if (input.toPocketId) {
      requirePocketForAccount(input.toPocketId, account.id, tx);
    }

    const pocketBalances = getPocketsWithBalances(tx);
    const accountBalance = getAccountsWithBalances(tx).find((item) => item.id === account.id)
      ?.currentBalanceMinorUnits ?? account.openingBalanceMinorUnits;
    const sourceBalance = fromPocket
      ? pocketBalances.find((pocket) => pocket.id === fromPocket.id)
          ?.currentBalanceMinorUnits ?? 0
      : getAvailablePocketBalance(account.id, accountBalance, tx);
    if (sourceBalance < input.amountMinorUnits) {
      throw new Error(`${fromPocket?.name ?? "Available"} does not have enough funds.`);
    }

    const id = newPocketRecordId(tx);
    insertPocketMovement(
      {
        id,
        accountId: account.id,
        fromPocketId: input.fromPocketId,
        toPocketId: input.toPocketId,
        amountMinorUnits: input.amountMinorUnits,
        note: input.note?.trim() || null,
        occurredAt: input.occurredAt ?? new Date(),
        createdAt: new Date(),
      },
      tx,
    );
    return id;
  });
}
