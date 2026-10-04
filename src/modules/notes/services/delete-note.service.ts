import { db, type DbContext } from "@/infrastructure/database/client";
import { findNoteById, deleteNoteRecord } from "../repositories/notes.repository";
import {
  deleteNoteAttachmentsByNoteId,
  listNoteAttachmentsByNoteId,
} from "../repositories/note-attachments.repository";
import { deleteNoteAttachmentLocalFile } from "./note-attachment-storage.service";

export async function deleteNote(id: string): Promise<void> {
  const existing = findNoteById(id);
  if (!existing) {
    return;
  }

  const attachments = listNoteAttachmentsByNoteId(id);

  db.transaction((tx: DbContext) => {
    deleteNoteAttachmentsByNoteId(id, tx);
    deleteNoteRecord(id, tx);
  });

  // Clean up local disk files
  for (const attachment of attachments) {
    try {
      deleteNoteAttachmentLocalFile(attachment.storageKey);
    } catch {
      // Continue cleanup
    }
  }
}
