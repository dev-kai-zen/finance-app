import React from "react";
import { StyleSheet, View } from "react-native";
import { PageLoadingState } from "@/components/page-container";
import { WalkthroughTarget } from "@/modules/walkthrough";
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
    reportLoading,
    selectedPeriodKey,
    setSelectedPeriodKey,
  } = useCashFlowReport();

  return (
    <View style={styles.container}>
      <WalkthroughTarget id="reportsFilterBar">
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
      </WalkthroughTarget>

      {reportLoading ? (
        <PageLoadingState message="Loading report..." variant="cards" />
      ) : (
        <>
          <CashFlowSummaryCards
            totalInflowMinorUnits={data.totalInflowMinorUnits}
            totalOutflowMinorUnits={data.totalOutflowMinorUnits}
            netCashFlowMinorUnits={data.netCashFlowMinorUnits}
            savingsRatePercentage={data.overallSavingsRatePercentage}
          />

          <WalkthroughTarget id="reportsChart">
            <CashFlowBarChart
              periods={data.periods}
              selectedPeriodKey={selectedPeriodKey}
              onSelectPeriod={setSelectedPeriodKey}
            />
          </WalkthroughTarget>

          <WalkthroughTarget id="reportsBreakdownTable">
            <CashFlowTable
              periods={data.periods}
              totalInflowMinorUnits={data.totalInflowMinorUnits}
              totalOutflowMinorUnits={data.totalOutflowMinorUnits}
              netCashFlowMinorUnits={data.netCashFlowMinorUnits}
              overallSavingsRatePercentage={data.overallSavingsRatePercentage}
              selectedPeriodKey={selectedPeriodKey}
              onSelectPeriod={setSelectedPeriodKey}
            />
          </WalkthroughTarget>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
