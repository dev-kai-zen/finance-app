import * as DocumentPicker from "expo-document-picker";
import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { MAX_IMPORT_BYTES, type ImportKind } from "../types/import.types";
import { ImportValidationError, parseCsv } from "../utils/csv";
import { importDigest } from "../utils/import-preview";

export async function pickImportFile() {
  const picked = await DocumentPicker.getDocumentAsync({ type: ["text/*", "application/csv", "application/vnd.ms-excel", "application/octet-stream"], copyToCacheDirectory: true, multiple: false });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  try {
    if (!/\.(csv|tsv|txt)$/i.test(asset.name)) throw new ImportValidationError("fileType");
    if ((asset.size ?? new File(asset.uri).size) > MAX_IMPORT_BYTES) throw new ImportValidationError("fileSize");
    const text = await new File(asset.uri).text();
    return { name: asset.name, document: parseCsv(text), hash: importDigest(text), text };
  } finally {
    // DocumentPicker made a disposable cache copy; the source remains untouched.
    if (process.env.EXPO_OS !== "web" && asset.uri.startsWith(Paths.cache.uri)) {
      const copy = new File(asset.uri);
      if (copy.exists) copy.delete();
    }
  }
}

function importTemplateContents(kind: ImportKind): string {
  const csv = kind === "accounts"
    ? "Account,Account Type,Currency,Opening Balance,Balance Date\r\nCash,Wallet,PHP,1000.00,2026-01-01\r\nSavings,Bank,PHP,5000.00,2026-01-01\r\n"
    : "Date,Type,Amount,Currency,Account,To Account,Category,Subcategory,Name,Note,Labels,Source ID\r\n2026-01-02,expense,150.00,PHP,Cash,,Food,,Lunch,,Personal,example-1\r\n2026-01-03,income,2000.00,PHP,Savings,,Salary,,Pay,,Work,example-2\r\n2026-01-04,transfer,300.00,PHP,Savings,Cash,,,Withdrawal,,,example-3\r\n";
  return `\uFEFF${csv}`;
}

export async function shareImportTemplate(kind: ImportKind): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new ImportValidationError("sharing");
  const file = new File(Paths.cache, `kaizen-${kind}-import-template-${randomUUID()}.csv`);
  file.create({ overwrite: true });
  file.write(importTemplateContents(kind));
  // Android resolves when the target app opens, before it necessarily reads the
  // attachment. Leave this unique cache file available for the receiving app.
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
}

export async function downloadImportTemplate(kind: ImportKind): Promise<string | null> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (error instanceof Error && /cancel|dismiss/i.test(`${error.name} ${error.message}`)) return null;
    throw error;
  }
  const fileName = `kaizen-${kind}-import-template-${randomUUID().slice(0, 8)}.csv`;
  const destination = directory.createFile(fileName, "text/csv");
  destination.write(importTemplateContents(kind));
  return fileName;
}
