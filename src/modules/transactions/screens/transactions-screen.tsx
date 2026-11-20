import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronsUp,
  Download,
  FolderDown,
  LayoutList,
  Receipt,
  RotateCcw,
  Rows3,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActionBottomSheet,
  ConfirmModal,
  FloatingActionButton,
  HorizontalScrollView,
  InfoModal,
  PageContainer,
  PageEmptyState,
  PageLoadingState,
  useHeaderWalkthroughAction,
} from "@/components";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ArrowLeftRight } from "lucide-react-native";
import { triggerHaptic, useExperiencePreferences, usePrivacyMode } from "@/modules/settings";
import {
  WalkthroughRegistryProvider,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughIntroModal,
  TransactionsWalkthroughOverlay,
  useTransactionsWalkthrough,
  useWalkthroughIntro,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { useAccounts } from "@/modules/accounts";
import { AnchoredAdDock } from "@/modules/ads";
import { useCategories } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useLabels } from "@/modules/labels";
import { formatCurrency } from "@/utils/currency";
import {
  DEFAULT_TRANSACTION_FILTERS,
  TransactionFilterModal,
  type DatePreset,
  type TransactionFilterState,
} from "../components/transaction-filter-modal";
import { normalizeDateRange } from "../utils/transaction-date-filter";
import { TransactionDetailModal } from "../components/transaction-detail-modal";
import { DeletedTransactionsModal } from "../components/deleted-transactions-modal";
import { TransactionFormModal } from "../components/transaction-form-modal";
import { QuickPresetsModal } from "../components/quick-presets-modal";
import type { TransactionPreset } from "../types/transaction-preset.types";
import { TransactionSpeedDialFab } from "../components/transaction-speed-dial-fab";
import {
  ChatWithKaiModal,
  type ChatSavedTransactionResult,
} from "@/modules/chat-with-kai";
import { TransactionRow } from "../components/transaction-row";
import { usePaginatedTransactions } from "../hooks/use-paginated-transactions";
import { useTransactionPresets } from "../hooks/use-transaction-presets";
import { useTransactionViewMode } from "../hooks/use-transaction-view-mode";
import {
  saveTransactionsCsvToDevice,
  shareTransactionsCsv,
  TransactionCsvExportCancelledError,
} from "../services/export-transactions-csv.service";
import type {
  TransactionListItem,
  TransactionPageFilter,
  TransactionType,
} from "../types/transaction.types";

const TRANSACTIONS_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 150;

function resolveDateRangeForFilter(filterState: TransactionFilterState): {
  startDate?: Date;
  endDate?: Date;
  emptyResult?: boolean;
} {
  if (filterState.datePreset === "all") {
    return {};
  }

  const now = new Date();
  switch (filterState.datePreset) {
    case "this_month":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        endDate: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    case "last_month":
      return {
        startDate: new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
          0,
          0,
          0,
          0,
        ),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "this_year":
      return {
        startDate: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "custom": {
      if (!filterState.customDateFrom || !filterState.customDateTo) {
        return { emptyResult: true };
      }
      const { from, to } = normalizeDateRange(
        filterState.customDateFrom,
        filterState.customDateTo,
      );
      const [fromY, fromM, fromD] = from.split("-").map(Number);
      const [toY, toM, toD] = to.split("-").map(Number);
      return {
        startDate: new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0),
        endDate: new Date(toY, toM - 1, toD, 23, 59, 59, 999),
      };
    }
    default:
      return {};
  }
}

interface DateGroup {
  key: string;
  label: string;
  items: TransactionListItem[];
  netMinorUnits: number;
  currencyCode: string;
  hasNonTransfer: boolean;
}

function getDateGroupInfo(occurredAt: Date | string | undefined): {
  key: string;
  label: string;
} {
  if (!occurredAt) {
    return { key: "unknown", label: "Unknown Date" };
  }
  const date = new Date(occurredAt);
  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  if (isSameDay) {
    return { key, label: "Today" };
  }
  if (isYesterday) {
    return { key, label: "Yesterday" };
  }

  const label = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return { key, label };
}

function initialFilterState(
  categoryId?: string,
  datePreset?: string,
  accountId?: string,
  initialType?: string,
  initialLabelId?: string,
): TransactionFilterState {
  const filterType =
    initialType === "expense" || initialType === "income" || initialType === "transfer"
      ? initialType
      : "all";
  const validPreset: DatePreset =
    datePreset === "this_month" ||
    datePreset === "last_month" ||
    datePreset === "this_year"
      ? datePreset
      : "all";
  if (!accountId && !categoryId && !initialLabelId && filterType === "all" && validPreset === "all") {
    return DEFAULT_TRANSACTION_FILTERS;
  }
  return {
    ...DEFAULT_TRANSACTION_FILTERS,
    ...(accountId ? { accountIds: [accountId] } : {}),
    ...(categoryId ? { categoryIds: [categoryId] } : {}),
    ...(initialLabelId ? { labelIds: [initialLabelId] } : {}),
    datePreset: validPreset,
    type: filterType,
  };
}

export interface TransactionsScreenProps {
  initialCategoryId?: string;
  initialDatePreset?: string;
  initialAccountId?: string;
  initialAction?: string;
  initialType?: string;
  initialSearch?: string;
  initialInspectId?: string;
  initialLabelId?: string;
}

export function TransactionsScreen(props: TransactionsScreenProps = {}) {
  return (
    <WalkthroughRegistryProvider>
      <TransactionsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function TransactionsScreenContent({
  initialCategoryId,
  initialDatePreset,
  initialAccountId,
  initialAction,
  initialType,
  initialSearch,
  initialInspectId,
  initialLabelId,
}: TransactionsScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);

  // Search & Filter state (drives SQLite keyset pagination directly)
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(
    initialSearch ?? "",
  );
  const [filterState, setFilterState] = useState<TransactionFilterState>(() =>
    initialFilterState(
      initialAction !== "new" ? initialCategoryId : undefined,
      initialAction !== "new" ? initialDatePreset : undefined,
      initialAction !== "new" ? initialAccountId : undefined,
      initialAction !== "new" ? initialType : undefined,
      initialAction !== "new" ? initialLabelId : undefined,
    ),
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setDebouncedSearchQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    categories,
    loading: categoriesLoading,
    refresh: refreshCategories,
  } = useCategories();

  const expandedCategoryIds = useMemo(() => {
    if (!filterState.categoryIds || filterState.categoryIds.length === 0) {
      return undefined;
    }
    const matchingCatIds = new Set<string>();
    for (const catId of filterState.categoryIds) {
      matchingCatIds.add(catId);
      const parent = categories.find((c) => c.id === catId);
      if (parent?.subcategories) {
        for (const sub of parent.subcategories) {
          matchingCatIds.add(sub.id);
        }
      }
    }
    return Array.from(matchingCatIds);
  }, [categories, filterState.categoryIds]);

  const pageFilter = useMemo<TransactionPageFilter>(() => {
    const dateRange = resolveDateRangeForFilter(filterState);
    return {
      type: filterState.type,
      accountIds:
        filterState.accountIds.length > 0 ? filterState.accountIds : undefined,
      categoryIds: expandedCategoryIds,
      labelIds:
        filterState.labelIds && filterState.labelIds.length > 0
          ? filterState.labelIds
          : undefined,
      searchQuery: debouncedSearchQuery.trim() || undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      emptyResult: dateRange.emptyResult,
      sortBy: filterState.sortBy,
      sortOrder: filterState.sortOrder,
      includeBalances: true,
    };
  }, [debouncedSearchQuery, expandedCategoryIds, filterState]);

  const {
    transactions,
    deletedTransactions,
    totalCount,
    hasMore: hasMoreTransactions,
    loading,
    isFilterTransitioning,
    pendingAction,
    error,
    clearError,
    recordTransaction,
    recordTransfer,
    deleteTx,
    restoreTx,
    permanentlyDeleteTx,
    permanentlyDeleteAllTx,
    editTransaction,
    editTransfer,
    refresh,
    loadMore: handleLoadMore,
    refreshDeletedTransactions,
    getTransactionById,
    getExportRows,
  } = usePaginatedTransactions({
    filter: pageFilter,
    pageSize: TRANSACTIONS_PAGE_SIZE,
  });
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

  const {
    accounts,
    pockets,
    loading: accountsLoading,
    refresh: refreshAccounts,
  } = useAccounts();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      void refresh();
      refreshAccounts();
      void refreshCategories();
      refreshPresets();
    } finally {
      setTimeout(() => setIsPullRefreshing(false), 500);
    }
  }, [refresh, refreshAccounts, refreshCategories, refreshPresets]);

  const { preferences: currencyPreferences } = useCurrencyPreferences();
  const { labels: allLabels } = useLabels();

  const { viewMode, setViewMode } = useTransactionViewMode();
  const transitionKindRef = useRef<"sort" | "filter">("filter");
  const prevSortSignatureRef = useRef(
    `${filterState.sortBy}:${filterState.sortOrder}`,
  );
  const currentSortSignature = `${filterState.sortBy}:${filterState.sortOrder}`;
  if (prevSortSignatureRef.current !== currentSortSignature) {
    prevSortSignatureRef.current = currentSortSignature;
    transitionKindRef.current = "sort";
  } else if (!isFilterTransitioning) {
    transitionKindRef.current = "filter";
  }

  const fabRef = useRef<View>(null);
  const { registerTarget } = useWalkthroughRegistry();
  const { isPromptDismissed } = useExperiencePreferences();
  const { isPrivate } = usePrivacyMode();
  const searchRef = useWalkthroughTarget("txSearch");
  const filterRef = useWalkthroughTarget("txFilter");
  const sortDateRef = useWalkthroughTarget("txSortDate");
  const sortAmountRef = useWalkthroughTarget("txSortAmount");
  const viewModeRef = useWalkthroughTarget("txViewMode");
  const scheduledRef = useWalkthroughTarget("txScheduled");
  const trashRef = useWalkthroughTarget("txTrash");
  const exportRef = useWalkthroughTarget("txExport");
  const firstTransactionId = transactions[0]?.id ?? null;
  const hasTransactionInList = firstTransactionId !== null;
  const firstItemRef = useWalkthroughTarget(
    hasTransactionInList ? "txFirstItem" : null,
  );

  useEffect(() => {
    registerTarget("txFab", fabRef);
    return () => registerTarget("txFab", null);
  }, [registerTarget]);

  const sectionListRef = useRef<SectionList<any>>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isBottomAdVisible, setIsBottomAdVisible] = useState(false);
  const showScrollToTopRef = useRef(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const shouldShow = contentOffset.y > 350;

      if (shouldShow !== showScrollToTopRef.current) {
        showScrollToTopRef.current = shouldShow;
        setShowScrollToTop(shouldShow);
      }
    },
    [],
  );

  const handleScrollToTop = useCallback(() => {
    triggerHaptic();
    const scrollResponder = sectionListRef.current?.getScrollResponder();
    if (scrollResponder?.scrollTo) {
      scrollResponder.scrollTo({ y: 0, animated: true });
    } else {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        viewOffset: 0,
        animated: true,
      });
    }
  }, []);

  const handleScrollToTarget = useCallback((targetId: WalkthroughTargetId) => {
    if (targetId === "txFab") {
      return;
    }
    if (targetId === "txFirstItem") {
      const scrollResponder = sectionListRef.current?.getScrollResponder();
      if (scrollResponder?.scrollTo) {
        scrollResponder.scrollTo({ y: 0, animated: true });
      } else {
        try {
          sectionListRef.current?.scrollToLocation({
            sectionIndex: 0,
            itemIndex: 0,
            viewOffset: 0,
            animated: true,
          });
        } catch {
          // Ignore if SectionList has not laid out yet
        }
      }
    }
  }, []);

  const walkthrough = useTransactionsWalkthrough({
    hasTransactionInList,
    onScrollToTarget: handleScrollToTarget,
  });

  useHeaderWalkthroughAction(
    useMemo(
      () => ({
        onStart: walkthrough.startWalkthrough,
        isActive: walkthrough.isWalkthroughActive,
      }),
      [walkthrough.startWalkthrough, walkthrough.isWalkthroughActive],
    ),
  );

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "transactionsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  useEffect(() => {
    if (initialAction !== "new" && initialType) {
      setFilterState(
        initialFilterState(
          initialCategoryId,
          initialDatePreset,
          initialAccountId,
          initialType,
          initialLabelId,
        ),
      );
    } else if (
      initialAction !== "new" &&
      (initialAccountId || initialCategoryId || initialDatePreset || initialLabelId)
    ) {
      setFilterState(
        initialFilterState(
          initialCategoryId,
          initialDatePreset,
          initialAccountId,
          undefined,
          initialLabelId,
        ),
      );
    }
  }, [
    initialAccountId,
    initialAction,
    initialCategoryId,
    initialDatePreset,
    initialLabelId,
    initialType,
  ]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const handledInspectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialInspectId && handledInspectIdRef.current !== initialInspectId) {
      const target =
        transactions.find((transaction) => transaction.id === initialInspectId) ??
        getTransactionById(initialInspectId);
      if (target) {
        handledInspectIdRef.current = initialInspectId;
        setInspectedTransaction(target);
        router.setParams({ inspectId: undefined });
      }
    } else if (!initialInspectId) {
      handledInspectIdRef.current = null;
    }
  }, [getTransactionById, initialInspectId, router, transactions]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [onChatEditSaved, setOnChatEditSaved] = useState<
    ((data?: ChatSavedTransactionResult) => void) | null
  >(null);
  const [formInitialType, setFormInitialType] = useState<
    TransactionType | undefined
  >(undefined);
  const [formInitialAccountId, setFormInitialAccountId] = useState<
    string | null
  >(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [prefilledPreset, setPrefilledPreset] = useState<TransactionPreset | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvSheetOpen, setExportCsvSheetOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<{
    title: string;
    message: string;
    variant?: "info" | "success" | "error";
  } | null>(null);
  const handledActionRef = useRef<string | null>(null);
  const returnToChatOnFormCloseRef = useRef(false);

  useEffect(() => {
    if (initialAction === "new") {
      const actionKey = `${initialAction}-${initialType ?? "expense"}-${initialAccountId ?? ""}`;
      if (handledActionRef.current !== actionKey) {
        handledActionRef.current = actionKey;
        setIsEditingTransaction(false);
        setPrefilledTransaction(null);
        setFormInitialAccountId(initialAccountId ?? null);
        setFormInitialType(
          initialType === "income"
            ? "income"
            : initialType === "transfer"
              ? "transfer"
              : "expense",
        );
        setIsFormModalOpen(true);
        router.setParams({
          action: undefined,
          type: undefined,
          source: undefined,
        });
      }
    } else if (initialAction === "trash") {
      if (handledActionRef.current !== "trash") {
        handledActionRef.current = "trash";
        clearError();
        refreshDeletedTransactions();
        setIsTrashModalOpen(true);
        router.setParams({
          action: undefined,
          type: undefined,
          source: undefined,
        });
      }
    } else if (initialAction === "export") {
      if (handledActionRef.current !== "export") {
        handledActionRef.current = "export";
        setExportCsvSheetOpen(true);
        router.setParams({
          action: undefined,
          type: undefined,
          source: undefined,
        });
      }
    } else if (initialAction === "chat") {
      if (handledActionRef.current !== "chat") {
        handledActionRef.current = "chat";
        setIsChatModalOpen(true);
        router.setParams({
          action: undefined,
          type: undefined,
          source: undefined,
        });
      }
    } else if (initialAction === "presets") {
      if (handledActionRef.current !== "presets") {
        handledActionRef.current = "presets";
        clearError();
        setIsPresetsModalOpen(true);
        router.setParams({
          action: undefined,
          type: undefined,
          source: undefined,
        });
      }
    } else {
      handledActionRef.current = null;
    }
  }, [
    clearError,
    initialAccountId,
    initialAction,
    initialType,
    refreshDeletedTransactions,
    router,
  ]);

  useEffect(() => {
    setInspectedTransaction((current) =>
      current
        ? transactions.find((transaction) => transaction.id === current.id) ??
          getTransactionById(current.id) ??
          current
        : null,
    );
  }, [getTransactionById, transactions]);

  const pendingDeleteTransaction = useMemo(
    () => transactions.find((tx) => tx.id === pendingDeleteId) ?? null,
    [transactions, pendingDeleteId],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.type !== "all") count += 1;
    if (filterState.datePreset !== "all") count += 1;
    if (filterState.accountIds.length > 0) count += 1;
    if (filterState.categoryIds && filterState.categoryIds.length > 0) count += 1;
    if (filterState.labelIds && filterState.labelIds.length > 0) count += 1;
    return count;
  }, [filterState]);

  // Group paginated transactions by date (already filtered & sorted in SQLite)
  const groupedTransactions = useMemo(() => {
    const groups: DateGroup[] = [];
    const map = new Map<string, DateGroup>();

    for (const tx of transactions) {
      const { key, label } = getDateGroupInfo(tx.occurredAt);
      if (!map.has(key)) {
        const group: DateGroup = {
          key,
          label,
          items: [],
          netMinorUnits: 0,
          currencyCode: currencyPreferences.defaultCurrency,
          hasNonTransfer: false,
        };
        map.set(key, group);
        groups.push(group);
      }
      const group = map.get(key)!;
      group.items.push(tx);
      if (tx.type !== "transfer") {
        if (!group.hasNonTransfer) {
          group.currencyCode = tx.currencyCode || currencyPreferences.defaultCurrency;
        } else if (
          tx.currencyCode &&
          tx.currencyCode !== group.currencyCode
        ) {
          group.currencyCode = currencyPreferences.defaultCurrency;
        }
        group.hasNonTransfer = true;
        const delta = Math.abs(tx.amountMinorUnits);
        group.netMinorUnits += tx.type === "income" ? delta : -delta;
      }
    }

    return groups;
  }, [transactions, currencyPreferences.defaultCurrency]);

  const handleOpenNewTransaction = () => {
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setIsFormModalOpen(true);
  };

  const handleRecordTransaction = async (
    input: Parameters<typeof recordTransaction>[0],
    preset?: Parameters<typeof recordTransaction>[1],
    attachmentChanges?: Parameters<typeof recordTransaction>[2],
  ) => {
    const res = await recordTransaction(input, preset, attachmentChanges);
    if (res) {
      refreshAccounts();
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
    }
    return Boolean(res);
  };

  const handleRecordTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
    preset?: Parameters<typeof recordTransfer>[1],
    attachmentChanges?: Parameters<typeof recordTransfer>[2],
  ) => {
    const res = await recordTransfer(input, preset, attachmentChanges);
    if (res) {
      refreshAccounts();
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
    }
    return Boolean(res);
  };

  const handleUpdateTransaction = async (
    id: Parameters<typeof editTransaction>[0],
    input: Parameters<typeof editTransaction>[1],
    attachmentChanges?: Parameters<typeof editTransaction>[2],
  ) => {
    const success = await editTransaction(id, input, attachmentChanges);
    if (success) {
      refreshAccounts();
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
  };

  const handleUpdateTransfer = async (
    input: Parameters<typeof editTransfer>[0],
    attachmentChanges?: Parameters<typeof editTransfer>[1],
  ) => {
    const success = await editTransfer(input, attachmentChanges);
    if (success) {
      refreshAccounts();
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
  };

  const handleDuplicate = useCallback((tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(false);
    setIsFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(true);
    setIsFormModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleInspectTransaction = useCallback((item: TransactionListItem) => {
    setInspectedTransaction(item);
  }, []);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setInspectedTransaction(null);
    const deleted = await deleteTx(pendingDeleteId);
    if (deleted) {
      triggerHaptic("medium", "destructive");
      refreshAccounts();
      setPendingDeleteId(null);
    }
  };

  const deleteConfirmMessage = useMemo(() => {
    const tx = pendingDeleteTransaction;
    if (!tx) {
      return "This record will be moved to Trash. You can restore it later.";
    }
    const label = tx.name?.trim() || tx.categoryName || "this transaction";
    if (tx.type === "transfer") {
      return `Move the transfer from "${tx.accountName}" to "${tx.transferAccountName ?? "another account"}" to Trash? Both legs can be restored later.`;
    }
    return `Move "${label}" to Trash? This record can be restored later.`;
  }, [pendingDeleteTransaction]);

  const runCsvExport = (
    action: (rows: readonly TransactionListItem[]) => Promise<void>,
  ) => {
    void (async () => {
      try {
        setExportingCsv(true);
        const allMatchingRows = getExportRows();
        await action(allMatchingRows);
      } catch (error) {
        if (error instanceof TransactionCsvExportCancelledError) {
          return;
        }
        setExportNotice({
          title: t("transactions.exportFailedTitle"),
          message:
            error instanceof Error
              ? error.message
              : t("transactions.exportFailedMessage"),
          variant: "error",
        });
      } finally {
        setExportingCsv(false);
      }
    })();
  };

  const handleOpenExportCsv = () => {
    if (totalCount === 0) {
      setExportNotice({
        title: t("transactions.exportEmptyTitle"),
        message: t("transactions.exportEmptyMessage"),
        variant: "info",
      });
      return;
    }

    setExportCsvSheetOpen(true);
  };

  const handleSaveCsvToDevice = () => {
    setExportCsvSheetOpen(false);
    runCsvExport(async (rows) => {
      const { fileName } = await saveTransactionsCsvToDevice(rows);
      setExportNotice({
        title: t("transactions.exportSavedTitle"),
        message: t("transactions.exportSavedMessage", { fileName }),
        variant: "info",
      });
    });
  };

  const handleShareCsv = () => {
    setExportCsvSheetOpen(false);
    runCsvExport((rows) => shareTransactionsCsv(rows));
  };

  const handleSelectSortField = useCallback((field: "date" | "amount") => {
    transitionKindRef.current = "sort";
    setFilterState((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field
          ? prev.sortOrder === "desc"
            ? "asc"
            : "desc"
          : "desc",
    }));
  }, []);

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterState(DEFAULT_TRANSACTION_FILTERS);
  };

  const renderRowSeparator = useCallback(
    () => <View style={styles.rowSeparator} />,
    [styles.rowSeparator],
  );

  const renderTransactionItem = useCallback(
    ({ item }: { item: TransactionListItem }) => {
      const isFirstTransaction =
        firstTransactionId !== null && firstTransactionId === item.id;

      return (
        <TransactionRow
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onPress={handleInspectTransaction}
          rowRef={isFirstTransaction ? firstItemRef : undefined}
          transaction={item}
          viewMode={viewMode}
        />
      );
    },
    [
      firstItemRef,
      firstTransactionId,
      handleDelete,
      handleDuplicate,
      handleInspectTransaction,
      viewMode,
    ],
  );

  const sections = useMemo(
    () =>
      groupedTransactions.map((group) => ({
        key: group.key,
        title: group.label,
        count: group.items.length,
        netMinorUnits: group.netMinorUnits,
        currencyCode: group.currencyCode,
        hasNonTransfer: group.hasNonTransfer,
        data: group.items,
      })),
    [groupedTransactions],
  );

  return (
    <View style={styles.screenWrapper}>
      <PageContainer
        contentContainerStyle={styles.pageContent}
        refreshing={isPullRefreshing}
        onRefresh={handlePullRefresh}
        scrollEnabled={
          walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
        }
        floatingAction={
          <TransactionSpeedDialFab
            accessibilityLabel="Record new transaction"
            fabRef={fabRef}
            style={isBottomAdVisible ? styles.fabAboveAdDock : undefined}
            onPressForm={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              handleOpenNewTransaction();
            }}
            onPressChat={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              setIsChatModalOpen(true);
            }}
          />
        }
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Search & Actions Header (Kaizen SearchScreen Design) */}
        <View style={styles.searchRow}>
          <View
            ref={searchRef}
            collapsable={false}
            style={styles.searchInputContainer}
          >
            <Search
              color={theme.colors.textMuted}
              size={18}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search transactions"
              multiline={false}
              numberOfLines={1}
              onChangeText={setSearchQuery}
              placeholder="Search transactions..."
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <X color={theme.colors.textMuted} size={16} />
              </Pressable>
            )}
          </View>

          {/* Filter Trigger Button */}
            <Pressable
              ref={filterRef as never}
              collapsable={false}
              accessibilityLabel={`Filters, ${activeFilterCount} active`}
              onPress={() => setIsFilterModalOpen(true)}
              style={[
                styles.actionButton,
                styles.filterActionButton,
                activeFilterCount > 0 && styles.actionButtonActive,
              ]}
            >
              <SlidersHorizontal
                color={
                  activeFilterCount > 0
                    ? theme.colors.onPrimary
                    : theme.colors.textSecondary
                }
                size={18}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilterCount > 0 && styles.filterButtonTextActive,
                ]}
              >
                Filter
              </Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>

        </View>

        {/* Sort & Results Bar */}
        <View style={styles.sortBar}>
          <Text style={styles.resultsCountText}>
            {loading || isFilterTransitioning
              ? transitionKindRef.current === "sort"
                ? "Sorting transactions..."
                : "Loading transactions..."
              : `${totalCount} transaction${totalCount === 1 ? "" : "s"} found`}
          </Text>

          <View style={styles.sortActionsRow}>
            {/* Sort Field Chips */}
            <Pressable
              ref={sortDateRef as never}
              collapsable={false}
              accessibilityLabel={`Sort by date, ${
                filterState.sortBy === "date"
                  ? filterState.sortOrder === "desc"
                    ? "latest to oldest"
                    : "oldest to latest"
                  : "tap to sort latest to oldest"
              }`}
              accessibilityRole="button"
              onPress={() => handleSelectSortField("date")}
              style={[
                styles.sortPill,
                filterState.sortBy === "date" && styles.sortPillActive,
              ]}
            >
              <Text
                style={[
                  styles.sortPillText,
                  filterState.sortBy === "date" && styles.sortPillTextActive,
                ]}
              >
                Date
              </Text>
              {filterState.sortBy === "date" ? (
                filterState.sortOrder === "asc" ? (
                  <ArrowUp color={theme.colors.success} size={14} />
                ) : (
                  <ArrowDown color={theme.colors.success} size={14} />
                )
              ) : null}
            </Pressable>

            <Pressable
              ref={sortAmountRef as never}
              collapsable={false}
              accessibilityLabel={`Sort by amount, ${
                filterState.sortBy === "amount"
                  ? filterState.sortOrder === "desc"
                    ? "highest to lowest"
                    : "lowest to highest"
                  : "tap to sort highest to lowest"
              }`}
              accessibilityRole="button"
              onPress={() => handleSelectSortField("amount")}
              style={[
                styles.sortPill,
                filterState.sortBy === "amount" && styles.sortPillActive,
              ]}
            >
              <Text
                style={[
                  styles.sortPillText,
                  filterState.sortBy === "amount" && styles.sortPillTextActive,
                ]}
              >
                Amount
              </Text>
              {filterState.sortBy === "amount" ? (
                filterState.sortOrder === "asc" ? (
                  <ArrowUp color={theme.colors.success} size={14} />
                ) : (
                  <ArrowDown color={theme.colors.success} size={14} />
                )
              ) : null}
            </Pressable>

            <Pressable
              ref={viewModeRef as never}
              collapsable={false}
              accessibilityLabel={`Switch to ${viewMode === "compact" ? "detailed" : "compact"} view`}
                accessibilityRole="button"
                onPress={() =>
                  setViewMode(viewMode === "compact" ? "detailed" : "compact")
                }
                style={[
                  styles.sortOrderButton,
                  viewMode === "compact" && styles.viewModeButtonActive,
                ]}
              >
                {viewMode === "compact" ? (
                  <Rows3 color={theme.colors.success} size={16} />
                ) : (
                  <LayoutList color={theme.colors.textSecondary} size={16} />
                )}
              </Pressable>
          </View>
        </View>

        {/* Secondary transaction actions */}
        <View style={styles.secondaryActionsRow}>
          <Pressable
            ref={scheduledRef as never}
            collapsable={false}
            accessibilityLabel="Open scheduled transactions"
              accessibilityRole="button"
              onPress={() =>
                router.push("/transactions/scheduled")
              }
              style={styles.schedulesButton}
            >
              <CalendarClock color={theme.colors.primary} size={17} />
              <Text style={styles.schedulesButtonText}>Scheduled</Text>
            </Pressable>

          <Pressable
            ref={trashRef as never}
            collapsable={false}
            accessibilityLabel="Open transaction trash"
              accessibilityRole="button"
              onPress={() => {
                clearError();
                refreshDeletedTransactions();
                setIsTrashModalOpen(true);
              }}
              style={styles.trashButton}
            >
              <Trash2 color={theme.colors.danger} size={17} />
              <Text style={styles.trashButtonText}>Trash</Text>
            </Pressable>

          <Pressable
            ref={exportRef as never}
            collapsable={false}
            accessibilityLabel="Export CSV"
              accessibilityState={{ disabled: exportingCsv || loading }}
              disabled={exportingCsv || loading}
              onPress={handleOpenExportCsv}
              style={[
                styles.actionButton,
                (exportingCsv || loading) && styles.actionButtonDisabled,
              ]}
            >
              <Download color={theme.colors.success} size={18} />
            </Pressable>
        </View>

        {(activeFilterCount > 0 || searchQuery.trim().length > 0) && (
          <HorizontalScrollView
            contentContainerStyle={styles.activeFiltersRow}
            style={styles.activeFiltersScroll}
          >
            <Pressable
              accessibilityLabel="Clear all filters"
              accessibilityRole="button"
              onPress={handleClearFilters}
              style={({ pressed }) => [
                styles.clearAllFiltersChip,
                pressed && { opacity: 0.7 },
              ]}
            >
              <RotateCcw color={theme.colors.textSecondary} size={12} />
              <Text style={styles.clearAllFiltersChipText}>Clear all</Text>
            </Pressable>

            {searchQuery.trim().length > 0 ? (
              <Pressable
                style={styles.activeFilterChip}
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
              >
                <Text style={styles.activeFilterChipText} numberOfLines={1}>
                  {`"${searchQuery.trim()}"`}
                </Text>
                <X size={13} color={theme.colors.primary} />
              </Pressable>
            ) : null}

            {filterState.type !== "all" ? (
              <Pressable
                style={styles.activeFilterChip}
                onPress={() =>
                  setFilterState((prev) => ({ ...prev, type: "all" }))
                }
                accessibilityRole="button"
              >
                <Text style={styles.activeFilterChipText}>
                  {filterState.type === "income"
                    ? "Income"
                    : filterState.type === "expense"
                      ? "Expense"
                      : "Transfer"}
                </Text>
                <X size={13} color={theme.colors.primary} />
              </Pressable>
            ) : null}

            {filterState.datePreset !== "all" ? (
              <Pressable
                style={styles.activeFilterChip}
                onPress={() =>
                  setFilterState((prev) => ({
                    ...prev,
                    datePreset: "all",
                    customDateFrom: null,
                    customDateTo: null,
                  }))
                }
                accessibilityRole="button"
              >
                <Text style={styles.activeFilterChipText}>
                  {filterState.datePreset === "this_month"
                    ? "This Month"
                    : filterState.datePreset === "last_month"
                      ? "Last Month"
                      : filterState.datePreset === "this_year"
                        ? "This Year"
                        : "Custom Dates"}
                </Text>
                <X size={13} color={theme.colors.primary} />
              </Pressable>
            ) : null}

            {filterState.accountIds.map((accId) => {
              const accName =
                accounts.find((a) => a.id === accId)?.name ?? "Account";
              return (
                <Pressable
                  key={`acc-${accId}`}
                  style={styles.activeFilterChip}
                  onPress={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      accountIds: prev.accountIds.filter((id) => id !== accId),
                    }))
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.activeFilterChipText} numberOfLines={1}>
                    {accName}
                  </Text>
                  <X size={13} color={theme.colors.primary} />
                </Pressable>
              );
            })}

            {(filterState.categoryIds ?? []).map((catId) => {
              const allCats = categories.flatMap((c) => [
                c,
                ...(c.subcategories ?? []),
              ]);
              const catName =
                allCats.find((c) => c.id === catId)?.name ?? "Category";
              return (
                <Pressable
                  key={`cat-${catId}`}
                  style={styles.activeFilterChip}
                  onPress={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      categoryIds: (prev.categoryIds ?? []).filter(
                        (id) => id !== catId,
                      ),
                    }))
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.activeFilterChipText} numberOfLines={1}>
                    {catName}
                  </Text>
                  <X size={13} color={theme.colors.primary} />
                </Pressable>
              );
            })}

            {(filterState.labelIds ?? []).map((lblId) => {
              const lblName =
                allLabels.find((l) => l.id === lblId)?.name ?? "Label";
              return (
                <Pressable
                  key={`lbl-${lblId}`}
                  style={styles.activeFilterChip}
                  onPress={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      labelIds: (prev.labelIds ?? []).filter(
                        (id) => id !== lblId,
                      ),
                    }))
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.activeFilterChipText} numberOfLines={1}>
                    {`#${lblName}`}
                  </Text>
                  <X size={13} color={theme.colors.primary} />
                </Pressable>
              );
            })}
          </HorizontalScrollView>
        )}

        {/* Transactions Feed Grouped By Date */}
        <SectionList
          ref={sectionListRef}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={handlePullRefresh}
              refreshing={isPullRefreshing}
              tintColor={theme.colors.primary}
            />
          }
          ItemSeparatorComponent={renderRowSeparator}
          ListEmptyComponent={
            loading || isFilterTransitioning ? (
              <View style={styles.sortingSkeletonContainer}>
                <PageLoadingState
                  message={
                    isFilterTransitioning && transitionKindRef.current === "sort"
                      ? "Sorting transactions..."
                      : "Loading transactions..."
                  }
                  variant="list"
                />
              </View>
            ) : (
              <PageEmptyState
                icon={
                  activeFilterCount > 0 || searchQuery.length > 0 ? (
                    <Search color={theme.colors.primary} size={32} />
                  ) : (
                    <Receipt color={theme.colors.primary} size={32} />
                  )
                }
                actionLabel={
                  activeFilterCount > 0 || searchQuery.length > 0
                    ? "Clear Filters"
                    : "+ Record First Transaction"
                }
                description={
                  activeFilterCount > 0 || searchQuery.length > 0
                    ? "No transaction records match your search or filter criteria."
                    : "Your transaction history is empty. Start recording your expenses, income, or transfers."
                }
                onAction={
                  activeFilterCount > 0 || searchQuery.length > 0
                    ? handleClearFilters
                    : handleOpenNewTransaction
                }
                title="No Transactions Found"
              />
            )
          }
          contentContainerStyle={[
            styles.listContentContainer,
            {
              paddingBottom:
                (isBottomAdVisible ? 16 : Math.max(insets.bottom, 24)) + 80,
            },
          ]}
          initialNumToRender={20}
          keyExtractor={(item) => item.id}
          maxToRenderPerBatch={15}
          removeClippedSubviews={Platform.OS !== "web"}
          renderItem={renderTransactionItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.dateGroupHeader}>
              <Text style={styles.dateGroupTitle}>{section.title}</Text>
              {section.hasNonTransfer ? (
                <Text
                  style={[
                    styles.dateNetText,
                    currencyPreferences.colorAmounts &&
                      (section.netMinorUnits > 0
                        ? { color: theme.colors.success }
                        : section.netMinorUnits < 0
                          ? { color: theme.colors.danger }
                          : null),
                  ]}
                >
                  {isPrivate
                    ? "••••••"
                    : formatCurrency(
                        section.netMinorUnits,
                        section.currencyCode,
                        true,
                      )}
                </Text>
              ) : null}
              <View style={styles.dateCountBadge}>
                <Text style={styles.dateCountBadgeText}>
                  {section.count} {section.count === 1 ? "record" : "records"}
                </Text>
              </View>
            </View>
          )}
          sections={isFilterTransitioning ? [] : sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          style={styles.sectionList}
          windowSize={7}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          ListFooterComponent={
            !isFilterTransitioning && hasMoreTransactions ? (
              <View style={styles.loadMoreFooter}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
              </View>
            ) : null
          }
        />

        {showScrollToTop ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.scrollToTopContainer,
              {
                bottom: isBottomAdVisible
                  ? 16
                  : Math.max(insets.bottom, 16) + 24,
              },
            ]}
          >
            <Pressable
              accessibilityLabel={t("transactions.scrollToTop", {
                defaultValue: "Scroll to top",
              })}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleScrollToTop}
              style={({ pressed }) => [
                styles.scrollToTopButton,
                pressed && styles.scrollToTopButtonPressed,
              ]}
            >
              <ChevronsUp
                color={theme.colors.primary}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Transaction & Transfer Form Modal */}
      <TransactionFormModal
        accounts={accounts}
        pockets={pockets}
        categories={categories}
        presets={presets}
        presetsLoading={presetsLoading}
        presetPending={presetPending}
        presetError={presetError}
        error={error}
        isEditing={isEditingTransaction}
        initialTransaction={prefilledTransaction}
        initialPreset={prefilledPreset}
        onClearError={clearError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          const shouldReturnToChat = returnToChatOnFormCloseRef.current;
          returnToChatOnFormCloseRef.current = false;
          setIsFormModalOpen(false);
          setPrefilledTransaction(null);
          setPrefilledPreset(null);
          setIsEditingTransaction(false);
          setFormInitialType(undefined);
          setFormInitialAccountId(null);
          setOnChatEditSaved(null);
          router.setParams({
            action: undefined,
            type: undefined,
            source: undefined,
          });
          if (shouldReturnToChat) {
            setTimeout(() => {
              setIsChatModalOpen(true);
            }, Platform.OS === "ios" ? 250 : 80);
          }
        }}
        initialType={formInitialType}
        defaultExpenseAccountId={formInitialAccountId}
        defaultIncomeAccountId={formInitialAccountId}
        onSaveTransaction={handleRecordTransaction}
        onSaveTransfer={handleRecordTransfer}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
        onArchivePreset={archivePreset}
        onRestorePreset={restorePreset}
        onPermanentlyDeletePreset={permanentlyDeletePreset}
        onReorderPresets={reorderPresets}
        archivedPresets={archivedPresets}
        presetSortBy={presetSortBy}
        onChangePresetSortBy={setPresetSortBy}
        onUpdateTransaction={handleUpdateTransaction}
        onUpdateTransfer={handleUpdateTransfer}
        onCategoriesChanged={() => void refreshCategories()}
        loading={accountsLoading || categoriesLoading}
        pending={pendingAction}
        visible={isFormModalOpen}
      />

      {/* Quick Presets Management Modal */}
      <QuickPresetsModal
        accounts={accounts}
        categories={categories}
        error={presetError}
        loading={presetsLoading}
        onClearError={clearPresetError}
        onClose={() => setIsPresetsModalOpen(false)}
        onDelete={deletePreset}
        onArchive={archivePreset}
        onRestore={restorePreset}
        onPermanentlyDelete={permanentlyDeletePreset}
        onReorder={reorderPresets}
        onSave={savePreset}
        onSelect={(preset) => {
          setIsPresetsModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
          setPrefilledPreset(preset);
          setIsFormModalOpen(true);
        }}
        pending={presetPending}
        pockets={pockets}
        presets={presets}
        archivedPresets={archivedPresets}
        sortBy={presetSortBy}
        onChangeSortBy={setPresetSortBy}
        visible={isPresetsModalOpen}
      />

      {/* Transaction Details Inspector Modal */}
      <TransactionDetailModal
        onAttachmentsChanged={refresh}
        onClose={() => setInspectedTransaction(null)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={handleEdit}
        transaction={inspectedTransaction}
        visible={!!inspectedTransaction}
      />

      <ChatWithKaiModal
        accounts={accounts}
        categories={categories}
        onClose={() => setIsChatModalOpen(false)}
        onDeleteTransaction={deleteTx}
        onEditInForm={(prefilled, onSaved, isEditing = false) => {
          returnToChatOnFormCloseRef.current = true;
          setPrefilledTransaction(prefilled);
          setIsEditingTransaction(isEditing);
          setOnChatEditSaved(() => onSaved ?? null);
          setIsFormModalOpen(true);
        }}
        onSaveTransaction={async (input) => {
          const res = await recordTransaction(input);
          if (res) {
            refreshAccounts();
          }
          return res;
        }}
        onSaveTransfer={async (input) => {
          const res = await recordTransfer(input);
          if (res) {
            refreshAccounts();
          }
          return res;
        }}
        pockets={pockets}
        visible={isChatModalOpen}
      />

      {/* Filter Modal */}
      <TransactionFilterModal
        accounts={accounts}
        filters={filterState}
        onApply={(newFilters) => setFilterState(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
        visible={isFilterModalOpen}
      />

      <ConfirmModal
        confirmLabel="Delete"
        message={deleteConfirmMessage}
        pending={pendingAction}
        title="Delete transaction?"
        variant="destructive"
        visible={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />

      <DeletedTransactionsModal
        error={error}
        onClearError={clearError}
        onClose={() => {
          clearError();
          setIsTrashModalOpen(false);
        }}
        onPermanentlyDelete={async (id) => {
          const deleted = await permanentlyDeleteTx(id);
          if (deleted) refreshAccounts();
          return deleted;
        }}
        onPermanentlyDeleteAll={async () => {
          const deleted = await permanentlyDeleteAllTx();
          if (deleted) refreshAccounts();
          return deleted;
        }}
        onRestore={async (id) => {
          const restored = await restoreTx(id);
          if (restored) refreshAccounts();
          return restored;
        }}
        pending={pendingAction}
        transactions={deletedTransactions}
        visible={isTrashModalOpen}
      />

      <ActionBottomSheet
        items={[
          {
            id: "save-to-device",
            label: "Save to device",
            description: "Choose a folder in Files or Downloads",
            icon: <FolderDown color={theme.colors.primary} size={22} />,
            onPress: handleSaveCsvToDevice,
          },
          {
            id: "share",
            label: "Share",
            description: "Send to another app or cloud storage",
            icon: <Share2 color={theme.colors.success} size={22} />,
            onPress: handleShareCsv,
          },
        ]}
        onClose={() => setExportCsvSheetOpen(false)}
        title="Export CSV"
        visible={exportCsvSheetOpen}
      />

      <InfoModal
        buttonLabel={t("common.ok")}
        message={exportNotice?.message ?? ""}
        onClose={() => setExportNotice(null)}
        title={exportNotice?.title ?? ""}
        variant={exportNotice?.variant ?? "info"}
        visible={Boolean(exportNotice)}
      />

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("transactionsWalkthrough.introTitle")}
        subtitle={t("transactionsWalkthrough.introSubtitle")}
        message={t("transactionsWalkthrough.introMessage")}
        icon={<ArrowLeftRight color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />

      <TransactionsWalkthroughOverlay
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
          handleOpenNewTransaction();
        }}
      />
      </PageContainer>

      <AnchoredAdDock
        onVisibilityChange={setIsBottomAdVisible}
        placement="transactions"
      />

      {/* Block interaction while waiting for the first-time modal */}
      {walkthroughIntro.isWaitingForIntro ? (
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => {}}
          style={styles.interactionBlocker}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenWrapper: {
      flex: 1,
    },
    interactionBlocker: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.01)",
      zIndex: 99999,
    },
    pageContent: {
      flex: 1,
      paddingBottom: 0,
    },
    container: {
      flex: 1,
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    sectionList: {
      flex: 1,
    },
    sortingSkeletonContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    listContentContainer: {
      flexGrow: 1,
    },
    fabAboveAdDock: {
      bottom: 16,
    },
    searchRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    searchInputContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      height: 40,
      paddingHorizontal: theme.spacing.md,
      ...theme.shadows.card,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      includeFontPadding: false,
      paddingVertical: theme.spacing.xs,
      textAlignVertical: "center",
    },
    clearButton: {
      padding: theme.spacing.xs,
    },
    actionButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: LAYOUT_DIMENSIONS.minTouchTarget,
      ...theme.shadows.card,
    },
    filterActionButton: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      width: 104,
    },
    trashButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}60`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 40,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    schedulesButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderColor: `${theme.colors.primary}55`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 40,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    schedulesButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    trashButtonText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    actionButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    actionButtonDisabled: {
      opacity: 0.55,
    },
    filterBadge: {
      backgroundColor: theme.colors.danger,
      borderRadius: 9,
      height: 18,
      position: "absolute",
      right: -4,
      top: -4,
      width: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sortBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    secondaryActionsRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    resultsCountText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sortActionsRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    sortPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
    },
    sortPillText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sortPillActive: {
      borderColor: theme.colors.success,
    },
    sortPillTextActive: {
      color: theme.colors.success,
    },
    sortOrderButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    viewModeButtonActive: {
      borderColor: theme.colors.success,
    },
    rowSeparator: {
      height: theme.spacing.sm,
    },
    dateGroupContainer: {
      gap: theme.spacing.xs,
    },
    dateGroupHeader: {
      gap: theme.spacing.sm,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    dateGroupTitle: {
      color: theme.colors.success,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dateCountBadge: {
      paddingVertical: 2,
    },
    dateCountBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    activeFiltersScroll: {
      flexGrow: 0,
      maxHeight: 34,
    },
    activeFiltersRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: 2,
    },
    activeFilterChip: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      maxWidth: 180,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    activeFilterChipText: {
      color: theme.colors.primary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    clearAllFiltersChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    clearAllFiltersChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dateHeaderRight: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    dateNetText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    loadMoreFooter: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    scrollToTopContainer: {
      alignItems: "center",
      alignSelf: "center",
      justifyContent: "center",
      pointerEvents: "box-none",
      position: "absolute",
      zIndex: 50,
    },
    scrollToTopButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1.5,
      elevation: 6,
      height: 44,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      width: 44,
    },
    scrollToTopButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      transform: [{ scale: 0.92 }],
    },
  });
}

