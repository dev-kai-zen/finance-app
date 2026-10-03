import React from "react";
import { StyleSheet, View } from "react-native";
import { useCashFlowReport } from "../../hooks/use-cash-flow-report";
import { CashFlowBarChart } from "./cash-flow-bar-chart";
import { CashFlowFilterBar } from "./cash-flow-filter-bar";
import { CashFlowSummaryCards } from "./cash-flow-summary-cards";
import { CashFlowTable } from "./cash-flow-table";

export function CashFlowReport() {
  const {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    selectedPeriodKey,
    setSelectedPeriodKey,
  } = useCashFlowReport();

  return (
    <View style={styles.container}>
      <CashFlowFilterBar
        preset={preset}
        onSelectPreset={(p) => {
          setPreset(p);
          setSelectedPeriodKey(null);
        }}
        range={range}
        customDateA={customDateA}
        customDateB={customDateB}
        onChangeCustomDateA={setCustomDateA}
        onChangeCustomDateB={setCustomDateB}
      />

      <CashFlowSummaryCards
        totalInflowMinorUnits={data.totalInflowMinorUnits}
        totalOutflowMinorUnits={data.totalOutflowMinorUnits}
        netCashFlowMinorUnits={data.netCashFlowMinorUnits}
        savingsRatePercentage={data.overallSavingsRatePercentage}
      />

      <CashFlowBarChart
        periods={data.periods}
        selectedPeriodKey={selectedPeriodKey}
        onSelectPeriod={setSelectedPeriodKey}
      />

      <CashFlowTable
        periods={data.periods}
        totalInflowMinorUnits={data.totalInflowMinorUnits}
        totalOutflowMinorUnits={data.totalOutflowMinorUnits}
        netCashFlowMinorUnits={data.netCashFlowMinorUnits}
        overallSavingsRatePercentage={data.overallSavingsRatePercentage}
        selectedPeriodKey={selectedPeriodKey}
        onSelectPeriod={setSelectedPeriodKey}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
