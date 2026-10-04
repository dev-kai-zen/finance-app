import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { noteAttachments } from "@/infrastructure/database/schema";
import type { NoteAttachment } from "../types/note.types";
import { getNoteAttachmentLocalUri } from "../services/note-attachment-storage.service";

export type NewNoteAttachmentRecord = {
  id: string;
  noteId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
  updatedAt: Date;
};

export function listNoteAttachmentsByNoteId(
  noteId: string,
  context: DbContext = db,
): NoteAttachment[] {
  return context
    .select()
    .from(noteAttachments)
    .where(
      and(
        eq(noteAttachments.noteId, noteId),
        isNull(noteAttachments.deletedAt),
      ),
    )
    .orderBy(desc(noteAttachments.createdAt))
    .all()
    .map(mapAttachment);
}

export function listNoteAttachmentsByNoteIds(
  noteIds: readonly string[],
  context: DbContext = db,
): NoteAttachment[] {
  if (noteIds.length === 0) return [];
  return context
    .select()
    .from(noteAttachments)
    .where(
      and(
        inArray(noteAttachments.noteId, [...noteIds]),
        isNull(noteAttachments.deletedAt),
      ),
    )
    .orderBy(desc(noteAttachments.createdAt))
    .all()
    .map(mapAttachment);
}

export function findNoteAttachmentById(
  id: string,
  context: DbContext = db,
): NoteAttachment | null {
  const row = context
    .select()
    .from(noteAttachments)
    .where(eq(noteAttachments.id, id))
    .get();
  return row ? mapAttachment(row) : null;
}

export function insertNoteAttachment(
  attachment: NewNoteAttachmentRecord,
  context: DbContext = db,
): NoteAttachment {
  const record = {
    ...attachment,
    driveFileId: null,
    syncStatus: "pending" as const,
    lastSyncError: null,
    deletedAt: null,
  };
  context.insert(noteAttachments).values(record).run();
  return {
    ...record,
    uri: getNoteAttachmentLocalUri(record.storageKey),
  };
}

export function updateNoteAttachmentSync(
  id: string,
  values: {
    syncStatus: NoteAttachment["syncStatus"];
    driveFileId?: string | null;
    lastSyncError?: string | null;
  },
  context: DbContext = db,
): void {
  context
    .update(noteAttachments)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(noteAttachments.id, id))
    .run();
}

export function softDeleteNoteAttachment(
  id: string,
  deletedAt = new Date(),
  context: DbContext = db,
): void {
  context
    .update(noteAttachments)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(noteAttachments.id, id))
    .run();
}

export function deleteNoteAttachmentRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(noteAttachments).where(eq(noteAttachments.id, id)).run();
}

export function deleteNoteAttachmentsByNoteId(
  noteId: string,
  context: DbContext = db,
): void {
  context
    .delete(noteAttachments)
    .where(eq(noteAttachments.noteId, noteId))
    .run();
}

function mapAttachment(
  row: typeof noteAttachments.$inferSelect,
): NoteAttachment {
  return {
    ...row,
    syncStatus: row.syncStatus as NoteAttachment["syncStatus"],
    uri: getNoteAttachmentLocalUri(row.storageKey),
  };
}
