import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { ManualSetupChecklist, useWorkspace } from "@/modules/onboarding";
import { useExperiencePreferences, useUserNickname } from "@/modules/settings";
import { DashboardGreetingCard } from "../components/dashboard-greeting-card";
import { AdBanner } from "@/modules/ads";
import {
  TransactionDetailModal,
  TransactionFormModal,
  useTransactionPresets,
  useTransactions,
  type TransactionListItem,
  type TransactionType,
} from "@/modules/transactions";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useLocalization } from "@/infrastructure/localization";
import {
  WalkthroughRegistryProvider,
  useWalkthroughRegistry,
  DashboardWalkthroughOverlay,
  DashboardCongratulationsModal,
  DraggableTourChip,
  WalkthroughIntroModal,
  useDashboardWalkthrough,
  useWalkthroughIntro,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
} from "@/modules/walkthrough";
import type { WalkthroughTargetId } from "@/modules/walkthrough";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardScreen() {
  return (
    <WalkthroughRegistryProvider>
      <DashboardScreenContent />
    </WalkthroughRegistryProvider>
  );
}

function DashboardScreenContent() {
  const router = useRouter();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);
  const { state: workspaceState } = useWorkspace();
  const { preferences: currencyPreferences } = useCurrencyPreferences();
  const {
    homeMode,
    isPromptDismissed,
    setHomeMode,
    dismissPrompt,
  } = useExperiencePreferences();
  const { nickname } = useUserNickname();

  const {
    summary,
    loading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboard();
  const { accounts, pockets, types, refresh: refreshAccounts } = useAccounts();
  const { categories, refresh: refreshCategories } = useCategories();
  const {
    recordTransaction,
    recordTransfer,
    editTransaction,
    editTransfer,
    deleteTx,
    pendingAction,
    error: transactionError,
    clearError: clearTransactionError,
    refresh: refreshTransactions,
  } = useTransactions();
  const {
    presets,
    archivedPresets,
    loading: presetsLoading,
    pending: presetPending,
    error: presetError,
    refresh: refreshPresets,
    savePreset,
    archivePreset,
    deletePreset,
    restorePreset,
    permanentlyDeletePreset,
    reorderPresets,
    sortBy: presetSortBy,
    setSortBy: setPresetSortBy,
    clearError: clearPresetError,
  } = useTransactionPresets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>("expense");
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const { registerTarget, measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "fabButton") {
        return;
      }

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

  const walkthrough = useDashboardWalkthrough({
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "dashboardWalkthroughDismissed",
    prerequisitePromptKey: "developerMessageSeen",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    registerTarget("fabButton", fabRef);
    return () => registerTarget("fabButton", null);
  }, [registerTarget]);

  useEffect(() => {
    if (
      summary &&
      !loading &&
      walkthroughIntro.canTrigger
    ) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    summary,
    loading,
    walkthroughIntro.canTrigger,
    walkthroughIntro.triggerIfFirstTime,
  ]);

  useFocusEffect(
    useCallback(() => {
      void refreshCategories();
    }, [refreshCategories]),
  );

  const manualSetupSteps = [
    {
      id: "account-type",
      title: "Create an account type",
      description: "Define how your first account should be grouped.",
      complete: types.some(({ isSystem }) => !isSystem),
      actionLabel: "Manage account types",
      onPress: () => router.navigate("/accounts?setup=types" as any),
    },
    {
      id: "account",
      title: "Create your first account",
      description: "Add its name, current balance, and account type.",
      complete: accounts.length > 0,
      actionLabel: "Add an account",
      onPress: () => router.navigate("/accounts?setup=account" as any),
    },
    {
      id: "category",
      title: "Create category groups",
      description: "Add the income and expense groups you want to track.",
      complete: categories.some(({ isSystem }) => !isSystem),
      actionLabel: "Add a category group",
      onPress: () => router.navigate("/categories?setup=group" as any),
    },
    {
      id: "subcategory",
      title: "Add a subcategory",
      description: "Break a category group into useful detail.",
      complete: categories.some((category) =>
        category.subcategories?.some(({ isSystem }) => !isSystem),
      ),
      actionLabel: "Open categories",
      onPress: () => router.navigate("/categories" as any),
    },
  ];

  const handleOpenTransactionModal = (mode: TransactionType) => {
    refreshAccounts();
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const recentTx = summary?.recentTransactions ?? [];

  useEffect(() => {
    setInspectedTransaction((current) =>
      current
        ? recentTx.find((transaction) => transaction.id === current.id) ??
          current
        : null,
    );
  }, [recentTx]);

  const handleDuplicateTransaction = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(false);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(true);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!pendingDeleteId) return;
    setInspectedTransaction(null);
    const deleted = await deleteTx(pendingDeleteId);
    if (deleted) {
      refreshAccounts();
      refreshDashboard();
      setPendingDeleteId(null);
    }
  };

  const handleViewAllTransactions = () => {
    router.navigate("/transactions" as any);
  };

  const handleSaveTx = async (
    input: Parameters<typeof recordTransaction>[0],
    preset?: Parameters<typeof recordTransaction>[1],
    attachmentChanges?: Parameters<typeof recordTransaction>[2],
  ) => {
    const isFirstEverTransaction = recentTx.length === 0;
    const success = await recordTransaction(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
      if (
        isFirstEverTransaction &&
        !isPromptDismissed("firstTransactionCelebrated")
      ) {
        setShowCongratulationsModal(true);
      }
    }
    return success;
  };

  const handleSaveTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
    preset?: Parameters<typeof recordTransfer>[1],
    attachmentChanges?: Parameters<typeof recordTransfer>[2],
  ) => {
    const isFirstEverTransaction = recentTx.length === 0;
    const success = await recordTransfer(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
      if (
        isFirstEverTransaction &&
        !isPromptDismissed("firstTransactionCelebrated")
      ) {
        setShowCongratulationsModal(true);
      }
    }
    return success;
  };

  const netWorth = summary?.netWorthMinorUnits ?? 0;
  const assets = summary?.totalAssetsMinorUnits ?? 0;
  const liabilities = summary?.totalLiabilitiesMinorUnits ?? 0;

  return (
    <PageContainer
      scrollContentRef={scrollContentRef}
      scrollRef={scrollRef}
      floatingAction={
        <>
          <FloatingActionButton
            accessibilityLabel="Record new transaction"
            fabRef={fabRef}
            onPress={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              handleOpenTransactionModal("expense");
            }}
          />
          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />
        </>
      }
    >
      <View style={styles.container}>
        {workspaceState.status === "completed" &&
        workspaceState.mode === "personal" &&
        workspaceState.setupStrategy === "manual" ? (
          <ManualSetupChecklist steps={manualSetupSteps} />
        ) : null}
        {!summary ? (
          dashboardError ? (
            <PageErrorState message={dashboardError} onRetry={refreshDashboard} />
          ) : (
            <PageLoadingState
              message={loading ? "Loading your dashboard..." : "Preparing dashboard..."}
            />
          )
        ) : (
          <>
            <DashboardGreetingCard nickname={nickname} />
            <AdBanner placement="dashboard" variant="card" />
            <DashboardNetWorthCard
              currencyCode={currencyPreferences.defaultCurrency}
              history={summary.netWorthHistory}
              homeMode={homeMode}
              monthlyChangePercentage={summary.netWorthChangePercentage}
              monthlySpentMinorUnits={summary.monthlyCashflow.totalOutflowMinorUnits}
              netWorthMinorUnits={netWorth}
              onHomeModeChange={setHomeMode}
              totalAssetsMinorUnits={assets}
              totalLiabilitiesMinorUnits={liabilities}
            />
            <RecentTransactionsCard
              onPressTransaction={(tx) => setInspectedTransaction(tx)}
              onViewAll={handleViewAllTransactions}
              transactions={recentTx}
            />
          </>
        )}
      </View>

      <TransactionDetailModal
        onAttachmentsChanged={() => {
          void refreshTransactions();
          refreshDashboard();
        }}
        onClose={() => setInspectedTransaction(null)}
        onDelete={handleDeleteTransaction}
        onDuplicate={handleDuplicateTransaction}
        onEdit={handleEditTransaction}
        transaction={inspectedTransaction}
        visible={inspectedTransaction !== null}
      />

      {/* Direct Transaction Modal */}
      <TransactionFormModal
        accounts={accounts}
        pockets={pockets}
        categories={categories}
        presets={presets}
        presetsLoading={presetsLoading}
        presetPending={presetPending}
        presetError={presetError}
        error={transactionError}
        initialTransaction={prefilledTransaction}
        isEditing={isEditingTransaction}
        onClearError={clearTransactionError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          setIsModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
        }}
        onSaveTransaction={handleSaveTx}
        onSaveTransfer={handleSaveTransfer}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
        onArchivePreset={archivePreset}
        onRestorePreset={restorePreset}
        onPermanentlyDeletePreset={permanentlyDeletePreset}
        onReorderPresets={reorderPresets}
        archivedPresets={archivedPresets}
        presetSortBy={presetSortBy}
        onChangePresetSortBy={setPresetSortBy}
        onUpdateTransaction={async (id, input, attachmentChanges) => {
          const success = await editTransaction(id, input, attachmentChanges);
          if (success) {
            refreshAccounts();
            refreshDashboard();
          }
          return success;
        }}
        onUpdateTransfer={async (input, attachmentChanges) => {
          const success = await editTransfer(input, attachmentChanges);
          if (success) {
            refreshAccounts();
            refreshDashboard();
          }
          return success;
        }}
        onCategoriesChanged={() => void refreshCategories()}
        pending={pendingAction}
        visible={isModalOpen}
      />

      <ConfirmModal
        cancelLabel="Keep"
        confirmLabel="Delete"
        message="This record will be moved to Trash. You can restore it later."
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          void handleConfirmDeleteTransaction();
        }}
        pending={pendingAction}
        title="Delete transaction?"
        variant="destructive"
        visible={pendingDeleteId !== null}
      />

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("dashboard.walkthroughIntroTitle")}
        subtitle={t("dashboard.walkthroughIntroSubtitle")}
        message={t("dashboard.walkthroughIntroMessage")}
        badge={t("dashboard.walkthroughIntroBadge")}
        startLabel={t("dashboard.walkthroughIntroStart")}
        skipLabel={t("dashboard.walkthroughIntroSkip")}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />

      <DashboardWalkthroughOverlay
        visible={walkthrough.isWalkthroughActive}
        stepIndex={walkthrough.activeStepIndex}
        totalSteps={walkthrough.totalSteps}
        step={walkthrough.currentStep}
        targetLayout={walkthrough.activeTargetLayout}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        onFabPress={() => {
          walkthrough.completeWalkthrough();
          handleOpenTransactionModal("expense");
        }}
      />

      <DashboardCongratulationsModal
        visible={showCongratulationsModal}
        onClose={() => {
          dismissPrompt("firstTransactionCelebrated");
          setShowCongratulationsModal(false);
        }}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
      paddingBottom: 80,
      paddingTop: theme.spacing.lg,
    },
  });
}
