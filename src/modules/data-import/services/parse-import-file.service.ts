import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  MAX_IMPORT_DATA_ROWS,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "../constants/data-import.constants";
import type { ParsedCsvFile } from "../types/data-import.types";
import { parseDelimitedText } from "../utils/csv-tokenizer";
import { hashString } from "../utils/source-identity";

export interface PickAndParseResult {
  canceled: boolean;
  file?: ParsedCsvFile;
  error?: string;
}

/**
 * Validates and parses raw text or bytes into a structured ParsedCsvFile.
 */
export function parseRawCsvContent(
  content: string,
  fileName: string,
  fileSizeBytes: number,
): ParsedCsvFile {
  if (fileSizeBytes > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error("The selected file is larger than 2 MB. Please select a smaller file.");
  }

  const { delimiter, headers, rows } = parseDelimitedText(content);

  if (rows.length === 0) {
    throw new Error("The file has headers but does not contain any data rows.");
  }

  if (rows.length > MAX_IMPORT_DATA_ROWS) {
    throw new Error(
      `The file contains ${rows.length} data rows. A maximum of ${MAX_IMPORT_DATA_ROWS} rows can be imported at once.`,
    );
  }

  const fileHash = hashString(content);

  return {
    fileName,
    fileSizeBytes,
    delimiter,
    headers,
    rawRows: rows,
    fileHash,
  };
}

/**
 * Opens the system document picker, reads and parses the chosen CSV/TSV/TXT file,
 * then immediately deletes the temporary cache copy without storing the raw file.
 */
export async function pickAndParseImportFile(): Promise<PickAndParseResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "text/tab-separated-values",
      "text/plain",
      "application/vnd.ms-excel",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  const tempFile = new File(asset.uri);

  let rawBytes: Uint8Array;
  try {
    if (!tempFile.exists) {
      return { canceled: false, error: "Unable to read the chosen file." };
    }
    rawBytes = await tempFile.bytes();
  } catch (err: any) {
    return { canceled: false, error: err?.message || "Failed to read the file." };
  } finally {
    // Delete temporary cache copy made by document picker immediately!
    try {
      if (tempFile.exists) {
        tempFile.delete();
      }
    } catch {
      // Best-effort cleanup
    }
  }

  const size = asset.size ?? rawBytes.byteLength;
  if (size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return {
      canceled: false,
      error: "The selected file is larger than 2 MB. Please select a smaller file.",
    };
  }

  // Verify UTF-8 decoding
  let decodedText: string;
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decodedText = decoder.decode(rawBytes);
  } catch {
    return {
      canceled: false,
      error: "The file is not valid UTF-8 text. Please save it as UTF-8 and try again.",
    };
  }

  try {
    const parsed = parseRawCsvContent(decodedText, asset.name, size);
    return {
      canceled: false,
      file: parsed,
    };
  } catch (err: any) {
    return {
      canceled: false,
      error: err?.message || "Unable to parse the file.",
    };
  }
}

