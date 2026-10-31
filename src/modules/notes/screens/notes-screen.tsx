import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { ConfirmModal } from "@/components";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { PRO_LIMITS, ProFeatureModal, useProGuard } from "@/modules/pro";
import { useLocalization } from "@/infrastructure/localization";
import { StickyNote } from "lucide-react-native";
import {
  DraggableTourChip,
  NotesWalkthroughOverlay,
  WalkthroughIntroModal,
  useNotesWalkthrough,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { NoteCardTile } from "../components/note-card-tile";
import { NoteEditorModal } from "../components/note-editor-modal";
import { NoteSortFilterBar } from "../components/note-sort-filter-bar";
import { NoteTableRow } from "../components/note-table-row";
import { useNotes } from "../hooks/use-notes";
import type { Note, NoteAttachmentDraft } from "../types/note.types";

export function NotesScreen(props?: { initialAction?: "new" }) {
  return (
    <WalkthroughRegistryProvider>
      <NotesScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function NotesScreenContent({
  initialAction,
}: {
  initialAction?: "new";
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);

  const {
    notes,
    hasAnyNotes,
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
  const { guardAction, paywallVisible, closePaywall, guardMeta } = useProGuard();

  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const handledActionRef = useRef<string | null>(null);

  // Walkthrough targets & coordination
  const emptyCreateRef = useWalkthroughTarget("notesEmptyCreateButton");
  const searchRef = useWalkthroughTarget("notesSearch");
  const viewModeRef = useWalkthroughTarget("notesViewMode");
  const sortFilterRef = useWalkthroughTarget("notesSortFilter");
  const hasNoteInList = notes.length > 0;
  const firstNoteRef = useWalkthroughTarget(
    hasNoteInList ? "notesFirstItem" : null,
  );
  const fabRef = useWalkthroughTarget(hasNoteInList ? "notesFab" : null);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "notesFab") {
        return;
      }

      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useNotesWalkthrough({
    hasAnyNotes,
    hasNoteInList,
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "notesWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleOpenNewNote = useCallback(() => {
    if (notes.length >= PRO_LIMITS.FREE_MAX_NOTES) {
      guardAction(() => {
        setSelectedNote(null);
        setEditorVisible(true);
      }, {
        featureTitle: t("pro.limits.notesTitle"),
        featureDescription: t("pro.limits.notesDesc", {
          count: PRO_LIMITS.FREE_MAX_NOTES,
        }),
      });
      return;
    }
    setSelectedNote(null);
    setEditorVisible(true);
  }, [guardAction, notes.length, t]);

  useEffect(() => {
    if (!loading && initialAction === "new") {
      if (handledActionRef.current !== "new") {
        handledActionRef.current = "new";
        handleOpenNewNote();
        router.setParams({ action: undefined });
      }
    } else if (!initialAction) {
      handledActionRef.current = null;
    }
  }, [handleOpenNewNote, initialAction, loading, router]);

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

  const contentSpacing = useThemeStyles((theme) => ({
    paddingTop: theme.spacing.lg,
  }));

  return (
    <PageContainer
      scrollRef={scrollRef}
      scrollContentRef={scrollContentRef}
      contentContainerStyle={contentSpacing}
      scrollEnabled={
        walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
      }
      floatingAction={
        <>
          {notes.length > 0 ? (
            <FloatingActionButton
              accessibilityLabel="Add new note"
              fabRef={fabRef}
              onPress={handleOpenNewNote}
            />
          ) : null}
          <DraggableTourChip
            onPress={() => {
              if (search.length > 0) {
                setSearch("");
              }
              walkthrough.startWalkthrough();
            }}
            visible={!walkthrough.isWalkthroughActive}
          />
        </>
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
            actionRef={emptyCreateRef}
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
              searchRef={searchRef}
              sortBy={sortBy}
              sortFilterRef={sortFilterRef}
              viewMode={viewMode}
              viewModeRef={viewModeRef}
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
                {notes.map((item, index) => (
                  <View
                    key={item.id}
                    collapsable={false}
                    ref={index === 0 ? firstNoteRef : undefined}
                    style={styles.tileCol}
                  >
                    <NoteCardTile note={item} onPress={handleSelectNote} />
                  </View>
                ))}
              </View>
            ) : (
              /* Table / Rows View with swipe-to-delete */
              <View style={styles.tableList}>
                {notes.map((item, index) => (
                  <View
                    key={item.id}
                    collapsable={false}
                    ref={index === 0 ? firstNoteRef : undefined}
                  >
                    <NoteTableRow
                      note={item}
                      onDelete={handleConfirmDeleteFromRow}
                      onPress={handleSelectNote}
                    />
                  </View>
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

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("notesWalkthrough.introTitle")}
        subtitle={t("notesWalkthrough.introSubtitle")}
        message={t("notesWalkthrough.introMessage")}
        icon={<StickyNote color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />

      {/* Notes Walkthrough Overlay */}
      <NotesWalkthroughOverlay
        onEmptyCreatePress={() => {
          walkthrough.completeWalkthrough();
          handleOpenNewNote();
        }}
        onFabPress={() => {
          walkthrough.completeWalkthrough();
          handleOpenNewNote();
        }}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        step={walkthrough.currentStep}
        stepIndex={walkthrough.activeStepIndex}
        targetLayout={walkthrough.activeTargetLayout}
        totalSteps={walkthrough.totalSteps}
        visible={walkthrough.isWalkthroughActive}
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
