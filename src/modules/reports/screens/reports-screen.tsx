import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { PageContainer } from "@/components";
import { useHeaderWalkthroughAction } from "@/components/app-shell-header-context";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { ProGate } from "@/modules/pro";
import { AdBanner } from "@/modules/ads";
import {
  ReportsWalkthroughOverlay,
  useReportsWalkthrough,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  WalkthroughTarget,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { BalanceSheetReport } from "../components/balance-sheet/balance-sheet-report";
import { CashFlowReport } from "../components/cash-flow/cash-flow-report";
import { IncomeExpenseReport } from "../components/income-expense/income-expense-report";
import { LabelsSummaryReport } from "../components/labels-summary/labels-summary-report";
import { NetWorthGrowthReport } from "../components/net-worth/net-worth-growth-report";
import { ReportsTabBar } from "../components/reports-tab-bar";
import type { ReportTabKey } from "../types/reports.types";

export function ReportsScreen(props?: { initialTab?: ReportTabKey }) {
  const styles = useThemeStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ReportTabKey>(
    () => props?.initialTab ?? "income-expense",
  );
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  React.useEffect(() => {
    if (props?.initialTab) {
      setActiveTab(props.initialTab);
    }
  }, [props?.initialTab]);

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useReportsWalkthrough({
    onTabChange: setActiveTab,
    onScrollToTarget: handleScrollToTarget,
  });

  useHeaderWalkthroughAction(
    useMemo(
      () => ({
        onStart: walkthrough.startWalkthrough,
        isActive: walkthrough.isWalkthroughActive,
      }),
      [walkthrough.isWalkthroughActive, walkthrough.startWalkthrough],
    ),
  );

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "reportsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
    enabled: true,
  });

  useEffect(() => {
    if (walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [walkthroughIntro]);

  return (
    <>
      <PageContainer
        scrollable={true}
        scrollRef={scrollRef}
        scrollContentRef={scrollContentRef}
        contentContainerStyle={styles.pageContent}
      >
        <WalkthroughTarget id="reportsTabBar">
          <ReportsTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
        </WalkthroughTarget>

        {activeTab === "income-expense" ? (
          <>
            <IncomeExpenseReport />
            <AdBanner
              placement="reports"
              variant="card"
              style={{ marginHorizontal: 16, marginTop: 16 }}
            />
          </>
        ) : null}

        {activeTab === "balance-sheet" ? (
          <ProGate mode="blur">
            <BalanceSheetReport />
          </ProGate>
        ) : null}

        {activeTab === "cash-flow" ? (
          <ProGate mode="blur">
            <CashFlowReport />
          </ProGate>
        ) : null}

        {activeTab === "net-worth" ? (
          <ProGate mode="blur">
            <NetWorthGrowthReport />
          </ProGate>
        ) : null}

        {activeTab === "labels-summary" ? (
          <ProGate mode="blur">
            <LabelsSummaryReport />
          </ProGate>
        ) : null}
      </PageContainer>

      <ReportsWalkthroughOverlay
        visible={walkthrough.isWalkthroughActive}
        stepIndex={walkthrough.activeStepIndex}
        totalSteps={walkthrough.totalSteps}
        step={walkthrough.currentStep}
        targetLayout={walkthrough.activeTargetLayout}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
      />
    </>
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
