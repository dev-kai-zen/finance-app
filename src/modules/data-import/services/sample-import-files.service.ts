import { randomUUID } from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { ImportType } from "../types/data-import.types";

const BOM = "\uFEFF";

export const SAMPLE_TRANSACTIONS_CSV =
  `${BOM}Date,Type,Amount,Currency,Account,To Account,Category,Subcategory,Name,Note,Labels,Source ID\r\n` +
  `2026-03-24,Expense,150.00,PHP,Cash,,Food,Groceries,Supermarket,Weekly groceries,Essentials;Food,tx_sample_1\r\n` +
  `2026-03-25,Income,25000.00,PHP,Bank Account,,Salary,Monthly,Acme Corp,March salary,Income;Work,tx_sample_2\r\n` +
  `2026-03-26,Transfer,5000.00,PHP,Bank Account,Cash,,,ATM Withdrawal,Cash for the week,,tx_sample_3\r\n`;

export const SAMPLE_ACCOUNTS_CSV =
  `${BOM}Account,Account Type,Currency,Opening Balance,Balance Date\r\n` +
  `Cash,Cash,PHP,1500.00,2026-01-01\r\n` +
  `Bank Account,Savings,PHP,25000.00,2026-01-01\r\n`;

/**
 * Creates a unique sample CSV file on disk with BOM and leaves it available.
 */
export async function createSampleFile(type: ImportType): Promise<{ uri: string; name: string }> {
  const content = type === "transactions" ? SAMPLE_TRANSACTIONS_CSV : SAMPLE_ACCOUNTS_CSV;
  const suffix = randomUUID().slice(0, 8);
  const name = `kaizen-example-${type}-${suffix}.csv`;
  const file = new File(Paths.cache, name);

  file.create({ intermediates: true, overwrite: true });
  file.write(content);

  return { uri: file.uri, name };
}

/**
 * Shares the example CSV file with other apps.
 */
export async function shareSampleFile(type: ImportType): Promise<void> {
  const { uri, name } = await createSampleFile(type);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Share Example ${type === "transactions" ? "Transactions" : "Accounts"} CSV`,
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  } else {
    throw new Error("Sharing is not available on this device.");
  }
}

/**
 * Downloads or saves the example CSV file to device storage.
 */
export async function downloadSampleFile(type: ImportType): Promise<{ uri: string; name: string }> {
  const fileInfo = await createSampleFile(type);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileInfo.uri, {
      dialogTitle: `Save Example ${type === "transactions" ? "Transactions" : "Accounts"} CSV`,
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  }
  return fileInfo;
}

