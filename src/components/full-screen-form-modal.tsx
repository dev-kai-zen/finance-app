import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, RotateCcw, Save, Trash2 } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface FullScreenFormModalProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  deleteLabel?: string;
  deleteAction?: "delete" | "restore";
  saveDisabled?: boolean;
  deleteDisabled?: boolean;
  pending?: boolean;
  headerRight?: ReactNode;
}

export function FullScreenFormModal({
  visible,
  title,
  onClose,
  onSave,
  onDelete,
  saveLabel = "Save",
  deleteLabel = "Delete",
  deleteAction = "delete",
  saveDisabled = false,
  deleteDisabled = false,
  pending = false,
  headerRight,
  children,
}: FullScreenFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const defaultHeaderRight =
    onSave || onDelete ? (
      <View style={styles.headerActions}>
        {onDelete ? (
          <Pressable
            accessibilityLabel={deleteLabel}
            accessibilityRole="button"
            disabled={pending || deleteDisabled}
            onPress={onDelete}
            style={[
              styles.iconBtn,
              deleteAction === "restore" ? styles.restoreBtn : styles.deleteBtn,
              (pending || deleteDisabled) && styles.iconBtnDisabled,
            ]}
          >
            {deleteAction === "restore" ? (
              <RotateCcw color={theme.colors.success} size={18} />
            ) : (
              <Trash2 color={theme.colors.danger} size={18} />
            )}
          </Pressable>
        ) : null}
        {onSave ? (
          <Pressable
            accessibilityLabel={saveLabel}
            accessibilityRole="button"
            disabled={pending || saveDisabled}
            onPress={onSave}
            style={[
              styles.iconBtn,
              styles.saveBtn,
              (pending || saveDisabled) && styles.iconBtnDisabled,
            ]}
          >
            {pending ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <Save color={theme.colors.onPrimary} size={18} />
            )}
          </Pressable>
        ) : null}
      </View>
    ) : (
      <View style={styles.headerActionsPlaceholder} />
    );

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!pending) onClose();
      }}
      visible={visible}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            disabled={pending}
            onPress={onClose}
            style={styles.backBtn}
          >
            <ChevronLeft color={theme.colors.textPrimary} size={24} />
          </Pressable>

          <View style={styles.titleCol}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          </View>

          {headerRight ?? defaultHeaderRight}
        </View>

        <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {children}
        </View>
      </View>
    </Modal>
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
    backBtn: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    titleCol: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    headerActionsPlaceholder: {
      width: 40,
    },
    iconBtn: {
      alignItems: "center",
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
    },
    deleteBtn: {
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}40`,
      borderWidth: 1,
    },
    restoreBtn: {
      backgroundColor: `${theme.colors.success}18`,
      borderColor: `${theme.colors.success}40`,
      borderWidth: 1,
    },
    iconBtnDisabled: {
      opacity: 0.5,
    },
    body: {
      flex: 1,
    },
  });
}
