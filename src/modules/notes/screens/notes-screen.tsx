import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { ConfirmModal } from "@/components";
import { FloatingActionButton } from "@/components/floating-action-button";
import {
  PageContainer,
  PageEmptyState,
} from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { NoteCardTile } from "../components/note-card-tile";
import { NoteEditorModal } from "../components/note-editor-modal";
import { NoteSortFilterBar } from "../components/note-sort-filter-bar";
import { NoteTableRow } from "../components/note-table-row";
import { useNotes } from "../hooks/use-notes";
import type { Note, NoteAttachmentDraft } from "../types/note.types";

export function NotesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    notes,
    loading,
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
  } = useNotes();

  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleOpenNewNote = () => {
    setSelectedNote(null);
    setEditorVisible(true);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorVisible(true);
  };

  const handleConfirmDeleteFromRow = (note: Note) => {
    setNoteToDelete(note);
  };

  const handleExecuteDelete = async () => {
    if (!noteToDelete) return;
    const id = noteToDelete.id;
    setNoteToDelete(null);
    await deleteNote(id);
  };

  const handleSaveNote = async (payload: {
    title: string;
    content: string;
    color: string | null;
    isPinned: boolean;
    drafts: NoteAttachmentDraft[];
    removedAttachmentIds: string[];
  }) => {
    try {
      setSaving(true);
      if (selectedNote) {
        await updateNote({
          id: selectedNote.id,
          title: payload.title,
          content: payload.content,
          color: payload.color,
          isPinned: payload.isPinned,
          addedAttachments: payload.drafts,
          removedAttachmentIds: payload.removedAttachmentIds,
        });
      } else {
        await createNote({
          title: payload.title,
          content: payload.content,
          color: payload.color,
          isPinned: payload.isPinned,
          attachments: payload.drafts,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
  };

  const isSearchActive = search.trim().length > 0;
  const hasNoNotes = notes.length === 0;

  return (
    <PageContainer
      floatingAction={
        notes.length > 0 ? (
          <FloatingActionButton
            accessibilityLabel="Add new note"
            onPress={handleOpenNewNote}
          />
        ) : undefined
      }
      header={
        <PageHeader
          subtitle="Keep financial goals, memos, strategies & receipt notes organized"
          title="Notes"
        />
      }
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : hasNoNotes && !isSearchActive ? (
          /* Empty state when user hasn't created any notes yet */
          <PageEmptyState
            actionLabel="+ Create First Note"
            description="Capture your financial goals, checklists, memos, and receipt photos."
            onAction={handleOpenNewNote}
            title="No Notes Yet"
          />
        ) : (
          <>
            {/* Search, View Toggle, and Sort controls */}
            <NoteSortFilterBar
              onSearchChange={setSearch}
              onSortByChange={setSortBy}
              onViewModeChange={setViewMode}
              search={search}
              sortBy={sortBy}
              viewMode={viewMode}
            />

            {hasNoNotes && isSearchActive ? (
              /* Empty state when search query matches nothing */
              <PageEmptyState
                actionLabel="Clear Search"
                description={`No notes found matching "${search}".`}
                onAction={() => setSearch("")}
                title="No Matching Notes"
              />
            ) : viewMode === "tiles" ? (
              /* Square Tiles View (2 Columns) */
              <View style={styles.tilesGrid}>
                {notes.map((item) => (
                  <View key={item.id} style={styles.tileCol}>
                    <NoteCardTile note={item} onPress={handleSelectNote} />
                  </View>
                ))}
              </View>
            ) : (
              /* Table / Rows View with swipe-to-delete */
              <View style={styles.tableList}>
                {notes.map((item) => (
                  <NoteTableRow
                    key={item.id}
                    note={item}
                    onDelete={handleConfirmDeleteFromRow}
                    onPress={handleSelectNote}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <NoteEditorModal
        note={selectedNote}
        onClose={() => setEditorVisible(false)}
        onDelete={handleDeleteNote}
        onSave={handleSaveNote}
        saving={saving}
        visible={editorVisible}
      />

      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Delete"
        message={`Are you sure you want to permanently delete "${noteToDelete?.title ?? "this note"}"? This action cannot be undone.`}
        onCancel={() => setNoteToDelete(null)}
        onConfirm={handleExecuteDelete}
        title="Delete Note"
        variant="destructive"
        visible={Boolean(noteToDelete)}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxl,
      width: "100%",
    },
    tilesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      width: "100%",
    },
    tileCol: {
      width: "48.5%",
    },
    tableList: {
      width: "100%",
    },
  });
}
