import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ChevronRight,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react-native";

import {
  AmountCalculatorField,
  AmountCalculatorModal,
  FullScreenFormModal,
  IconHelper,
  KeyboardAwareForm,
  ThemedSwitch,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { AccountPickerModal, useAccounts } from "@/modules/accounts";
import { CategoryPickerModal, useCategories } from "@/modules/categories";
import { BILLING_CYCLE_OPTIONS } from "../constants/subscription.constants";
import { SUBSCRIPTION_PRESETS } from "../constants/subscription-presets.constants";
import type {
  BillingCycle,
  SaveSubscriptionInput,
  SubscriptionItem,
  SubscriptionPreset,
  SubscriptionStatus,
} from "../types/subscription.types";

export interface SubscriptionFormModalProps {
  visible: boolean;
  subscription?: SubscriptionItem | null;
  onClose: () => void;
  onSave: (input: SaveSubscriptionInput, id?: string) => void;
  onDelete?: (id: string) => void;
}

export function SubscriptionFormModal(props: SubscriptionFormModalProps) {
  if (!props.visible) {
    return null;
  }
  return <SubscriptionFormModalContent {...props} />;
}

function SubscriptionFormModalContent({
  subscription,
  onClose,
  onSave,
  onDelete,
}: SubscriptionFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const { accounts, pockets } = useAccounts({
    includeCreditCardMonitoring: false,
  });
  const { categories } = useCategories();

  // Form State
  const [name, setName] = useState(subscription?.name ?? "");
  const [amountMinorUnits, setAmountMinorUnits] = useState(
    subscription?.amountMinorUnits ?? 0,
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    subscription?.billingCycle ?? "monthly",
  );
  const [billingCycleInterval, setBillingCycleInterval] = useState(
    subscription?.billingCycleInterval ?? 1,
  );
  const [isTrial, setIsTrial] = useState(subscription?.status === "trial");
  const [accountId, setAccountId] = useState<string | null>(
    subscription?.accountId ?? (accounts[0]?.id || null),
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    subscription?.categoryId ?? null,
  );
  const [autoPost, setAutoPost] = useState(subscription?.autoPost ?? false);
  const [cancellationUrl, setCancellationUrl] = useState(
    subscription?.cancellationUrl ?? "",
  );
  const [notes, setNotes] = useState(subscription?.notes ?? "");
  const [color, setColor] = useState<string | null>(subscription?.color ?? null);
  const [icon, setIcon] = useState<string | null>(subscription?.icon ?? null);

  // Picker modals
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const isEditing = Boolean(subscription?.id);

  // Select Preset Handler
  const handleSelectPreset = useCallback(
    (preset: SubscriptionPreset) => {
      setName(preset.name);
      setAmountMinorUnits(preset.defaultAmountMinorUnits);
      setBillingCycle(preset.defaultBillingCycle);
      setIcon(preset.icon);
      setColor(preset.color);
      if (preset.cancellationUrl) {
        setCancellationUrl(preset.cancellationUrl);
      }

      // Match category by name if available
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === preset.categoryName.toLowerCase(),
      );
      if (matchedCat) {
        setCategoryId(matchedCat.id);
      }
    },
    [categories],
  );

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId) || null;
  }, [accounts, accountId]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);

  const isValid = name.trim().length > 0 && (isTrial || amountMinorUnits > 0);

  const handleSave = () => {
    if (!isValid) return;

    const status: SubscriptionStatus = isTrial
      ? "trial"
      : subscription?.status === "paused"
        ? "paused"
        : subscription?.status === "cancelled"
          ? "cancelled"
          : "active";

    const input: SaveSubscriptionInput = {
      id: subscription?.id,
      name: name.trim(),
      status,
      amountMinorUnits,
      currencyCode: subscription?.currencyCode || selectedAccount?.currencyCode || "PHP",
      billingCycle,
      billingCycleInterval,
      firstBillingDate: subscription?.firstBillingDate || new Date(),
      trialEndsAt: isTrial ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      accountId,
      categoryId,
      autoPost,
      reminderLeadDays: subscription?.reminderLeadDays || [1, 3],
      cancellationUrl: cancellationUrl.trim() || null,
      notes: notes.trim() || null,
      color,
      icon,
    };

    onSave(input, subscription?.id);
  };

  const handleDelete = () => {
    if (subscription?.id && onDelete) {
      onDelete(subscription.id);
    }
  };

  return (
    <>
      <FullScreenFormModal
        onClose={onClose}
        onDelete={isEditing && onDelete ? handleDelete : undefined}
        onSave={handleSave}
        saveDisabled={!isValid}
        title={
          isEditing
            ? t("subscriptions.editSubscription", {
                defaultValue: "Edit Subscription",
              })
            : t("subscriptions.newSubscription", {
                defaultValue: "New Subscription",
              })
        }
        visible={true}
      >
        <KeyboardAwareForm>
          {/* Quick Presets (Shown when creating new) */}
          {!isEditing && (
            <View style={styles.presetsSection}>
              <Text style={styles.sectionTitle}>
                {t("subscriptions.quickPresets", {
                  defaultValue: "Popular Services",
                })}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {SUBSCRIPTION_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="button"
                    onPress={() => handleSelectPreset(preset)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View
                      style={[
                        styles.presetIconBox,
                        { backgroundColor: preset.color },
                      ]}
                    >
                      <IconHelper
                        color="#FFFFFF"
                        name={preset.icon}
                        size={16}
                      />
                    </View>
                    <Text style={styles.presetName}>{preset.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Name Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.nameLabel", { defaultValue: "Subscription Name" })}
            </Text>
            <TextInput
              onChangeText={setName}
              placeholder={t("subscriptions.namePlaceholder", {
                defaultValue: "e.g. Netflix, Spotify, Gym",
              })}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.textInput}
              value={name}
            />
          </View>

          {/* Amount Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.amountLabel", { defaultValue: "Amount / Cost" })}
            </Text>
            <AmountCalculatorField
              amountMinorUnits={amountMinorUnits}
              amountSign="+"
              currencyCode={selectedAccount?.currencyCode || "PHP"}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              showSignToggle={false}
            />
          </View>

          {/* Billing Cycle Row */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.billingCycle", { defaultValue: "Billing Cycle" })}
            </Text>
            <View style={styles.cycleGrid}>
              {BILLING_CYCLE_OPTIONS.map((opt) => {
                const isSelected = billingCycle === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setBillingCycle(opt.value)}
                    style={({ pressed }) => [
                      styles.cycleChip,
                      isSelected && styles.cycleChipSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cycleChipText,
                        isSelected && styles.cycleChipTextSelected,
                      ]}
                    >
                      {t(opt.labelKey as any, { defaultValue: opt.value })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Account Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.paymentAccount", {
                defaultValue: "Paid From Account",
              })}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAccountPickerVisible(true)}
              style={styles.selectorBtn}
            >
              <View style={styles.selectorLeft}>
                <Wallet color={theme.colors.primary} size={18} />
                <Text style={styles.selectorValue}>
                  {selectedAccount?.name ||
                    t("subscriptions.selectAccount", {
                      defaultValue: "Select Account",
                    })}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          {/* Category Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.category", { defaultValue: "Category" })}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryPickerVisible(true)}
              style={styles.selectorBtn}
            >
              <View style={styles.selectorLeft}>
                <Tag color={theme.colors.primary} size={18} />
                <Text style={styles.selectorValue}>
                  {selectedCategory?.name ||
                    t("subscriptions.selectCategory", {
                      defaultValue: "Select Category",
                    })}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          {/* Free Trial Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <View style={styles.toggleHeader}>
                <Sparkles color="#8B5CF6" size={16} />
                <Text style={styles.toggleTitle}>
                  {t("subscriptions.freeTrialTitle", {
                    defaultValue: "Free Trial Mode",
                  })}
                </Text>
              </View>
              <Text style={styles.toggleDescription}>
                {t("subscriptions.freeTrialDesc", {
                  defaultValue:
                    "Flags this subscription as a trial with early renewal alerts so you can cancel before getting charged.",
                })}
              </Text>
            </View>
            <ThemedSwitch onValueChange={setIsTrial} value={isTrial} />
          </View>

          {/* Auto-Post Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>
                {t("subscriptions.autoPostTitle", {
                  defaultValue: "Auto-Post to Ledger",
                })}
              </Text>
              <Text style={styles.toggleDescription}>
                {t("subscriptions.autoPostDesc", {
                  defaultValue:
                    "Automatically generates an expense transaction in your ledger on the scheduled renewal date.",
                })}
              </Text>
            </View>
            <ThemedSwitch onValueChange={setAutoPost} value={autoPost} />
          </View>

          {/* Direct Cancellation Link */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.cancellationUrlLabel", {
                defaultValue: "Manage / Cancellation Web Link",
              })}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={setCancellationUrl}
              placeholder="https://..."
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.textInput}
              value={cancellationUrl}
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("navigation.notes", { defaultValue: "Notes" })}
            </Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setNotes}
              placeholder={t("subscriptions.notesPlaceholder", {
                defaultValue: "Plan tier, account credentials hint, etc.",
              })}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.textInput, styles.textArea]}
              value={notes}
            />
          </View>
        </KeyboardAwareForm>
      </FullScreenFormModal>

      {/* Account Picker Modal */}
      <AccountPickerModal
        accounts={accounts}
        hidePockets={true}
        onClose={() => setAccountPickerVisible(false)}
        onSelectLocation={(acc) => {
          setAccountId(acc.id);
          setAccountPickerVisible(false);
        }}
        pockets={pockets}
        selectedAccountId={accountId || undefined}
        visible={accountPickerVisible}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        categories={categories}
        onClose={() => setCategoryPickerVisible(false)}
        onSelectCategory={(cat) => {
          setCategoryId(cat.id);
          setCategoryPickerVisible(false);
        }}
        selectedCategoryId={categoryId || undefined}
        visible={categoryPickerVisible}
      />

      {/* Amount Calculator Modal */}
      <AmountCalculatorModal
        currencyCode={selectedAccount?.currencyCode || "PHP"}
        initialMinorUnits={amountMinorUnits}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(val) => {
          setAmountMinorUnits(val);
          setIsCalculatorOpen(false);
        }}
        visible={isCalculatorOpen}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    presetsSection: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    presetsScroll: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: 2,
    },
    presetChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    presetIconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    presetName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    fieldGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: "top",
    },
    cycleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    cycleChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    cycleChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    cycleChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    cycleChipTextSelected: {
      color: "#FFFFFF",
    },
    selectorBtn: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    selectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    selectorValue: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    toggleTextCol: {
      flex: 1,
    },
    toggleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    toggleTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    toggleDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
  });
}
