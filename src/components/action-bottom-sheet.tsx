import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface ActionBottomSheetItem {
  id: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

export interface ActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionBottomSheetItem[];
}

export function ActionBottomSheet({
  visible,
  onClose,
  items,
}: ActionBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close menu"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.handle} />
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                index > 0 && styles.itemBorder,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.itemIcon}>{item.icon}</View>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <ChevronRight color={styles.chevronColor.color} size={18} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      paddingTop: theme.spacing.sm,
      ...theme.shadows.modal,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: theme.colors.border,
      borderRadius: 999,
      height: 4,
      marginBottom: theme.spacing.md,
      width: 40,
    },
    item: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    itemBorder: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
    },
    itemPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    itemIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 28,
    },
    itemLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    chevronColor: {
      color: theme.colors.textMuted,
    },
  });
}
