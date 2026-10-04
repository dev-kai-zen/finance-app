import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { notes, type NewNoteRecord, type NoteRecord } from "@/infrastructure/database/schema";
import type { Note, NoteSortOption } from "../types/note.types";
import { listNoteAttachmentsByNoteIds } from "./note-attachments.repository";

export interface ListNotesOptions {
  search?: string;
  sortBy?: NoteSortOption;
  includeDeleted?: boolean;
}

export function listNotes(
  options: ListNotesOptions = {},
  context: DbContext = db,
): Note[] {
  const { search, sortBy = "last_modified_desc", includeDeleted = false } = options;

  const conditions = [];

  if (!includeDeleted) {
    conditions.push(isNull(notes.deletedAt));
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(notes.title, term),
        like(notes.content, term),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClauses = [desc(notes.isPinned)];

  switch (sortBy) {
    case "last_modified_asc":
      orderClauses.push(asc(notes.updatedAt));
      break;
    case "title_asc":
      orderClauses.push(asc(notes.title));
      break;
    case "title_desc":
      orderClauses.push(desc(notes.title));
      break;
    case "last_modified_desc":
    default:
      orderClauses.push(desc(notes.updatedAt));
      break;
  }

  const query = context.select().from(notes);
  const rows = whereClause
    ? query.where(whereClause).orderBy(...orderClauses).all()
    : query.orderBy(...orderClauses).all();

  if (rows.length === 0) return [];

  const noteIds = rows.map((r) => r.id);
  const allAttachments = listNoteAttachmentsByNoteIds(noteIds, context);

  const attachmentsByNoteId = new Map<string, typeof allAttachments>();
  for (const attachment of allAttachments) {
    const existing = attachmentsByNoteId.get(attachment.noteId) ?? [];
    existing.push(attachment);
    attachmentsByNoteId.set(attachment.noteId, existing);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    isPinned: Boolean(row.isPinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    attachments: attachmentsByNoteId.get(row.id) ?? [],
  }));
}

export function findNoteById(
  id: string,
  context: DbContext = db,
): Note | null {
  const row = context
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .get();

  if (!row) return null;

  const attachments = listNoteAttachmentsByNoteIds([id], context);

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    isPinned: Boolean(row.isPinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    attachments,
  };
}

export function insertNote(
  record: NewNoteRecord,
  context: DbContext = db,
): NoteRecord {
  const fullRecord: NoteRecord = {
    id: record.id,
    title: record.title,
    content: record.content ?? "",
    color: record.color ?? null,
    isPinned: Boolean(record.isPinned),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
  };
  context.insert(notes).values(fullRecord).run();
  return fullRecord;
}

export function updateNoteRecord(
  id: string,
  values: Partial<NewNoteRecord>,
  context: DbContext = db,
): void {
  context
    .update(notes)
    .set({ ...values, updatedAt: values.updatedAt ?? new Date() })
    .where(eq(notes.id, id))
    .run();
}

export function softDeleteNoteRecord(
  id: string,
  deletedAt = new Date(),
  context: DbContext = db,
): void {
  context
    .update(notes)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(notes.id, id))
    .run();
}

export function deleteNoteRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(notes).where(eq(notes.id, id)).run();
}
