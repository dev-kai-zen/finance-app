import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import {
  ConfirmModal,
  PageContainer,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { ManualSetupChecklist, useWorkspace } from "@/modules/onboarding";
import {
  useExperiencePreferences,
  useUserNickname,
  type DashboardWidgetId,
} from "@/modules/settings";
import { DashboardGreetingCard } from "../components/dashboard-greeting-card";
import { DashboardQuickActionsCard } from "../components/dashboard-quick-actions-card";
import { DashboardCashflowCard } from "../components/dashboard-cashflow-card";
import { DashboardAccountsCard } from "../components/dashboard-accounts-card";
import { DashboardTopCategoriesCard } from "../components/dashboard-top-categories-card";
import { CustomizeDashboardModal } from "../components/customize-dashboard-modal";
import { AdBanner } from "@/modules/ads";
import {
  TransactionDetailModal,
  TransactionFormModal,
  TransactionSpeedDialFab,
  useTransactionPresets,
  useTransactions,
  type TransactionListItem,
  type TransactionType,
} from "@/modules/transactions";
import {
  ChatWithKaiModal,
  type ChatSavedTransactionResult,
} from "@/modules/chat-with-kai";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useLocalization } from "@/infrastructure/localization";
import {
  WalkthroughRegistryProvider,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  DashboardWalkthroughOverlay,
  DashboardCongratulationsModal,
  DraggableTourChip,
  WalkthroughIntroModal,
  useDashboardWalkthrough,
  useWalkthroughIntro,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
} from "@/modules/walkthrough";
import type { WalkthroughTargetId } from "@/modules/walkthrough";
import { useIsVersionHistoryPending } from "@/modules/version-history";
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
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { state: workspaceState } = useWorkspace();
  const { preferences: currencyPreferences } = useCurrencyPreferences();
  const {
    homeMode,
    dashboardLayout,
    toggleDashboardWidget,
    moveDashboardWidget,
    reorderDashboardWidgets,
    setShowGreetingQuote,
    selectDashboardPreset,
    resetDashboardLayout,
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
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [onChatEditSaved, setOnChatEditSaved] = useState<
    ((data?: ChatSavedTransactionResult) => void) | null
  >(null);
  const [modalMode, setModalMode] = useState<TransactionType>("expense");
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);
  const returnToChatOnFormCloseRef = useRef(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const customizeHomeRef = useWalkthroughTarget("customizeHomeButton");
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

  const isVersionHistoryPending = useIsVersionHistoryPending();

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "dashboardWalkthroughDismissed",
    prerequisitePromptKey: "developerMessageSeen",
    enabled: !isVersionHistoryPending,
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
    const res = await recordTransaction(input, preset, attachmentChanges);
    if (res) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
      const cat = categories
        .flatMap((c) => [c, ...(c.subcategories ?? [])])
        .find((c) => c.id === input.categoryId);
      const acc = accounts.find((a) => a.id === input.accountId);
      onChatEditSaved?.({
        id: typeof res === "string" ? res : undefined,
        type: input.type,
        amountMinorUnits: Math.abs(input.amountMinorUnits),
        currencyCode: input.currencyCode,
        name: input.name ?? null,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        accountId: input.accountId,
        accountName: acc?.name ?? null,
        categoryId: input.categoryId ?? null,
        categoryName: cat?.name ?? null,
        categoryIcon: cat?.icon ?? null,
        categoryColor: cat?.hexColorsId ?? null,
        pocketId: input.pocketId ?? null,
      });
      setOnChatEditSaved(null);
      if (
        isFirstEverTransaction &&
        !isPromptDismissed("firstTransactionCelebrated")
      ) {
        setShowCongratulationsModal(true);
      }
    }
    return Boolean(res);
  };

  const handleSaveTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
    preset?: Parameters<typeof recordTransfer>[1],
    attachmentChanges?: Parameters<typeof recordTransfer>[2],
  ) => {
    const isFirstEverTransaction = recentTx.length === 0;
    const res = await recordTransfer(input, preset, attachmentChanges);
    if (res) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
      const fromAcc = accounts.find((a) => a.id === input.fromAccountId);
      const toAcc = accounts.find((a) => a.id === input.toAccountId);
      onChatEditSaved?.({
        id: typeof res === "string" ? res : undefined,
        type: "transfer",
        amountMinorUnits: Math.abs(input.amountMinorUnits),
        name: input.name ?? null,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        accountId: input.fromAccountId,
        accountName: fromAcc?.name ?? null,
        transferAccountId: input.toAccountId,
        transferAccountName: toAcc?.name ?? null,
      });
      setOnChatEditSaved(null);
      if (
        isFirstEverTransaction &&
        !isPromptDismissed("firstTransactionCelebrated")
      ) {
        setShowCongratulationsModal(true);
      }
    }
    return Boolean(res);
  };

  const netWorth = summary?.netWorthMinorUnits ?? 0;
  const assets = summary?.totalAssetsMinorUnits ?? 0;
  const liabilities = summary?.totalLiabilitiesMinorUnits ?? 0;

  const visibleWidgets = useMemo<DashboardWidgetId[]>(() => {
    const hiddenSet = new Set(dashboardLayout.hidden);
    const list = dashboardLayout.order.filter((id) => !hiddenSet.has(id));
    return list.length > 0 ? list : ["netWorth", "recentTransactions"];
  }, [dashboardLayout.hidden, dashboardLayout.order]);

  const renderWidget = (widgetId: DashboardWidgetId) => {
    if (!summary) return null;
    switch (widgetId) {
      case "greeting":
        return (
          <DashboardGreetingCard
            key="greeting"
            nickname={nickname}
            showQuote={dashboardLayout.showGreetingQuote}
          />
        );
      case "netWorth":
        return (
          <DashboardNetWorthCard
            key="netWorth"
            currencyCode={currencyPreferences.defaultCurrency}
            history={summary.netWorthHistory}
            homeMode={homeMode}
            monthlyChangePercentage={summary.netWorthChangePercentage}
            monthlySpentMinorUnits={
              summary.monthlyCashflow.totalOutflowMinorUnits
            }
            netWorthMinorUnits={netWorth}
            onCustomizeDashboard={() => setIsCustomizeOpen(true)}
            onHomeModeChange={setHomeMode}
            totalAssetsMinorUnits={assets}
            totalLiabilitiesMinorUnits={liabilities}
          />
        );
      case "quickActions":
        return (
          <DashboardQuickActionsCard
            key="quickActions"
            onAddExpense={() => handleOpenTransactionModal("expense")}
            onAddIncome={() => handleOpenTransactionModal("income")}
            onAddTransfer={() => handleOpenTransactionModal("transfer")}
            onOpenAssistant={() => setIsChatModalOpen(true)}
          />
        );
      case "cashflow":
        return (
          <DashboardCashflowCard
            key="cashflow"
            cashflow={summary.monthlyCashflow}
            currencyCode={currencyPreferences.defaultCurrency}
            onPressReports={() => router.navigate("/reports" as any)}
            onPressIncome={() =>
              router.navigate("/transactions?type=income&datePreset=this_month" as any)
            }
            onPressExpense={() =>
              router.navigate("/transactions?type=expense&datePreset=this_month" as any)
            }
          />
        );
      case "accountsStrip":
        return (
          <DashboardAccountsCard
            key="accountsStrip"
            accounts={summary.accountsWithBalances}
            onViewAll={() => router.navigate("/accounts" as any)}
          />
        );
      case "topCategories":
        return (
          <DashboardTopCategoriesCard
            key="topCategories"
            categories={summary.topSpendingCategories}
            currencyCode={currencyPreferences.defaultCurrency}
            onViewCategories={() => router.navigate("/categories" as any)}
            onPressCategory={(categoryId) =>
              router.navigate(
                `/transactions?categoryId=${encodeURIComponent(categoryId)}&datePreset=this_month` as any,
              )
            }
          />
        );
      case "recentTransactions":
        return (
          <RecentTransactionsCard
            key="recentTransactions"
            currencyCode={currencyPreferences.defaultCurrency}
            onPressTransaction={(tx) => setInspectedTransaction(tx)}
            onViewAll={handleViewAllTransactions}
            transactions={recentTx}
          />
        );
    }
  };

  return (
    <PageContainer
      scrollContentRef={scrollContentRef}
      scrollRef={scrollRef}
      floatingAction={
        <>
          <TransactionSpeedDialFab
            accessibilityLabel="Record new transaction"
            fabRef={fabRef}
            onPressForm={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              handleOpenTransactionModal("expense");
            }}
            onPressChat={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              setIsChatModalOpen(true);
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
            {visibleWidgets.map((widgetId, index) => (
              <View key={widgetId} style={styles.widgetSlot}>
                {renderWidget(widgetId)}
                {index === 0 ? (
                  <AdBanner placement="dashboard" variant="card" />
                ) : null}
              </View>
            ))}

            <Pressable
              ref={customizeHomeRef as any}
              collapsable={false}
              accessibilityLabel={t("dashboard.customizeHome")}
              accessibilityRole="button"
              onPress={() => setIsCustomizeOpen(true)}
              style={({ pressed }) => [
                styles.customizeHomeBtn,
                pressed && styles.customizeHomeBtnPressed,
              ]}
            >
              <SlidersHorizontal color={theme.colors.primary} size={15} />
              <Text style={styles.customizeHomeBtnText}>
                {t("dashboard.customizeHome")}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <CustomizeDashboardModal
        layout={dashboardLayout}
        onClose={() => setIsCustomizeOpen(false)}
        onMoveWidget={moveDashboardWidget}
        onReorderWidgets={reorderDashboardWidgets}
        onReset={resetDashboardLayout}
        onSelectPreset={selectDashboardPreset}
        onToggleQuote={setShowGreetingQuote}
        onToggleWidget={toggleDashboardWidget}
        visible={isCustomizeOpen}
      />

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
        initialType={modalMode}
        isEditing={isEditingTransaction}
        onClearError={clearTransactionError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          const shouldReturnToChat = returnToChatOnFormCloseRef.current;
          returnToChatOnFormCloseRef.current = false;
          setIsModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
          setModalMode("expense");
          setOnChatEditSaved(null);
          if (shouldReturnToChat) {
            setTimeout(() => {
              setIsChatModalOpen(true);
            }, Platform.OS === "ios" ? 250 : 80);
          }
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
            const cat = categories
              .flatMap((c) => [c, ...(c.subcategories ?? [])])
              .find((c) => c.id === input.categoryId);
            const acc = accounts.find((a) => a.id === input.accountId);
            onChatEditSaved?.({
              id,
              type: input.type,
              amountMinorUnits: Math.abs(input.amountMinorUnits),
              currencyCode: input.currencyCode,
              name: input.name ?? null,
              note: input.note ?? null,
              occurredAt: input.occurredAt ?? new Date(),
              accountId: input.accountId,
              accountName: acc?.name ?? null,
              categoryId: input.categoryId ?? null,
              categoryName: cat?.name ?? null,
              categoryIcon: cat?.icon ?? null,
              categoryColor: cat?.hexColorsId ?? null,
              pocketId: input.pocketId ?? null,
            });
            setOnChatEditSaved(null);
          }
          return success;
        }}
        onUpdateTransfer={async (input, attachmentChanges) => {
          const success = await editTransfer(input, attachmentChanges);
          if (success) {
            refreshAccounts();
            refreshDashboard();
            const fromAcc = accounts.find((a) => a.id === input.fromAccountId);
            const toAcc = accounts.find((a) => a.id === input.toAccountId);
            onChatEditSaved?.({
              id: input.transactionGroupId,
              type: "transfer",
              amountMinorUnits: Math.abs(input.amountMinorUnits),
              name: input.name ?? null,
              note: input.note ?? null,
              occurredAt: input.occurredAt ?? new Date(),
              accountId: input.fromAccountId,
              accountName: fromAcc?.name ?? null,
              transferAccountId: input.toAccountId,
              transferAccountName: toAcc?.name ?? null,
            });
            setOnChatEditSaved(null);
          }
          return success;
        }}
        onCategoriesChanged={() => void refreshCategories()}
        pending={pendingAction}
        visible={isModalOpen}
      />

      <ChatWithKaiModal
        accounts={accounts}
        categories={categories}
        defaultCurrency={currencyPreferences.defaultCurrency}
        onClose={() => setIsChatModalOpen(false)}
        onDeleteTransaction={deleteTx}
        onEditInForm={(prefilled, onSaved, isEditing = false) => {
          returnToChatOnFormCloseRef.current = true;
          setPrefilledTransaction(prefilled);
          setIsEditingTransaction(isEditing);
          setOnChatEditSaved(() => onSaved ?? null);
          setIsModalOpen(true);
        }}
        onSaveTransaction={async (input) => {
          const res = await recordTransaction(input);
          if (res) {
            refreshAccounts();
            refreshDashboard();
          }
          return res;
        }}
        onSaveTransfer={async (input) => {
          const res = await recordTransfer(input);
          if (res) {
            refreshAccounts();
            refreshDashboard();
          }
          return res;
        }}
        pockets={pockets}
        visible={isChatModalOpen}
      />

      <ConfirmModal
        cancelLabel={t("common.keep")}
        confirmLabel={t("common.delete")}
        message={t("dashboard.deleteTransactionMessage")}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          void handleConfirmDeleteTransaction();
        }}
        pending={pendingAction}
        title={t("dashboard.deleteTransactionTitle")}
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
        onExplore={() => {
          dismissPrompt("firstTransactionCelebrated");
          setShowCongratulationsModal(false);
        }}
        onSkip={() => {
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
    widgetSlot: {
      gap: theme.spacing.lg,
    },
    customizeHomeBtn: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
    },
    customizeHomeBtnPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.85,
    },
    customizeHomeBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
