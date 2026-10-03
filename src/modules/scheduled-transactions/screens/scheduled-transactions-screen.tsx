import { useMemo, useState } from "react";
import { Checkbox, Host } from "@expo/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarClock,
  Pause,
  Play,
  RotateCcw,
  SquarePen,
  Trash2,
} from "lucide-react-native";

import {
  AppButton,
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageHeader,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";
import { ScheduledTransactionFormModal } from "../components/scheduled-transaction-form-modal";
import { useScheduledTransactions } from "../hooks/use-scheduled-transactions";
import type {
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import { formatScheduleRecurrence } from "../utils/recurrence";

export function ScheduledTransactionsScreen() {
  const router = useRouter();
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
  const [showArchived, setShowArchived] = useState(false);

  const visibleSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) => showArchived || schedule.archivedAt === null,
      ),
    [schedules, showArchived],
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

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Create scheduled transaction"
          icon={<CalendarClock color={theme.colors.onPrimary} size={24} />}
          onPress={openNew}
        />
      }
      header={
        <PageHeader
          breadcrumb="Transactions"
          secondaryActions={[
            {
              label: "Transaction History",
              onPress: () => router.navigate("/transactions" as never),
            },
          ]}
          subtitle="Plan one-time or recurring income, expenses, and transfers."
          title="Scheduled Transactions"
        />
      }
    >
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {actionableOccurrences.length > 0 ? (
          <View style={styles.dueSection}>
            <Text style={styles.sectionHeading}>Needs attention</Text>
            {actionableOccurrences.map((occurrence) => {
              const schedule = scheduleById.get(occurrence.scheduleId);
              return (
                <View key={occurrence.id} style={styles.dueCard}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle}>
                      {schedule?.name?.trim() ||
                        schedule?.transactionType ||
                        "Scheduled transaction"}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Due{" "}
                      {(occurrence.effectiveDueAt ??
                        occurrence.nominalDueAt
                      ).toLocaleString()}
                    </Text>
                    {occurrence.errorMessage ? (
                      <Text style={styles.failureText}>
                        {occurrence.errorMessage}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.dueActions}>
                    <AppButton
                      label="Skip"
                      onPress={() => skipOccurrence(occurrence.id)}
                      size="small"
                      variant="ghost"
                    />
                    <AppButton
                      label={occurrence.status === "failed" ? "Retry" : "Post"}
                      onPress={() => handlePost(occurrence)}
                      size="small"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.scheduleHeadingRow}>
          <Text style={styles.sectionHeading}>Schedules</Text>
          <Host matchContents style={styles.archiveCheckbox}>
            <Checkbox
              disabled={pending}
              label="Show archived"
              onValueChange={setShowArchived}
              value={showArchived}
            />
          </Host>
        </View>
        {loading ? (
          <PageLoadingState message="Loading schedules..." />
        ) : visibleSchedules.length === 0 ? (
          <PageEmptyState
            description={
              schedules.some((schedule) => schedule.archivedAt !== null)
                ? "Only archived schedules are available. Turn on Show archived to view and restore them."
                : "Create recurring income, expenses, or transfers and decide whether each occurrence posts automatically. Use the + button to add your first schedule."
            }
            icon={<CalendarClock color={theme.colors.primary} size={34} />}
            title="No scheduled transactions"
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
                ? -schedule.amountCents
                : schedule.amountCents;

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
      justifyContent: "space-between",
    },
    archiveCheckbox: {
      minHeight: 36,
    },
    dueSection: {
      gap: theme.spacing.sm,
    },
    dueCard: {
      alignItems: "center",
      backgroundColor: theme.colors.primary + "0D",
      borderColor: theme.colors.primary + "45",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    dueActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
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
