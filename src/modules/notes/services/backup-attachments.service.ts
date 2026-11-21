import type { DbContext } from "@/infrastructure/database/client";
import { listBackupAttachments, rebindBackupAttachment } from "../repositories/backup-attachments.repository";
import { getNoteAttachmentLocalUri } from "./note-attachment-storage.service";

export async function getNoteBackupAttachments(context: DbContext) {
  const result: Array<ReturnType<typeof listBackupAttachments>[number] & { kind: "note" }> = [];
  let afterId: string | undefined;
  for (;;) {
    const rows = listBackupAttachments(context, afterId);
    if (!rows.length) break;
    result.push(...rows.map(entry => ({ ...entry, kind: "note" as const })));
    if (result.length > 5000) throw new Error("There are too many attachments for one portable backup.");
    afterId = rows[rows.length - 1].id;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return result;
}

export async function rebindNoteBackupAttachments(context: DbContext, keys: ReadonlyMap<string, string>): Promise<void> {
  for (const [id, storageKey] of keys) {
    rebindBackupAttachment(context, id, storageKey);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

export { getNoteAttachmentLocalUri as getNoteBackupAttachmentUri };
