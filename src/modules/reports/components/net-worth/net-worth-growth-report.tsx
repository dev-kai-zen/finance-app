import React from "react";
import { StyleSheet, View } from "react-native";
import { useNetWorthGrowthReport } from "../../hooks/use-net-worth-growth-report";
import { NetWorthFilterBar } from "./net-worth-filter-bar";
import { NetWorthGrowthChart } from "./net-worth-growth-chart";
import { NetWorthHistoryTable } from "./net-worth-history-table";
import { NetWorthSummaryCards } from "./net-worth-summary-cards";

export function NetWorthGrowthReport() {
  const {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    selectedPointIndex,
    setSelectedPointIndex,
  } = useNetWorthGrowthReport();

  return (
    <View style={styles.container}>
      <NetWorthFilterBar
        preset={preset}
        onSelectPreset={(p) => {
          setPreset(p);
          setSelectedPointIndex(null);
        }}
        range={range}
        customDateA={customDateA}
        customDateB={customDateB}
        onChangeCustomDateA={setCustomDateA}
        onChangeCustomDateB={setCustomDateB}
      />

      <NetWorthSummaryCards
        currentNetWorthMinorUnits={data.currentNetWorthMinorUnits}
        periodChangeMinorUnits={data.periodChangeMinorUnits}
        periodChangePercentage={data.periodChangePercentage}
        peakNetWorthMinorUnits={data.peakNetWorthMinorUnits}
        lowestNetWorthMinorUnits={data.lowestNetWorthMinorUnits}
      />

      <NetWorthGrowthChart
        points={data.points}
        selectedPointIndex={selectedPointIndex}
        onSelectPointIndex={setSelectedPointIndex}
      />

      <NetWorthHistoryTable
        points={data.points}
        selectedPointIndex={selectedPointIndex}
        onSelectPointIndex={setSelectedPointIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
