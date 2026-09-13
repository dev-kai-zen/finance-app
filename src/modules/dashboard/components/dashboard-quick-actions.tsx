import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { TransactionType } from "@/modules/transactions";

export interface DashboardQuickActionsProps {
  onOpenTransactionModal: (initialMode: TransactionType) => void;
  onNavigateToAccounts: () => void;
}

export function DashboardQuickActions({
  onOpenTransactionModal,
  onNavigateToAccounts,
}: DashboardQuickActionsProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const actions = [
    {
      label: "+ Expense",
      icon: "arrow-up-right",
      color: theme.colors.danger,
      onPress: () => onOpenTransactionModal("expense"),
    },
    {
      label: "+ Income",
      icon: "arrow-down-left",
      color: theme.colors.success,
      onPress: () => onOpenTransactionModal("income"),
    },
    {
      label: "⇄ Transfer",
      icon: "arrow-left-right",
      color: theme.colors.info,
      onPress: () => onOpenTransactionModal("transfer"),
    },
    {
      label: "+ Account",
      icon: "landmark",
      color: theme.colors.primary,
      onPress: onNavigateToAccounts,
    },
  ] as const;

  return (
    <View style={styles.container}>
      {actions.map((act) => (
        <Pressable
          key={act.label}
          accessibilityLabel={act.label}
          accessibilityRole="button"
          onPress={act.onPress}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${act.color}22`, borderColor: `${act.color}45` },
            ]}
          >
            <IconHelper color={act.color} name={act.icon} size={18} />
          </View>
          <Text style={styles.actionLabel}>{act.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    actionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 12,
      ...theme.shadows.card,
    },
    actionBtnPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconWrapper: {
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      marginBottom: 6,
      width: 36,
    },
    actionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
