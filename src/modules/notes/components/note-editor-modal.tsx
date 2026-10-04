import { useEffect, useState } from "react";
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
import { Check, Pin, Trash2, X } from "lucide-react-native";

import { ConfirmModal, NotificationModal } from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import { NOTE_COLOR_PRESETS } from "../constants/notes.constants";
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
      setValidationError(null);
    }
  }, [visible, note]);

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
        onRequestClose={onClose}
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
              accessibilityLabel="Cancel editing"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.headerButton}
            >
              <X color={theme.colors.textPrimary} size={22} />
            </Pressable>

            <Text style={styles.headerTitle}>
              {note ? "Edit Note" : "New Note"}
            </Text>

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
            {/* Color Palette Chips */}
            <View style={styles.colorPalette}>
              {NOTE_COLOR_PRESETS.map((preset) => {
                const isSelected = color === preset.value;
                return (
                  <Pressable
                    key={preset.id}
                    accessibilityLabel={`Color ${preset.label}`}
                    onPress={() => setColor(preset.value)}
                    style={[
                      styles.colorChip,
                      {
                        backgroundColor: preset.value ?? theme.colors.surfaceMuted,
                        borderColor: isSelected
                          ? theme.colors.primary
                          : preset.border,
                        borderWidth: isSelected ? 2.5 : 1,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Check
                        color={
                          preset.value
                            ? "#ffffff"
                            : theme.colors.textPrimary
                        }
                        size={14}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Note Title Input */}
            <TextInput
              accessibilityLabel="Note title"
              maxLength={120}
              onChangeText={setTitle}
              placeholder="Note Title"
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

            {/* Delete note trigger if editing */}
            {note && onDelete ? (
              <Pressable
                accessibilityLabel="Delete note"
                accessibilityRole="button"
                onPress={() => setDeleteConfirmOpen(true)}
                style={styles.deleteButton}
              >
                <Trash2 color={theme.colors.danger} size={16} />
                <Text style={styles.deleteButtonText}>Delete Note</Text>
              </Pressable>
            ) : null}
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
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    headerButton: {
      alignItems: "center",
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
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
    colorPalette: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    colorChip: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 28,
      justifyContent: "center",
      width: 28,
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
    deleteButton: {
      alignItems: "center",
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      marginTop: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    deleteButtonText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
