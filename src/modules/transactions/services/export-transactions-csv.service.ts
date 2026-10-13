import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { TransactionListItem } from "@/modules/transactions/types/transaction.types";
import {
  buildTransactionsCsv,
  createTransactionsCsvFileName,
} from "@/modules/transactions/utils/transactions-csv";

const CSV_MIME_TYPE = "text/csv";

export class TransactionCsvExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "TransactionCsvExportCancelledError";
  }
}

function assertCsvExportAvailable(): void {
  if (process.env.EXPO_OS === "web") {
    throw new Error("CSV export is not available on web yet.");
  }
}

function buildTransactionsCsvBytes(
  rows: readonly TransactionListItem[],
): Uint8Array {
  if (rows.length === 0) {
    throw new Error("There are no transactions to export.");
  }

  const csv = buildTransactionsCsv(rows);
  return new TextEncoder().encode(`\uFEFF${csv}`);
}

function createUniqueTransactionsCsvFileName(): string {
  const base = createTransactionsCsvFileName();
  const suffix = randomUUID().slice(0, 8);
  return base.replace(/\.csv$/i, `-${suffix}.csv`);
}

function writeCsvCacheFile(bytes: Uint8Array, name: string): File {
  const file = new File(Paths.cache, name);
  file.create({ intermediates: true, overwrite: true });
  file.write(bytes);
  return file;
}

function isPickerCancelledError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("cancel") ||
    message.includes("picker was dismissed") ||
    error.name.toLowerCase().includes("cancel")
  );
}

export async function shareTransactionsCsv(
  rows: readonly TransactionListItem[],
): Promise<void> {
  assertCsvExportAvailable();

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Exporting files is not available on this device.");
  }

  const bytes = buildTransactionsCsvBytes(rows);
  const name = createUniqueTransactionsCsvFileName();
  const file = writeCsvCacheFile(bytes, name);

  try {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Export transactions",
      mimeType: CSV_MIME_TYPE,
    });
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}

export async function saveTransactionsCsvToDevice(
  rows: readonly TransactionListItem[],
): Promise<{ fileName: string }> {
  assertCsvExportAvailable();

  const bytes = buildTransactionsCsvBytes(rows);
  const fileName = createUniqueTransactionsCsvFileName();

  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isPickerCancelledError(error)) {
      throw new TransactionCsvExportCancelledError();
    }
    throw error;
  }

  const destination = directory.createFile(fileName, CSV_MIME_TYPE);
  destination.write(bytes);

  return { fileName };
}

/** @deprecated Use shareTransactionsCsv or saveTransactionsCsvToDevice. */
export async function exportTransactionsCsv(
  rows: readonly TransactionListItem[],
): Promise<void> {
  await shareTransactionsCsv(rows);
}
