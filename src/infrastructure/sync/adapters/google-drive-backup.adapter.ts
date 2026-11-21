import { fetch } from "expo/fetch";
import { File, UploadType } from "expo-file-system";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const BACKUP_NAME_PREFIX = "kaizen-finance-backup-";
const MAX_MULTIPART_BYTES = 5 * 1024 * 1024;
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
      [BACKUP_PROTECTION_PROPERTY]: passwordProtected ? "password" : "none",
      ...(legacyFileId ? { [LEGACY_FILE_ID_PROPERTY]: legacyFileId } : {}),
      ...(extraProperties ?? {}),
    },
  });
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = joinBytes(prefix, bytes, suffix);
  const fields = encodeURIComponent(
    "id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties",
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

// V2 files deliberately omit the legacy Quick Sync marker/name, so older apps
// cannot discover and PATCH these immutable snapshots.
const QUICK_SYNC_PROTOCOL = 'quickSyncProtocol';
const MAX_QUICK_SYNC_PARENTS = 16;

function revisionToken(file: DriveFileResponse): string {
  return file.appProperties?.[QUICK_SYNC_PROTOCOL] === '2'
    ? file.id
    : file.id + '@' + (file.headRevisionId ?? file.version ?? file.modifiedTime ?? 'unknown');
}

async function listQuickSyncRevisions(accessToken: string): Promise<DriveFileResponse[]> {
  const files: DriveFileResponse[] = [];
  const seenPages = new Set<string>();
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      spaces: 'drive', pageSize: '100',
      q: "trashed = false and (appProperties has { key='quickSyncProtocol' and value='2' } or appProperties has { key='isQuickSync' and value='true' } or name = 'kaizen-finance-quick-sync.kfb')",
      fields: 'nextPageToken,files(id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties)',
      ...(pageToken ? { pageToken } : {}),
    });
    const response = await driveFetch(DRIVE_FILES_URL + '?' + query, accessToken);
    const page = await response.json() as DriveFileListResponse;
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
    // Fail closed instead of silently dropping old branches or exhausting memory.
    if (files.length > 10000) throw new Error('Quick Sync revision history needs review before syncing.');
    if (pageToken && seenPages.has(pageToken)) throw new Error("Drive repeated a revision history page.");
    if (pageToken) seenPages.add(pageToken);
  } while (pageToken);
  return files;
}

async function revisionTips(files: DriveFileResponse[]): Promise<DriveFileResponse[]> {
  const parents = new Set<string>();
  for (let offset = 0; offset < files.length; offset += 250) {
    for (const file of files.slice(offset, offset + 250)) {
      for (let i = 0; i < MAX_QUICK_SYNC_PARENTS; i++) {
        const parent = file.appProperties?.['syncParent' + i];
        if (parent) parents.add(parent);
      }
    }
    if (offset + 250 < files.length) await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  const tips: DriveFileResponse[] = [];
  for (let offset = 0; offset < files.length; offset += 250) {
    for (const file of files.slice(offset, offset + 250)) {
      if (!parents.has(revisionToken(file))) tips.push(file);
    }
    if (tips.length > MAX_QUICK_SYNC_PARENTS) throw new Error('Too many competing Quick Sync revisions. Review backups before syncing.');
    if (offset + 250 < files.length) await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return tips.sort((a, b) => (b.createdTime ?? '').localeCompare(a.createdTime ?? '') ||
    (b.id > a.id ? 1 : b.id < a.id ? -1 : 0));
}

function revisionMetadata(file: DriveFileResponse, tips: DriveFileResponse[]): GoogleDriveQuickSyncMetadata {
  return { ...toQuickSyncMetadata(file), revisionToken: revisionToken(file),
    tipTokens: tips.map(revisionToken), hasConcurrentRevisions: tips.length > 1 };
}

export async function uploadOrUpdateGoogleDriveQuickSyncBackup(
  accessToken: string,
  bytes: Uint8Array,
  existingFileId?: string | null,
  deviceProperties?: GoogleDriveQuickSyncDeviceProperties,
): Promise<GoogleDriveQuickSyncMetadata> {
  const revisions = await listQuickSyncRevisions(accessToken);
  const revisionId = deviceProperties?.syncRevisionId;
  if (!revisionId) throw new Error('A revision ID is required for Quick Sync.');
  const parents = [...new Set(deviceProperties?.parentTokens ?? [])];
  if (parents.length > MAX_QUICK_SYNC_PARENTS) throw new Error('Too many competing Quick Sync revisions. Review backups before syncing.');
  const properties = buildQuickSyncAppProperties(deviceProperties);
  delete properties[QUICK_SYNC_PROPERTY];
  properties[QUICK_SYNC_PROTOCOL] = '2';
  parents.forEach((parent, index) => {
    const key = 'syncParent' + index;
    if (utf8Encoder.encode(key + parent).length > MAX_DRIVE_APP_PROPERTY_BYTES) throw new Error('Quick Sync parent revision is too long.');
    properties[key] = parent;
  });
  // Reuse the same publication after a lost response/auth retry. Never PATCH.
  let created = revisions.find(file => file.appProperties?.[QUICK_SYNC_PROTOCOL] === '2' &&
    file.appProperties?.[QUICK_SYNC_REVISION_ID_PROPERTY] === revisionId &&
    file.appProperties?.[QUICK_SYNC_DEVICE_ID_PROPERTY] === deviceProperties?.deviceId);
  if (!created) {
    const folder = await ensureBackupFolder(accessToken);
    const now = new Date().toISOString();
    created = await uploadBackupToFolder(accessToken, bytes, folder.id, now,
      BACKUP_NAME_PREFIX + 'quick-sync-' + revisionId + '.kfb', undefined, false, properties);
  }
  const latest = await listQuickSyncRevisions(accessToken);
  // A listing may lag publication. Always retain our successfully created node.
  const tips = await revisionTips([...latest.filter(file => file.id !== created!.id), created]);
  const result = revisionMetadata(created, tips);
  const competing = tips.find(file => file.id !== created.id);
  if (tips.length > 1 && competing) result.concurrentFile = revisionMetadata(competing, tips);
  return result;
}

export async function getGoogleDriveQuickSyncFileMetadata(
  accessToken: string,
  existingFileId?: string | null,
  exact = false,
): Promise<GoogleDriveQuickSyncMetadata | null> {
  if (exact && existingFileId) {
    const fields = 'id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties';
    const response = await driveFetch(DRIVE_FILES_URL + '/' + encodeURIComponent(existingFileId) + '?fields=' + encodeURIComponent(fields), accessToken);
    const file = await response.json() as DriveFileResponse;
    return file.trashed ? null : revisionMetadata(file, await revisionTips(await listQuickSyncRevisions(accessToken)));
  }
  const tips = await revisionTips(await listQuickSyncRevisions(accessToken));
  const selected = tips.length > 1 ? tips.find(file => file.id !== existingFileId) ?? tips[0] : tips[0];
  return selected ? revisionMetadata(selected, tips) : null;
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
  await File.downloadFileAsync(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`,
    destination,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      idempotent: true,
    },
  );
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
    file.appProperties?.[QUICK_SYNC_PROPERTY] === "true"
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
