import { db, type DbContext } from "@/infrastructure/database/client";
import { listImportComparisonTransactions, type ImportComparisonCandidate } from "../repositories/import-transactions.repository";
import { createTransactionInContext } from "./create-transaction.service";
import { createTransferInContext } from "./create-transfer.service";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import type { CreateTransactionInput, CreateTransferInput } from "../types/transaction.types";

// This domain exposes its own ledger; import orchestration never reads its tables.
export function* getTransactionImportCatalog(
  candidates: ImportComparisonCandidate[], context: DbContext = db,
) {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = JSON.stringify([candidate.type, candidate.accountId, candidate.amount, candidate.date.toDateString()]);
    if (seen.has(key)) continue;
    seen.add(key);
    let cursor: { date: Date; id: string } | undefined;
    while (true) {
      const rows = listImportComparisonTransactions(candidate, context, cursor);
      // Pages are bounded even when many ledger records share an identity.
      yield rows.map((r) => ({
        type: r.type, accountId: r.accountId, amount: r.type === "transfer" ? Math.abs(r.amountMinorUnits) : r.amountMinorUnits,
        date: r.occurredAt, name: r.name ?? "", toAccountId: r.type === "transfer" ? r.toAccountId : "",
      }));
      if (rows.length < 500) break;
      const last = rows[rows.length - 1];
      cursor = { date: last.occurredAt, id: last.id };
    }
  }
}

export type ImportedTransactionCommand = { kind: "transaction"; input: CreateTransactionInput } | { kind: "transfer"; input: CreateTransferInput };
export function createImportedTransactions(commands: ImportedTransactionCommand[], context: DbContext): string[][] {
  const work = createImportedTransactionsWork(commands, context);
  let result = work.next();
  while (!result.done) result = work.next();
  reconcileCreditCardBillingInContext(new Date(), context);
  return result.value;
}

/** Only run cooperatively on an isolated staging database, never an open live transaction. */
export function* createImportedTransactionsWork(commands: ImportedTransactionCommand[], context: DbContext): Generator<void, string[][]> {
  const ids: string[][] = [];
  for (const command of commands) {
    yield;
    if (command.kind === "transaction") ids.push([createTransactionInContext(command.input, context, { reconcileBilling: false }).id]);
    else {
      const result = createTransferInContext(command.input, context, { reconcileBilling: false });
      ids.push([result.outLeg.id, result.inLeg.id]);
    }
  }
  return ids;
}
