import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import type { VarianceValue } from "../../types/reports.types";

interface BalanceSheetDiffCellProps {
  variance: VarianceValue;
}

export function BalanceSheetDiffCell({ variance }: BalanceSheetDiffCellProps) {
  const { isPrivate } = usePrivacyMode();
  const hasSymbol = Boolean(variance.symbol);
  const displayDiff = formatPrivacyAmount(
    `${variance.formattedDiff}${hasSymbol ? ` ${variance.symbol}` : ""}`,
    isPrivate,
  );

  return (
    <View style={styles.container}>
      <Text
        numberOfLines={1}
        style={[styles.text, { color: variance.color }]}
      >
        {displayDiff}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
