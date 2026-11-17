import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Plus, Repeat, Search, X } from "lucide-react-native";

import {
  AppToast,
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { MarkPaidModal } from "../components/mark-paid-modal";
import { SubscriptionBurnRateSummaryCard } from "../components/subscription-burn-rate-summary";
import { SubscriptionCard } from "../components/subscription-card";
import { SubscriptionFilterTabs } from "../components/subscription-filter-tabs";
import { SubscriptionFormModal } from "../components/subscription-form-modal";
import { useSubscriptions } from "../hooks/use-subscriptions";
import { saveSubscription } from "../services/save-subscription.service";
import type {
  SaveSubscriptionInput,
  SubscriptionFilter,
  SubscriptionItem,
} from "../types/subscription.types";

export function SubscriptionsScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const {
    subscriptions,
    filteredSubscriptions,
    summary,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    loading,
    refresh,
    markPaid,
    changeStatus,
    archive,
    restore,
    remove,
    checkHasPayments,
  } = useSubscriptions();

  // Modal states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<SubscriptionItem | null>(null);
  const [markingPaidSub, setMarkingPaidSub] =
    useState<SubscriptionItem | null>(null);
  const [subToDelete, setSubToDelete] = useState<SubscriptionItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterCounts = useMemo<Partial<Record<SubscriptionFilter, number>>>(() => {
    return {
      all: subscriptions.filter((s) => !s.archivedAt).length,
      active: subscriptions.filter((s) => !s.archivedAt && s.status === "active").length,
      trial: subscriptions.filter((s) => !s.archivedAt && s.status === "trial").length,
      paused: subscriptions.filter((s) => !s.archivedAt && s.status === "paused").length,
      cancelled: subscriptions.filter((s) => !s.archivedAt && s.status === "cancelled").length,
      archived: subscriptions.filter((s) => Boolean(s.archivedAt)).length,
    };
  }, [subscriptions]);

  const handleOpenCreate = useCallback(() => {
    setEditingSubscription(null);
    setFormModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((sub: SubscriptionItem) => {
    setEditingSubscription(sub);
    setFormModalVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingSubscription(null);
  }, []);

  const handleSaveSubscription = useCallback(
    (input: SaveSubscriptionInput, id?: string) => {
      try {
        saveSubscription(input, id);
        refresh();
        setFormModalVisible(false);
        setEditingSubscription(null);
        setToastMessage(
          id
            ? t("subscriptions.updatedToast", { defaultValue: "Subscription updated" })
            : t("subscriptions.createdToast", { defaultValue: "Subscription added" }),
        );
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to save subscription");
      }
    },
    [refresh, t],
  );

  const handleRequestDelete = useCallback((sub: SubscriptionItem) => {
    setSubToDelete(sub);
  }, []);

  const handleFormDelete = useCallback(
    (id: string) => {
      const target = subscriptions.find((s) => s.id === id);
      if (target) {
        setFormModalVisible(false);
        setEditingSubscription(null);
        setSubToDelete(target);
      }
    },
    [subscriptions],
  );

  const isArchivedTarget = Boolean(subToDelete?.archivedAt);
  const targetHasPayments = subToDelete ? checkHasPayments(subToDelete.id) : false;
  const isArchiveOperation = targetHasPayments && !isArchivedTarget;

  const handleConfirmDeleteOrArchive = useCallback(() => {
    if (!subToDelete) return;
    try {
      const sub = subToDelete;
      setSubToDelete(null);

      if (isArchiveOperation) {
        archive(sub.id);
        setToastMessage(
          t("subscriptions.archivedToast", {
            defaultValue: "Subscription archived",
          }),
        );
      } else {
        remove(sub.id);
        setToastMessage(
          t("subscriptions.deletedToast", {
            defaultValue: "Subscription deleted",
          }),
        );
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to process request");
    }
  }, [subToDelete, isArchiveOperation, archive, remove, t]);

  const handleRestoreSubscription = useCallback(
    (sub: SubscriptionItem) => {
      try {
        restore(sub.id);
        setToastMessage(
          t("subscriptions.restoredToast", {
            defaultValue: "Subscription restored",
          }),
        );
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to restore subscription");
      }
    },
    [restore, t],
  );

  const handleConfirmMarkPaid = useCallback(
    (options: {
      accountId: string;
      pocketId?: string | null;
      paidAt: Date;
    }) => {
      if (!markingPaidSub) return;
      try {
        markPaid(markingPaidSub.id, options);
        setMarkingPaidSub(null);
        setToastMessage(
          t("subscriptions.paymentRecordedToast", {
            name: markingPaidSub.name,
            defaultValue: `Recorded payment for ${markingPaidSub.name}`,
          }),
        );
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to record payment");
      }
    },
    [markingPaidSub, markPaid, t],
  );

  const handleToggleStatus = useCallback(
    (sub: SubscriptionItem) => {
      const nextStatus = sub.status === "paused" ? "active" : "paused";
      changeStatus(sub.id, nextStatus);
      setToastMessage(
        nextStatus === "paused"
          ? t("subscriptions.pausedToast", { defaultValue: "Subscription paused" })
          : t("subscriptions.resumedToast", { defaultValue: "Subscription resumed" }),
      );
    },
    [changeStatus, t],
  );

  if (loading && subscriptions.length === 0) {
    return (
      <PageContainer>
        <PageLoadingState />
      </PageContainer>
    );
  }

  const hasSubscriptions = subscriptions.length > 0;

  return (
    <PageContainer
      contentContainerStyle={styles.pageContent}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel={t("subscriptions.addSubscription", {
            defaultValue: "Add Subscription",
          })}
          onPress={handleOpenCreate}
        />
      }
      scrollable={false}
    >
      {/* Fixed Header Section: Search, Summary, Filter Tabs */}
      {hasSubscriptions && (
        <View style={styles.fixedHeader}>
          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Search color={theme.colors.textSecondary} size={16} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder={t("subscriptions.searchPlaceholder", {
                defaultValue: "Search subscriptions, utilities, services...",
              })}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setSearchQuery("")}>
                <X color={theme.colors.textSecondary} size={16} />
              </Pressable>
            ) : null}
          </View>

          {/* Hero Burn Rate Card */}
          <SubscriptionBurnRateSummaryCard summary={summary} />

          {/* Filter Tabs */}
          <SubscriptionFilterTabs
            counts={filterCounts}
            currentFilter={filter}
            onSelectFilter={setFilter}
          />
        </View>
      )}

      {/* Subscription Cards List or Empty State */}
      {!hasSubscriptions ? (
        <View style={styles.emptyContainer}>
          <PageEmptyState
            actionLabel={t("subscriptions.addFirstAction", {
              defaultValue: "Add Subscription",
            })}
            description={t("subscriptions.emptyDescription", {
              defaultValue:
                "Track your recurring memberships, streaming apps, gym, and bills in one place with automatic renewal countdowns.",
            })}
            icon={<Repeat color={theme.colors.primary} size={32} />}
            onAction={handleOpenCreate}
            title={t("subscriptions.emptyTitle", {
              defaultValue: "No Subscriptions Tracked Yet",
            })}
          />
        </View>
      ) : filteredSubscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PageEmptyState
            description={t("subscriptions.noMatchDescription", {
              defaultValue: "Try adjusting your search query or switching tabs.",
            })}
            icon={<Search color={theme.colors.textSecondary} size={28} />}
            title={t("subscriptions.noMatchTitle", {
              defaultValue: "No matching subscriptions found",
            })}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={styles.listScrollView}
        >
          {filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              onDelete={() => handleRequestDelete(sub)}
              onEdit={() => handleOpenEdit(sub)}
              onMarkPaid={() => setMarkingPaidSub(sub)}
              onPress={() => handleOpenEdit(sub)}
              onRestore={() => handleRestoreSubscription(sub)}
              onToggleStatus={() => handleToggleStatus(sub)}
              subscription={sub}
            />
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Form Modal */}
      <SubscriptionFormModal
        onClose={handleCloseForm}
        onDelete={handleFormDelete}
        onSave={handleSaveSubscription}
        subscription={editingSubscription}
        visible={formModalVisible}
      />

      {/* Mark Paid Confirmation Modal */}
      <MarkPaidModal
        onClose={() => setMarkingPaidSub(null)}
        onConfirm={handleConfirmMarkPaid}
        subscription={markingPaidSub}
        visible={Boolean(markingPaidSub)}
      />

      {/* Delete / Archive Confirmation Modal */}
      {subToDelete ? (
        <ConfirmModal
          cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
          confirmLabel={
            isArchiveOperation
              ? t("subscriptions.filterArchived", { defaultValue: "Archive" })
              : isArchivedTarget
                ? t("subscriptions.deletePermanently", {
                    defaultValue: "Delete Permanently",
                  })
                : t("common.delete", { defaultValue: "Delete" })
          }
          message={
            isArchiveOperation
              ? t("subscriptions.archiveConfirmMessage", {
                  name: subToDelete.name,
                  defaultValue: `"${subToDelete.name}" has recorded payments in your ledger. It will be moved to Archived to preserve your transaction history and stop all upcoming reminders. You can restore it anytime.`,
                })
              : t("subscriptions.deleteConfirmMessage", {
                  name: subToDelete.name,
                  defaultValue: `Are you sure you want to permanently delete "${subToDelete.name}"? This cannot be undone.`,
                })
          }
          onCancel={() => setSubToDelete(null)}
          onConfirm={handleConfirmDeleteOrArchive}
          title={
            isArchiveOperation
              ? t("subscriptions.archiveConfirmTitle", {
                  defaultValue: "Archive Subscription",
                })
              : t("subscriptions.deleteConfirmTitle", {
                  defaultValue: "Delete Subscription",
                })
          }
          variant={isArchiveOperation ? "primary" : "destructive"}
          visible={Boolean(subToDelete)}
        />
      ) : null}

      {/* Feedback Toast */}
      {toastMessage ? (
        <AppToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          position="bottom"
          variant="success"
          visible={Boolean(toastMessage)}
        />
      ) : null}
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pageContent: {
      flex: 1,
      paddingBottom: 0,
      paddingTop: theme.spacing.md,
    },
    fixedHeader: {
      flexShrink: 0,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    listScrollView: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 96,
    },
    emptyContainer: {
      flex: 1,
      paddingTop: theme.spacing.xl,
    },
  });
}
