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
    remove,
  } = useSubscriptions();

  // Modal states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<SubscriptionItem | null>(null);
  const [markingPaidSub, setMarkingPaidSub] =
    useState<SubscriptionItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterCounts = useMemo<Partial<Record<SubscriptionFilter, number>>>(() => {
    return {
      all: subscriptions.length,
      active: subscriptions.filter((s) => s.status === "active").length,
      trial: subscriptions.filter((s) => s.status === "trial").length,
      paused: subscriptions.filter((s) => s.status === "paused").length,
      cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
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

  const handleDeleteSubscription = useCallback(
    (id: string) => {
      try {
        remove(id);
        setFormModalVisible(false);
        setEditingSubscription(null);
        setToastMessage(
          t("subscriptions.deletedToast", { defaultValue: "Subscription deleted" }),
        );
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to delete subscription");
      }
    },
    [remove, t],
  );

  const handleConfirmMarkPaid = useCallback(
    (options: { accountId: string; paidAt: Date }) => {
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
    <PageContainer>
      {/* Search Input Bar (When there are items) */}
      {hasSubscriptions && (
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
      )}

      {/* Hero Burn Rate Card */}
      {hasSubscriptions && (
        <SubscriptionBurnRateSummaryCard summary={summary} />
      )}

      {/* Filter Tabs */}
      {hasSubscriptions && (
        <SubscriptionFilterTabs
          counts={filterCounts}
          currentFilter={filter}
          onSelectFilter={setFilter}
        />
      )}

      {/* Subscription Cards List or Empty State */}
      {!hasSubscriptions ? (
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
      ) : filteredSubscriptions.length === 0 ? (
        <PageEmptyState
          description={t("subscriptions.noMatchDescription", {
            defaultValue: "Try adjusting your search query or switching tabs.",
          })}
          icon={<Search color={theme.colors.textSecondary} size={28} />}
          title={t("subscriptions.noMatchTitle", {
            defaultValue: "No matching subscriptions found",
          })}
        />
      ) : (
        <View style={styles.list}>
          {filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              onDelete={() => handleDeleteSubscription(sub.id)}
              onEdit={() => handleOpenEdit(sub)}
              onMarkPaid={() => setMarkingPaidSub(sub)}
              onPress={() => handleOpenEdit(sub)}
              onToggleStatus={() => handleToggleStatus(sub)}
              subscription={sub}
            />
          ))}
        </View>
      )}

      {/* Floating Action Button (+) */}
      <FloatingActionButton
        accessibilityLabel={t("subscriptions.addSubscription", {
          defaultValue: "Add Subscription",
        })}
        onPress={handleOpenCreate}
      />

      {/* Add / Edit Form Modal */}
      <SubscriptionFormModal
        onClose={handleCloseForm}
        onDelete={handleDeleteSubscription}
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

      {/* Feedback Toast */}
      {toastMessage ? (
        <AppToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          variant="success"
          visible={Boolean(toastMessage)}
        />
      ) : null}
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
    list: {
      paddingBottom: 80,
    },
  });
}
