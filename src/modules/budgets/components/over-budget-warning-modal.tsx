import { memo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { AppButton } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { BudgetCheckResult } from "../types/budget.types";

export interface OverBudgetWarningModalProps {
  visible: boolean;
  result: BudgetCheckResult | null;
  onProceed: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export const OverBudgetWarningModal = memo(function OverBudgetWarningModal({
  visible,
  result,
  onProceed,
  onCancel,
  pending = false,
}: OverBudgetWarningModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (!result || !result.exceeds) {
    return null;
  }

  const {
    categoryName,
    periodLabel,
    effectiveBudgetCents,
    currentSpentCents,
    additionalExpenseCents,
    newSpentCents,
    exceededByCents,
  } = result;

  const percentage =
    effectiveBudgetCents > 0
      ? Math.round((newSpentCents / effectiveBudgetCents) * 100)
      : 100;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss budget warning"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.dialogContainer,
            isDesktop && styles.dialogContainerDesktop,
          ]}
        >
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <AlertTriangle color={theme.colors.danger} size={30} />
          </View>

          {/* Title & Category Info */}
          <Text style={styles.title}>Budget Exceeded</Text>
          <Text style={styles.description}>
            This expense will push{" "}
            <Text style={styles.boldText}>{categoryName}</Text> over its{" "}
            <Text style={styles.boldText}>{periodLabel}</Text> budget limit.
          </Text>

          {/* Breakdown Box */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Budget Limit</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(effectiveBudgetCents, "PHP", false)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Current Spending</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(currentSpentCents, "PHP", false)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>This Expense</Text>
              <Text style={[styles.breakdownValue, styles.expenseAmount]}>
                +{formatCurrency(additionalExpenseCents, "PHP", false)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>New Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(newSpentCents, "PHP", false)}
              </Text>
            </View>

            <View style={styles.exceededRow}>
              <Text style={styles.exceededLabel}>Over by</Text>
              <Text style={styles.exceededValue}>
                {formatCurrency(exceededByCents, "PHP", false)} ({percentage}%)
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <AppButton
              label="Proceed Anyway"
              loading={pending}
              onPress={onProceed}
              variant="destructive"
            />
            <AppButton
              disabled={pending}
              label="Cancel & Edit"
              onPress={onCancel}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    dialogContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      padding: theme.spacing.xl,
      width: "100%",
    },
    dialogContainerDesktop: {
      maxWidth: 460,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 60,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 60,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    boldText: {
      color: theme.colors.textPrimary,
      fontWeight: "600",
    },
    breakdownBox: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: theme.spacing.xl,
      padding: theme.spacing.md,
    },
    breakdownRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    breakdownLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    breakdownValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    expenseAmount: {
      color: theme.colors.danger,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginVertical: theme.spacing.xs,
    },
    totalLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    totalValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    exceededRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 2,
    },
    exceededLabel: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    exceededValue: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "700",
    },
    buttonStack: {
      gap: theme.spacing.sm,
    },
  });
}
