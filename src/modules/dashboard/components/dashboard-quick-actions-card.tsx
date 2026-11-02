import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface DashboardQuickActionsCardProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddTransfer: () => void;
  onOpenAssistant: () => void;
}

export function DashboardQuickActionsCard({
  onAddExpense,
  onAddIncome,
  onAddTransfer,
  onOpenAssistant,
}: DashboardQuickActionsCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <View style={styles.card}>
      <View style={styles.actionsGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onAddExpense}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.quickActionExpense")}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.danger}18` },
            ]}
          >
            <ArrowUpRight size={17} color={theme.colors.danger} />
          </View>
          <Text
            style={styles.actionLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("dashboard.quickActionExpense")}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onAddIncome}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.quickActionIncome")}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.success}18` },
            ]}
          >
            <ArrowDownLeft size={17} color={theme.colors.success} />
          </View>
          <Text
            style={styles.actionLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("dashboard.quickActionIncome")}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onAddTransfer}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.quickActionTransfer")}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.primary}18` },
            ]}
          >
            <ArrowLeftRight size={17} color={theme.colors.primary} />
          </View>
          <Text
            style={styles.actionLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("dashboard.quickActionTransfer")}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onOpenAssistant}
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.quickActionAi")}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${theme.colors.accent}22` },
            ]}
          >
            <Sparkles size={17} color={theme.colors.primary} />
          </View>
          <Text
            style={styles.actionLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {t("dashboard.quickActionAi")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    actionsGrid: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: theme.spacing.xs,
    },
    actionButton: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonPressed: {
      opacity: 0.78,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
  });
