import { memo, useCallback } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
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
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import type { ExpenseBudgetCheckResult } from "../services/check-expense-budgets.service";

export interface OverBudgetWarningModalProps {
  visible: boolean;
  results: ExpenseBudgetCheckResult[];
  onProceed: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export const OverBudgetWarningModal = memo(function OverBudgetWarningModal(props: OverBudgetWarningModalProps) {
  if (!props.visible || props.results.length === 0) return null;
  return <OverBudgetWarningModalContent {...props} />;
});

function OverBudgetWarningModalContent({
  results,
  onProceed,
  onCancel,
  pending = false,
}: OverBudgetWarningModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const handleCancel = useCallback(() => {
    if (pending) return;
    Keyboard.dismiss();
    onCancel();
  }, [onCancel, pending]);
  const handleProceed = useCallback(() => {
    if (pending) return;
    Keyboard.dismiss();
    onProceed();
  }, [onProceed, pending]);

  return (
    <Modal animationType="fade" onRequestClose={handleCancel} transparent visible>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("transactions.budgetWarningDismiss")}
          accessibilityRole="button"
          disabled={pending}
          onPress={handleCancel}
          style={styles.backdrop}
        />
        <View style={[styles.dialogContainer, isDesktop && styles.dialogContainerDesktop]}>
          <View style={styles.iconCircle}>
            <AlertTriangle color={theme.colors.danger} size={30} />
          </View>
          <Text style={styles.title}>{t("transactions.budgetWarningTitle")}</Text>
          {results.length > 1 ? (
            <Text style={styles.description}>{t("transactions.budgetWarningMultiple", { count: results.length })}</Text>
          ) : null}
          <ScrollView style={styles.budgetsScroll} keyboardShouldPersistTaps="handled">
            {results.map((result) => <BudgetWarningDetails key={result.budgetId} result={result} />)}
          </ScrollView>
          <View style={styles.buttonStack}>
            <AppButton label={t("transactions.budgetWarningProceed")} disabled={pending} loading={pending} onPress={handleProceed} variant="destructive" />
            <AppButton label={t("transactions.budgetWarningCancel")} disabled={pending} onPress={handleCancel} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BudgetWarningDetails = memo(function BudgetWarningDetails({ result }: { result: ExpenseBudgetCheckResult }) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const {
    categoryName, periodLabel, effectiveBudgetCents, currentSpentCents,
    additionalExpenseCents, newSpentCents, exceededByCents,
  } = result;
  const percentage = effectiveBudgetCents > 0 ? Math.round((newSpentCents / effectiveBudgetCents) * 100) : null;
  return (
    <View>
      <Text style={styles.description}>{t("transactions.budgetWarningDescription", { category: categoryName, period: periodLabel })}</Text>
      {/* Breakdown Box */}
      <View style={styles.breakdownBox}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t("transactions.budgetWarningLimit")}</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(effectiveBudgetCents, result.budgetCurrencyCode || "PHP", false)}
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t("transactions.budgetWarningCurrent")}</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(currentSpentCents, result.budgetCurrencyCode || "PHP", false)}
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t("transactions.budgetWarningExpense")}</Text>
          <Text style={[styles.breakdownValue, styles.expenseAmount]}>
            +{formatCurrency(additionalExpenseCents, result.budgetCurrencyCode || "PHP", false)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.breakdownRow}>
          <Text style={styles.totalLabel}>{t("transactions.budgetWarningNewTotal")}</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(newSpentCents, result.budgetCurrencyCode || "PHP", false)}
          </Text>
        </View>

        <View style={styles.exceededRow}>
          <Text style={styles.exceededLabel}>{t("transactions.budgetWarningOverBy")}</Text>
          <Text style={styles.exceededValue}>
            {formatCurrency(exceededByCents, result.budgetCurrencyCode || "PHP", false)}{percentage !== null ? ` (${percentage}%)` : ""}
          </Text>
        </View>
      </View>

    </View>
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
      maxHeight: "90%",
      padding: theme.spacing.xl,
      width: "100%",
    },
    budgetsScroll: {
      flexShrink: 1,
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
