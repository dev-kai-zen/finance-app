import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountType } from "@/modules/accounts/types/account.types";

export function AccountTypePickerModal({
  visible,
  types,
  value,
  existingTypeId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  types: AccountType[];
  value: string;
  existingTypeId?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Account Type</Text>
            <Pressable accessibilityLabel="Close picker" onPress={onClose} style={styles.closeBtn}>
              <X color={theme.colors.textSecondary} size={20} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {(["asset", "liability"] as const).map((group) => {
              const options = types.filter(
                (t) =>
                  t.accountGroup === group &&
                  (!t.isArchived || t.id === existingTypeId),
              );
              if (options.length === 0) return null;

              return (
                <View key={group} style={styles.group}>
                  <Text style={styles.groupLabel}>
                    {group === "asset" ? "Assets" : "Liabilities"}
                  </Text>
                  {options.map((type) => {
                    const selected = value === type.id;
                    const color = type.color
                      ? theme.colors.categorical[type.color as keyof typeof theme.colors.categorical] ??
                        theme.colors.primary
                      : theme.colors.primary;

                    return (
                      <Pressable
                        key={type.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          onSelect(type.id);
                          onClose();
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          selected && styles.optionSelected,
                          pressed && styles.optionPressed,
                        ]}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
                          <IconHelper color={color} name={type.iconKey ?? "landmark"} size={18} />
                        </View>
                        <Text style={styles.optionLabel}>{type.name}</Text>
                        {selected ? <Check color={theme.colors.primary} size={18} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
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
      maxHeight: "80%",
      paddingTop: theme.spacing.md,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeBtn: {
      padding: theme.spacing.xs,
    },
    group: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    groupLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.xs,
    },
    option: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    },
    optionPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    optionLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
