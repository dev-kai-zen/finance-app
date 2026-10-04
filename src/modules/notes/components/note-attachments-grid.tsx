import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Camera, Image as ImageIcon, Plus, Trash2 } from "lucide-react-native";

import { ActionBottomSheet } from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import type { NoteAttachment, NoteAttachmentDraft } from "../types/note.types";
import { NoteImageViewerModal } from "./note-image-viewer-modal";

export interface NoteAttachmentsGridProps {
  existingAttachments: NoteAttachment[];
  drafts: NoteAttachmentDraft[];
  picking?: boolean;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onRemoveDraft: (index: number) => void;
  onRemoveExisting: (attachmentId: string) => void;
}

export function NoteAttachmentsGrid({
  existingAttachments,
  drafts,
  picking = false,
  onPickCamera,
  onPickLibrary,
  onRemoveDraft,
  onRemoveExisting,
}: NoteAttachmentsGridProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeViewer, setActiveViewer] = useState<{
    uri: string;
    name: string;
    onDelete?: () => void;
  } | null>(null);

  const totalCount = existingAttachments.length + drafts.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.label}>Photos & Attachments</Text>
          {totalCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Add photos"
          accessibilityRole="button"
          disabled={picking}
          onPress={() => setSheetOpen(true)}
          style={styles.addButton}
        >
          {picking ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <>
              <Plus color={theme.colors.primary} size={16} />
              <Text style={styles.addButtonText}>Add Photo</Text>
            </>
          )}
        </Pressable>
      </View>

      {totalCount === 0 ? (
        <Pressable
          accessibilityLabel="Add attachment photo"
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          style={styles.emptyContainer}
        >
          <ImageIcon color={theme.colors.textMuted} size={28} />
          <Text style={styles.emptyText}>
            Attach photos, receipts, or documents to this note
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {/* Existing attachments */}
          {existingAttachments.map((attachment) => (
            <View key={attachment.id} style={styles.thumbnailWrapper}>
              <Pressable
                accessibilityLabel={`View ${attachment.originalName}`}
                onPress={() =>
                  setActiveViewer({
                    uri: attachment.uri ?? "",
                    name: attachment.originalName,
                    onDelete: () => {
                      onRemoveExisting(attachment.id);
                      setActiveViewer(null);
                    },
                  })
                }
                style={styles.thumbnailPressable}
              >
                <Image
                  contentFit="cover"
                  source={{ uri: attachment.uri }}
                  style={styles.thumbnailImage}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Remove photo"
                hitSlop={6}
                onPress={() => onRemoveExisting(attachment.id)}
                style={styles.removeBadge}
              >
                <Trash2 color="#ffffff" size={13} />
              </Pressable>
            </View>
          ))}

          {/* Draft attachments */}
          {drafts.map((draft, idx) => (
            <View key={`${draft.uri}-${idx}`} style={styles.thumbnailWrapper}>
              <Pressable
                accessibilityLabel={`View ${draft.name}`}
                onPress={() =>
                  setActiveViewer({
                    uri: draft.uri,
                    name: draft.name,
                    onDelete: () => {
                      onRemoveDraft(idx);
                      setActiveViewer(null);
                    },
                  })
                }
                style={styles.thumbnailPressable}
              >
                <Image
                  contentFit="cover"
                  source={{ uri: draft.uri }}
                  style={styles.thumbnailImage}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Remove photo"
                hitSlop={6}
                onPress={() => onRemoveDraft(idx)}
                style={styles.removeBadge}
              >
                <Trash2 color="#ffffff" size={13} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action bottom sheet for Camera / Gallery */}
      <ActionBottomSheet
        items={[
          {
            id: "camera",
            label: "Take Photo",
            icon: <Camera color={theme.colors.primary} size={20} />,
            onPress: () => {
              setSheetOpen(false);
              setTimeout(onPickCamera, 200);
            },
          },
          {
            id: "library",
            label: "Choose from Photos",
            icon: <ImageIcon color={theme.colors.primary} size={20} />,
            onPress: () => {
              setSheetOpen(false);
              setTimeout(onPickLibrary, 200);
            },
          },
        ]}
        onClose={() => setSheetOpen(false)}
        title="Attach Photo"
        visible={sheetOpen}
      />

      {/* Image viewer modal */}
      <NoteImageViewerModal
        imageName={activeViewer?.name}
        imageUri={activeViewer?.uri ?? null}
        onClose={() => setActiveViewer(null)}
        onDelete={activeViewer?.onDelete}
        visible={Boolean(activeViewer)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    countBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    countText: {
      color: theme.colors.textPrimary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    addButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 4,
    },
    addButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderStyle: "dashed",
      borderWidth: 1.5,
      gap: theme.spacing.xs,
      justifyContent: "center",
      paddingVertical: theme.spacing.lg,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      textAlign: "center",
    },
    scrollList: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    thumbnailWrapper: {
      borderRadius: theme.borderRadius.medium,
      height: 80,
      position: "relative",
      width: 80,
    },
    thumbnailPressable: {
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      overflow: "hidden",
    },
    thumbnailImage: {
      height: "100%",
      width: "100%",
    },
    removeBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.danger,
      borderRadius: theme.borderRadius.round,
      elevation: 2,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: -4,
      top: -4,
      width: 22,
    },
  });
}
