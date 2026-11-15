import { db, type DbContext } from "@/infrastructure/database/client";
import { listImportComparisonTransactions } from "../repositories/import-transactions.repository";
import { createTransactionInContext } from "./create-transaction.service";
import { createTransferInContext } from "./create-transfer.service";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import type { CreateTransactionInput, CreateTransferInput } from "../types/transaction.types";

// This domain exposes its own ledger; import orchestration never reads its tables.
export function getTransactionImportCatalog(context: DbContext = db) {
  const rows = listImportComparisonTransactions(context);
  const groups = new Map<string, typeof rows>();
  for (const row of rows) if (row.transactionGroupId && row.type === "transfer") {
    const group = groups.get(row.transactionGroupId) ?? [];
    group.push(row); groups.set(row.transactionGroupId, group);
  }
  return rows.filter((r) => r.type !== "transfer" || r.amountMinorUnits < 0).map((r) => ({
    type: r.type, accountId: r.accountId, amount: r.type === "transfer" ? Math.abs(r.amountMinorUnits) : r.amountMinorUnits,
    date: r.occurredAt, name: r.name ?? "",
    toAccountId: r.type === "transfer" ? groups.get(r.transactionGroupId ?? "")?.find((other) => other.amountMinorUnits > 0)?.accountId ?? "" : "",
  }));
}

export type ImportedTransactionCommand = { kind: "transaction"; input: CreateTransactionInput } | { kind: "transfer"; input: CreateTransferInput };
export function createImportedTransactions(commands: ImportedTransactionCommand[], context: DbContext): string[][] {
  const ids = commands.map((command) => {
    if (command.kind === "transaction") return [createTransactionInContext(command.input, context, { reconcileBilling: false }).id];
    const result = createTransferInContext(command.input, context, { reconcileBilling: false });
    return [result.outLeg.id, result.inLeg.id];
  });
  reconcileCreditCardBillingInContext(new Date(), context);
  return ids;
}
