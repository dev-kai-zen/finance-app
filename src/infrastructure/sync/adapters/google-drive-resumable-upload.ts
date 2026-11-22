import { md5 } from "@noble/hashes/legacy.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
export const DRIVE_UPLOAD_CHUNK_BYTES = 256 * 1024;
const MAX_RETRIES = 5;
const MAX_SESSION_RESTARTS = 2;
const FIELDS = "id,name,createdTime,modifiedTime,size,version,headRevisionId,trashed,appProperties,md5Checksum";
type Request = (url: string, options?: RequestInit, accepted?: readonly number[]) => Promise<Response>;
interface UploadedFile { id: string; name: string; size?: string; md5Checksum?: string }
interface UploadState {
  id: string;
  session?: string;
  checksum: string;
  metadata: Record<string, unknown>;
  busy?: boolean;
}
// Retain only this immutable archive's session across the caller's auth retry.
// No tokens or archive buffers are copied into the session state or persisted.
const sessions = new WeakMap<Uint8Array, Map<string, UploadState>>();
const yieldWork = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const statusOf = (error: unknown) => (error as { status?: number })?.status;
const retryable = (error: unknown) => statusOf(error) === 0 || statusOf(error) === 429 ||
  (statusOf(error) ?? 0) >= 500 || (error as { retryable?: boolean })?.retryable === true;
function exhausted(error: unknown): Error {
  return Object.assign(new Error("The backup upload was interrupted repeatedly. Check your connection and Drive storage, then try again. The last successful backup has not changed."),
    { cause: error, status: statusOf(error) });
}

async function readJson<T>(response: Response): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      response.json() as Promise<T>,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Google Drive's upload response timed out.")), 30_000);
      }),
    ]);
  } catch {
    throw Object.assign(new Error("Google Drive's upload response was interrupted. Try again if the connection remains unstable."), { status: 0 });
  } finally { clearTimeout(timer); }
}

async function pause(attempt: number, error: unknown, assertCurrent?: () => void): Promise<void> {
  assertCurrent?.();
  const requested = (error as { retryAfterMs?: number })?.retryAfterMs ?? 0;
  if (requested > 30_000) throw new Error("Google Drive is busy. Try the backup again later; the last successful backup has not changed.");
  const delay = Math.max(requested, Math.min(8_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250));
  // Small waits let replacement cancellation stop a sleeping upload promptly.
  for (let remaining = delay; remaining > 0; remaining -= 250) {
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(250, remaining)));
    assertCurrent?.();
  }
}

function nextOffset(response: Response, total: number, previous: number, sentEnd: number): number {
  const range = response.headers.get("range");
  if (!range) {
    if (previous !== 0) throw new Error("Google Drive lost the acknowledged upload position. Try the backup again.");
    return 0;
  }
  const match = /^bytes=0-(\d+)$/i.exec(range);
  const next = match ? Number(match[1]) + 1 : Number.NaN;
  if (!Number.isSafeInteger(next) || next < previous || next > sentEnd || next > total) {
    throw new Error("Google Drive returned an invalid upload position. Try the backup again.");
  }
  return next;
}

async function checksum(bytes: Uint8Array, assertCurrent?: () => void): Promise<string> {
  // Drive's MD5 is a transport-completeness check, not archive authentication.
  // Password protection and the archive's SHA-256 verification remain unchanged.
  const hash = md5.create();
  for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
    assertCurrent?.();
    hash.update(bytes.subarray(offset, offset + 64 * 1024));
    await yieldWork();
  }
  return bytesToHex(hash.digest());
}

/** Publish an immutable archive or update an existing canonical sync file. */
export async function uploadResumableDriveBackup<T extends UploadedFile>(
  request: Request,
  bytes: Uint8Array,
  metadata: Record<string, unknown>,
  assertCurrent?: () => void,
): Promise<T> {
  if (bytes.length === 0) throw new Error("The backup archive is empty.");
  const key = JSON.stringify([metadata.id, metadata.parents, metadata.name, metadata.appProperties &&
    Object.entries(metadata.appProperties).filter(([name]) => name !== "originalCreatedAt")]);
  let archiveSessions = sessions.get(bytes);
  if (!archiveSessions) { archiveSessions = new Map(); sessions.set(bytes, archiveSessions); }
  let state = archiveSessions.get(key);
  async function withRetries<R>(action: () => Promise<R>): Promise<R> {
    for (let attempt = 0; ; attempt++) {
      assertCurrent?.();
      try { return await action(); } catch (error) {
        if (!retryable(error)) throw error;
        if (attempt >= MAX_RETRIES) throw exhausted(error);
        await pause(attempt, error, assertCurrent);
      }
    }
  }
  if (!state) {
    state = { id: (typeof metadata.id === "string" ? metadata.id : ""), checksum: "", metadata: { ...metadata } };
    archiveSessions.set(key, state);
  }
  if (state.busy) throw new Error("This backup upload is already in progress.");
  state.busy = true;
  const current = state;
  async function complete(response: Response): Promise<T> {
    const file = await readJson<T>(response);
    if (file.id !== current.id || Number(file.size) !== bytes.length || file.md5Checksum !== current.checksum) {
      throw new Error("Google Drive could not verify the complete backup. The last successful backup has not changed; try again.");
    }
    return file;
  }
  async function findCompleted(): Promise<T | null> {
    try {
      return await complete(await withRetries(() => request(FILES_URL + "/" + encodeURIComponent(current.id) + "?fields=" + encodeURIComponent(FIELDS))));
    } catch (error) { if (statusOf(error) === 404) return null; throw error; }
  }
  try {
    if (!current.checksum) current.checksum = await checksum(bytes, assertCurrent);
    if (!current.id) {
      const generated = await withRetries(async () => {
        const response = await request(FILES_URL + "/generateIds?count=1&space=drive&type=files");
        return await readJson<{ ids?: string[] }>(response);
      });
      const id = generated.ids?.[0];
      if (!id) throw new Error("Google Drive did not reserve a backup file ID. Try again.");
      current.id = id; current.metadata.id = id;
    }
    let restarts = 0, failures = 0, offset = 0, sentEnd = bytes.length;
    // A retained session may have accepted bytes despite the previous 401/error.
    let probe = Boolean(current.session);
    while (true) {
      assertCurrent?.();
      if (!current.session) {
        try {
          const isUpdate = Boolean(current.metadata.isUpdate && current.id);
          const uploadEndpoint = isUpdate
            ? `${UPLOAD_URL}/${encodeURIComponent(current.id)}?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}`
            : `${UPLOAD_URL}?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}`;
          const uploadMethod = isUpdate ? "PATCH" : "POST";
          const uploadBody = isUpdate
            ? JSON.stringify({ name: current.metadata.name, appProperties: current.metadata.appProperties })
            : JSON.stringify(current.metadata);
          const response = await request(uploadEndpoint, {
            method: uploadMethod, redirect: "manual",
            headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "application/octet-stream", "X-Upload-Content-Length": String(bytes.length) },
            body: uploadBody,
          });
          const location = response.headers.get("location");
          // Never forward a bearer token to an arbitrary session URL.
          const url = location ? new URL(location) : null;
          if (!url || url.origin !== "https://www.googleapis.com" || url.username || url.password || !url.pathname.startsWith("/upload/drive/")) {
            throw new Error("Google Drive did not provide a valid backup upload session. Try again.");
          }
          current.session = url.toString(); offset = 0; sentEnd = 0; probe = false;
        } catch (error) {
          if (statusOf(error) === 409) {
            const completed = await findCompleted();
            if (completed) return completed;
            throw new Error("Google Drive could not recover this upload. Try creating the backup again.");
          }
          if (!retryable(error)) throw error;
          if (failures++ >= MAX_RETRIES) throw exhausted(error);
          await pause(failures - 1, error, assertCurrent); continue;
        }
      }
      try {
        // Typed-array views send only this range; never concatenate the archive.
        const end = Math.min(offset + DRIVE_UPLOAD_CHUNK_BYTES, bytes.length);
        if (!probe) sentEnd = end;
        const response = await request(current.session, {
          method: "PUT", redirect: "manual",
          headers: { "Content-Type": "application/octet-stream", "Content-Length": String(probe ? 0 : end - offset),
            "Content-Range": probe ? "bytes */" + bytes.length : "bytes " + offset + "-" + (end - 1) + "/" + bytes.length },
          ...(probe ? {} : { body: bytes.subarray(offset, end) as BodyInit }),
        }, [308]);
        assertCurrent?.();
        if (response.status === 200 || response.status === 201) return await complete(response);
        if (response.status !== 308) throw new Error("Google Drive returned an unexpected upload response.");
        const acknowledged = nextOffset(response, bytes.length, offset, sentEnd);
        if (acknowledged > offset) failures = 0;
        else {
          if (failures++ >= MAX_RETRIES) throw new Error("Google Drive stopped accepting this backup. Try again when the connection is stable.");
          await pause(failures - 1, null, assertCurrent);
        }
        offset = acknowledged;
        // All bytes without completion metadata require a status probe, not an empty data chunk.
        probe = offset === bytes.length;
        await yieldWork();
      } catch (error) {
        if (statusOf(error) === 404 || statusOf(error) === 410) {
          const completed = await findCompleted();
          if (completed) return completed;
          if (restarts++ >= MAX_SESSION_RESTARTS) throw new Error("Google Drive upload sessions keep expiring. Try the backup again with a stable connection.");
          current.session = undefined; offset = 0; continue;
        }
        // Propagate 401 intact; the owning auth service refreshes and re-enters
        // with these same archive bytes/session/file ID. Permanent 4xx fail fast.
        if (!retryable(error)) throw error;
        if (failures++ >= MAX_RETRIES) throw exhausted(error);
        await pause(failures - 1, error, assertCurrent); probe = true;
      }
    }
  } finally { current.busy = false; }
}
