import { and, asc, eq, gt, isNull } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { noteAttachments } from "@/infrastructure/database/schema";

export function listBackupAttachments(context: DbContext, afterId?: string) {
  return context.select({ id: noteAttachments.id, storageKey: noteAttachments.storageKey, sizeBytes: noteAttachments.sizeBytes, sha256: noteAttachments.sha256 })
    .from(noteAttachments).where(and(isNull(noteAttachments.deletedAt), afterId ? gt(noteAttachments.id, afterId) : undefined))
    .orderBy(asc(noteAttachments.id)).limit(500).all();
}

export function rebindBackupAttachment(context: DbContext, id: string, storageKey: string): void {
  context.update(noteAttachments).set({ storageKey }).where(eq(noteAttachments.id, id)).run();
}
