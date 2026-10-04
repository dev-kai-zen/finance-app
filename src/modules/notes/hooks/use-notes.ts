import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_NOTE_SORT_OPTION,
  DEFAULT_NOTE_VIEW_MODE,
} from "../constants/notes.constants";
import { listNotes } from "../repositories/notes.repository";
import { createNote as createNoteService } from "../services/create-note.service";
import { updateNote as updateNoteService } from "../services/update-note.service";
import { deleteNote as deleteNoteService } from "../services/delete-note.service";
import type {
  CreateNoteInput,
  Note,
  NoteSortOption,
  NoteViewMode,
  UpdateNoteInput,
} from "../types/note.types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<NoteSortOption>(DEFAULT_NOTE_SORT_OPTION);
  const [viewMode, setViewMode] = useState<NoteViewMode>(DEFAULT_NOTE_VIEW_MODE);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      const items = listNotes({
        search: search.trim().length > 0 ? search : undefined,
        sortBy,
      });
      setNotes(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [search, sortBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNote = useCallback(
    async (input: CreateNoteInput): Promise<Note> => {
      try {
        const created = await createNoteService(input);
        refresh();
        return created;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create note.";
        setError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const updateNote = useCallback(
    async (input: UpdateNoteInput): Promise<Note> => {
      try {
        const updated = await updateNoteService(input);
        refresh();
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update note.";
        setError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const deleteNote = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteNoteService(id);
        refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete note.";
        setError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    notes,
    loading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    createNote,
    updateNote,
    deleteNote,
    refresh,
    clearError,
  };
}
