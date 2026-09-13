import React from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatPhpCurrency } from "@/utils/currency";

export interface FormattedCurrencyProps {
  amountMinorUnits: number;
  showPositiveSign?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
}

/**
 * Reusable component for displaying PHP Currency amounts.
 * Automatically formats numbers with commas, conditional sign, and color:
 * - Positive (> 0): Green (theme.colors.success)
 * - Negative (< 0): Red (theme.colors.danger)
 * - Zero (= 0): Neutral (theme.colors.textMuted)
 */
export function FormattedCurrency({
  amountMinorUnits,
  showPositiveSign = true,
  style,
  numberOfLines = 1,
}: FormattedCurrencyProps) {
  const theme = useAppTheme();

  const { formatted, color } = formatPhpCurrency(amountMinorUnits, {
    showPositiveSign,
    positiveColor: theme.colors.success,
    negativeColor: theme.colors.danger,
    zeroColor: theme.colors.textMuted,
  });

  return (
    <Text numberOfLines={numberOfLines} style={[{ color }, styles.base, style]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ["tabular-nums"],
  },
});
