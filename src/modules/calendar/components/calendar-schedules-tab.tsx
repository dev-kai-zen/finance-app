import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, CalendarClock, FastForward, Clock } from "lucide-react-native";
import { PageEmptyState } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Account } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type { CalendarScheduleOccurrence } from "@/modules/scheduled-transactions";
import { formatCurrency } from "@/utils/currency";
import {
  formatFriendlyDate,
  getDateKeyFromDate,
} from "../utils/calendar-dates";

export interface CalendarSchedulesTabProps {
  schedules: CalendarScheduleOccurrence[];
  selectedDay: string | null;
  accounts: Account[];
  categories: Category[];
  onPostOccurrence: (id: string) => void;
  onSkipOccurrence: (id: string) => void;
  onNavigateToSchedules?: () => void;
}

interface ScheduleDateGroup {
  dateKey: string;
  label: string;
  items: CalendarScheduleOccurrence[];
}

export function CalendarSchedulesTab({
  schedules,
  selectedDay,
  accounts,
  categories,
  onPostOccurrence,
  onSkipOccurrence,
  onNavigateToSchedules,
}: CalendarSchedulesTabProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const grouped = useMemo<ScheduleDateGroup[]>(() => {
    const map = new Map<string, CalendarScheduleOccurrence[]>();

    for (const item of schedules) {
      const key = getDateKeyFromDate(item.effectiveDueAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    // Sort ascending by date
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    return keys.map((key) => ({
      dateKey: key,
      label: formatFriendlyDate(key),
      items: map.get(key)!,
    }));
  }, [schedules]);

  if (schedules.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <PageEmptyState
          actionLabel={onNavigateToSchedules ? "Manage Recurring Schedules" : undefined}
          description={
            selectedDay
              ? `No recurring schedules or bills due on ${formatFriendlyDate(selectedDay)}.`
              : "No recurring transactions scheduled for this month."
          }
          icon={<CalendarClock color={theme.colors.primary} size={32} />}
          onAction={onNavigateToSchedules}
          title="No Schedules Found"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {grouped.map((group) => (
        <View key={group.dateKey} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.dateLabelRow}>
              <Clock color={theme.colors.primary} size={14} />
              <Text style={styles.groupTitle}>{group.label}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {group.items.length}{" "}
                {group.items.length === 1 ? "occurrence" : "occurrences"}
              </Text>
            </View>
          </View>

          <View style={styles.itemsList}>
            {group.items.map((item) => {
              const account = accountMap.get(item.accountId);
              const toAccount = item.toAccountId
                ? accountMap.get(item.toAccountId)
                : null;
              const category = item.categoryId
                ? categoryMap.get(item.categoryId)
                : null;

              const isExpense = item.transactionType === "expense";
              const isIncome = item.transactionType === "income";

              const signedAmount = isExpense
                ? -item.amountMinorUnits
                : item.amountMinorUnits;

              const amountColor = isIncome
                ? theme.colors.success
                : isExpense
                  ? theme.colors.danger
                  : theme.colors.textPrimary;

              return (
                <View key={item.id} style={styles.scheduleRow}>
                  <View style={styles.rowMain}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.scheduleName}>
                        {item.scheduleName}
                      </Text>
                      {renderStatusBadge(item.status, theme, styles)}
                    </View>

                    <View style={styles.metaRow}>
                      {category && (
                        <Text style={styles.metaText}>{category.name}</Text>
                      )}
                      {category && account && (
                        <Text style={styles.metaDot}>•</Text>
                      )}
                      {account && (
                        <Text style={styles.metaText}>{account.name}</Text>
                      )}
                      {toAccount && (
                        <Text style={styles.metaText}>
                          {" → " + toAccount.name}
                        </Text>
                      )}
                      {item.autoPost && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.autoPostText}>Auto-posts</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={[styles.amountText, { color: amountColor }]}>
                      {formatCurrency(
                        signedAmount,
                        account?.currencyCode ?? "PHP",
                        false,
                      )}
                    </Text>

                    {/* Action buttons if due and actionable */}
                    {item.status === "due" && !item.isProjected && (
                      <View style={styles.actionsRow}>
                        <Pressable
                          accessibilityLabel="Post occurrence now"
                          accessibilityRole="button"
                          onPress={() => onPostOccurrence(item.id)}
                          style={({ pressed }) => [
                            styles.postButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Check color="#ffffff" size={12} />
                          <Text style={styles.postButtonText}>Post</Text>
                        </Pressable>

                        <Pressable
                          accessibilityLabel="Skip occurrence"
                          accessibilityRole="button"
                          onPress={() => onSkipOccurrence(item.id)}
                          style={({ pressed }) => [
                            styles.skipButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <FastForward
                            color={theme.colors.textSecondary}
                            size={12}
                          />
                          <Text style={styles.skipButtonText}>Skip</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function renderStatusBadge(
  status: CalendarScheduleOccurrence["status"],
  theme: AppTheme,
  styles: ReturnType<typeof createStyles>,
) {
  let badgeStyle = styles.badgeUpcoming;
  let textStyle = styles.badgeTextUpcoming;
  let label = "Upcoming";

  if (status === "due") {
    badgeStyle = styles.badgeDue;
    textStyle = styles.badgeTextDue;
    label = "Due Now";
  } else if (status === "posted") {
    badgeStyle = styles.badgePosted;
    textStyle = styles.badgeTextPosted;
    label = "Posted";
  } else if (status === "skipped") {
    badgeStyle = styles.badgeSkipped;
    textStyle = styles.badgeTextSkipped;
    label = "Skipped";
  }

  return (
    <View style={[styles.statusBadge, badgeStyle]}>
      <Text style={[styles.statusBadgeText, textStyle]}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
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
      marginBottom: 4,
    },
    dateLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
    itemsList: {
      gap: theme.spacing.xs,
    },
    scheduleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.background,
    },
    rowMain: {
      flex: 1,
      gap: 2,
      marginRight: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    scheduleName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    metaDot: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    autoPostText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    rowRight: {
      alignItems: "flex-end",
      gap: 4,
    },
    amountText: {
      fontSize: 14,
      fontWeight: "700",
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    postButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: theme.colors.success,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    postButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#ffffff",
    },
    skipButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    skipButtonText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    badgeUpcoming: {
      backgroundColor: theme.colors.primary + "18",
    },
    badgeTextUpcoming: {
      color: theme.colors.primary,
    },
    badgeDue: {
      backgroundColor: (theme.colors.warning ?? "#f59e0b") + "20",
    },
    badgeTextDue: {
      color: theme.colors.warning ?? "#f59e0b",
    },
    badgePosted: {
      backgroundColor: theme.colors.success + "18",
    },
    badgeTextPosted: {
      color: theme.colors.success,
    },
    badgeSkipped: {
      backgroundColor: theme.colors.border,
    },
    badgeTextSkipped: {
      color: theme.colors.textMuted,
    },
  });
}
