import { memo } from "react";
import {
  Keyboard,
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
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import type { CreditLimitCheckResult } from "../services/check-credit-limit-exceeded.service";

export interface CreditLimitWarningModalProps {
  visible: boolean;
  result: CreditLimitCheckResult | null;
  onProceed: () => void;
  onCancel: () => void;
  pending?: boolean;
}

export const CreditLimitWarningModal = memo(function CreditLimitWarningModal({
  visible,
  result,
  onProceed,
  onCancel,
  pending = false,
}: CreditLimitWarningModalProps) {
  if (!visible || !result || !result.exceeds) {
    return null;
  }

  return (
    <CreditLimitWarningModalContent
      onCancel={onCancel}
      onProceed={onProceed}
      pending={pending}
      result={result}
    />
  );
});

const CreditLimitWarningModalContent = memo(function CreditLimitWarningModalContent({
  result,
  onProceed,
  onCancel,
  pending = false,
}: {
  result: CreditLimitCheckResult;
  onProceed: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  const {
    accountName,
    currencyCode,
    creditLimitMinorUnits,
    currentOutstandingMinorUnits,
    additionalExpenseMinorUnits,
    newOutstandingMinorUnits,
    exceededByMinorUnits,
  } = result;

  const percentage =
    creditLimitMinorUnits > 0
      ? Math.round((newOutstandingMinorUnits / creditLimitMinorUnits) * 100)
      : 100;

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleCancel}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t(
            "creditCardMonitoring.limitWarning.dismissAccessibility",
          )}
          accessibilityRole="button"
          onPress={handleCancel}
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

          {/* Title & Info */}
          <Text style={styles.title}>
            {t("creditCardMonitoring.limitWarning.title")}
          </Text>
          <Text style={styles.description}>
            {t("creditCardMonitoring.limitWarning.description", { accountName })}
          </Text>

          {/* Breakdown Box */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t("creditCardMonitoring.limitWarning.creditLimit")}
              </Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(creditLimitMinorUnits, currencyCode, false)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t("creditCardMonitoring.limitWarning.currentOutstanding")}
              </Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(currentOutstandingMinorUnits, currencyCode, false)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t("creditCardMonitoring.limitWarning.thisExpense")}
              </Text>
              <Text style={[styles.breakdownValue, styles.expenseAmount]}>
                +{formatCurrency(additionalExpenseMinorUnits, currencyCode, false)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>
                {t("creditCardMonitoring.limitWarning.newTotalDebt")}
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(newOutstandingMinorUnits, currencyCode, false)}
              </Text>
            </View>

            <View style={styles.exceededRow}>
              <Text style={styles.exceededLabel}>
                {t("creditCardMonitoring.limitWarning.exceededBy")}
              </Text>
              <Text style={styles.exceededValue}>
                {t("creditCardMonitoring.limitWarning.exceededByAmount", {
                  amount: formatCurrency(
                    exceededByMinorUnits,
                    currencyCode,
                    false,
                  ),
                  percent: percentage,
                })}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <AppButton
              label={t("creditCardMonitoring.limitWarning.proceed")}
              loading={pending}
              onPress={onProceed}
              variant="destructive"
            />
            <AppButton
              disabled={pending}
              label={t("creditCardMonitoring.limitWarning.cancelEdit")}
              onPress={handleCancel}
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
      width: "100%",
    },
    breakdownRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
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
      width: "100%",
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
      paddingVertical: 4,
    },
    exceededLabel: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "700",
    },
    exceededValue: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "700",
    },
    buttonStack: {
      gap: theme.spacing.sm,
      width: "100%",
    },
  });
}
