import { fetch } from "expo/fetch";
import { File, UploadType } from "expo-file-system";
import { uploadResumableDriveBackup } from "./google-drive-resumable-upload";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const BACKUP_NAME_PREFIX = "kaizen-finance-backup-";
const MAX_DRIVE_APP_PROPERTY_BYTES = 124;
const MAX_QUICK_SYNC_PROPERTY_VALUE_BYTES = 80;
const utf8Encoder = new TextEncoder();
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "Kaizen Finance";
const BACKUPS_FOLDER_NAME = "Backups";
const ATTACHMENTS_FOLDER_NAME = "Attachments";
const APP_PROPERTY_KIND = "kaizenFinanceKind";
const ROOT_FOLDER_KIND = "root-folder";
const BACKUPS_FOLDER_KIND = "backups-folder";
const BACKUP_FILE_KIND = "encrypted-backup";
const ATTACHMENTS_FOLDER_KIND = "attachments-folder";
const ATTACHMENT_FILE_KIND = "transaction-attachment";
const NOTES_ATTACHMENTS_FOLDER_NAME = "Notes Attachments";
const NOTES_ATTACHMENTS_FOLDER_KIND = "notes-attachments-folder";
const NOTE_ATTACHMENT_FILE_KIND = "note-attachment";
const BACKUP_PROTECTION_PROPERTY = "backupProtection";
const LEGACY_FILE_ID_PROPERTY = "legacyFileId";
const ORIGINAL_CREATED_AT_PROPERTY = "originalCreatedAt";
export const QUICK_SYNC_BACKUP_NAME = "kaizen-finance-quick-sync.kfb";
export const QUICK_SYNC_PROPERTY = "isQuickSync";
export const QUICK_SYNC_DEVICE_ID_PROPERTY = "lastUpdatedByDeviceId";
export const QUICK_SYNC_DEVICE_NAME_PROPERTY = "lastUpdatedByDeviceName";
export const QUICK_SYNC_REVISION_ID_PROPERTY = "syncRevisionId";

export type GoogleDriveBackupLocation = "visible" | "legacy-hidden";

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
  location: GoogleDriveBackupLocation;
  passwordProtected: boolean;
  attachmentCoverage?: "included" | "legacy-records-only";
}

export interface GoogleDriveQuickSyncMetadata extends GoogleDriveBackupFile {
  concurrentFile?: GoogleDriveQuickSyncMetadata;
  revisionToken?: string;
  tipTokens?: string[];
  hasConcurrentRevisions?: boolean;
  version: number | null;
  headRevisionId: string | null;
  trashed: boolean;
  syncRevisionId: string | null;
  lastUpdatedByDeviceId: string | null;
  lastUpdatedByDeviceName: string | null;
}

export interface GoogleDriveQuickSyncDeviceProperties {
  assertCurrent?: () => void;
  attachmentCoverage?: "included" | "legacy-records-only";
  parentTokens?: readonly string[];
  deviceId?: string | null;
  deviceName?: string | null;
  syncRevisionId?: string | null;
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
  version?: string;
  headRevisionId?: string;
  trashed?: boolean;
  appProperties?: Record<string, string>;
}

interface DriveFileListResponse {
  files?: DriveFileResponse[];
  nextPageToken?: string;
}

export interface GoogleDriveAttachmentFile {
  id: string;
  name: string;
  size: number;
}

export class GoogleDriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable = false,
    public readonly retryAfterMs = 0,
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
    .filter((file) => !isQuickSyncBackupFile(file))
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
  passwordProtected: boolean,
  attachmentCoverage?: "included" | "legacy-records-only",
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
    undefined,
    passwordProtected,
    attachmentCoverage ? { backupAttachmentCoverage: attachmentCoverage } : undefined,
  ).then(toVisibleBackupFile);
}

async function uploadBackupToFolder(
  accessToken: string,
  bytes: Uint8Array,
  folderId: string,
  originalCreatedAt: string,
  name: string,
  legacyFileId?: string,
  passwordProtected = true,
  extraProperties?: Record<string, string>,
  assertCurrent?: () => void,
): Promise<DriveFileResponse> {
  return uploadResumableDriveBackup<DriveFileResponse>(
    (url, options, accepted) => driveFetch(url, accessToken, options, accepted),
    bytes,
    {
      name,
      parents: [folderId],
      appProperties: {
        [APP_PROPERTY_KIND]: BACKUP_FILE_KIND,
        [ORIGINAL_CREATED_AT_PROPERTY]: originalCreatedAt,
        [BACKUP_PROTECTION_PROPERTY]: passwordProtected ? "password" : "none",
        ...(legacyFileId ? { [LEGACY_FILE_ID_PROPERTY]: legacyFileId } : {}),
        ...(extraProperties ?? {}),
      },
    },
    assertCurrent,
  );
}

export async function pruneLegacyQuickSyncFiles(
  accessToken: string,
): Promise<number> {
  try {
    const q = `trashed = false and (name contains 'quick-sync-' or appProperties has { key='quickSyncProtocol' and value='2' }) and name != '${QUICK_SYNC_BACKUP_NAME}'`;
    const query = [
      "spaces=drive",
      `q=${encodeURIComponent(q)}`,
      "pageSize=20",
      `fields=${encodeURIComponent("files(id,name)")}`,
    ].join("&");
    const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
    const body = (await response.json()) as DriveFileListResponse;
    const files = body.files ?? [];
    for (const file of files) {
      await driveFetch(`${DRIVE_FILES_URL}/${encodeURIComponent(file.id)}`, accessToken, {
        method: "DELETE",
      }).catch(() => {});
    }
    return files.length;
  } catch {
    return 0;
  }
}

async function findQuickSyncFile(
  accessToken: string,
): Promise<DriveFileResponse | null> {
  const q = `name = '${QUICK_SYNC_BACKUP_NAME}' and trashed = false`;
  const query = [
    "spaces=drive",
    `q=${encodeURIComponent(q)}`,
    "pageSize=1",
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties)")}`,
  ].join("&");
  const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
  const body = (await response.json()) as DriveFileListResponse;
  return body.files?.[0] ?? null;
}

export async function uploadOrUpdateGoogleDriveQuickSyncBackup(
  accessToken: string,
  bytes: Uint8Array,
  existingFileId?: string | null,
  deviceProperties?: GoogleDriveQuickSyncDeviceProperties,
): Promise<GoogleDriveQuickSyncMetadata> {
  deviceProperties?.assertCurrent?.();

  const properties = buildQuickSyncAppProperties(deviceProperties);
  properties[APP_PROPERTY_KIND] = BACKUP_FILE_KIND;
  properties[BACKUP_PROTECTION_PROPERTY] = "none";
  properties[QUICK_SYNC_PROPERTY] = "true";

  // Look up the active untrashed canonical file on Google Drive
  const existing = await findQuickSyncFile(accessToken);
  let targetFileId = (existing && !existing.trashed) ? existing.id : null;

  // Attempt in-place update if targetFileId exists
  if (targetFileId) {
    try {
      const updated = await uploadResumableDriveBackup<DriveFileResponse>(
        (url, options, accepted) => driveFetch(url, accessToken, options, accepted),
        bytes,
        {
          id: targetFileId,
          isUpdate: true,
          name: QUICK_SYNC_BACKUP_NAME,
          appProperties: properties,
        },
        deviceProperties?.assertCurrent,
      );
      void pruneLegacyQuickSyncFiles(accessToken).catch(() => {});
      return toQuickSyncMetadata(updated);
    } catch (error) {
      // If the target file no longer exists (404), fall through to creating a new canonical file
      if (error instanceof GoogleDriveApiError && error.status === 404) {
        targetFileId = null;
      } else {
        throw error;
      }
    }
  }

  // Create new canonical file in Backups folder
  const folder = await ensureBackupFolder(accessToken);
  const now = new Date().toISOString();
  properties[ORIGINAL_CREATED_AT_PROPERTY] = now;
  const created = await uploadResumableDriveBackup<DriveFileResponse>(
    (url, options, accepted) => driveFetch(url, accessToken, options, accepted),
    bytes,
    {
      name: QUICK_SYNC_BACKUP_NAME,
      parents: [folder.id],
      appProperties: properties,
    },
    deviceProperties?.assertCurrent,
  );
  void pruneLegacyQuickSyncFiles(accessToken).catch(() => {});
  return toQuickSyncMetadata(created);
}

export async function getGoogleDriveQuickSyncFileMetadata(
  accessToken: string,
  existingFileId?: string | null,
  exact = false,
): Promise<GoogleDriveQuickSyncMetadata | null> {
  const fields = "id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties";
  if (existingFileId) {
    try {
      const response = await driveFetch(
        `${DRIVE_FILES_URL}/${encodeURIComponent(existingFileId)}?fields=${encodeURIComponent(fields)}`,
        accessToken,
      );
      const file = (await response.json()) as DriveFileResponse;
      if (file.trashed) {
        return null;
      }
      if (exact || isQuickSyncBackupFile(file)) {
        return toQuickSyncMetadata(file);
      }
    } catch (error) {
      if (exact) throw error;
      if (error instanceof GoogleDriveApiError && error.status === 404) {
        // Stale fileId, fall through to lookup
      } else {
        throw error;
      }
    }
  }

  const found = await findQuickSyncFile(accessToken);
  return found && !found.trashed ? toQuickSyncMetadata(found) : null;
}

export async function resolveGoogleDriveQuickSyncBackupFile(
  accessToken: string,
): Promise<GoogleDriveQuickSyncMetadata | null> {
  return getGoogleDriveQuickSyncFileMetadata(accessToken);
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

export async function uploadGoogleDriveAttachmentFile(
  accessToken: string,
  input: {
    attachmentId: string;
    transactionId: string;
    originalName: string;
    mimeType: string;
    sha256: string;
    localUri: string;
  },
): Promise<GoogleDriveAttachmentFile> {
  const folder = await ensureAttachmentsFolder(accessToken);
  const localFile = new File(input.localUri);
  if (!localFile.exists) {
    throw new Error(`Attachment file is missing: ${input.originalName}`);
  }

  const name = `${input.attachmentId}__${sanitizeDriveFileName(input.originalName)}`;
  const fields = encodeURIComponent("id,name,size");
  const sessionResponse = await driveFetch(
    `${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=${fields}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(localFile.size),
        "X-Upload-Content-Type": input.mimeType,
      },
      body: JSON.stringify({
        name,
        parents: [folder.id],
        appProperties: {
          [APP_PROPERTY_KIND]: ATTACHMENT_FILE_KIND,
          attachmentId: input.attachmentId,
          transactionId: input.transactionId,
          sha256: input.sha256,
        },
      }),
    },
  );
  const uploadUrl = sessionResponse.headers.get("location");
  if (!uploadUrl) {
    throw new GoogleDriveApiError(
      "Google Drive did not provide an attachment upload session.",
      0,
    );
  }

  const result = await localFile.upload(uploadUrl, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: input.mimeType,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": String(localFile.size),
    },
    sessionType: "background",
  });
  if (result.status < 200 || result.status >= 300) {
    throw new GoogleDriveApiError(
      getDriveErrorMessage(result.status, result.body),
      result.status,
    );
  }

  const file = JSON.parse(result.body) as DriveFileResponse;
  return { id: file.id, name: file.name, size: Number(file.size ?? localFile.size) };
}

export async function uploadGoogleDriveNoteAttachmentFile(
  accessToken: string,
  input: {
    attachmentId: string;
    noteId: string;
    originalName: string;
    mimeType: string;
    sha256: string;
    localUri: string;
  },
): Promise<GoogleDriveAttachmentFile> {
  const folder = await ensureNotesAttachmentsFolder(accessToken);
  const localFile = new File(input.localUri);
  if (!localFile.exists) {
    throw new Error(`Note attachment file is missing: ${input.originalName}`);
  }

  const name = `${input.attachmentId}__${sanitizeDriveFileName(input.originalName)}`;
  const fields = encodeURIComponent("id,name,size");
  const sessionResponse = await driveFetch(
    `${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=${fields}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(localFile.size),
        "X-Upload-Content-Type": input.mimeType,
      },
      body: JSON.stringify({
        name,
        parents: [folder.id],
        appProperties: {
          [APP_PROPERTY_KIND]: NOTE_ATTACHMENT_FILE_KIND,
          attachmentId: input.attachmentId,
          noteId: input.noteId,
          sha256: input.sha256,
        },
      }),
    },
  );
  const uploadUrl = sessionResponse.headers.get("location");
  if (!uploadUrl) {
    throw new GoogleDriveApiError(
      "Google Drive did not provide a note attachment upload session.",
      0,
    );
  }

  const result = await localFile.upload(uploadUrl, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: input.mimeType,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": String(localFile.size),
    },
    sessionType: "background",
  });
  if (result.status < 200 || result.status >= 300) {
    throw new GoogleDriveApiError(
      getDriveErrorMessage(result.status, result.body),
      result.status,
    );
  }

  const file = JSON.parse(result.body) as DriveFileResponse;
  return { id: file.id, name: file.name, size: Number(file.size ?? localFile.size) };
}

export async function downloadGoogleDriveAttachmentFile(
  accessToken: string,
  fileId: string,
  destinationUri: string,
): Promise<void> {
  const destination = new File(destinationUri);
  try {
    await File.downloadFileAsync(
      `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`,
      destination,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        idempotent: true,
      },
    );
  } catch (error) {
    if (destination.exists) {
      try {
        destination.delete();
      } catch {
        // ignore delete failure
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404") || message.includes("not found")) {
      throw new GoogleDriveApiError(
        "Attachment not found or might be deleted.",
        404,
      );
    }
    if (message.includes("401") || message.includes("403")) {
      throw new GoogleDriveApiError(
        "Google Drive access was denied or expired. Please sign in again.",
        403,
      );
    }
    throw new GoogleDriveApiError(
      "Unable to download attachment. Check your connection and try again.",
      0,
    );
  }
}

export async function deleteGoogleDriveAttachmentFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  try {
    await driveFetch(
      `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}`,
      accessToken,
      { method: "DELETE" },
    );
  } catch (error) {
    if (error instanceof GoogleDriveApiError && error.status === 404) return;
    throw error;
  }
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

async function findBackupFolder(
  accessToken: string,
): Promise<DriveFileResponse | null> {
  const rootFolder = await findFolder(accessToken, ROOT_FOLDER_KIND);
  if (!rootFolder) return null;

  return findFolder(accessToken, BACKUPS_FOLDER_KIND, rootFolder.id);
}

async function ensureAttachmentsFolder(
  accessToken: string,
): Promise<DriveFileResponse> {
  const rootFolder = await findOrCreateFolder(
    accessToken,
    ROOT_FOLDER_NAME,
    ROOT_FOLDER_KIND,
  );
  return findOrCreateFolder(
    accessToken,
    ATTACHMENTS_FOLDER_NAME,
    ATTACHMENTS_FOLDER_KIND,
    rootFolder.id,
  );
}

export async function ensureNotesAttachmentsFolder(
  accessToken: string,
): Promise<DriveFileResponse> {
  const rootFolder = await findOrCreateFolder(
    accessToken,
    ROOT_FOLDER_NAME,
    ROOT_FOLDER_KIND,
  );
  return findOrCreateFolder(
    accessToken,
    NOTES_ATTACHMENTS_FOLDER_NAME,
    NOTES_ATTACHMENTS_FOLDER_KIND,
    rootFolder.id,
  );
}

async function findFolder(
  accessToken: string,
  kind: string,
  parentId?: string,
): Promise<DriveFileResponse | null> {
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
  return body.files?.[0] ?? null;
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  kind: string,
  parentId?: string,
): Promise<DriveFileResponse> {
  const existing = await findFolder(accessToken, kind, parentId);
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
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties)")}`,
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

function isQuickSyncBackupFile(file: {
  name: string;
  appProperties?: Record<string, string>;
}): boolean {
  return (
    file.name === QUICK_SYNC_BACKUP_NAME ||
    file.appProperties?.[QUICK_SYNC_PROPERTY] === "true" ||
    file.appProperties?.quickSyncProtocol === "2" ||
    file.name.startsWith(BACKUP_NAME_PREFIX + "quick-sync-")
  );
}

function toVisibleBackupFile(file: DriveFileResponse): GoogleDriveBackupFile {
  return toBackupFile(file, "visible");
}

export function truncateUtf8Bytes(value: string, maxBytes: number): string {
  if (maxBytes <= 0 || value.length === 0) return "";
  let usedBytes = 0;
  let result = "";
  for (const char of value) {
    const charBytes = utf8Encoder.encode(char).byteLength;
    if (usedBytes + charBytes > maxBytes) {
      break;
    }
    result += char;
    usedBytes += charBytes;
  }
  return result.trimEnd();
}

function fitDriveAppPropertyValue(key: string, rawValue: string): string {
  const keyBytes = utf8Encoder.encode(key).byteLength;
  const maxValueBytes = Math.min(
    MAX_QUICK_SYNC_PROPERTY_VALUE_BYTES,
    MAX_DRIVE_APP_PROPERTY_BYTES - keyBytes,
  );
  return truncateUtf8Bytes(rawValue.trim(), maxValueBytes);
}

export function buildQuickSyncAppProperties(
  deviceProperties?: GoogleDriveQuickSyncDeviceProperties,
): Record<string, string> {
  const properties: Record<string, string> = {
    [QUICK_SYNC_PROPERTY]: "true",
    ...(deviceProperties?.attachmentCoverage ? { backupAttachmentCoverage: deviceProperties.attachmentCoverage } : {}),
  };
  const deviceId = deviceProperties?.deviceId
    ? fitDriveAppPropertyValue(
        QUICK_SYNC_DEVICE_ID_PROPERTY,
        deviceProperties.deviceId,
      )
    : "";
  const deviceName = deviceProperties?.deviceName
    ? fitDriveAppPropertyValue(
        QUICK_SYNC_DEVICE_NAME_PROPERTY,
        deviceProperties.deviceName,
      )
    : "";
  const syncRevisionId = deviceProperties?.syncRevisionId
    ? fitDriveAppPropertyValue(
        QUICK_SYNC_REVISION_ID_PROPERTY,
        deviceProperties.syncRevisionId,
      )
    : "";
  if (deviceId) {
    properties[QUICK_SYNC_DEVICE_ID_PROPERTY] = deviceId;
  }
  if (deviceName) {
    properties[QUICK_SYNC_DEVICE_NAME_PROPERTY] = deviceName;
  }
  if (syncRevisionId) {
    properties[QUICK_SYNC_REVISION_ID_PROPERTY] = syncRevisionId;
  }
  return properties;
}

function toQuickSyncMetadata(
  file: DriveFileResponse,
): GoogleDriveQuickSyncMetadata {
  const base = toBackupFile(file, "visible");
  const parsedVersion =
    file.version !== undefined ? Number(file.version) : Number.NaN;

  return {
    ...base,
    revisionToken: file.id,
    tipTokens: [file.id],
    hasConcurrentRevisions: false,
    version: Number.isFinite(parsedVersion) ? parsedVersion : null,
    headRevisionId: file.headRevisionId ?? null,
    trashed: Boolean(file.trashed),
    syncRevisionId:
      file.appProperties?.[QUICK_SYNC_REVISION_ID_PROPERTY] ?? null,
    lastUpdatedByDeviceId:
      file.appProperties?.[QUICK_SYNC_DEVICE_ID_PROPERTY] ?? null,
    lastUpdatedByDeviceName:
      file.appProperties?.[QUICK_SYNC_DEVICE_NAME_PROPERTY] ?? null,
  };
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
    passwordProtected:
      file.appProperties?.[BACKUP_PROTECTION_PROPERTY] !== "none",
    attachmentCoverage: file.appProperties?.backupAttachmentCoverage === "included" ? "included" : "legacy-records-only",
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function sanitizeDriveFileName(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || "attachment").slice(0, 180);
}

async function driveFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {},
  acceptedStatuses: readonly number[] = [],
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

    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      const details = await response.text().catch(() => "");
      throw new GoogleDriveApiError(
        getDriveErrorMessage(response.status, details),
        response.status,
        response.status === 403 && /"reason"\s*:\s*"(?:rateLimitExceeded|userRateLimitExceeded)"/.test(details),
        parseRetryAfter(response.headers?.get("retry-after") ?? null),
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
  if (status === 403) {
    if (details.includes('"storageQuotaExceeded"')) return "Google Drive storage is full. Free up space and try the backup again.";
    if (/"reason"\s*:\s*"(?:rateLimitExceeded|userRateLimitExceeded)"/.test(details)) return "Google Drive is busy. Try the backup again shortly.";
    return "Google Drive access was denied for this account. Check its permissions and sign in again.";
  }
  if (status === 404) return "That backup no longer exists in Google Drive.";

  try {
    const parsed = JSON.parse(details) as { error?: { message?: string } };
    return parsed.error?.message ?? `Google Drive request failed (${status}).`;
  } catch {
    return `Google Drive request failed (${status}).`;
  }
}

function parseRetryAfter(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}
