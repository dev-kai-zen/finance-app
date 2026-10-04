import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { FileText, Image as ImageIcon, Pin, Trash2 } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import type { Note } from "../types/note.types";
import { extractSnippet, formatRelativeDate } from "../utils/note-formatters";

export interface NoteTableRowProps {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

const ACTION_WIDTH = 75;

export const NoteTableRow = memo(function NoteTableRow({
  note,
  onPress,
  onLongPress,
  onDelete,
}: NoteTableRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const hasAttachments = note.attachments.length > 0;
  const coverAttachment = hasAttachments ? note.attachments[0] : null;
  const snippet = extractSnippet(note.content, 60);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onStart(() => {
          startX.set(translateX.get());
        })
        .onUpdate((event) => {
          const next = startX.get() + event.translationX;
          // Only allow swiping to the left, bounded between -ACTION_WIDTH and 0
          translateX.set(Math.min(0, Math.max(-ACTION_WIDTH - 10, next)));
        })
        .onEnd((event) => {
          if (translateX.get() < -ACTION_WIDTH / 2 || event.velocityX < -400) {
            translateX.set(
              withSpring(-ACTION_WIDTH, { dampingRatio: 0.85, duration: 250 }),
            );
          } else {
            translateX.set(
              withSpring(0, { dampingRatio: 0.85, duration: 250 }),
            );
          }
        }),
    [startX, translateX],
  );

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const handleRowPress = () => {
    if (translateX.get() < -10) {
      translateX.set(withSpring(0, { dampingRatio: 0.85, duration: 200 }));
      return;
    }
    onPress(note);
  };

  const handleDeletePress = () => {
    translateX.set(withSpring(0, { dampingRatio: 0.85, duration: 200 }));
    onDelete?.(note);
  };

  return (
    <View style={styles.container}>
      {/* Background Delete Button revealed upon swipe */}
      <View style={styles.actionsContainer}>
        <Pressable
          accessibilityLabel={`Delete ${note.title}`}
          accessibilityRole="button"
          onPress={handleDeletePress}
          style={styles.deleteButton}
        >
          <Trash2 color="#ffffff" size={18} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>

      {/* Swipeable Row */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedRowStyle}>
          <Pressable
            accessibilityLabel={`Note: ${note.title}`}
            accessibilityRole="button"
            onLongPress={() => onLongPress?.(note)}
            onPress={handleRowPress}
            style={({ pressed }) => [
              styles.row,
              note.color
                ? { borderLeftColor: note.color, borderLeftWidth: 3.5 }
                : null,
              pressed && styles.rowPressed,
            ]}
          >
            {/* Thumbnail or placeholder */}
            <View style={styles.thumbnailContainer}>
              {coverAttachment?.uri ? (
                <Image
                  contentFit="cover"
                  source={{ uri: coverAttachment.uri }}
                  style={styles.thumbnail}
                  transition={150}
                />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <FileText color={theme.colors.textMuted} size={18} />
                </View>
              )}
            </View>

            {/* Main information */}
            <View style={styles.infoCell}>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  {note.title}
                </Text>
                {note.isPinned ? (
                  <Pin
                    color={theme.colors.primary}
                    fill={theme.colors.primary}
                    size={12}
                  />
                ) : null}
              </View>

              {snippet ? (
                <Text numberOfLines={1} style={styles.snippet}>
                  {snippet}
                </Text>
              ) : null}
            </View>

            {/* Attachments counter */}
            {hasAttachments ? (
              <View style={styles.attachmentChip}>
                <ImageIcon color={theme.colors.textSecondary} size={12} />
                <Text style={styles.attachmentText}>
                  {note.attachments.length}
                </Text>
              </View>
            ) : null}

            {/* Timestamp */}
            <Text style={styles.dateText}>
              {formatRelativeDate(note.updatedAt)}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: theme.spacing.xs,
      position: "relative",
      width: "100%",
    },
    actionsContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.danger,
      borderRadius: theme.borderRadius.medium,
      bottom: 0,
      justifyContent: "center",
      position: "absolute",
      right: 0,
      top: 0,
      width: ACTION_WIDTH,
    },
    deleteButton: {
      alignItems: "center",
      height: "100%",
      justifyContent: "center",
      width: "100%",
    },
    deleteText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: 2,
    },
    row: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      width: "100%",
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    thumbnailContainer: {
      borderRadius: theme.borderRadius.small,
      height: 42,
      overflow: "hidden",
      width: 42,
    },
    thumbnail: {
      height: "100%",
      width: "100%",
    },
    placeholderThumbnail: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      height: "100%",
      justifyContent: "center",
      width: "100%",
    },
    infoCell: {
      flex: 1,
      gap: 2,
      justifyContent: "center",
      minWidth: 0,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    snippet: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    attachmentChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    attachmentText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: "right",
      width: 65,
    },
  });
}
