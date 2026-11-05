import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronLeft, Pin, Plus, Slash, Trash2 } from "lucide-react-native";

import { ConfirmModal, NotificationModal, UnsavedChangesModal } from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import {
  HexColorFormModal,
  useHexColors,
  type HexColorInput,
} from "@/modules/hex-colors";
import { isLightColor } from "@/utils/color-contrast";
import { useNoteAttachments } from "../hooks/use-note-attachments";
import type { Note, NoteAttachmentDraft } from "../types/note.types";
import { NoteAttachmentsGrid } from "./note-attachments-grid";

export interface NoteEditorModalProps {
  visible: boolean;
  note: Note | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    content: string;
    color: string | null;
    isPinned: boolean;
    drafts: NoteAttachmentDraft[];
    removedAttachmentIds: string[];
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function NoteEditorModal({
  visible,
  note,
  saving = false,
  onClose,
  onSave,
  onDelete,
}: NoteEditorModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isColorFormOpen, setIsColorFormOpen] = useState(false);
  const initialSnapshotRef = useRef<string>("");
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowUnsavedPrompt(false);
    }
  }, [visible]);

  const {
    colors: hexColorsList,
    refresh: refreshHexColors,
    addColor,
  } = useHexColors();

  const {
    existingAttachments,
    drafts,
    removedAttachmentIds,
    picking,
    error: attachmentError,
    pickFromCamera,
    pickFromLibrary,
    removeDraft,
    markExistingAttachmentForRemoval,
    reset: resetAttachments,
    clearError: clearAttachmentError,
  } = useNoteAttachments(note?.attachments ?? []);

  useEffect(() => {
    if (visible) {
      refreshHexColors();
      setIsColorFormOpen(false);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setColor(note.color ?? null);
        setIsPinned(note.isPinned);
        resetAttachments(note.attachments);
      } else {
        setTitle("");
        setContent("");
        setColor(null);
        setIsPinned(false);
        resetAttachments([]);
      }
      initialSnapshotRef.current = JSON.stringify({
        title: note ? note.title : "",
        content: note ? note.content : "",
        color: note ? (note.color ?? null) : null,
        isPinned: note ? note.isPinned : false,
      });
      setValidationError(null);
    }
  }, [visible, note, refreshHexColors]);

  const handleSaveCustomColor = (input: HexColorInput) => {
    const created = addColor(input);
    setColor(created.hex);
    return true;
  };

  const hasLegacyColor =
    Boolean(color) &&
    !hexColorsList.some(
      (c) =>
        c.hex.toUpperCase() === color!.toUpperCase() || c.id === color,
    );

  const isDirty = useMemo(() => {
    if (!visible || !initialSnapshotRef.current) return false;
    const currentSnapshot = JSON.stringify({
      title,
      content,
      color,
      isPinned,
    });
    return (
      currentSnapshot !== initialSnapshotRef.current ||
      drafts.length > 0 ||
      removedAttachmentIds.length > 0
    );
  }, [visible, title, content, color, isPinned, drafts.length, removedAttachmentIds.length]);

  const handleRequestClose = useCallback(() => {
    if (saving || picking) return;
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose, picking, saving]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError("Please enter a note title.");
      return;
    }

    try {
      await onSave({
        title: trimmedTitle,
        content: content.trim(),
        color,
        isPinned,
        drafts,
        removedAttachmentIds,
      });
      onClose();
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : "Failed to save note.",
      );
    }
  };

  const handleDelete = async () => {
    if (!note || !onDelete) return;
    try {
      setDeleteConfirmOpen(false);
      await onDelete(note.id);
      onClose();
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : "Failed to delete note.",
      );
    }
  };

  return (
    <>
      <Modal
        animationType="slide"
        hardwareAccelerated
        onRequestClose={handleRequestClose}
        presentationStyle="fullScreen"
        visible={visible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, theme.spacing.sm),
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleRequestClose}
              style={styles.headerButton}
            >
              <ChevronLeft color={theme.colors.textPrimary} size={24} />
            </Pressable>

            <View style={styles.titleCol}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {note ? "Edit Note" : "New Note"}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* Pin Toggle */}
              <Pressable
                accessibilityLabel="Pin note"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setIsPinned((prev) => !prev)}
                style={[
                  styles.pinButton,
                  isPinned && styles.pinButtonActive,
                ]}
              >
                <Pin
                  color={
                    isPinned
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  fill={isPinned ? theme.colors.primary : "none"}
                  size={18}
                />
              </Pressable>

              {note && onDelete ? (
                <Pressable
                  accessibilityLabel="Delete note"
                  accessibilityRole="button"
                  disabled={saving || picking}
                  onPress={() => setDeleteConfirmOpen(true)}
                  style={[
                    styles.deleteHeaderButton,
                    (saving || picking) && styles.disabledButton,
                  ]}
                >
                  <Trash2 color={theme.colors.danger} size={18} />
                </Pressable>
              ) : null}

              {/* Save Button */}
              <Pressable
                accessibilityLabel="Save note"
                accessibilityRole="button"
                disabled={saving || picking}
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  (saving || picking) && styles.disabledButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Check color={theme.colors.onPrimary} size={16} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Editor Body */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Color Palette (Placed above Note Title so it's always visible) */}
            <View style={styles.topPaletteContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paletteScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Default (no accent) */}
                <Pressable
                  accessibilityLabel="Default color (no accent)"
                  accessibilityRole="button"
                  onPress={() => setColor(null)}
                  style={[
                    styles.colorChip,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor:
                        color === null
                          ? theme.colors.primary
                          : theme.colors.border,
                      borderWidth: color === null ? 2.5 : 1,
                    },
                  ]}
                >
                  {color === null ? (
                    <Check color={theme.colors.textPrimary} size={14} />
                  ) : (
                    <Slash color={theme.colors.textMuted} size={12} />
                  )}
                </Pressable>

                {/* Hex colors from hex-colors repository */}
                {hexColorsList.map((c) => {
                  const isSelected =
                    Boolean(color) &&
                    (color === c.hex ||
                      color === c.id ||
                      color?.toUpperCase() === c.hex.toUpperCase());
                  const light = isLightColor(c.hex);
                  const checkColor = light ? "#0F172A" : "#FFFFFF";

                  return (
                    <Pressable
                      key={c.id}
                      accessibilityLabel={`Color ${c.name} (${c.hex})`}
                      accessibilityRole="button"
                      onPress={() => setColor(c.hex)}
                      style={[
                        styles.colorChip,
                        {
                          backgroundColor: c.hex,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                          borderWidth: isSelected ? 2.5 : 1,
                        },
                      ]}
                    >
                      {isSelected ? <Check color={checkColor} size={14} /> : null}
                    </Pressable>
                  );
                })}

                {/* Legacy Note Color if not in the hexColorsList */}
                {hasLegacyColor && color ? (
                  <Pressable
                    accessibilityLabel={`Current note color (${color})`}
                    accessibilityRole="button"
                    onPress={() => setColor(color)}
                    style={[
                      styles.colorChip,
                      {
                        backgroundColor: color,
                        borderColor: theme.colors.primary,
                        borderWidth: 2.5,
                      },
                    ]}
                  >
                    <Check
                      color={isLightColor(color) ? "#0F172A" : "#FFFFFF"}
                      size={14}
                    />
                  </Pressable>
                ) : null}

                {/* Add Custom Color (+) button */}
                <Pressable
                  accessibilityLabel="Add custom color"
                  accessibilityRole="button"
                  onPress={() => setIsColorFormOpen(true)}
                  style={({ pressed }) => [
                    styles.addColorChip,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Plus color={theme.colors.textSecondary} size={14} />
                </Pressable>
              </ScrollView>
            </View>

            {/* Title Input */}
            <TextInput
              accessibilityLabel="Note title"
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.titleInput}
              value={title}
            />

            {/* Content Input */}
            <TextInput
              accessibilityLabel="Note content"
              multiline
              onChangeText={setContent}
              placeholder="Write your thoughts, financial goals, checklist, or receipt notes here..."
              placeholderTextColor={theme.colors.textMuted}
              scrollEnabled={false}
              style={styles.contentInput}
              textAlignVertical="top"
              value={content}
            />

            {/* Photo Attachments Grid */}
            <NoteAttachmentsGrid
              drafts={drafts}
              existingAttachments={existingAttachments}
              onPickCamera={pickFromCamera}
              onPickLibrary={pickFromLibrary}
              onRemoveDraft={removeDraft}
              onRemoveExisting={markExistingAttachmentForRemoval}
              picking={picking}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Delete"
        message="Are you sure you want to permanently delete this note and its attachments? This action cannot be undone."
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Note"
        variant="destructive"
        visible={deleteConfirmOpen}
      />

      {/* Validation / Error Notification Modal */}
      <NotificationModal
        message={validationError ?? attachmentError ?? ""}
        onClose={() => {
          setValidationError(null);
          clearAttachmentError();
        }}
        title="Notice"
        variant="error"
        visible={Boolean(validationError || attachmentError)}
      />

      <HexColorFormModal
        initialColor={null}
        onClose={() => setIsColorFormOpen(false)}
        onSave={handleSaveCustomColor}
        visible={isColorFormOpen}
      />

      <UnsavedChangesModal
        visible={showUnsavedPrompt}
        pending={saving}
        onSave={() => {
          setShowUnsavedPrompt(false);
          void handleSave();
        }}
        onDiscard={() => {
          setShowUnsavedPrompt(false);
          onClose();
        }}
        onKeepEditing={() => {
          setShowUnsavedPrompt(false);
        }}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    headerButton: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    titleCol: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-start",
      marginLeft: theme.spacing.xs,
      minWidth: 0,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "left",
    },
    headerRight: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    pinButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    pinButtonActive: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    deleteHeaderButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    saveButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 7,
    },
    saveButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    disabledButton: {
      opacity: 0.6,
    },
    scrollContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    topPaletteContainer: {
      paddingBottom: theme.spacing.xs,
    },
    paletteScrollContent: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: 2,
    },
    colorPalette: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    colorChip: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    addColorChip: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      borderStyle: "dashed",
      borderWidth: 1.5,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    addColorChipPressed: {
      opacity: 0.7,
    },
    titleInput: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      paddingVertical: theme.spacing.xs,
    },
    contentInput: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      lineHeight: 24,
      minHeight: 180,
      paddingVertical: theme.spacing.xs,
    },
  });
}
