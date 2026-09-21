import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface ActionBottomSheetItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  onPress: () => void;
  selected?: boolean;
}

export interface ActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionBottomSheetItem[];
  title?: string;
}

export function ActionBottomSheet({
  visible,
  onClose,
  items,
  title,
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
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 32, right: 32 }}
            onPress={onClose}
            style={styles.handleContainer}
          >
            {({ pressed }) => (
              <View style={[styles.handle, pressed && styles.handlePressed]} />
            )}
          </Pressable>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: item.selected }}
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
              <View style={styles.itemCopy}>
                <Text
                  style={[
                    styles.itemLabel,
                    item.selected && styles.itemLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {item.description ? (
                  <Text style={styles.itemDescription}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {item.selected ? (
                <Check color={styles.selectedColor.color} size={20} />
              ) : (
                <ChevronRight color={styles.chevronColor.color} size={18} />
              )}
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
    handleContainer: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      width: 60,
    },
    handle: {
      backgroundColor: theme.colors.border,
      borderRadius: 999,
      height: 4,
      width: 40,
    },
    handlePressed: {
      backgroundColor: theme.colors.textMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
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
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    itemLabelSelected: {
      color: theme.colors.primary,
    },
    itemCopy: {
      flex: 1,
      gap: 2,
    },
    itemDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    chevronColor: {
      color: theme.colors.textMuted,
    },
    selectedColor: {
      color: theme.colors.primary,
    },
  });
}
