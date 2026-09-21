import { fetch } from "expo/fetch";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const BACKUP_NAME_PREFIX = "kaizen-finance-backup-";
const MAX_MULTIPART_BYTES = 5 * 1024 * 1024;

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
}

interface DriveFileResponse {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
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

export async function listGoogleDriveBackupFiles(
  accessToken: string,
): Promise<GoogleDriveBackupFile[]> {
  const query = [
    "spaces=appDataFolder",
    `q=${encodeURIComponent(`name contains '${BACKUP_NAME_PREFIX}'`)}`,
    "orderBy=createdTime desc",
    "pageSize=20",
    `fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime,size)")}`,
  ].join("&");
  const response = await driveFetch(`${DRIVE_FILES_URL}?${query}`, accessToken);
  const body = (await response.json()) as DriveFileListResponse;

  return (body.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: Number(file.size ?? 0),
  }));
}

export async function uploadGoogleDriveBackupFile(
  accessToken: string,
  bytes: Uint8Array,
  createdAt: Date,
): Promise<GoogleDriveBackupFile> {
  if (bytes.byteLength > MAX_MULTIPART_BYTES) {
    throw new Error(
      "This backup is larger than 5 MB. Resumable uploads are not available in Phase 1.",
    );
  }

  const name = `${BACKUP_NAME_PREFIX}${createdAt
    .toISOString()
    .replaceAll(":", "-")}.kfb`;
  const boundary = `kaizen-finance-${createdAt.getTime()}`;
  const encoder = new TextEncoder();
  const metadata = JSON.stringify({
    name,
    parents: ["appDataFolder"],
  });
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = joinBytes(prefix, bytes, suffix);
  const fields = encodeURIComponent("id,name,createdTime,modifiedTime,size");
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

  return {
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: Number(file.size ?? bytes.byteLength),
  };
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

