import { useMemo, useState } from "react";
import { Checkbox, Host } from "@expo/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CalendarClock,
  Pause,
  Play,
  RotateCcw,
  SquarePen,
  Trash2,
} from "lucide-react-native";

import {
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";
import { ScheduledOccurrenceCard } from "../components/scheduled-occurrence-card";
import { ScheduledTransactionFormModal } from "../components/scheduled-transaction-form-modal";
import { useScheduledTransactions } from "../hooks/use-scheduled-transactions";
import type {
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import { formatScheduleRecurrence } from "../utils/recurrence";
import {
  DEFAULT_SCHEDULE_LIST_FILTERS,
  filterSchedulesByStatus,
  type ScheduleListFilter,
} from "../utils/schedule-list-filter";

const SCHEDULE_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: ScheduleListFilter;
}> = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function ScheduledTransactionsScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories } = useCategories();
  const {
    schedules,
    occurrences,
    loading,
    pending,
    error,
    save,
    setPaused,
    end,
    remove,
    permanentlyDelete,
    restore,
    postOccurrence,
    skipOccurrence,
    scheduleIdsWithPostings,
  } = useScheduledTransactions();
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduledTransaction | null>(null);
  const [pendingEnd, setPendingEnd] =
    useState<ScheduledTransaction | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<ScheduledTransaction | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] =
    useState<ScheduledTransaction | null>(null);
  const [pendingRestore, setPendingRestore] =
    useState<ScheduledTransaction | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<
    ReadonlySet<ScheduleListFilter>
  >(() => new Set(DEFAULT_SCHEDULE_LIST_FILTERS));

  const visibleSchedules = useMemo(
    () => filterSchedulesByStatus(schedules, selectedFilters),
    [schedules, selectedFilters],
  );

  const scheduleById = useMemo(
    () =>
      new Map(
        schedules
          .filter((schedule) => schedule.archivedAt === null)
          .map((schedule) => [schedule.id, schedule]),
      ),
    [schedules],
  );
  const actionableOccurrences = occurrences.filter(
    (occurrence) =>
      scheduleById.has(occurrence.scheduleId) &&
      (occurrence.status === "due" || occurrence.status === "failed"),
  );
  const pendingDeleteHasHistory = Boolean(
    pendingDelete && scheduleIdsWithPostings.has(pendingDelete.id),
  );

  const openNew = () => {
    setEditingSchedule(null);
    setFormVisible(true);
  };

  const openEdit = (schedule: ScheduledTransaction) => {
    setEditingSchedule(schedule);
    setFormVisible(true);
  };

  const handlePost = (occurrence: ScheduleOccurrence) => {
    if (postOccurrence(occurrence.id)) refreshAccounts();
  };

  const setFilterSelected = (
    filter: ScheduleListFilter,
    selected: boolean,
  ) => {
    setSelectedFilters((current) => {
      const next = new Set(current);
      if (selected) next.add(filter);
      else next.delete(filter);
      return next;
    });
  };

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Create scheduled transaction"
          icon={<CalendarClock color={theme.colors.onPrimary} size={24} />}
          onPress={openNew}
        />
      }
    >
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {selectedFilters.has("active") && actionableOccurrences.length > 0 ? (
          <View style={styles.dueSection}>
            <Text style={styles.sectionHeading}>Needs attention</Text>
            {actionableOccurrences.map((occurrence) => {
              const schedule = scheduleById.get(occurrence.scheduleId);
              if (!schedule) return null;
              const source = accounts.find(
                (account) => account.id === schedule.accountId,
              );
              const destination = accounts.find(
                (account) => account.id === schedule.toAccountId,
              );
              const category = categories.find(
                (item) => item.id === schedule.categoryId,
              );

              return (
                <ScheduledOccurrenceCard
                  key={occurrence.id}
                  category={category}
                  destinationAccount={destination}
                  occurrence={occurrence}
                  onEdit={openEdit}
                  onPost={handlePost}
                  onSkip={skipOccurrence}
                  pending={pending}
                  schedule={schedule}
                  sourceAccount={source}
                />
              );
            })}
          </View>
        ) : null}

        <View style={styles.scheduleHeadingRow}>
          <Text style={styles.sectionHeading}>Schedules</Text>
          <View
            accessibilityLabel="Schedule status filters"
            style={styles.filterOptions}
          >
            {SCHEDULE_FILTER_OPTIONS.map((option) => (
              <Host key={option.value} matchContents style={styles.filterCheckbox}>
                <Checkbox
                  disabled={pending}
                  label={option.label}
                  onValueChange={(selected) =>
                    setFilterSelected(option.value, selected)
                  }
                  value={selectedFilters.has(option.value)}
                />
              </Host>
            ))}
          </View>
        </View>
        {loading ? (
          <PageLoadingState message="Loading schedules..." />
        ) : visibleSchedules.length === 0 ? (
          <PageEmptyState
            description={
              schedules.length > 0
                ? "No schedules match the selected status filters. Select another status to view them."
                : "Create recurring income, expenses, or transfers and decide whether each occurrence posts automatically. Use the + button to add your first schedule."
            }
            icon={<CalendarClock color={theme.colors.primary} size={34} />}
            title={
              schedules.length > 0
                ? "No matching schedules"
                : "No scheduled transactions"
            }
          />
        ) : (
          visibleSchedules.map((schedule) => {
            const source = accounts.find(
              (account) => account.id === schedule.accountId,
            );
            const destination = accounts.find(
              (account) => account.id === schedule.toAccountId,
            );
            const category = categories.find(
              (item) => item.id === schedule.categoryId,
            );
            const signedAmount =
              schedule.transactionType === "expense"
                ? -schedule.amountMinorUnits
                : schedule.amountMinorUnits;

            return (
              <View
                key={schedule.id}
                style={[
                  styles.scheduleCard,
                  schedule.archivedAt && styles.archivedScheduleCard,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {schedule.name?.trim() ||
                          category?.name ||
                          (schedule.transactionType === "transfer"
                            ? "Scheduled transfer"
                            : "Scheduled " + schedule.transactionType)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          schedule.archivedAt
                            ? styles.statusArchived
                            : schedule.status === "active"
                            ? styles.statusActive
                            : schedule.status === "paused"
                              ? styles.statusPaused
                              : styles.statusCompleted,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {schedule.archivedAt ? "archived" : schedule.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {schedule.transactionType === "transfer"
                        ? (source?.name ?? "Unknown") +
                          " → " +
                          (destination?.name ?? "Unknown")
                        : (source?.name ?? "Unknown") +
                          " · " +
                          (category?.name ?? "No category")}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatScheduleRecurrence(schedule)} ·{" "}
                      {schedule.autoPost ? "Auto-post" : "Confirm each"}
                    </Text>
                    <Text style={styles.nextText}>
                      {schedule.nextEffectiveAt
                        ? "Next: " +
                          schedule.nextEffectiveAt.toLocaleString()
                        : "No future occurrences"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.amountText,
                      schedule.transactionType === "expense"
                        ? styles.amountExpense
                        : schedule.transactionType === "income"
                          ? styles.amountIncome
                          : styles.amountTransfer,
                    ]}
                  >
                    {formatCurrency(
                      signedAmount,
                      source?.currencyCode ?? "PHP",
                      schedule.transactionType === "income",
                    )}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  {schedule.archivedAt ? (
                    <>
                      <Pressable
                        accessibilityLabel="Restore schedule"
                        onPress={() => setPendingRestore(schedule)}
                        style={styles.iconAction}
                      >
                        <RotateCcw color={theme.colors.success} size={17} />
                        <Text style={styles.restoreActionText}>Restore</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Permanently delete schedule"
                        onPress={() => setPendingPermanentDelete(schedule)}
                        style={styles.deleteAction}
                      >
                        <Trash2 color={theme.colors.danger} size={17} />
                        <Text style={styles.endActionText}>Delete</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityLabel="Edit schedule"
                        onPress={() => openEdit(schedule)}
                        style={styles.iconAction}
                      >
                        <SquarePen
                          color={theme.colors.textSecondary}
                          size={17}
                        />
                        <Text style={styles.actionText}>Edit</Text>
                      </Pressable>
                      {schedule.status !== "completed" ? (
                        <Pressable
                          accessibilityLabel={
                            schedule.status === "paused"
                              ? "Resume schedule"
                              : "Pause schedule"
                          }
                          onPress={() =>
                            setPaused(
                              schedule.id,
                              schedule.status !== "paused",
                            )
                          }
                          style={styles.iconAction}
                        >
                          {schedule.status === "paused" ? (
                            <Play color={theme.colors.success} size={17} />
                          ) : (
                            <Pause
                              color={theme.colors.textSecondary}
                              size={17}
                            />
                          )}
                          <Text style={styles.actionText}>
                            {schedule.status === "paused" ? "Resume" : "Pause"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {schedule.status !== "completed" ? (
                        <Pressable
                          accessibilityLabel="End schedule"
                          onPress={() => setPendingEnd(schedule)}
                          style={styles.iconAction}
                        >
                          <Text style={styles.endActionText}>End</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel="Delete schedule"
                        onPress={() => setPendingDelete(schedule)}
                        style={styles.deleteAction}
                      >
                        <Trash2 color={theme.colors.danger} size={17} />
                        <Text style={styles.endActionText}>Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <ScheduledTransactionFormModal
        accounts={accounts}
        categories={categories}
        error={error}
        initialSchedule={editingSchedule}
        onClose={() => {
          setFormVisible(false);
          setEditingSchedule(null);
        }}
        onSave={save}
        pending={pending}
        pockets={pockets}
        visible={formVisible}
      />

      <ConfirmModal
        cancelLabel="Keep Archived"
        confirmLabel="Restore Schedule"
        message="This schedule will return to the schedules list. Its completed status and transaction history will remain unchanged."
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (pendingRestore && restore(pendingRestore.id)) {
            setPendingRestore(null);
          }
        }}
        pending={pending}
        title="Restore scheduled transaction?"
        variant="restore"
        visible={pendingRestore !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Active"
        confirmLabel="End Schedule"
        message="Future occurrences will stop. Transactions already posted by this schedule will remain unchanged."
        onCancel={() => setPendingEnd(null)}
        onConfirm={() => {
          if (pendingEnd && end(pendingEnd.id)) setPendingEnd(null);
        }}
        pending={pending}
        title="End scheduled transaction?"
        variant="destructive"
        visible={pendingEnd !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Schedule"
        confirmLabel={
          pendingDeleteHasHistory ? "Archive Schedule" : "Delete Permanently"
        }
        message={
          pendingDeleteHasHistory
            ? "This schedule has posted transactions in your accounts. It will be archived and removed from your active schedule list. Posted transactions stay in place."
            : "This schedule has no posted transactions and will be permanently deleted."
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete && remove(pendingDelete.id)) {
            setPendingDelete(null);
          }
        }}
        pending={pending}
        title={
          pendingDeleteHasHistory
            ? "Archive scheduled transaction?"
            : "Delete scheduled transaction?"
        }
        variant="destructive"
        visible={pendingDelete !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Archived"
        confirmLabel="Delete Permanently"
        message="This schedule and its run history will be permanently deleted. Any transactions already posted to your accounts will remain safe and unchanged."
        onCancel={() => setPendingPermanentDelete(null)}
        onConfirm={() => {
          if (
            pendingPermanentDelete &&
            permanentlyDelete(pendingPermanentDelete.id)
          ) {
            setPendingPermanentDelete(null);
          }
        }}
        pending={pending}
        title="Permanently delete schedule?"
        variant="destructive"
        visible={pendingPermanentDelete !== null}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      paddingBottom: 80,
    },
    errorBanner: {
      backgroundColor: theme.colors.danger + "18",
      borderColor: theme.colors.danger + "55",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    sectionHeading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.4,
      marginTop: theme.spacing.xs,
      textTransform: "uppercase",
    },
    scheduleHeadingRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    filterOptions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterCheckbox: {
      minHeight: 36,
    },
    dueSection: {
      gap: theme.spacing.sm,
    },
    scheduleCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    archivedScheduleCard: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    cardMain: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "capitalize",
    },
    cardMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
      marginTop: 2,
    },
    nextText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: theme.spacing.xs,
    },
    failureText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.xs,
    },
    amountText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountExpense: {
      color: theme.colors.danger,
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountTransfer: {
      color: theme.colors.primary,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    statusActive: {
      backgroundColor: theme.colors.success + "20",
    },
    statusPaused: {
      backgroundColor: theme.colors.warning + "20",
    },
    statusCompleted: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    statusArchived: {
      backgroundColor: theme.colors.warning + "20",
    },
    statusText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    cardActions: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    iconAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    actionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    restoreActionText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    deleteAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginLeft: "auto",
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    endActionText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
