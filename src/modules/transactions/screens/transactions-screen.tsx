import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Trash2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import {
  ConfirmModal,
  FeatureNotImplementedModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
} from "@/components";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import {
  DEFAULT_TRANSACTION_FILTERS,
  TransactionFilterModal,
  type TransactionFilterState,
} from "../components/transaction-filter-modal";
import { TransactionDetailModal } from "../components/transaction-detail-modal";
import { DeletedTransactionsModal } from "../components/deleted-transactions-modal";
import { TransactionFormModal } from "../components/transaction-form-modal";
import { TransactionRow } from "../components/transaction-row";
import { useTransactions } from "../hooks/use-transactions";
import type { TransactionListItem } from "../types/transaction.types";

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

export function TransactionsScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    transactions,
    deletedTransactions,
    loading,
    pendingAction,
    error,
    recordTransaction,
    recordTransfer,
    deleteTx,
    restoreTx,
    editTransaction,
    editTransfer,
  } = useTransactions();

  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories } = useCategories();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<TransactionFilterState>(
    DEFAULT_TRANSACTION_FILTERS,
  );

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDeleteTransaction = useMemo(
    () => transactions.find((tx) => tx.id === pendingDeleteId) ?? null,
    [transactions, pendingDeleteId],
  );

  // Unintegrated feature modal
  const [featureModalVisible, setFeatureModalVisible] = useState(false);
  const [unintegratedFeature, setUnintegratedFeature] = useState({
    title: "",
    description: "",
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.type !== "all") count += 1;
    if (filterState.datePreset !== "all") count += 1;
    if (filterState.accountId !== null) count += 1;
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
    if (filterState.accountId) {
      list = list.filter(
        (tx) =>
          tx.accountId === filterState.accountId ||
          tx.transferAccountId === filterState.accountId,
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
          default:
            return true;
        }
      });
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (filterState.sortBy === "amount") {
        const valA = Math.abs(a.amountCents);
        const valB = Math.abs(b.amountCents);
        return filterState.sortOrder === "asc" ? valA - valB : valB - valA;
      } else {
        const timeA = new Date(a.occurredAt ?? 0).getTime();
        const timeB = new Date(b.occurredAt ?? 0).getTime();
        return filterState.sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
    });

    return list;
  }, [transactions, searchQuery, filterState]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: DateGroup[] = [];
    const map = new Map<string, DateGroup>();

    for (const tx of filteredTransactions) {
      const { key, label } = getDateGroupInfo(tx.occurredAt);
      if (!map.has(key)) {
        const group: DateGroup = { key, label, items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key)!.items.push(tx);
    }

    return groups;
  }, [filteredTransactions]);

  const handleOpenNewTransaction = () => {
    refreshAccounts();
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setIsFormModalOpen(true);
  };

  const handleRecordTransaction = async (
    input: Parameters<typeof recordTransaction>[0],
  ) => {
    const success = await recordTransaction(input);
    if (success) refreshAccounts();
    return success;
  };

  const handleRecordTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
  ) => {
    const success = await recordTransfer(input);
    if (success) refreshAccounts();
    return success;
  };

  const handleUpdateTransaction = async (
    id: Parameters<typeof editTransaction>[0],
    input: Parameters<typeof editTransaction>[1],
  ) => {
    const success = await editTransaction(id, input);
    if (success) refreshAccounts();
    return success;
  };

  const handleUpdateTransfer = async (
    input: Parameters<typeof editTransfer>[0],
  ) => {
    const success = await editTransfer(input);
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

  const handleExportCsv = () => {
    setUnintegratedFeature({
      title: "Export to CSV",
      description:
        "CSV export functionality is under integration and will be available in the next release.",
    });
    setFeatureModalVisible(true);
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

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Record new transaction"
          onPress={handleOpenNewTransaction}
        />
      }
    >
      <View style={styles.container}>
        {/* Search & Actions Header (Kaizen SearchScreen Design) */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search
              color={theme.colors.textMuted}
              size={18}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search transactions"
              onChangeText={setSearchQuery}
              placeholder="Search description, payee, notes..."
              placeholderTextColor={theme.colors.textMuted}
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
              accessibilityLabel="Sort by date"
              onPress={() =>
                setFilterState((prev) => ({ ...prev, sortBy: "date" }))
              }
              style={[styles.sortPill, filterState.sortBy === "date" && styles.sortPillActive]}
            >
              <Text style={[styles.sortPillText, filterState.sortBy === "date" && styles.sortPillTextActive]}>Date</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Sort by amount"
              onPress={() =>
                setFilterState((prev) => ({ ...prev, sortBy: "amount" }))
              }
              style={[styles.sortPill, filterState.sortBy === "amount" && styles.sortPillActive]}
            >
              <Text style={[styles.sortPillText, filterState.sortBy === "amount" && styles.sortPillTextActive]}>Amount</Text>
            </Pressable>

            {/* Sort Order Toggle */}
            <Pressable
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
          </View>
        </View>

        {/* Secondary transaction actions */}
        <View style={styles.secondaryActionsRow}>
          <Pressable
            accessibilityLabel="Open transaction trash"
            accessibilityRole="button"
            onPress={() => setIsTrashModalOpen(true)}
            style={styles.trashButton}
          >
            <Trash2 color={theme.colors.danger} size={17} />
            <Text style={styles.trashButtonText}>Trash</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Export CSV"
            onPress={handleExportCsv}
            style={styles.actionButton}
          >
            <Download color={theme.colors.success} size={18} />
          </Pressable>
        </View>

        {/* Transactions Feed Grouped By Date */}
        {groupedTransactions.length === 0 ? (
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
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.key} style={styles.dateGroupContainer}>
              {/* Date Group Header */}
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupTitle}>{group.label}</Text>
                <View style={styles.dateCountBadge}>
                  <Text style={styles.dateCountBadgeText}>
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "record" : "records"}
                  </Text>
                </View>
              </View>

              {group.items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  onDelete={handleDelete}
                  onPress={(item) => setInspectedTransaction(item)}
                  transaction={tx}
                />
              ))}
            </View>
          ))
        )}
      </View>

      {/* Transaction & Transfer Form Modal */}
      <TransactionFormModal
        accounts={accounts}
        pockets={pockets}
        categories={categories}
        error={error}
        isEditing={isEditingTransaction}
        initialTransaction={prefilledTransaction}
        onClose={() => {
          setIsFormModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
        }}
        onSaveTransaction={handleRecordTransaction}
        onSaveTransfer={handleRecordTransfer}
        onUpdateTransaction={handleUpdateTransaction}
        onUpdateTransfer={handleUpdateTransfer}
        pending={pendingAction}
        visible={isFormModalOpen}
      />

      {/* Transaction Details Inspector Modal */}
      <TransactionDetailModal
        onClose={() => setInspectedTransaction(null)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={handleEdit}
        transaction={inspectedTransaction}
        visible={!!inspectedTransaction}
      />

      {/* Filter Modal */}
      <TransactionFilterModal
        accounts={accounts}
        filters={filterState}
        onApply={(newFilters) => setFilterState(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
        visible={isFilterModalOpen}
      />

      {/* Feature Under Integration Modal */}
      <FeatureNotImplementedModal
        featureDescription={unintegratedFeature.description}
        featureTitle={unintegratedFeature.title}
        onClose={() => setFeatureModalVisible(false)}
        visible={featureModalVisible}
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
        onClose={() => setIsTrashModalOpen(false)}
        onRestore={(id) => {
          void restoreTx(id).then((restored) => {
            if (restored) refreshAccounts();
          });
        }}
        pending={pendingAction}
        transactions={deletedTransactions}
        visible={isTrashModalOpen}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: 80,
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
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
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
      paddingVertical: theme.spacing.sm,
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
    dateGroupContainer: {
      gap: theme.spacing.xs,
    },
    dateGroupHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
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
  });
}

