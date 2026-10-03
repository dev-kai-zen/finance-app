import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { VarianceValue } from "../../types/reports.types";

interface BalanceSheetDiffCellProps {
  variance: VarianceValue;
}

export function BalanceSheetDiffCell({ variance }: BalanceSheetDiffCellProps) {
  const hasSymbol = Boolean(variance.symbol);

  return (
    <View style={styles.container}>
      <Text
        numberOfLines={1}
        style={[styles.text, { color: variance.color }]}
      >
        {variance.formattedDiff}
        {hasSymbol ? ` ${variance.symbol}` : ""}
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
