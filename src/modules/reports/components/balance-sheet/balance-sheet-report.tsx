import React from "react";
import { StyleSheet, View } from "react-native";
import { useBalanceSheetReport } from "../../hooks/use-balance-sheet-report";
import { BalanceSheetFilterBar } from "./balance-sheet-filter-bar";
import { BalanceSheetTable } from "./balance-sheet-table";

export function BalanceSheetReport() {
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
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
  } = useBalanceSheetReport();

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

      <BalanceSheetTable
        data={data}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
