import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trash2, X } from "lucide-react-native";

import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";

export interface NoteImageViewerModalProps {
  visible: boolean;
  imageUri: string | null;
  imageName?: string;
  onClose: () => void;
  onDelete?: () => void;
}

export function NoteImageViewerModal({
  visible,
  imageUri,
  imageName,
  onClose,
  onDelete,
}: NoteImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (!visible || !imageUri) return null;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, theme.spacing.md) },
          ]}
        >
          <Text numberOfLines={1} style={styles.title}>
            {imageName ?? "Attachment"}
          </Text>
          <View style={styles.headerActions}>
            {onDelete ? (
              <Pressable
                accessibilityLabel="Delete image"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onDelete}
                style={styles.actionButton}
              >
                <Trash2 color={theme.colors.danger} size={20} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Close image viewer"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.actionButton}
            >
              <X color={theme.colors.onPrimary} size={22} />
            </Pressable>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <Image
            contentFit="contain"
            source={{ uri: imageUri }}
            style={styles.image}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.94)",
      flex: 1,
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      zIndex: 10,
    },
    title: {
      color: "#ffffff",
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      marginRight: theme.spacing.md,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    actionButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: theme.borderRadius.round,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    imageContainer: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.md,
    },
    image: {
      height: "100%",
      width: "100%",
    },
  });
}
