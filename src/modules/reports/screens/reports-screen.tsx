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
  const [activeTab, setActiveTab] = useState<ReportTabKey>("income-expense");

  return (
    <PageContainer
      scrollable={true}
      contentContainerStyle={styles.pageContent}
    >
      <ReportsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {activeTab === "income-expense" ? (
        <IncomeExpenseReport />
      ) : null}

      {activeTab === "balance-sheet" ? (
        <ProGate
          featureDescription="Track assets, liabilities, and equity variations across custom periods with Pro."
          featureTitle="Balance Sheet Comparison"
          mode="blur"
        >
          <BalanceSheetReport />
        </ProGate>
      ) : null}

      {activeTab === "cash-flow" ? (
        <ProGate
          featureDescription="Analyze operating cash flows, liquidity trends, and net balances over time with Pro."
          featureTitle="Cash Flow Analytics"
          mode="blur"
        >
          <CashFlowReport />
        </ProGate>
      ) : null}

      {activeTab === "net-worth" ? (
        <ProGate
          featureDescription="Monitor long-term wealth velocity, compounding trajectories, and total portfolio valuation with Pro."
          featureTitle="Net Worth Growth Trends"
          mode="blur"
        >
          <NetWorthGrowthReport />
        </ProGate>
      ) : null}

      {activeTab === "labels-summary" ? (
        <ProGate
          featureDescription="Aggregate expenses and income tagged under custom labels, projects, and events with Pro."
          featureTitle="Labels & Tags Breakdown"
          mode="blur"
        >
          <LabelsSummaryReport />
        </ProGate>
      ) : null}
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
