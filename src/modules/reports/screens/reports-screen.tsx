import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { PageContainer } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { ProGate } from "@/modules/pro";
import { BalanceSheetReport } from "../components/balance-sheet/balance-sheet-report";
import { CashFlowReport } from "../components/cash-flow/cash-flow-report";
import { IncomeExpenseReport } from "../components/income-expense/income-expense-report";
import { LabelsSummaryReport } from "../components/labels-summary/labels-summary-report";
import { NetWorthGrowthReport } from "../components/net-worth/net-worth-growth-report";
import { ReportsTabBar } from "../components/reports-tab-bar";
import type { ReportTabKey } from "../types/reports.types";

export function ReportsScreen() {
  const styles = useThemeStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ReportTabKey>("balance-sheet");

  return (
    <PageContainer
      scrollable={true}
      contentContainerStyle={styles.pageContent}
    >
      <ProGate>
        <ReportsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

        {activeTab === "balance-sheet" ? <BalanceSheetReport /> : null}

        {activeTab === "income-expense" ? <IncomeExpenseReport /> : null}

        {activeTab === "cash-flow" ? <CashFlowReport /> : null}

        {activeTab === "net-worth" ? <NetWorthGrowthReport /> : null}

        {activeTab === "labels-summary" ? <LabelsSummaryReport /> : null}
      </ProGate>
    </PageContainer>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    pageContent: {
      paddingHorizontal: 0,
      paddingBottom: 32,
    },
  });
}
