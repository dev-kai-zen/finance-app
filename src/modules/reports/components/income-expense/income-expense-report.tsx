import React from "react";
import { StyleSheet, View } from "react-native";
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

      <CategoryDonutChart
        categories={data.categories}
        totalMinorUnits={data.totalMinorUnits}
        transactionCount={data.transactionCount}
        mode={mode}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      <CategoryBreakdownTable
        categories={data.categories}
        totalMinorUnits={data.totalMinorUnits}
        transactionCount={data.transactionCount}
        mode={mode}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
