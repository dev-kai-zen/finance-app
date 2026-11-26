import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight } from "lucide-react-native";
import { AppButton, PageEmptyState } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  TransactionRow,
  type TransactionListItem,
} from "@/modules/transactions";
import {
  formatFriendlyDate,
  getDateKeyFromDate,
} from "../utils/calendar-dates";

export interface CalendarTransactionsTabProps {
  transactions: TransactionListItem[];
  selectedDay: string | null;
  onPressTransaction: (tx: TransactionListItem) => void;
  onDeleteTransaction?: (id: string) => void;
  visibleCount?: number;
  totalCount?: number;
  onLoadMore?: () => void;
}

interface DateGroup {
  dateKey: string;
  label: string;
  items: TransactionListItem[];
}

export const CalendarTransactionsTab = React.memo(function CalendarTransactionsTab({
  transactions,
  selectedDay,
  onPressTransaction,
  onDeleteTransaction,
  visibleCount = 50,
  totalCount,
  onLoadMore,
}: CalendarTransactionsTabProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const effectiveTotal = totalCount ?? transactions.length;
  const displayedTransactions = useMemo(() => {
    if (visibleCount >= transactions.length) {
      return transactions;
    }
    return transactions.slice(0, visibleCount);
  }, [transactions, visibleCount]);

  const grouped = useMemo<DateGroup[]>(() => {
    const map = new Map<string, TransactionListItem[]>();

    for (const tx of displayedTransactions) {
      if (!tx.occurredAt) continue;
      const key = getDateKeyFromDate(tx.occurredAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }

    // Sort descending by date
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return keys.map((key) => ({
      dateKey: key,
      label: formatFriendlyDate(key),
      items: map.get(key)!,
    }));
  }, [displayedTransactions]);

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <PageEmptyState
          description={
            selectedDay
              ? `No transactions recorded on ${formatFriendlyDate(selectedDay)}.`
              : "No transactions recorded for this month."
          }
          icon={<ArrowLeftRight color={theme.colors.primary} size={32} />}
          title="No Transactions Found"
        />
      </View>
    );
  }

  const hasMore = displayedTransactions.length < effectiveTotal;

  // If a single day is selected, show list directly
  if (selectedDay) {
    return (
      <View style={styles.listContainer}>
        {displayedTransactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            onDelete={onDeleteTransaction}
            onPress={onPressTransaction}
            transaction={tx}
          />
        ))}
        {hasMore && (
          <View style={styles.loadMoreContainer}>
            <Text style={styles.loadMoreText}>
              Showing {displayedTransactions.length} of {effectiveTotal} records
            </Text>
            {onLoadMore && (
              <AppButton
                label="Load next 50"
                onPress={onLoadMore}
                size="small"
                variant="secondary"
              />
            )}
          </View>
        )}
      </View>
    );
  }

  // Whole month view: grouped by date
  return (
    <View style={styles.listContainer}>
      {grouped.map((group) => (
        <View key={group.dateKey} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {group.items.length}{" "}
                {group.items.length === 1 ? "record" : "records"}
              </Text>
            </View>
          </View>

          <View style={styles.groupItems}>
            {group.items.map((tx) => (
              <TransactionRow
                key={tx.id}
                onDelete={onDeleteTransaction}
                onPress={onPressTransaction}
                transaction={tx}
              />
            ))}
          </View>
        </View>
      ))}

      {hasMore && (
        <View style={styles.loadMoreContainer}>
          <Text style={styles.loadMoreText}>
            Showing {displayedTransactions.length} of {effectiveTotal} records
          </Text>
          {onLoadMore && (
            <AppButton
              label="Load next 50"
              onPress={onLoadMore}
              size="small"
              variant="secondary"
            />
          )}
        </View>
      )}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    listContainer: {
      gap: theme.spacing.sm,
    },
    emptyContainer: {
      paddingVertical: theme.spacing.md,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 2,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    badge: {
      backgroundColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    groupItems: {
      gap: 2,
    },
    loadMoreContainer: {
      alignItems: "center",
      gap: theme.spacing.xs,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    loadMoreText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
  });
}
