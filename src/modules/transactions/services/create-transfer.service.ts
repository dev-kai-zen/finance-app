import { db, type DbContext } from "@/infrastructure/database/client";
import { requireAccount, requirePocketForAccount } from "@/modules/accounts";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import {
  generateId,
  insertTransaction,
} from "../repositories/transactions.repository";
import { assignTransactionLabels } from "@/modules/labels";
import type {
  CreateTransferInput,
  Transaction,
  TransferResult,
} from "../types/transaction.types";

export function createTransfer(input: CreateTransferInput): TransferResult {
  return db.transaction((tx) => createTransferInContext(input, tx));
}

export function createTransferInContext(
  input: CreateTransferInput,
  context: DbContext,
): TransferResult {
  if (!input.fromAccountId) {
    throw new Error("Source account ('From') is required.");
  }
  if (!input.toAccountId) {
    throw new Error("Destination account ('To') is required.");
  }
  if (
    input.fromAccountId === input.toAccountId &&
    (input.fromPocketId ?? null) === (input.toPocketId ?? null)
  ) {
    throw new Error("Choose different pockets when transferring within one account.");
  }
  if (!input.amountMinorUnits || input.amountMinorUnits <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (!Number.isInteger(input.amountMinorUnits)) {
    throw new Error("Transfer amount must be an integer in minor units (centavos).");
  }

  const fromAccount = requireAccount(input.fromAccountId, context);
  const toAccount = requireAccount(input.toAccountId, context);
  if (input.fromPocketId) {
    requirePocketForAccount(input.fromPocketId, fromAccount.id, context);
  }
  if (input.toPocketId) {
    requirePocketForAccount(input.toPocketId, toAccount.id, context);
  }

  if (input.fee && input.fee.amountMinorUnits > 0) {
    if (!input.fee.accountId) {
      throw new Error("Fee account is required.");
    }
    if (!input.fee.categoryId) {
      throw new Error("Fee category is required.");
    }
    if (!Number.isInteger(input.fee.amountMinorUnits)) {
      throw new Error("Fee amount must be an integer in minor units (centavos).");
    }
    const feeAccount = requireAccount(input.fee.accountId, context);
    if (input.fee.pocketId) {
      requirePocketForAccount(input.fee.pocketId, feeAccount.id, context);
    }
  }

  const groupId = generateId(context);
  const occurredAt =
    input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
  const name = input.name?.trim() || null;
  const note = input.note?.trim() || null;
  const amount = Math.abs(input.amountMinorUnits);

  const outLeg = insertTransaction(
    {
      accountId: input.fromAccountId,
      categoryId: null,
      pocketId: input.fromPocketId ?? null,
      transactionGroupId: groupId,
      type: "transfer",
      amountMinorUnits: -amount,
      name,
      note,
      occurredAt,
    },
    context,
  );

  const inLeg = insertTransaction(
    {
      accountId: input.toAccountId,
      categoryId: null,
      pocketId: input.toPocketId ?? null,
      transactionGroupId: groupId,
      type: "transfer",
      amountMinorUnits: amount,
      name,
      note,
      occurredAt,
    },
    context,
  );

  let feeLeg: Transaction | undefined;
  if (input.fee && input.fee.amountMinorUnits > 0) {
    const feeAmount = Math.abs(input.fee.amountMinorUnits);
    const feeName = name ? `${name} Fee` : "Transfer Fee";
    feeLeg = insertTransaction(
      {
        accountId: input.fee.accountId,
        categoryId: input.fee.categoryId,
        pocketId: input.fee.pocketId ?? null,
        transactionGroupId: groupId,
        type: "expense",
        amountMinorUnits: -feeAmount,
        name: feeName,
        note,
        occurredAt,
      },
      context,
    );
  }

  if (input.labelIds && input.labelIds.length > 0) {
    assignTransactionLabels(outLeg.id, input.labelIds, context);
    assignTransactionLabels(inLeg.id, input.labelIds, context);
    if (feeLeg) {
      assignTransactionLabels(feeLeg.id, input.labelIds, context);
    }
  }

  reconcileCreditCardBillingInContext(new Date(), context);
  return { transactionGroupId: groupId, outLeg, inLeg, feeLeg };
}
