import type { ReactNode } from "react";
import { ArrowLeftRight, Calculator } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

export interface AmountCalculatorFieldProps {
  label: string;
  labelAccessory?: ReactNode;
  amountMinorUnits: number;
  amountSign?: "+" | "-" | "transfer";
  onToggleSign?: () => void;
  onOpenCalculator: () => void;
  currencyCode?: string;
  disabled?: boolean;
  showSignToggle?: boolean;
  showCurrencyPill?: boolean;
}

export function AmountCalculatorField({
  label,
  labelAccessory,
  amountMinorUnits,
  amountSign = "+",
  onToggleSign,
  onOpenCalculator,
  currencyCode = "PHP",
  disabled = false,
  showSignToggle = true,
  showCurrencyPill = true,
}: AmountCalculatorFieldProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;
  const displayAmount = showCurrencyPill
    ? formatCurrency(absMinorUnits, currencyCode, false)
        .replace(/^-?₱/, "")
        .replace(/^-?/, "")
    : `${major.toLocaleString("en-PH")}.${String(minor).padStart(2, "0")}`;

  const isTransfer = amountSign === "transfer";
  const signIsPositive = amountSign === "+";

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelAccessory}
      </View>
      <View style={styles.row}>
        <View style={[styles.amountShell, disabled && styles.amountShellDisabled]}>
          {showSignToggle ? (
            <Pressable
              accessibilityLabel={
                isTransfer
                  ? "Transfer amount"
                  : `Toggle amount sign. Currently ${signIsPositive ? "positive" : "negative"}`
              }
              accessibilityRole="button"
              disabled={disabled || isTransfer || !onToggleSign}
              onPress={isTransfer ? undefined : onToggleSign}
              style={[
                styles.signCircle,
                isTransfer
                  ? styles.signCircleTransfer
                  : signIsPositive
                    ? styles.signCirclePositive
                    : styles.signCircleNegative,
              ]}
            >
              {isTransfer ? (
                <ArrowLeftRight color={theme.colors.onPrimary} size={18} />
              ) : (
                <Text style={styles.signCircleText}>{amountSign}</Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel={`Amount ${displayAmount}. Open calculator.`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={onOpenCalculator}
            style={styles.amountTapArea}
          >
            <Text style={styles.amountValue}>{displayAmount}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Open calculator"
            accessibilityRole="button"
            disabled={disabled}
            onPress={onOpenCalculator}
            style={styles.calcCircle}
          >
            <Calculator color={theme.colors.onPrimary} size={18} />
          </Pressable>
        </View>

        {showCurrencyPill ? (
          <View style={styles.currencyPill}>
            <Text style={styles.currencyPillText}>{currencyCode}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing.sm,
    },
    labelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    amountShell: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      minHeight: 52,
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    amountShellDisabled: {
      opacity: 0.55,
    },
    signCircle: {
      alignItems: "center",
      borderRadius: 999,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    signCirclePositive: {
      backgroundColor: theme.colors.success,
    },
    signCircleNegative: {
      backgroundColor: theme.colors.danger,
    },
    signCircleTransfer: {
      backgroundColor: theme.colors.info,
    },
    signCircleText: {
      color: theme.colors.onPrimary,
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 24,
    },
    amountTapArea: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      minWidth: 0,
      paddingHorizontal: theme.spacing.sm,
    },
    amountValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      textAlign: "center",
    },
    calcCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.info,
      borderRadius: 999,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    currencyPill: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
    },
    currencyPillText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
  });
}
