import { randomUUID } from "expo-crypto";

import { db, type DbContext } from "@/infrastructure/database/client";
import { noteInputSchema } from "../schemas/note.schema";
import type { CreateNoteInput, Note } from "../types/note.types";
import { insertNote } from "../repositories/notes.repository";
import { insertNoteAttachment } from "../repositories/note-attachments.repository";
import {
  discardPreparedNoteAttachments,
  prepareNoteAttachments,
} from "./note-attachment-storage.service";

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const validated = noteInputSchema.parse({
    title: input.title,
    content: input.content ?? "",
    color: input.color,
    isPinned: input.isPinned ?? false,
  });

  const preparedAttachments = await prepareNoteAttachments(input.attachments ?? []);

  try {
    const committed = db.transaction((tx: DbContext) => {
      const now = new Date();
      const noteId = randomUUID();

      insertNote(
        {
          id: noteId,
          title: validated.title,
          content: validated.content,
          color: validated.color ?? null,
          isPinned: validated.isPinned,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        tx,
      );

      const savedAttachments = preparedAttachments.map((prepared) =>
        insertNoteAttachment(
          {
            ...prepared.record,
            noteId,
          },
          tx,
        ),
      );

      return {
        id: noteId,
        title: validated.title,
        content: validated.content,
        color: validated.color ?? null,
        isPinned: validated.isPinned,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        attachments: savedAttachments,
      };
    });

    return committed;
  } catch (error) {
    await discardPreparedNoteAttachments(preparedAttachments);
    throw error;
  }
}
