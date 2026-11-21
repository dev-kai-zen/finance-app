import { useCallback, useEffect, useRef, useState } from "react";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";

import {
  DEFAULT_NOTE_SORT_OPTION,
  DEFAULT_NOTE_VIEW_MODE,
} from "../constants/notes.constants";
import { countNotes, listNotes } from "../repositories/notes.repository";
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

export function useNotes(options?: {
  autoRefresh?: boolean;
  skipQuery?: boolean;
}) {
  const autoRefresh = options?.autoRefresh ?? true;
  const skipQuery = options?.skipQuery ?? false;
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalNotesCount, setTotalNotesCount] = useState(0);
  const [loading, setLoading] = useState(!skipQuery);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<NoteSortOption>(DEFAULT_NOTE_SORT_OPTION);
  const [viewMode, setViewMode] = useState<NoteViewMode>(DEFAULT_NOTE_VIEW_MODE);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState(() => ({
    search: "", sortBy: DEFAULT_NOTE_SORT_OPTION,
  }));
  const cancelPendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 150);
    return () => clearTimeout(timer);
  }, [search]);

  const cancelRefresh = useCallback(() => {
    cancelPendingRef.current?.();
    cancelPendingRef.current = null;
  }, []);

  const refresh = useCallback(() => {
    cancelRefresh();
    if (skipQuery) return;
    cancelPendingRef.current = runDeferredSyncQuery(
      { hasCachedResult: false, setLoading },
      () => {
        cancelPendingRef.current = null;
        try {
          const trimmedSearch = debouncedSearch.trim();
          const items = listNotes({
            search: trimmedSearch || undefined,
            sortBy,
          });
          const total = trimmedSearch ? countNotes() : items.length;
          setNotes(items);
          setTotalNotesCount(total);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load notes.");
        } finally {
          setResolvedQuery({ search: debouncedSearch.trim(), sortBy });
        }
      },
    );
  }, [cancelRefresh, debouncedSearch, skipQuery, sortBy]);

  useEffect(() => {
    if (autoRefresh && !skipQuery) refresh();
    return cancelRefresh;
  }, [autoRefresh, cancelRefresh, refresh, skipQuery]);

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
    totalNotesCount,
    hasAnyNotes: totalNotesCount > 0,
    loading: !skipQuery && (loading || search.trim() !== resolvedQuery.search || sortBy !== resolvedQuery.sortBy),
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
    cancelRefresh,
    clearError,
  };
}
