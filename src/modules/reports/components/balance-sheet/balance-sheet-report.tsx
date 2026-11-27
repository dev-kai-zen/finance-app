import React from "react";
import { StyleSheet, View } from "react-native";
import { PageErrorState, PageLoadingState } from "@/components/page-container";
import { useLocalization } from "@/infrastructure/localization";
import { useBalanceSheetReport } from "../../hooks/use-balance-sheet-report";
import { BalanceSheetFilterBar } from "./balance-sheet-filter-bar";
import { BalanceSheetTable } from "./balance-sheet-table";

export function BalanceSheetReport(props?: { skipQuery?: boolean }) {
  const { t } = useLocalization();
  const {
    preset,
    setPreset,
    hideZeroBalances,
    setHideZeroBalances,
    momYear,
    setMomYear,
    momMonth,
    setMomMonth,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    data,
    error,
    refresh,
    reportLoading,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
  } = useBalanceSheetReport({ skipQuery: props?.skipQuery });

  return (
    <View style={styles.container}>
      <BalanceSheetFilterBar
        preset={preset}
        onSelectPreset={setPreset}
        momYear={momYear}
        momMonth={momMonth}
        onChangeMomPeriod={(year, month) => {
          setMomYear(year);
          setMomMonth(month);
        }}
        customDateA={customDateA}
        customDateB={customDateB}
        onChangeCustomDateA={setCustomDateA}
        onChangeCustomDateB={setCustomDateB}
        hideZeroBalances={hideZeroBalances}
        onToggleHideZeroBalances={() => setHideZeroBalances((prev) => !prev)}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {error ? (
        <PageErrorState message={error} onRetry={refresh} />
      ) : reportLoading ? (
        <PageLoadingState message={t("reports.loading")} variant="cards" />
      ) : (
        <BalanceSheetTable
          data={data}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
