import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Image as ImageIcon, Pin } from "lucide-react-native";

import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import type { Note } from "../types/note.types";
import { extractSnippet, formatRelativeDate } from "../utils/note-formatters";

export interface NoteCardTileProps {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
}

export const NoteCardTile = memo(function NoteCardTile({
  note,
  onPress,
  onLongPress,
}: NoteCardTileProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const hasAttachments = note.attachments.length > 0;
  const coverAttachment = hasAttachments ? note.attachments[0] : null;
  const hasCoverImage = Boolean(coverAttachment?.uri);
  const snippet = extractSnippet(note.content, hasCoverImage ? 45 : 80);

  const dynamicCardStyle = {
    borderColor: note.color ? note.color : theme.colors.border,
    borderTopWidth: note.color ? 3.5 : 1,
  };

  return (
    <Pressable
      accessibilityLabel={`Note: ${note.title}`}
      accessibilityRole="button"
      onLongPress={() => onLongPress?.(note)}
      onPress={() => onPress(note)}
      style={({ pressed }) => [
        styles.card,
        dynamicCardStyle,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Cover Image Preview if available */}
      {hasCoverImage ? (
        <View style={styles.coverImageContainer}>
          <Image
            contentFit="cover"
            source={{ uri: coverAttachment?.uri }}
            style={styles.coverImage}
            transition={150}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.cardContent,
          hasCoverImage ? styles.cardContentWithCover : styles.cardContentNoCover,
        ]}
      >
        <View style={styles.topSection}>
          {/* Title and Pin Badge */}
          <View style={styles.titleRow}>
            <Text numberOfLines={hasCoverImage ? 2 : 2} style={styles.title}>
              {note.title}
            </Text>
            {note.isPinned ? (
              <View style={styles.pinBadge}>
                <Pin
                  color={theme.colors.primary}
                  fill={theme.colors.primary}
                  size={12}
                />
              </View>
            ) : null}
          </View>

          {/* Content Snippet */}
          {snippet ? (
            <Text
              numberOfLines={hasCoverImage ? 2 : 4}
              style={styles.snippet}
            >
              {snippet}
            </Text>
          ) : null}
        </View>

        {/* Footer: Attachments badge + Relative Date */}
        <View style={styles.footer}>
          {hasAttachments ? (
            <View style={styles.attachmentChip}>
              <ImageIcon color={theme.colors.textSecondary} size={10} />
              <Text style={styles.attachmentText}>
                {note.attachments.length}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <Text numberOfLines={1} style={styles.dateText}>
            {formatRelativeDate(note.updatedAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      elevation: 2,
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      width: "100%",
    },
    cardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    coverImageContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      height: "44%",
      overflow: "hidden",
      width: "100%",
    },
    coverImage: {
      height: "100%",
      width: "100%",
    },
    cardContent: {
      flex: 1,
      justifyContent: "space-between",
    },
    cardContentWithCover: {
      padding: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    cardContentNoCover: {
      padding: theme.spacing.md,
    },
    topSection: {
      gap: 3,
    },
    titleRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 16,
    },
    pinBadge: {
      marginLeft: 3,
      paddingTop: 1,
    },
    snippet: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    footer: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 2,
    },
    attachmentChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 1.5,
    },
    attachmentText: {
      color: theme.colors.textSecondary,
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 10,
    },
  });
}
