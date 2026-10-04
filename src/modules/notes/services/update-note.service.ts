import { db, type DbContext } from "@/infrastructure/database/client";
import { noteInputSchema } from "../schemas/note.schema";
import type { Note, UpdateNoteInput } from "../types/note.types";
import { findNoteById, updateNoteRecord } from "../repositories/notes.repository";
import {
  deleteNoteAttachmentRecord,
  findNoteAttachmentById,
  insertNoteAttachment,
  listNoteAttachmentsByNoteId,
} from "../repositories/note-attachments.repository";
import {
  deleteNoteAttachmentLocalFile,
  discardPreparedNoteAttachments,
  prepareNoteAttachments,
} from "./note-attachment-storage.service";

export async function updateNote(input: UpdateNoteInput): Promise<Note> {
  const existing = findNoteById(input.id);
  if (!existing) {
    throw new Error("Note not found.");
  }

  const validated = noteInputSchema.parse({
    title: input.title,
    content: input.content ?? "",
    color: input.color,
    isPinned: input.isPinned ?? false,
  });

  const preparedAttachments = await prepareNoteAttachments(
    input.addedAttachments ?? [],
  );

  const filesToDeleteLocally: string[] = [];

  try {
    db.transaction((tx: DbContext) => {
      const now = new Date();

      updateNoteRecord(
        input.id,
        {
          title: validated.title,
          content: validated.content,
          color: validated.color ?? null,
          isPinned: validated.isPinned,
          updatedAt: now,
        },
        tx,
      );

      // Handle removed attachments
      if (input.removedAttachmentIds && input.removedAttachmentIds.length > 0) {
        for (const attachmentId of input.removedAttachmentIds) {
          const attachment = findNoteAttachmentById(attachmentId, tx);
          if (attachment) {
            filesToDeleteLocally.push(attachment.storageKey);
            deleteNoteAttachmentRecord(attachmentId, tx);
          }
        }
      }

      // Handle newly added attachments
      for (const prepared of preparedAttachments) {
        insertNoteAttachment(
          {
            ...prepared.record,
            noteId: input.id,
          },
          tx,
        );
      }
    });

    // Clean up local disk files for successfully deleted attachments
    for (const storageKey of filesToDeleteLocally) {
      try {
        deleteNoteAttachmentLocalFile(storageKey);
      } catch {
        // Continue cleaning up remaining files
      }
    }

    const updated = findNoteById(input.id);
    if (!updated) {
      throw new Error("Failed to load updated note.");
    }
    return updated;
  } catch (error) {
    await discardPreparedNoteAttachments(preparedAttachments);
    throw error;
  }
}
