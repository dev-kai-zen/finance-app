import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { TransactionType } from "../types/transaction.types";

interface TransactionTypePickerProps {
  disabled?: boolean;
  onChange: (value: TransactionType) => void;
  value: TransactionType;
}

const TRANSACTION_TYPES: ReadonlyArray<{
  label: string;
  value: TransactionType;
}> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Fund Transfer", value: "transfer" },
];

export function TransactionTypePicker({
  disabled = false,
  onChange,
  value,
}: TransactionTypePickerProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.tabBar}>
      {TRANSACTION_TYPES.map((option) => {
        const active = value === option.value;
        const activeColor =
          option.value === "expense"
            ? theme.colors.danger
            : option.value === "income"
              ? theme.colors.success
              : theme.colors.info;

        return (
          <Pressable
            key={option.value}
            accessibilityLabel={`Switch to ${option.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.tabItem,
              active && styles.tabItemActive,
              active && { backgroundColor: activeColor },
              disabled && styles.disabled,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.tabText, active && styles.tabTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tabBar: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      padding: 4,
    },
    tabItem: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      flex: 1,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 8,
    },
    tabItemActive: {
      ...theme.shadows.card,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: theme.colors.textInverse,
      fontWeight: "700",
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
