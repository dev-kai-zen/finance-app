import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { logTelemetryEvent } from "@/infrastructure/telemetry";
import { appLockLifecycle } from "@/modules/security";
import type { AccountListItem, PocketListItem } from "../types/account.types";
import {
  buildAccountsCsv,
  createAccountsCsvFileName,
} from "../utils/accounts-csv";

const CSV_MIME_TYPE = "text/csv";
const CSV_UTI = "public.comma-separated-values-text";
const ACCOUNTS_CSV_CACHE_DIR = "accounts-csv-exports";
const STALE_EXPORT_MAX_AGE_MS = 15 * 60 * 1000;

export class AccountCsvExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "AccountCsvExportCancelledError";
  }
}

function assertCsvExportAvailable(): void {
  if (process.env.EXPO_OS === "web") {
    throw new Error("CSV export is not available on web yet.");
  }
}

function buildAccountsCsvBytes(
  accounts: readonly AccountListItem[],
  pockets: readonly PocketListItem[] = [],
): Uint8Array {
  if (accounts.length === 0) {
    throw new Error("There are no accounts to export.");
  }

  const csv = buildAccountsCsv(accounts, pockets);
  return new TextEncoder().encode(`\uFEFF${csv}`);
}

function createUniqueAccountsCsvFileName(): string {
  const base = createAccountsCsvFileName();
  const suffix = randomUUID().slice(0, 8);
  return base.replace(/\.csv$/i, `-${suffix}.csv`);
}

function cleanupStaleCsvCacheFiles(cacheDir: Directory): void {
  try {
    if (!cacheDir.exists) {
      return;
    }
    const cutoff = Date.now() - STALE_EXPORT_MAX_AGE_MS;
    for (const entry of cacheDir.list()) {
      if (entry instanceof File && entry.name.endsWith(".csv")) {
        const lastModified = entry.lastModified ?? 0;
        if (lastModified > 0 && lastModified < cutoff) {
          entry.delete();
        }
      }
    }
  } catch {
    // Best-effort cleanup of stale export cache files
  }
}

function writeCsvCacheFile(bytes: Uint8Array, name: string): File {
  const cacheDir = new Directory(Paths.cache, ACCOUNTS_CSV_CACHE_DIR);
  if (!cacheDir.exists) {
    cacheDir.create({ intermediates: true, idempotent: true });
  } else {
    cleanupStaleCsvCacheFiles(cacheDir);
  }
  const file = new File(cacheDir, name);
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

export async function shareAccountsCsv(
  accounts: readonly AccountListItem[],
  pockets: readonly PocketListItem[] = [],
): Promise<void> {
  assertCsvExportAvailable();

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Exporting files is not available on this device.");
  }

  const bytes = buildAccountsCsvBytes(accounts, pockets);
  const name = createUniqueAccountsCsvFileName();
  const file = writeCsvCacheFile(bytes, name);

  // Android resolves shareAsync when the target app opens, before it finishes
  // reading the attachment URI. Keep the cache file intact for the receiving app
  // and prune stale exports on subsequent export calls instead.
  await appLockLifecycle.withLockSuspended(async () => {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Export accounts",
      mimeType: CSV_MIME_TYPE,
      UTI: CSV_UTI,
    });
  });
  const bracket =
    accounts.length < 100
      ? "under_100"
      : accounts.length <= 1000
        ? "100_to_1000"
        : "over_1000";
  logTelemetryEvent("csv_export_generated", { format: "csv", bracket });
}

export async function saveAccountsCsvToDevice(
  accounts: readonly AccountListItem[],
  pockets: readonly PocketListItem[] = [],
): Promise<{ fileName: string }> {
  assertCsvExportAvailable();

  const bytes = buildAccountsCsvBytes(accounts, pockets);
  const fileName = createUniqueAccountsCsvFileName();

  let directory: Directory;
  try {
    directory = await appLockLifecycle.withLockSuspended(async () => {
      return await Directory.pickDirectoryAsync();
    });
  } catch (error) {
    if (isPickerCancelledError(error)) {
      throw new AccountCsvExportCancelledError();
    }
    throw error;
  }

  const destination = directory.createFile(fileName, CSV_MIME_TYPE);
  destination.write(bytes);

  const bracket =
    accounts.length < 100
      ? "under_100"
      : accounts.length <= 1000
        ? "100_to_1000"
        : "over_1000";
  logTelemetryEvent("csv_export_generated", { format: "csv", bracket });

  return { fileName };
}
