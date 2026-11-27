import React from "react";
import { StyleSheet, View } from "react-native";
import { PageErrorState, PageLoadingState } from "@/components/page-container";
import { useLocalization } from "@/infrastructure/localization";
import { WalkthroughTarget } from "@/modules/walkthrough";
import { useCashFlowReport } from "../../hooks/use-cash-flow-report";
import { CashFlowBarChart } from "./cash-flow-bar-chart";
import { CashFlowFilterBar } from "./cash-flow-filter-bar";
import { CashFlowSummaryCards } from "./cash-flow-summary-cards";
import { CashFlowTable } from "./cash-flow-table";

export function CashFlowReport(props?: { skipQuery?: boolean }) {
  const { t } = useLocalization();
  const {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    error,
    refresh,
    reportLoading,
    selectedPeriodKey,
    setSelectedPeriodKey,
  } = useCashFlowReport({ skipQuery: props?.skipQuery });

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

      {error ? (
        <PageErrorState message={error} onRetry={refresh} />
      ) : reportLoading ? (
        <PageLoadingState message={t("reports.loading")} variant="cards" />
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
