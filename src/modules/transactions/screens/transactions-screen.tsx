import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
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
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import {
  FeatureNotImplementedModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageHeader,
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
    loading,
    pendingAction,
    error,
    recordTransaction,
    recordTransfer,
    deleteTx,
  } = useTransactions();

  const { accounts } = useAccounts();
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
    setPrefilledTransaction(null);
    setIsFormModalOpen(true);
  };

  const handleDuplicate = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsFormModalOpen(true);
  };

  const handleEdit = (_tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setUnintegratedFeature({
      title: "Edit Transaction",
      description:
        "Direct transaction editing is under integration. For now, you can duplicate or delete this record and log the adjustment.",
    });
    setFeatureModalVisible(true);
  };

  const handleDelete = (id: string) => {
    const executeDelete = async () => {
      setInspectedTransaction(null);
      await deleteTx(id);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this transaction record?")) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction record?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ],
      );
    }
  };

  const handleExportCsv = () => {
    setUnintegratedFeature({
      title: "Export to CSV",
      description:
        "CSV export functionality is under integration and will be available in the next release.",
    });
    setFeatureModalVisible(true);
  };

  const toggleSortBy = () => {
    setFilterState((prev) => ({
      ...prev,
      sortBy: prev.sortBy === "date" ? "amount" : "date",
    }));
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
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Transactions"
          primaryAction={{
            label: "+ Record Transaction",
            onPress: handleOpenNewTransaction,
          }}
          subtitle="Detailed ledger of your income, expenses, and account transfers."
          title="Transactions"
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
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Export CSV Trigger Button */}
          <Pressable
            accessibilityLabel="Export CSV"
            onPress={handleExportCsv}
            style={styles.actionButton}
          >
            <Download color={theme.colors.textSecondary} size={18} />
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
            {/* Sort Field Pill Toggle */}
            <Pressable
              accessibilityLabel={`Sort by ${filterState.sortBy}`}
              onPress={toggleSortBy}
              style={styles.sortPill}
            >
              <Text style={styles.sortPillText}>
                {filterState.sortBy === "date" ? "Date" : "Amount"}
              </Text>
            </Pressable>

            {/* Sort Order Toggle */}
            <Pressable
              accessibilityLabel={`Sort order ${filterState.sortOrder}`}
              onPress={toggleSortOrder}
              style={styles.sortOrderButton}
            >
              {filterState.sortOrder === "asc" ? (
                <ArrowUp color={theme.colors.textSecondary} size={16} />
              ) : (
                <ArrowDown color={theme.colors.textSecondary} size={16} />
              )}
            </Pressable>
          </View>
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

              {/* Transactions List inside Date Group Card */}
              <View style={styles.groupCard}>
                {group.items.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    onDelete={handleDelete}
                    onPress={(item) => setInspectedTransaction(item)}
                    transaction={tx}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Floating Action Button for quick recording */}
      <FloatingActionButton
        accessibilityLabel="Record new transaction"
        onPress={handleOpenNewTransaction}
      />

      {/* Transaction & Transfer Form Modal */}
      <TransactionFormModal
        accounts={accounts}
        categories={categories}
        error={error}
        initialTransaction={prefilledTransaction}
        onClose={() => {
          setIsFormModalOpen(false);
          setPrefilledTransaction(null);
        }}
        onSaveTransaction={recordTransaction}
        onSaveTransfer={recordTransfer}
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
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
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
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dateCountBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    dateCountBadgeText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      ...theme.shadows.card,
    },
  });
}

