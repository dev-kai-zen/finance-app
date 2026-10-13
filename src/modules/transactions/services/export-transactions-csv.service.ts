import { randomUUID } from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { TransactionListItem } from "@/modules/transactions/types/transaction.types";
import {
  buildTransactionsCsv,
  createTransactionsCsvFileName,
} from "@/modules/transactions/utils/transactions-csv";

function assertCsvExportAvailable(): void {
  if (process.env.EXPO_OS === "web") {
    throw new Error("CSV export is not available on web yet.");
  }
}

export async function exportTransactionsCsv(
  rows: readonly TransactionListItem[],
): Promise<void> {
  assertCsvExportAvailable();

  if (rows.length === 0) {
    throw new Error("There are no transactions to export.");
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Exporting files is not available on this device.");
  }

  const csv = buildTransactionsCsv(rows);
  const bytes = new TextEncoder().encode(`\uFEFF${csv}`);
  const name = createTransactionsCsvFileName();
  const destination = new File(Paths.cache, name);
  const temporary = new File(Paths.cache, `${name}.${randomUUID()}.tmp`);

  try {
    temporary.create({ intermediates: true, overwrite: true });
    temporary.write(bytes);
    await temporary.move(destination);
  } catch (error) {
    if (temporary.exists) temporary.delete();
    throw error;
  }

  await Sharing.shareAsync(destination.uri, {
    dialogTitle: "Export transactions",
    mimeType: "text/csv",
  });
}
