import { and, asc, eq, gt, isNull } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { transactionAttachments } from "@/infrastructure/database/schema";

export function listBackupAttachments(context: DbContext, afterId?: string) {
  return context.select({ id: transactionAttachments.id, storageKey: transactionAttachments.storageKey, sizeBytes: transactionAttachments.sizeBytes, sha256: transactionAttachments.sha256 })
    .from(transactionAttachments).where(and(isNull(transactionAttachments.deletedAt), afterId ? gt(transactionAttachments.id, afterId) : undefined))
    .orderBy(asc(transactionAttachments.id)).limit(500).all();
}

export function rebindBackupAttachment(context: DbContext, id: string, storageKey: string): void {
  context.update(transactionAttachments).set({ storageKey }).where(eq(transactionAttachments.id, id)).run();
}
