import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowDownAZ,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "./icon-helper";

export interface SortableItem {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface SortableListModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: SortableItem[];
  onSave: (orderedIds: string[]) => Promise<void> | void;
  showAlphabetizeAction?: boolean;
}

export function SortableListModal({
  visible,
  onClose,
  title,
  items: initialItems,
  onSave,
  showAlphabetizeAction = true,
}: SortableListModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SortableItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setItems([...initialItems]);
    }
  }, [visible, initialItems]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setItems(updated);
  };

  const sortAlphabetically = () => {
    const sorted = [...items].sort((a, b) => {
      const aIsOther = a.name.toLowerCase().startsWith("other");
      const bIsOther = b.name.toLowerCase().startsWith("other");
      if (aIsOther && !bIsOther) return 1;
      if (!aIsOther && bIsOther) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    setItems(sorted);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map((i) => i.id));
      onClose();
    } catch {
      // Error handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.sheetBackdrop}
          onPress={onClose}
          accessibilityLabel="Close sort modal backdrop"
        />

        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerRight}>
              {showAlphabetizeAction && items.length > 1 && (
                <TouchableOpacity
                  style={styles.azBtn}
                  onPress={sortAlphabetically}
                  activeOpacity={0.7}
                  accessibilityLabel="Sort A-Z"
                >
                  <ArrowDownAZ size={15} color={theme.colors.primary} />
                  <Text style={styles.azBtnText}>Sort A-Z</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.instructionText}>
            Use the arrow buttons to reorder items freely, or tap Sort A-Z. Then tap Save Order.
          </Text>

          {/* Sortable List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                {/* Drag handle indicator */}
                <GripVertical
                  size={16}
                  color={theme.colors.textMuted}
                  style={{ marginRight: 8 }}
                />

                {/* Icon */}
                {item.icon ? (
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: item.color
                          ? `${item.color}25`
                          : `${theme.colors.primary}25`,
                      },
                    ]}
                  >
                    <IconHelper
                      name={item.icon}
                      size={16}
                      color={item.color ?? theme.colors.primary}
                    />
                  </View>
                ) : null}

                {/* Name */}
                <Text style={styles.itemNameText} numberOfLines={1}>
                  {item.name}
                </Text>

                {/* Position label */}
                <Text style={styles.positionText}>{index + 1}</Text>

                {/* Move Up */}
                <TouchableOpacity
                  style={[
                    styles.arrowBtn,
                    index === 0 && styles.arrowBtnDisabled,
                  ]}
                  onPress={() => moveItem(index, index - 1)}
                  disabled={index === 0}
                  accessibilityLabel={`Move up ${item.name}`}
                >
                  <ChevronUp
                    size={18}
                    color={
                      index === 0
                        ? theme.colors.textMuted
                        : theme.colors.primary
                    }
                  />
                </TouchableOpacity>

                {/* Move Down */}
                <TouchableOpacity
                  style={[
                    styles.arrowBtn,
                    index === items.length - 1 && styles.arrowBtnDisabled,
                  ]}
                  onPress={() => moveItem(index, index + 1)}
                  disabled={index === items.length - 1}
                  accessibilityLabel={`Move down ${item.name}`}
                >
                  <ChevronDown
                    size={18}
                    color={
                      index === items.length - 1
                        ? theme.colors.textMuted
                        : theme.colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(5, 8, 13, 0.7)",
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      borderTopWidth: 1,
      maxHeight: "78%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    titleText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.bold,
      marginRight: theme.spacing.sm,
    },
    headerRight: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    azBtn: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
    },
    azBtnText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
      marginLeft: 4,
    },
    closeBtn: {
      padding: 4,
    },
    instructionText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginBottom: theme.spacing.md,
    },
    scrollArea: {
      maxHeight: 380,
    },
    scrollContent: {
      paddingBottom: theme.spacing.sm,
    },
    itemRow: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    iconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 30,
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      width: 30,
    },
    itemNameText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    positionText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
      marginRight: theme.spacing.sm,
    },
    arrowBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      marginLeft: 2,
      width: 32,
    },
    arrowBtnDisabled: {
      opacity: 0.25,
    },
    footer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    cancelBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    saveBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
