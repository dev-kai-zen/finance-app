import type { DbContext } from "@/infrastructure/database/client";
import { listBackupAttachments, rebindBackupAttachment } from "../repositories/backup-attachments.repository";
import { getTransactionAttachmentLocalUri } from "./transaction-attachment-storage.service";

export async function getTransactionBackupAttachments(context: DbContext) {
  const result: Array<ReturnType<typeof listBackupAttachments>[number] & { kind: "transaction" }> = [];
  let afterId: string | undefined;
  for (;;) {
    const rows = listBackupAttachments(context, afterId);
    if (!rows.length) break;
    result.push(...rows.map(entry => ({ ...entry, kind: "transaction" as const })));
    if (result.length > 5000) throw new Error("There are too many attachments for one portable backup.");
    afterId = rows[rows.length - 1].id;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return result;
}

export async function rebindTransactionBackupAttachments(context: DbContext, keys: ReadonlyMap<string, string>): Promise<void> {
  for (const [id, storageKey] of keys) {
    rebindBackupAttachment(context, id, storageKey);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

export { getTransactionAttachmentLocalUri as getTransactionBackupAttachmentUri };
