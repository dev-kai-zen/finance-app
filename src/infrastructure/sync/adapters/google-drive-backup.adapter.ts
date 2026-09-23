import { fetch } from "expo/fetch";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const BACKUP_NAME_PREFIX = "kaizen-finance-backup-";
const MAX_MULTIPART_BYTES = 5 * 1024 * 1024;
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "Kaizen Finance";
const BACKUPS_FOLDER_NAME = "Backups";
const APP_PROPERTY_KIND = "kaizenFinanceKind";
const ROOT_FOLDER_KIND = "root-folder";
const BACKUPS_FOLDER_KIND = "backups-folder";
const BACKUP_FILE_KIND = "encrypted-backup";
const LEGACY_FILE_ID_PROPERTY = "legacyFileId";
const ORIGINAL_CREATED_AT_PROPERTY = "originalCreatedAt";

export type GoogleDriveBackupLocation = "visible" | "legacy-hidden";

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
  location: GoogleDriveBackupLocation;
}

export interface GoogleDriveBackupCatalog {
  files: GoogleDriveBackupFile[];
  folderId: string;
  folderUrl: string;
  migratedCount: number;
  migrationFailureCount: number;
}

interface DriveFileResponse {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  appProperties?: Record<string, string>;
}

interface DriveFileListResponse {
  files?: DriveFileResponse[];
}

export class GoogleDriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleDriveApiError";
  }
}

export async function prepareGoogleDriveBackupCatalog(
  accessToken: string,
): Promise<GoogleDriveBackupCatalog> {
  const backupFolder = await ensureBackupFolder(accessToken);
  let visibleFiles = await listVisibleBackupFiles(
    accessToken,
    backupFolder.id,
  );
  const legacyFiles = await listLegacyBackupFiles(accessToken);
  const migratedLegacyIds = new Set(
    visibleFiles
      .map((file) => file.appProperties?.[LEGACY_FILE_ID_PROPERTY])
      .filter((id): id is string => Boolean(id)),
  );
  let migratedCount = 0;
  let migrationFailureCount = 0;

  for (const legacyFile of legacyFiles) {
    if (migratedLegacyIds.has(legacyFile.id)) continue;

    try {
      const bytes = await downloadGoogleDriveBackupFile(
        accessToken,
        legacyFile.id,
      );
      const migratedFile = await uploadBackupToFolder(
        accessToken,
        bytes,
        backupFolder.id,
        legacyFile.createdTime ?? new Date().toISOString(),
        legacyFile.name,
        legacyFile.id,
      );
      visibleFiles = [migratedFile, ...visibleFiles];
      migratedLegacyIds.add(legacyFile.id);
      migratedCount += 1;
    } catch {
      migrationFailureCount += 1;
    }
  }

  const unmigratedLegacyFiles = legacyFiles
    .filter((file) => !migratedLegacyIds.has(file.id))
    .map((file) => toBackupFile(file, "legacy-hidden"));
  const files = [...visibleFiles.map(toVisibleBackupFile), ...unmigratedLegacyFiles]
    .sort(
      (left, right) =>
        Date.parse(right.createdTime) - Date.parse(left.createdTime),
    );

  return {
    files,
    folderId: backupFolder.id,
    folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(backupFolder.id)}`,
    migratedCount,
    migrationFailureCount,
  };
}

async function listLegacyBackupFiles(
  accessToken: string,
): Promise<DriveFileResponse[]> {
  const query = [
    "spaces=appDataFolder",
    `q=${encodeURIComponent(`name contains '${BACKUP_NAME_PREFIX}'`)}`,
    "orderBy=createdTime desc",
    "pageSize=20",
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,size,appProperties)")}`,
  ].join("&");
  const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
  const body = (await response.json()) as DriveFileListResponse;
  return body.files ?? [];
}

export async function uploadGoogleDriveBackupFile(
  accessToken: string,
  bytes: Uint8Array,
  createdAt: Date,
): Promise<GoogleDriveBackupFile> {
  const backupFolder = await ensureBackupFolder(accessToken);
  const name = `${BACKUP_NAME_PREFIX}${createdAt
    .toISOString()
    .replaceAll(":", "-")}.kfb`;

  return uploadBackupToFolder(
    accessToken,
    bytes,
    backupFolder.id,
    createdAt.toISOString(),
    name,
  ).then(toVisibleBackupFile);
}

async function uploadBackupToFolder(
  accessToken: string,
  bytes: Uint8Array,
  folderId: string,
  originalCreatedAt: string,
  name: string,
  legacyFileId?: string,
): Promise<DriveFileResponse> {
  if (bytes.byteLength > MAX_MULTIPART_BYTES) {
    throw new Error(
      "This backup is larger than 5 MB. Resumable uploads are not available in Phase 1.",
    );
  }

  const boundary = `kaizen-finance-${Date.now()}`;
  const encoder = new TextEncoder();
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
    appProperties: {
      [APP_PROPERTY_KIND]: BACKUP_FILE_KIND,
      [ORIGINAL_CREATED_AT_PROPERTY]: originalCreatedAt,
      ...(legacyFileId ? { [LEGACY_FILE_ID_PROPERTY]: legacyFileId } : {}),
    },
  });
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = joinBytes(prefix, bytes, suffix);
  const fields = encodeURIComponent(
    "id,name,createdTime,modifiedTime,size,appProperties",
  );
  const response = await driveFetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=${fields}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body as BodyInit,
    },
  );
  const file = (await response.json()) as DriveFileResponse;

  return { ...file, size: file.size ?? String(bytes.byteLength) };
}

export async function downloadGoogleDriveBackupFile(
  accessToken: string,
  fileId: string,
): Promise<Uint8Array> {
  const response = await driveFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`,
    accessToken,
  );
  return new Uint8Array(await response.arrayBuffer());
}

async function ensureBackupFolder(
  accessToken: string,
): Promise<DriveFileResponse> {
  const rootFolder = await findOrCreateFolder(
    accessToken,
    ROOT_FOLDER_NAME,
    ROOT_FOLDER_KIND,
  );

  return findOrCreateFolder(
    accessToken,
    BACKUPS_FOLDER_NAME,
    BACKUPS_FOLDER_KIND,
    rootFolder.id,
  );
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  kind: string,
  parentId?: string,
): Promise<DriveFileResponse> {
  const parentQuery = parentId
    ? ` and '${escapeDriveQueryValue(parentId)}' in parents`
    : "";
  const q =
    `mimeType = '${FOLDER_MIME_TYPE}' and trashed = false${parentQuery}` +
    ` and appProperties has { key='${APP_PROPERTY_KIND}' and value='${kind}' }`;
  const query = [
    "spaces=drive",
    `q=${encodeURIComponent(q)}`,
    "pageSize=1",
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,appProperties)")}`,
  ].join("&");
  const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
  const body = (await response.json()) as DriveFileListResponse;
  const existing = body.files?.[0];
  if (existing) return existing;

  return createDriveMetadataFile(accessToken, {
    name,
    mimeType: FOLDER_MIME_TYPE,
    ...(parentId ? { parents: [parentId] } : {}),
    appProperties: { [APP_PROPERTY_KIND]: kind },
  });
}

async function listVisibleBackupFiles(
  accessToken: string,
  folderId: string,
): Promise<DriveFileResponse[]> {
  const q =
    `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false` +
    ` and appProperties has { key='${APP_PROPERTY_KIND}' and value='${BACKUP_FILE_KIND}' }`;
  const query = [
    "spaces=drive",
    `q=${encodeURIComponent(q)}`,
    "orderBy=createdTime desc",
    "pageSize=100",
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,size,appProperties)")}`,
  ].join("&");
  const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
  const body = (await response.json()) as DriveFileListResponse;
  return body.files ?? [];
}

async function createDriveMetadataFile(
  accessToken: string,
  metadata: Record<string, unknown>,
): Promise<DriveFileResponse> {
  const fields = encodeURIComponent(
    "id,name,createdTime,modifiedTime,appProperties",
  );
  const response = await driveFetch(
    `${DRIVE_FILES_URL}?fields=${fields}`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(metadata),
    },
  );
  return (await response.json()) as DriveFileResponse;
}

function toVisibleBackupFile(file: DriveFileResponse): GoogleDriveBackupFile {
  return toBackupFile(file, "visible");
}

function toBackupFile(
  file: DriveFileResponse,
  location: GoogleDriveBackupLocation,
): GoogleDriveBackupFile {
  const createdTime =
    file.appProperties?.[ORIGINAL_CREATED_AT_PROPERTY] ??
    file.createdTime ??
    new Date(0).toISOString();

  return {
    id: file.id,
    name: file.name,
    createdTime,
    modifiedTime: file.modifiedTime ?? createdTime,
    size: Number(file.size ?? 0),
    location,
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function driveFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new GoogleDriveApiError(
        getDriveErrorMessage(response.status, details),
        response.status,
      );
    }

    return response;
  } catch (error) {
    if (error instanceof GoogleDriveApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GoogleDriveApiError("Google Drive did not respond in time.", 0);
    }
    throw new GoogleDriveApiError("Unable to reach Google Drive.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

function getDriveErrorMessage(status: number, details: string): string {
  if (status === 401) return "Your Google session expired. Please sign in again.";
  if (status === 403) return "Google Drive access was denied for this account.";
  if (status === 404) return "That backup no longer exists in Google Drive.";

  try {
    const parsed = JSON.parse(details) as { error?: { message?: string } };
    return parsed.error?.message ?? `Google Drive request failed (${status}).`;
  } catch {
    return `Google Drive request failed (${status}).`;
  }
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((length, part) => length + part.byteLength, 0),
  );
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.byteLength;
  });
  return output;
}
