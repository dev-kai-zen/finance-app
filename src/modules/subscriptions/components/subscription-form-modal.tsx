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
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  Tag,
  Wallet,
  X,
  Zap,
} from "lucide-react-native";

import {
  AmountCalculatorField,
  AmountCalculatorModal,
  DatePickerModal,
  FullScreenFormModal,
  HorizontalScrollView,
  IconHelper,
  InfoModal,
  KeyboardAwareForm,
  ThemedSwitch,
} from "@/components";
import { HelpIconButton } from "@/components/screen-title-with-help";
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

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function getBillingCycleDescription(
  cycle: BillingCycle,
  date: Date,
  t: (key: any, options?: any) => string,
): string {
  switch (cycle) {
    case "weekly": {
      const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
      return t("subscriptions.cycleDescWeekly", {
        day: weekday,
        defaultValue: `Billed every ${weekday} of the week`,
      });
    }
    case "monthly": {
      const day = getOrdinalSuffix(date.getDate());
      return t("subscriptions.cycleDescMonthly", {
        day,
        defaultValue: `Billed on the ${day} of every month`,
      });
    }
    case "quarterly": {
      const day = getOrdinalSuffix(date.getDate());
      const dateFormatted = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return t("subscriptions.cycleDescQuarterly", {
        day,
        date: dateFormatted,
        defaultValue: `Billed every 3 months on the ${day} (next: ${dateFormatted})`,
      });
    }
    case "semi_annual": {
      const day = getOrdinalSuffix(date.getDate());
      const dateFormatted = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return t("subscriptions.cycleDescSemiAnnual", {
        day,
        date: dateFormatted,
        defaultValue: `Billed every 6 months on the ${day} (next: ${dateFormatted})`,
      });
    }
    case "yearly": {
      const dateFormatted = date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
      return t("subscriptions.cycleDescYearly", {
        date: dateFormatted,
        defaultValue: `Billed annually every ${dateFormatted}`,
      });
    }
  }
}

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
  const [firstBillingDate, setFirstBillingDate] = useState<Date>(() =>
    subscription?.firstBillingDate
      ? new Date(subscription.firstBillingDate)
      : new Date(),
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [isTrial, setIsTrial] = useState(subscription?.status === "trial");
  const [trialDurationPreset, setTrialDurationPreset] = useState<
    7 | 14 | 30 | "custom"
  >(() => {
    if (!subscription?.trialEndsAt) return 14;
    const diffDays = Math.round(
      (new Date(subscription.trialEndsAt).getTime() -
        (subscription.firstBillingDate
          ? new Date(subscription.firstBillingDate).getTime()
          : Date.now())) /
        (24 * 60 * 60 * 1000),
    );
    if (diffDays === 7 || diffDays === 14 || diffDays === 30) return diffDays;
    return "custom";
  });
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(() =>
    subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null,
  );
  const [isTrialDatePickerOpen, setIsTrialDatePickerOpen] = useState(false);

  const [accountId, setAccountId] = useState<string | null>(
    subscription?.accountId ?? (accounts[0]?.id || null),
  );
  const [pocketId, setPocketId] = useState<string | null>(
    subscription?.pocketId ?? null,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    subscription?.categoryId ?? null,
  );
  const [autoPost, setAutoPost] = useState(subscription?.autoPost ?? false);
  const [endsOn, setEndsOn] = useState<Date | null>(() =>
    subscription?.endsOn ? new Date(subscription.endsOn) : null,
  );
  const [isEndsOnPickerOpen, setIsEndsOnPickerOpen] = useState(false);

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
  const [infoModalContent, setInfoModalContent] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const isEditing = Boolean(subscription?.id);

  const handleToggleTrial = useCallback(
    (enabled: boolean) => {
      setIsTrial(enabled);
      if (enabled && !trialEndsAt) {
        const defaultEnd = new Date(
          firstBillingDate.getTime() + 14 * 24 * 60 * 60 * 1000,
        );
        setTrialEndsAt(defaultEnd);
        setTrialDurationPreset(14);
      }
    },
    [firstBillingDate, trialEndsAt],
  );

  const handleSelectTrialPreset = useCallback(
    (days: 7 | 14 | 30 | "custom") => {
      setTrialDurationPreset(days);
      if (days === "custom") {
        setIsTrialDatePickerOpen(true);
      } else {
        const calculated = new Date(
          firstBillingDate.getTime() + days * 24 * 60 * 60 * 1000,
        );
        setTrialEndsAt(calculated);
      }
    },
    [firstBillingDate],
  );

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

  const selectedPocket = useMemo(() => {
    return pockets.find((p) => p.id === pocketId) || null;
  }, [pockets, pocketId]);

  const accountDisplayLabel = useMemo(() => {
    if (!selectedAccount) {
      return t("subscriptions.selectAccount", {
        defaultValue: "Select Account",
      });
    }
    if (selectedPocket) {
      return `${selectedAccount.name} • ${selectedPocket.name}`;
    }
    return selectedAccount.name;
  }, [selectedAccount, selectedPocket, t]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);

  const billingCycleDescription = useMemo(() => {
    return getBillingCycleDescription(billingCycle, firstBillingDate, t);
  }, [billingCycle, firstBillingDate, t]);

  const trialSummaryCaption = useMemo(() => {
    if (!trialEndsAt) return "";
    const daysLeft = Math.max(
      0,
      Math.round(
        (trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      ),
    );
    const daysLeftText = `${daysLeft}d left`;
    return t("subscriptions.trialSummaryCaption", {
      date: formatDisplayDate(trialEndsAt),
      daysLeft: daysLeftText,
      reminder: "",
      defaultValue: `Trial ends on ${formatDisplayDate(trialEndsAt)} (${daysLeftText}).`,
    });
  }, [trialEndsAt, t]);

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
      currencyCode:
        subscription?.currencyCode || selectedAccount?.currencyCode || "PHP",
      billingCycle,
      billingCycleInterval,
      firstBillingDate,
      trialEndsAt: isTrial
        ? trialEndsAt ||
          new Date(firstBillingDate.getTime() + 14 * 24 * 60 * 60 * 1000)
        : null,
      accountId,
      pocketId,
      categoryId,
      endsOn,
      autoPost,
      reminderLeadDays: subscription?.reminderLeadDays ?? [1, 3],
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
        <KeyboardAwareForm contentContainerStyle={styles.formContainer}>
          {/* Quick Presets (Shown when creating new) */}
          {!isEditing && (
            <View style={styles.presetsSection}>
              <Text style={styles.sectionTitle}>
                {t("subscriptions.quickPresets", {
                  defaultValue: "Popular Services",
                })}
              </Text>
              <HorizontalScrollView
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
              </HorizontalScrollView>
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

          {/* Anchor Billing Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {t("subscriptions.firstBillingDate", {
                defaultValue: "First Bill / Next Renewal Date",
              })}
            </Text>
            <Pressable
              accessibilityLabel={t("subscriptions.selectBillingDate", {
                defaultValue: "Select Billing Date",
              })}
              accessibilityRole="button"
              onPress={() => setIsDatePickerOpen(true)}
              style={styles.selectorBtn}
            >
              <View style={styles.selectorLeft}>
                <Calendar color={theme.colors.primary} size={18} />
                <Text style={styles.selectorValue}>
                  {formatDisplayDate(firstBillingDate)}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textSecondary} size={18} />
            </Pressable>
            <View style={styles.dynamicCycleBanner}>
              <Clock color={theme.colors.primary} size={14} />
              <Text style={styles.dynamicCycleText}>
                {billingCycleDescription}
              </Text>
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
                  {accountDisplayLabel}
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

          {/* Free Trial Toggle (Minimalist) */}
          <View style={styles.toggleRowMinimal}>
            <View style={styles.toggleLeftRow}>
              <Sparkles color="#8B5CF6" size={16} />
              <Text style={styles.toggleTitle}>
                {t("subscriptions.freeTrialTitle", {
                  defaultValue: "Free Trial Mode",
                })}
              </Text>
              <HelpIconButton
                accessibilityLabel={t("subscriptions.freeTrialHelp", {
                  defaultValue: "Free Trial Help",
                })}
                onPress={() =>
                  setInfoModalContent({
                    title: t("subscriptions.freeTrialTitle", {
                      defaultValue: "Free Trial Mode",
                    }),
                    message: t("subscriptions.freeTrialDesc", {
                      defaultValue:
                        "Flags this subscription as a trial with early renewal alerts so you can cancel before getting charged.",
                    }),
                  })
                }
                size={16}
              />
            </View>
            <ThemedSwitch onValueChange={handleToggleTrial} value={isTrial} />
          </View>

          {/* When Free Trial is Active: Duration Selector & Dynamic Summary */}
          {isTrial && (
            <View style={styles.trialContainer}>
              <Text style={styles.subFieldLabel}>
                {t("subscriptions.trialDuration", {
                  defaultValue: "Trial Duration",
                })}
              </Text>
              <View style={styles.trialPresetsRow}>
                {([7, 14, 30] as const).map((days) => {
                  const isSelected = trialDurationPreset === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => handleSelectTrialPreset(days)}
                      style={[
                        styles.trialChip,
                        isSelected && styles.trialChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.trialChipText,
                          isSelected && styles.trialChipTextSelected,
                        ]}
                      >
                        {days}d
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => handleSelectTrialPreset("custom")}
                  style={[
                    styles.trialChip,
                    trialDurationPreset === "custom" && styles.trialChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.trialChipText,
                      trialDurationPreset === "custom" &&
                        styles.trialChipTextSelected,
                    ]}
                  >
                    {trialDurationPreset === "custom" && trialEndsAt
                      ? formatDisplayDate(trialEndsAt)
                      : t("subscriptions.customDate", {
                          defaultValue: "Custom Date",
                        })}
                  </Text>
                </Pressable>
              </View>
              {trialSummaryCaption ? (
                <Text style={styles.trialSummaryText}>
                  {trialSummaryCaption}
                </Text>
              ) : null}
            </View>
          )}

          {/* Auto-Post Toggle (Minimalist) */}
          <View style={styles.toggleRowMinimal}>
            <View style={styles.toggleLeftRow}>
              <Zap color={theme.colors.primary} size={16} />
              <Text style={styles.toggleTitle}>
                {t("subscriptions.autoPostTitle", {
                  defaultValue: "Auto-Post to Ledger",
                })}
              </Text>
              <HelpIconButton
                accessibilityLabel={t("subscriptions.autoPostHelp", {
                  defaultValue: "Auto-Post Help",
                })}
                onPress={() =>
                  setInfoModalContent({
                    title: t("subscriptions.autoPostTitle", {
                      defaultValue: "Auto-Post to Ledger",
                    }),
                    message: t("subscriptions.autoPostDesc", {
                      defaultValue:
                        "Automatically generates an expense transaction in your ledger on the scheduled renewal date.",
                    }),
                  })
                }
                size={16}
              />
            </View>
            <ThemedSwitch onValueChange={setAutoPost} value={autoPost} />
          </View>

          {/* Optional Contract Expiration Date */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                {t("subscriptions.contractEndsOn", {
                  defaultValue: "Contract / Promo Expiration (Optional)",
                })}
              </Text>
              {endsOn ? (
                <Pressable hitSlop={6} onPress={() => setEndsOn(null)}>
                  <Text style={styles.clearLink}>
                    {t("common.clear", { defaultValue: "Clear" })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsEndsOnPickerOpen(true)}
              style={styles.selectorBtn}
            >
              <View style={styles.selectorLeft}>
                <Calendar color={theme.colors.textSecondary} size={18} />
                <Text
                  style={[
                    styles.selectorValue,
                    !endsOn && { color: theme.colors.textSecondary },
                  ]}
                >
                  {endsOn
                    ? formatDisplayDate(endsOn)
                    : t("subscriptions.noExpiration", {
                        defaultValue: "Renews indefinitely (no end date)",
                      })}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textSecondary} size={18} />
            </Pressable>
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
              scrollEnabled={false}
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
        hidePockets={false}
        onClose={() => setAccountPickerVisible(false)}
        onSelectLocation={(acc, selectedPocketId) => {
          setAccountId(acc.id);
          setPocketId(selectedPocketId ?? null);
          setAccountPickerVisible(false);
        }}
        pockets={pockets}
        selectedAccountId={accountId || undefined}
        selectedPocketId={pocketId || undefined}
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

      {/* First Billing Date Picker */}
      <DatePickerModal
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={(iso) => {
          setFirstBillingDate(parseIsoDate(iso));
          setIsDatePickerOpen(false);
        }}
        selectedDate={toIsoDate(firstBillingDate)}
        title={t("subscriptions.firstBillingDate", {
          defaultValue: "First Bill / Next Renewal Date",
        })}
        visible={isDatePickerOpen}
      />

      {/* Trial End Date Picker */}
      <DatePickerModal
        onClose={() => setIsTrialDatePickerOpen(false)}
        onSelectDate={(iso) => {
          setTrialEndsAt(parseIsoDate(iso));
          setIsTrialDatePickerOpen(false);
        }}
        selectedDate={toIsoDate(trialEndsAt || firstBillingDate)}
        title={t("subscriptions.trialEndsAtTitle", {
          defaultValue: "Trial End Date",
        })}
        visible={isTrialDatePickerOpen}
      />

      {/* Contract Expiration Date Picker */}
      <DatePickerModal
        onClose={() => setIsEndsOnPickerOpen(false)}
        onSelectDate={(iso) => {
          setEndsOn(parseIsoDate(iso));
          setIsEndsOnPickerOpen(false);
        }}
        selectedDate={endsOn ? toIsoDate(endsOn) : toIsoDate(firstBillingDate)}
        title={t("subscriptions.contractEndsOn", {
          defaultValue: "Contract / Promo Expiration",
        })}
        visible={isEndsOnPickerOpen}
      />

      {/* Info Help Modal */}
      {infoModalContent && (
        <InfoModal
          message={infoModalContent.message}
          onClose={() => setInfoModalContent(null)}
          title={infoModalContent.title}
          visible={Boolean(infoModalContent)}
        />
      )}
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    formContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    },
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
      minHeight: 96,
      textAlignVertical: "top",
    },
    dynamicCycleBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
      paddingHorizontal: 4,
    },
    dynamicCycleText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.primary,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    clearLink: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    toggleRowMinimal: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    toggleLeftRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    trialContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    subFieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    trialPresetsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    trialChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    trialChipSelected: {
      backgroundColor: "#8B5CF6",
      borderColor: "#8B5CF6",
    },
    trialChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    trialChipTextSelected: {
      color: "#FFFFFF",
    },
    trialSummaryText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
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
