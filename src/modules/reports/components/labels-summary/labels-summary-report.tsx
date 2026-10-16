import React from "react";
import { StyleSheet, View } from "react-native";
import { useLabelsSummaryReport } from "../../hooks/use-labels-summary-report";
import { IncomeExpenseFilterBar } from "../income-expense/income-expense-filter-bar";
import { LabelsSummaryDonutChart } from "./labels-summary-donut-chart";
import { LabelsSummaryTable } from "./labels-summary-table";

export function LabelsSummaryReport() {
  const {
    mode,
    setMode,
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    selectedLabelId,
    setSelectedLabelId,
  } = useLabelsSummaryReport();

  return (
    <View style={styles.container}>
      <IncomeExpenseFilterBar
        mode={mode}
        onSelectMode={(newMode) => {
          setMode(newMode);
          setSelectedLabelId(null);
        }}
        preset={preset}
        onSelectPreset={(newPreset) => {
          setPreset(newPreset);
          setSelectedLabelId(null);
        }}
        range={range}
        customDateA={customDateA}
        customDateB={customDateB}
        onChangeCustomDateA={setCustomDateA}
        onChangeCustomDateB={setCustomDateB}
      />

      <LabelsSummaryDonutChart
        labels={data.labels}
        totalMinorUnits={data.totalMinorUnits}
        transactionCount={data.transactionCount}
        mode={mode}
        selectedLabelId={selectedLabelId}
        onSelectLabel={setSelectedLabelId}
      />

      <LabelsSummaryTable
        labels={data.labels}
        totalMinorUnits={data.totalMinorUnits}
        labeledMinorUnits={data.labeledMinorUnits}
        unlabeledMinorUnits={data.unlabeledMinorUnits}
        transactionCount={data.transactionCount}
        labeledTransactionCount={data.labeledTransactionCount}
        unlabeledTransactionCount={data.unlabeledTransactionCount}
        mode={mode}
        selectedLabelId={selectedLabelId}
        onSelectLabel={setSelectedLabelId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
