import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
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
  Download,
  FolderDown,
  LayoutList,
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
  PageContainer,
  PageEmptyState,
} from "@/components";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ArrowLeftRight } from "lucide-react-native";
import { useExperiencePreferences } from "@/modules/settings";
import {
  WalkthroughRegistryProvider,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  DraggableTourChip,
  WalkthroughIntroModal,
  TransactionsWalkthroughOverlay,
  useTransactionsWalkthrough,
  useWalkthroughIntro,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { useAccounts } from "@/modules/accounts";
import { AdBanner } from "@/modules/ads";
import { useCategories } from "@/modules/categories";
import {
  DEFAULT_TRANSACTION_FILTERS,
  TransactionFilterModal,
  type TransactionFilterState,
} from "../components/transaction-filter-modal";
import { isLocalDateKeyInRange } from "../utils/transaction-date-filter";
import { TransactionDetailModal } from "../components/transaction-detail-modal";
import { DeletedTransactionsModal } from "../components/deleted-transactions-modal";
import { TransactionFormModal } from "../components/transaction-form-modal";
import { TransactionSpeedDialFab } from "../components/transaction-speed-dial-fab";
import { ChatWithKaiModal } from "@/modules/chat-with-kai";
import { TransactionRow } from "../components/transaction-row";
import { useTransactions } from "../hooks/use-transactions";
import { useTransactionPresets } from "../hooks/use-transaction-presets";
import { useTransactionViewMode } from "../hooks/use-transaction-view-mode";
import {
  saveTransactionsCsvToDevice,
  shareTransactionsCsv,
  TransactionCsvExportCancelledError,
} from "../services/export-transactions-csv.service";
import type {
  TransactionListItem,
  TransactionType,
} from "../types/transaction.types";

const TRANSACTIONS_PAGE_SIZE = 50;

interface DateGroup {
  key: string;
  label: string;
  items: TransactionListItem[];
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
  accountId?: string,
  initialType?: string,
): TransactionFilterState {
  const filterType =
    initialType === "expense" || initialType === "income" || initialType === "transfer"
      ? initialType
      : "all";
  if (!accountId && filterType === "all") {
    return DEFAULT_TRANSACTION_FILTERS;
  }
  return {
    ...DEFAULT_TRANSACTION_FILTERS,
    ...(accountId ? { accountIds: [accountId] } : {}),
    type: filterType,
  };
}

export interface TransactionsScreenProps {
  initialAccountId?: string;
  initialAction?: string;
  initialType?: string;
}

export function TransactionsScreen(props: TransactionsScreenProps = {}) {
  return (
    <WalkthroughRegistryProvider>
      <TransactionsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function TransactionsScreenContent({
  initialAccountId,
  initialAction,
  initialType,
}: TransactionsScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);

  const {
    transactions,
    deletedTransactions,
    loading,
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

  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories, refresh: refreshCategories } = useCategories();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<TransactionFilterState>(() =>
    initialFilterState(
      initialAccountId,
      initialAction !== "new" ? initialType : undefined,
    ),
  );
  const { viewMode, setViewMode } = useTransactionViewMode();
  const [renderedLimit, setRenderedLimit] = useState(TRANSACTIONS_PAGE_SIZE);

  useEffect(() => {
    setRenderedLimit(TRANSACTIONS_PAGE_SIZE);
  }, [searchQuery, filterState]);

  const fabRef = useRef<View>(null);
  const { registerTarget } = useWalkthroughRegistry();
  const { isPromptDismissed } = useExperiencePreferences();
  const searchRef = useWalkthroughTarget("txSearch");
  const filterRef = useWalkthroughTarget("txFilter");
  const sortDateRef = useWalkthroughTarget("txSortDate");
  const sortAmountRef = useWalkthroughTarget("txSortAmount");
  const sortOrderRef = useWalkthroughTarget("txSortOrder");
  const viewModeRef = useWalkthroughTarget("txViewMode");
  const scheduledRef = useWalkthroughTarget("txScheduled");
  const trashRef = useWalkthroughTarget("txTrash");
  const exportRef = useWalkthroughTarget("txExport");

  useEffect(() => {
    registerTarget("txFab", fabRef);
    return () => registerTarget("txFab", null);
  }, [registerTarget]);

  const sectionListRef = useRef<SectionList<any>>(null);

  const handleScrollToTarget = useCallback((targetId: WalkthroughTargetId) => {
    if (targetId === "txFab") {
      return;
    }
  }, []);

  const walkthrough = useTransactionsWalkthrough({
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "transactionsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  useEffect(() => {
    if (initialAction !== "new" && initialType) {
      setFilterState(initialFilterState(initialAccountId, initialType));
    } else if (initialAccountId) {
      setFilterState(initialFilterState(initialAccountId));
    }
  }, [initialAccountId, initialAction, initialType]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [onChatEditSaved, setOnChatEditSaved] = useState<(() => void) | null>(null);
  const [formInitialType, setFormInitialType] = useState<
    TransactionType | undefined
  >(undefined);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvSheetOpen, setExportCsvSheetOpen] = useState(false);
  const handledActionRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialAction === "new") {
      const actionKey = `${initialAction}-${initialType ?? "expense"}`;
      if (handledActionRef.current !== actionKey) {
        handledActionRef.current = actionKey;
        setIsEditingTransaction(false);
        setPrefilledTransaction(null);
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
    } else {
      handledActionRef.current = null;
    }
  }, [clearError, initialAction, initialType, router]);

  useEffect(() => {
    setInspectedTransaction((current) =>
      current
        ? transactions.find((transaction) => transaction.id === current.id) ??
          current
        : null,
    );
  }, [transactions]);

  const pendingDeleteTransaction = useMemo(
    () => transactions.find((tx) => tx.id === pendingDeleteId) ?? null,
    [transactions, pendingDeleteId],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.type !== "all") count += 1;
    if (filterState.datePreset !== "all") count += 1;
    if (filterState.accountIds.length > 0) count += 1;
    if (filterState.labelIds && filterState.labelIds.length > 0) count += 1;
    return count;
  }, [filterState]);

  // Client-side filtering & sorting
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // 1. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((tx) => {
        return (
          (tx.name && tx.name.toLowerCase().includes(q)) ||
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (tx.categoryName && tx.categoryName.toLowerCase().includes(q)) ||
          (tx.labels && tx.labels.some((lbl) => lbl.name.toLowerCase().includes(q))) ||
          tx.accountName.toLowerCase().includes(q) ||
          (tx.transferAccountName &&
            tx.transferAccountName.toLowerCase().includes(q))
        );
      });
    }

    // 2. Type filter
    if (filterState.type !== "all") {
      list = list.filter((tx) => tx.type === filterState.type);
    }

    // 3. Account filter
    if (filterState.accountIds.length > 0) {
      list = list.filter(
        (tx) =>
          filterState.accountIds.includes(tx.accountId) ||
          (tx.transferAccountId !== null &&
            filterState.accountIds.includes(tx.transferAccountId)),
      );
    }

    // 4. Label filter
    if (filterState.labelIds && filterState.labelIds.length > 0) {
      list = list.filter((tx) =>
        tx.labels?.some((lbl) => filterState.labelIds!.includes(lbl.id)),
      );
    }

    // 4. Date preset filter
    if (filterState.datePreset !== "all") {
      const now = new Date();
      list = list.filter((tx) => {
        if (!tx.occurredAt) return false;
        const d = new Date(tx.occurredAt);

        switch (filterState.datePreset) {
          case "this_month":
            return (
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth()
            );
          case "last_month": {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return (
              d.getFullYear() === lastMonth.getFullYear() &&
              d.getMonth() === lastMonth.getMonth()
            );
          }
          case "this_year":
            return d.getFullYear() === now.getFullYear();
          case "custom": {
            const from = filterState.customDateFrom;
            const to = filterState.customDateTo;
            if (!from || !to) return false;
            return isLocalDateKeyInRange(tx.occurredAt, from, to);
          }
          default:
            return true;
        }
      });
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (filterState.sortBy === "amount") {
        const valA = Math.abs(a.amountMinorUnits);
        const valB = Math.abs(b.amountMinorUnits);
        return filterState.sortOrder === "asc" ? valA - valB : valB - valA;
      } else {
        const timeA = new Date(a.occurredAt ?? 0).getTime();
        const timeB = new Date(b.occurredAt ?? 0).getTime();
        return filterState.sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
    });

    return list;
  }, [transactions, searchQuery, filterState]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, renderedLimit),
    [filteredTransactions, renderedLimit],
  );

  const hasMoreTransactions = renderedLimit < filteredTransactions.length;

  const handleLoadMore = useCallback(() => {
    if (renderedLimit < filteredTransactions.length) {
      setRenderedLimit((prev) =>
        Math.min(prev + TRANSACTIONS_PAGE_SIZE, filteredTransactions.length),
      );
    }
  }, [renderedLimit, filteredTransactions.length]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: DateGroup[] = [];
    const map = new Map<string, DateGroup>();

    for (const tx of visibleTransactions) {
      const { key, label } = getDateGroupInfo(tx.occurredAt);
      if (!map.has(key)) {
        const group: DateGroup = { key, label, items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key)!.items.push(tx);
    }

    return groups;
  }, [visibleTransactions]);

  const handleOpenNewTransaction = () => {
    refreshAccounts();
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setIsFormModalOpen(true);
  };

  const handleRecordTransaction = async (
    input: Parameters<typeof recordTransaction>[0],
    preset?: Parameters<typeof recordTransaction>[1],
    attachmentChanges?: Parameters<typeof recordTransaction>[2],
  ) => {
    const success = await recordTransaction(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshPresets();
      onChatEditSaved?.();
      setOnChatEditSaved(null);
    }
    return success;
  };

  const handleRecordTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
    preset?: Parameters<typeof recordTransfer>[1],
    attachmentChanges?: Parameters<typeof recordTransfer>[2],
  ) => {
    const success = await recordTransfer(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshPresets();
      onChatEditSaved?.();
      setOnChatEditSaved(null);
    }
    return success;
  };

  const handleUpdateTransaction = async (
    id: Parameters<typeof editTransaction>[0],
    input: Parameters<typeof editTransaction>[1],
    attachmentChanges?: Parameters<typeof editTransaction>[2],
  ) => {
    const success = await editTransaction(id, input, attachmentChanges);
    if (success) refreshAccounts();
    return success;
  };

  const handleUpdateTransfer = async (
    input: Parameters<typeof editTransfer>[0],
    attachmentChanges?: Parameters<typeof editTransfer>[1],
  ) => {
    const success = await editTransfer(input, attachmentChanges);
    if (success) refreshAccounts();
    return success;
  };

  const handleDuplicate = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(false);
    setIsFormModalOpen(true);
  };

  const handleEdit = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(true);
    setIsFormModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setInspectedTransaction(null);
    const deleted = await deleteTx(pendingDeleteId);
    if (deleted) {
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
        await action(filteredTransactions);
      } catch (error) {
        if (error instanceof TransactionCsvExportCancelledError) {
          return;
        }
        Alert.alert(
          "Export failed",
          error instanceof Error
            ? error.message
            : "Unable to export transactions.",
        );
      } finally {
        setExportingCsv(false);
      }
    })();
  };

  const handleOpenExportCsv = () => {
    if (filteredTransactions.length === 0) {
      Alert.alert(
        "Nothing to export",
        "Adjust your filters or record transactions first.",
      );
      return;
    }

    setExportCsvSheetOpen(true);
  };

  const handleSaveCsvToDevice = () => {
    setExportCsvSheetOpen(false);
    runCsvExport(async (rows) => {
      const { fileName } = await saveTransactionsCsvToDevice(rows);
      Alert.alert(
        "Saved to device",
        `${fileName} was saved to the folder you selected.`,
      );
    });
  };

  const handleShareCsv = () => {
    setExportCsvSheetOpen(false);
    runCsvExport((rows) => shareTransactionsCsv(rows));
  };

  const toggleSortOrder = () => {
    setFilterState((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterState(DEFAULT_TRANSACTION_FILTERS);
  };

  const sections = useMemo(
    () =>
      groupedTransactions.map((group) => ({
        key: group.key,
        title: group.label,
        count: group.items.length,
        data: group.items,
      })),
    [groupedTransactions],
  );

  return (
    <PageContainer
      contentContainerStyle={styles.pageContent}
      floatingAction={
        <>
          <TransactionSpeedDialFab
            accessibilityLabel="Record new transaction"
            fabRef={fabRef}
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
          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />
        </>
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
            {loading
              ? "Loading transactions..."
              : `${filteredTransactions.length} transaction${
                  filteredTransactions.length === 1 ? "" : "s"
                } found`}
          </Text>

          <View style={styles.sortActionsRow}>
            {/* Sort Field Chips */}
            <Pressable
              ref={sortDateRef as never}
              collapsable={false}
              accessibilityLabel="Sort by date"
                onPress={() =>
                  setFilterState((prev) => ({ ...prev, sortBy: "date" }))
                }
                style={[styles.sortPill, filterState.sortBy === "date" && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, filterState.sortBy === "date" && styles.sortPillTextActive]}>Date</Text>
              </Pressable>

            <Pressable
              ref={sortAmountRef as never}
              collapsable={false}
              accessibilityLabel="Sort by amount"
                onPress={() =>
                  setFilterState((prev) => ({ ...prev, sortBy: "amount" }))
                }
                style={[styles.sortPill, filterState.sortBy === "amount" && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, filterState.sortBy === "amount" && styles.sortPillTextActive]}>Amount</Text>
              </Pressable>

            <Pressable
              ref={sortOrderRef as never}
              collapsable={false}
              accessibilityLabel={`Sort order ${filterState.sortOrder}`}
                onPress={toggleSortOrder}
                style={styles.sortOrderButton}
              >
                {filterState.sortOrder === "asc" ? (
                  <ArrowUp color={theme.colors.success} size={16} />
                ) : (
                  <ArrowDown color={theme.colors.success} size={16} />
                )}
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

        {/* Transactions Feed Grouped By Date */}
        <SectionList
          ref={sectionListRef}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          ListEmptyComponent={
            <View>
              <PageEmptyState
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
              <AdBanner
                placement="transactions"
                variant="card"
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          }
          contentContainerStyle={[
            styles.listContentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 },
          ]}
          initialNumToRender={20}
          keyExtractor={(item) => item.id}
          maxToRenderPerBatch={15}
          removeClippedSubviews={Platform.OS !== "web"}
          renderItem={({ item }) => {
            const isThirdTransaction =
              filteredTransactions.length >= 4 &&
              filteredTransactions[2]?.id === item.id;

            return (
              <View key={item.id}>
                <TransactionRow
                  onDelete={handleDelete}
                  onPress={(item) => setInspectedTransaction(item)}
                  transaction={item}
                  viewMode={viewMode}
                />
                {isThirdTransaction ? (
                  <AdBanner
                    placement="transactions"
                    variant="card"
                    style={{ marginVertical: theme.spacing.sm }}
                  />
                ) : null}
              </View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <View style={styles.dateGroupHeader}>
              <Text style={styles.dateGroupTitle}>{section.title}</Text>
              <View style={styles.dateCountBadge}>
                <Text style={styles.dateCountBadgeText}>
                  {section.count} {section.count === 1 ? "record" : "records"}
                </Text>
              </View>
            </View>
          )}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          style={styles.sectionList}
          windowSize={7}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMoreTransactions ? (
              <View style={styles.loadMoreFooter}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
              </View>
            ) : filteredTransactions.length > 0 && filteredTransactions.length < 4 ? (
              <AdBanner
                placement="transactions"
                variant="card"
                style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}
              />
            ) : null
          }
        />
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
        onClearError={clearError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          setIsFormModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
          setFormInitialType(undefined);
          setOnChatEditSaved(null);
          router.setParams({
            action: undefined,
            type: undefined,
            source: undefined,
          });
        }}
        initialType={formInitialType}
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
        pending={pendingAction}
        visible={isFormModalOpen}
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
        onEditInForm={(prefilled, onSaved) => {
          setPrefilledTransaction(prefilled);
          setIsEditingTransaction(false);
          setOnChatEditSaved(() => onSaved ?? null);
          setIsFormModalOpen(true);
        }}
        onSaveTransaction={async (input) => {
          const success = await recordTransaction(input);
          if (success) {
            refreshAccounts();
          }
          return success;
        }}
        onSaveTransfer={async (input) => {
          const success = await recordTransfer(input);
          if (success) {
            refreshAccounts();
          }
          return success;
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
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pageContent: {
      flex: 1,
      paddingBottom: 0,
    },
    container: {
      flex: 1,
      gap: theme.spacing.md,
      paddingTop: theme.spacing.lg,
    },
    sectionList: {
      flex: 1,
    },
    listContentContainer: {
      flexGrow: 1,
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
      height: LAYOUT_DIMENSIONS.minTouchTarget,
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
      height: LAYOUT_DIMENSIONS.minTouchTarget,
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
      height: LAYOUT_DIMENSIONS.minTouchTarget,
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
      height: LAYOUT_DIMENSIONS.minTouchTarget,
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
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    dateGroupTitle: {
      color: theme.colors.success,
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
    loadMoreFooter: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
  });
}

