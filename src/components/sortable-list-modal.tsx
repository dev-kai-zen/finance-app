import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowDownAZ,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { FullScreenFormModal } from "./full-screen-form-modal";
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
    <FullScreenFormModal
      pending={saving}
      saveLabel="Save order"
      title={title}
      visible={visible}
      onClose={onClose}
      onSave={() => {
        void handleSave();
      }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        <Text style={styles.instructionText}>
          Use the arrow buttons to reorder items freely, or tap Sort A-Z. Then
          tap the save icon.
        </Text>

        {showAlphabetizeAction && items.length > 1 ? (
          <Pressable
            accessibilityLabel="Sort A-Z"
            accessibilityRole="button"
            disabled={saving}
            onPress={sortAlphabetically}
            style={[styles.azBtn, saving && styles.azBtnDisabled]}
          >
            <ArrowDownAZ color={theme.colors.primary} size={15} />
            <Text style={styles.azBtnText}>Sort A-Z</Text>
          </Pressable>
        ) : null}

        {items.map((item, index) => (
          <View key={item.id} style={styles.itemRow}>
            <GripVertical
              color={theme.colors.textMuted}
              size={16}
              style={{ marginRight: 8 }}
            />

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
                  color={item.color ?? theme.colors.primary}
                  name={item.icon}
                  size={16}
                />
              </View>
            ) : null}

            <Text numberOfLines={1} style={styles.itemNameText}>
              {item.name}
            </Text>

            <Text style={styles.positionText}>{index + 1}</Text>

            <TouchableOpacity
              accessibilityLabel={`Move up ${item.name}`}
              disabled={index === 0}
              onPress={() => moveItem(index, index - 1)}
              style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
            >
              <ChevronUp
                color={
                  index === 0 ? theme.colors.textMuted : theme.colors.primary
                }
                size={18}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={`Move down ${item.name}`}
              disabled={index === items.length - 1}
              onPress={() => moveItem(index, index + 1)}
              style={[
                styles.arrowBtn,
                index === items.length - 1 && styles.arrowBtnDisabled,
              ]}
            >
              <ChevronDown
                color={
                  index === items.length - 1
                    ? theme.colors.textMuted
                    : theme.colors.primary
                }
                size={18}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </FullScreenFormModal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    azBtn: {
      alignSelf: "flex-start",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    azBtnDisabled: {
      opacity: 0.5,
    },
    azBtnText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    instructionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.xs,
    },
    itemRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
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
  });
}
