import React from "react";
import { StyleSheet, View } from "react-native";
import { WalkthroughTarget } from "@/modules/walkthrough";
import { useIncomeExpenseReport } from "../../hooks/use-income-expense-report";
import { CategoryBreakdownTable } from "./category-breakdown-table";
import { CategoryDonutChart } from "./category-donut-chart";
import { IncomeExpenseFilterBar } from "./income-expense-filter-bar";

export function IncomeExpenseReport() {
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
    selectedCategoryId,
    setSelectedCategoryId,
  } = useIncomeExpenseReport();

  return (
    <View style={styles.container}>
      <WalkthroughTarget id="reportsFilterBar">
        <IncomeExpenseFilterBar
          mode={mode}
          onSelectMode={(newMode) => {
            setMode(newMode);
            setSelectedCategoryId(null);
          }}
          preset={preset}
          onSelectPreset={(newPreset) => {
            setPreset(newPreset);
            setSelectedCategoryId(null);
          }}
          range={range}
          customDateA={customDateA}
          customDateB={customDateB}
          onChangeCustomDateA={setCustomDateA}
          onChangeCustomDateB={setCustomDateB}
        />
      </WalkthroughTarget>

      <WalkthroughTarget id="reportsChart">
        <CategoryDonutChart
          categories={data.categories}
          totalMinorUnits={data.totalMinorUnits}
          transactionCount={data.transactionCount}
          mode={mode}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </WalkthroughTarget>

      <WalkthroughTarget id="reportsBreakdownTable">
        <CategoryBreakdownTable
          categories={data.categories}
          totalMinorUnits={data.totalMinorUnits}
          transactionCount={data.transactionCount}
          mode={mode}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </WalkthroughTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
