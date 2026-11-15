import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NetWorthInspectModal, PageLoadingState } from "@/components";
import { useLocalization } from "@/infrastructure/localization";
import { useCurrencyPreferences } from "@/modules/currencies";
import { usePrivacyMode } from "@/modules/settings";
import { WalkthroughTarget } from "@/modules/walkthrough";
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
    reportLoading,
    selectedPointIndex,
    setSelectedPointIndex,
  } = useNetWorthGrowthReport();

  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const { preferences } = useCurrencyPreferences();
  const { isPrivate } = usePrivacyMode();
  const { t } = useLocalization();

  return (
    <View style={styles.container}>
      <WalkthroughTarget id="reportsFilterBar">
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
      </WalkthroughTarget>

      {reportLoading ? (
        <PageLoadingState message="Loading report..." variant="cards" />
      ) : (
        <>
          <NetWorthSummaryCards
            currentNetWorthMinorUnits={data.currentNetWorthMinorUnits}
            periodChangeMinorUnits={data.periodChangeMinorUnits}
            periodChangePercentage={data.periodChangePercentage}
            peakNetWorthMinorUnits={data.peakNetWorthMinorUnits}
            lowestNetWorthMinorUnits={data.lowestNetWorthMinorUnits}
          />

          <WalkthroughTarget id="reportsChart">
            <NetWorthGrowthChart
              onPressChart={() => setInspectModalVisible(true)}
              onSelectPointIndex={setSelectedPointIndex}
              points={data.points}
              selectedPointIndex={selectedPointIndex}
            />
          </WalkthroughTarget>

          <WalkthroughTarget id="reportsBreakdownTable">
            <NetWorthHistoryTable
              onSelectPointIndex={setSelectedPointIndex}
              points={data.points}
              selectedPointIndex={selectedPointIndex}
            />
          </WalkthroughTarget>
        </>
      )}

      <NetWorthInspectModal
        currencyCode={preferences.defaultCurrency ?? "PHP"}
        initialPointIndex={selectedPointIndex}
        onClose={() => setInspectModalVisible(false)}
        points={data.points}
        title={t("netWorthInspect.growthTitle")}
        valuesVisible={!isPrivate}
        visible={inspectModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
