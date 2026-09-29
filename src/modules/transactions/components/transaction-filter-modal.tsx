import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts";
import type { TransactionType } from "../types/transaction.types";

export type DatePreset = "all" | "this_month" | "last_month" | "this_year";

export interface TransactionFilterState {
  type: TransactionType | "all";
  datePreset: DatePreset;
  accountIds: string[];
  sortBy: "date" | "amount";
  sortOrder: "asc" | "desc";
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilterState = {
  type: "all",
  datePreset: "all",
  accountIds: [],
  sortBy: "date",
  sortOrder: "desc",
};

export interface TransactionFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilterState;
  onApply: (filters: TransactionFilterState) => void;
  accounts: AccountListItem[];
}

const TYPE_OPTIONS: { key: TransactionType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expense", label: "Expense" },
  { key: "income", label: "Income" },
  { key: "transfer", label: "Transfer" },
];

const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
];

export function TransactionFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  accounts,
}: TransactionFilterModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [localFilters, setLocalFilters] = useState<TransactionFilterState>(filters);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  // Sync with prop when opened
  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      setAccountDropdownOpen(false);
    }
  }, [visible, filters]);

  const handleReset = () => {
    setLocalFilters(DEFAULT_TRANSACTION_FILTERS);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const hasActiveFilters =
    localFilters.type !== "all" ||
    localFilters.datePreset !== "all" ||
    localFilters.accountIds.length > 0;

  const selectedAccountNames = accounts
    .filter((account) => localFilters.accountIds.includes(account.id))
    .map((account) => account.name);
  const accountSelectionLabel =
    selectedAccountNames.length === 0
      ? "All accounts"
      : selectedAccountNames.length <= 2
        ? selectedAccountNames.join(", ")
        : `${selectedAccountNames.length} accounts selected`;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss filters modal"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              {hasActiveFilters && (
                <Text style={styles.filterSubtitle}>Active filters applied</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {hasActiveFilters && (
                <Pressable
                  accessibilityLabel="Reset all filters"
                  accessibilityRole="button"
                  onPress={handleReset}
                  style={styles.resetBtn}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityLabel="Close filter modal"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
            {/* Transaction Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>TRANSACTION TYPE</Text>
              <View style={styles.pillGrid}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = localFilters.type === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityLabel={`Type ${opt.label}`}
                      accessibilityRole="button"
                      onPress={() =>
                        setLocalFilters((prev) => ({ ...prev, type: opt.key }))
                      }
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text
                        style={[styles.pillText, active && styles.pillTextActive]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>DATE RANGE</Text>
              <View style={styles.pillGrid}>
                {DATE_OPTIONS.map((opt) => {
                  const active = localFilters.datePreset === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityLabel={`Date ${opt.label}`}
                      accessibilityRole="button"
                      onPress={() =>
                        setLocalFilters((prev) => ({ ...prev, datePreset: opt.key }))
                      }
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text
                        style={[styles.pillText, active && styles.pillTextActive]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Account Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>ACCOUNT</Text>
              <Pressable
                accessibilityLabel={`Account filter: ${accountSelectionLabel}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: accountDropdownOpen }}
                onPress={() => setAccountDropdownOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.accountDropdownTrigger,
                  pressed && styles.accountDropdownPressed,
                ]}
              >
                <Text numberOfLines={1} style={styles.accountDropdownText}>
                  {accountSelectionLabel}
                </Text>
                {accountDropdownOpen ? (
                  <ChevronUp color={theme.colors.textSecondary} size={18} />
                ) : (
                  <ChevronDown color={theme.colors.textSecondary} size={18} />
                )}
              </Pressable>

              {accountDropdownOpen ? (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={accounts.length > 5}
                  style={styles.accountOptionsList}
                >
                <Pressable
                  accessibilityLabel="All Accounts"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: localFilters.accountIds.length === 0 }}
                  onPress={() =>
                    setLocalFilters((prev) => ({ ...prev, accountIds: [] }))
                  }
                  style={[
                    styles.accountOption,
                    localFilters.accountIds.length === 0 && styles.accountOptionActive,
                  ]}
                >
                  <Text style={styles.accountOptionText}>
                    All Accounts
                  </Text>
                  {localFilters.accountIds.length === 0 ? (
                    <Check color={theme.colors.primary} size={17} strokeWidth={2.5} />
                  ) : null}
                </Pressable>

                {accounts.map((acc) => {
                  const active = localFilters.accountIds.includes(acc.id);
                  return (
                    <Pressable
                      key={acc.id}
                      accessibilityLabel={`Filter account ${acc.name}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      onPress={() =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          accountIds: active
                            ? prev.accountIds.filter((id) => id !== acc.id)
                            : [...prev.accountIds, acc.id],
                        }))
                      }
                      style={[styles.accountOption, active && styles.accountOptionActive]}
                    >
                      <Text
                        numberOfLines={1}
                        style={styles.accountOptionText}
                      >
                        {acc.name}
                      </Text>
                      {active ? (
                        <Check color={theme.colors.primary} size={17} strokeWidth={2.5} />
                      ) : null}
                    </Pressable>
                  );
                })}
                </ScrollView>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Apply Filters"
              accessibilityRole="button"
              onPress={handleApply}
              style={styles.applyBtn}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "85%",
      paddingHorizontal: 20,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 480,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    filterSubtitle: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    resetBtn: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}35`,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    resetBtnText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: "700",
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: "bold",
    },
    scrollBody: {
      marginBottom: 16,
    },
    filterGroup: {
      marginBottom: 18,
    },
    groupTitle: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    pillGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    pillActive: {
      backgroundColor: `${theme.colors.primary}20`,
      borderColor: theme.colors.primary,
    },
    pillText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    pillTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    accountDropdownTrigger: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    accountDropdownPressed: {
      opacity: 0.72,
    },
    accountDropdownText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
    },
    accountOptionsList: {
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: theme.spacing.xs,
      maxHeight: 220,
    },
    accountOption: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 42,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    accountOptionActive: {
      backgroundColor: `${theme.colors.primary}20`,
    },
    accountOptionText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      paddingRight: theme.spacing.sm,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 8,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      height: 46,
      justifyContent: "center",
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    applyBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      flex: 2,
      height: 46,
      justifyContent: "center",
    },
    applyBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
