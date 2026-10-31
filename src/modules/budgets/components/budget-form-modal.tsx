import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  ChevronRight,
  Crown,
  PieChart,
  RotateCw,
} from "lucide-react-native";
import { useLocalization } from "@/infrastructure/localization";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  FullScreenFormModal,
  HelpIconButton,
  IconHelper,
  InfoModal,
  NotificationModal,
  ThemedSwitch,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { CategoryPickerModal, type Category } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { ProFeatureModal, useProGuard } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import {
  BudgetFormWalkthroughOverlay,
  DraggableTourChip,
  useBudgetFormWalkthrough,
  WalkthroughIntroModal,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WalkthroughTarget,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import type {
  BudgetFrequency,
  BudgetRolloverMode,
  CategoryBudget,
  CategoryBudgetInput,
  MonthlyTargetInput,
} from "../types/budget.types";
import { CustomMonthlyEditor } from "./custom-monthly-editor";

export interface BudgetFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CategoryBudgetInput) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  initialBudget?: CategoryBudget | null;
  categories: Category[];
  existingBudgets?: CategoryBudget[];
  pending?: boolean;
}

const FREQUENCY_OPTIONS: Array<{ key: BudgetFrequency; label: string }> = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-Weekly" },
  { key: "semi_monthly", label: "Semi-Monthly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "custom_monthly", label: "Custom (12-Mo)" },
  { key: "yearly", label: "Yearly" },
];

const FREQUENCY_DESCRIPTIONS: Record<BudgetFrequency, string> = {
  daily: "Resets every day at midnight",
  weekly: "Resets every Monday to Sunday",
  biweekly: "Resets every 14 days (every 2 weeks)",
  semi_monthly: "Resets twice a month: 1st–15th and 16th–End of Month",
  monthly: "Resets on the 1st of every month",
  quarterly: "Resets every 3 months (Q1–Q4)",
  custom_monthly: "Custom budget limit per calendar month (Jan–Dec)",
  yearly: "Resets on January 1st every year",
};

export function BudgetFormModal(props: BudgetFormModalProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <BudgetFormModalContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function BudgetFormModalContent({
  visible,
  onClose,
  onSave,
  onDelete,
  initialBudget = null,
  categories,
  existingBudgets = [],
  pending = false,
}: BudgetFormModalProps) {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();
  const { preferences } = useCurrencyPreferences();
  const { isPro, guardAction, paywallVisible, closePaywall, guardMeta } =
    useProGuard();

  const [categoryId, setCategoryId] = useState<string>("");
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [amountMinorUnits, setAmountCents] = useState<number>(0);
  const [frequency, setFrequency] = useState<BudgetFrequency>("monthly");
  const [allowRollover, setAllowRollover] = useState<boolean>(false);
  const [rolloverMode, setRolloverMode] =
    useState<BudgetRolloverMode>("positive_only");
  const [notifyOnExceeded, setNotifyOnExceeded] = useState<boolean>(false);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetInput[]>(
    [],
  );
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleToggleRollover = (val: boolean) => {
    if (val && !isPro) {
      guardAction(() => {
        setAllowRollover(true);
      }, {
        featureTitle: t("pro.locked.budgetRolloverTitle"),
        featureDescription: t("pro.locked.budgetRolloverDesc"),
      });
      return;
    }
    setAllowRollover(val);
  };

  const handleToggleNotifyOnExceeded = (val: boolean) => {
    if (val && !isPro) {
      guardAction(() => {
        setNotifyOnExceeded(true);
      }, {
        featureTitle: "Over-Budget Alerts",
        featureDescription: "Receive instant alerts and confirmation prompts whenever a transaction exceeds your set category threshold with Kaizen Pro.",
      });
      return;
    }
    setNotifyOnExceeded(val);
  };

  // Sub-modals
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(
    null,
  );

  const frequencyScrollRef = useRef<ScrollView>(null);

  const frequencyOptions = useMemo(() => {
    const selected = FREQUENCY_OPTIONS.find((opt) => opt.key === frequency);
    const rest = FREQUENCY_OPTIONS.filter((opt) => opt.key !== frequency);
    return selected ? [selected, ...rest] : FREQUENCY_OPTIONS;
  }, [frequency]);

  const handleSelectFrequency = (nextFrequency: BudgetFrequency) => {
    setFrequency(nextFrequency);
    frequencyScrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  useEffect(() => {
    if (initialBudget) {
      setCategoryId(initialBudget.categoryId);
      setIsEnabled(initialBudget.isEnabled);
      setAmountCents(initialBudget.amountMinorUnits);
      setFrequency(initialBudget.frequency);
      setAllowRollover(initialBudget.allowRollover);
      setRolloverMode(initialBudget.rolloverMode);
      setNotifyOnExceeded(initialBudget.notifyOnExceeded);
      setMonthlyTargets(
        initialBudget.monthlyTargets?.map((t) => ({
          year: t.year,
          month: t.month,
          amountMinorUnits: t.amountMinorUnits,
        })) || [],
      );
    } else {
      const budgetedCategoryIds = new Set(
        existingBudgets.map((b) => b.categoryId),
      );
      const availableExpense = categories.find(
        (c) => c.type === "expense" && !budgetedCategoryIds.has(c.id),
      );
      setCategoryId(availableExpense?.id || "");
      setIsEnabled(true);
      setAmountCents(0);
      setFrequency("monthly");
      setAllowRollover(false);
      setRolloverMode("positive_only");
      setNotifyOnExceeded(false);
      setMonthlyTargets([]);
    }
    setErrorNotification(null);
  }, [initialBudget, categories, existingBudgets, visible]);

  useEffect(() => {
    if (visible) {
      frequencyScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  const selectedCategory = useMemo(() => {
    function findCat(cats: Category[]): Category | null {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat;
        if (cat.subcategories) {
          const sub = findCat(cat.subcategories);
          if (sub) return sub;
        }
      }
      return null;
    }
    return findCat(categories);
  }, [categoryId, categories]);

  const handleSelectCategory = (cat: Category) => {
    setCategoryId(cat.id);
    setIsCategoryPickerOpen(false);
  };

  const handleSave = async () => {
    if (!categoryId) {
      setErrorNotification("Please select a category for this budget.");
      return;
    }
    if (amountMinorUnits <= 0 && frequency !== "custom_monthly") {
      setErrorNotification("Please enter a budget amount greater than zero.");
      return;
    }

    const success = await onSave({
      id: initialBudget?.id,
      categoryId,
      isEnabled,
      amountMinorUnits,
      currencyCode:
        initialBudget?.currencyCode ?? preferences.defaultCurrency,
      frequency,
      allowRollover,
      rolloverMode,
      notifyOnExceeded,
      monthlyTargets: frequency === "custom_monthly" ? monthlyTargets : [],
    });

    if (success) {
      onClose();
    }
  };

  const saveRef = useWalkthroughTarget("budgetFormSave");
  const formScrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();
  const { isPromptDismissed } = useExperiencePreferences();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "budgetFormSave") {
        return;
      }

      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        formScrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useBudgetFormWalkthrough({
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "budgetFormWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
    enabled: visible && !initialBudget,
  });

  useEffect(() => {
    if (visible && !initialBudget && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [visible, initialBudget, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  const handleDelete = () => {
    if (!initialBudget || !onDelete) return;
    void onDelete(initialBudget.id);
  };

  const categoryColor = selectedCategory
    ? resolveEntityColor(selectedCategory.hexColorsId) ||
      selectedCategory.color ||
      theme.colors.primary
    : theme.colors.textSecondary;

  return (
    <>
      <FullScreenFormModal
        deleteLabel="Remove budget"
        pending={pending}
        saveButtonRef={saveRef}
        saveLabel="Save budget"
        title={
          initialBudget ? "Edit Category Budget" : "New Category Budget"
        }
        titleAlign="left"
        visible={visible}
        onClose={onClose}
        onDelete={initialBudget && onDelete ? handleDelete : undefined}
        onSave={() => void handleSave()}
      >
        <ScrollView
          ref={formScrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={
            walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
          }
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View collapsable={false} ref={scrollContentRef}>
              {/* Category Picker Selector */}
              <WalkthroughTarget id="budgetFormCategory">
                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>CATEGORY</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(initialBudget)}
                    onPress={() => setIsCategoryPickerOpen(true)}
                    style={[
                      styles.selectorButton,
                      Boolean(initialBudget) && styles.selectorDisabled,
                    ]}
                  >
                    <View style={styles.selectorLeft}>
                      {selectedCategory ? (
                        <View
                          style={[
                            styles.categoryIconWrap,
                            { backgroundColor: `${categoryColor}20` },
                          ]}
                        >
                          <IconHelper
                            color={categoryColor}
                            name={selectedCategory.icon || "tag"}
                            size={18}
                          />
                        </View>
                      ) : null}
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.selectorText,
                          !selectedCategory && styles.placeholderText,
                        ]}
                      >
                        {selectedCategory ? selectedCategory.name : "Select a category"}
                      </Text>
                    </View>
                    {!initialBudget && (
                      <ChevronRight color={theme.colors.textSecondary} size={18} />
                    )}
                  </Pressable>
                </View>
              </WalkthroughTarget>

              {/* Enable / Disable Switch */}
              <WalkthroughTarget id="budgetFormEnable">
                <View style={styles.switchRow}>
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchTitle}>Enable Budget</Text>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel="Enable Budget"
                    disabled={pending}
                    onValueChange={setIsEnabled}
                    value={isEnabled}
                  />
                </View>
              </WalkthroughTarget>

              {/* Amount Calculator Field */}
              <WalkthroughTarget id="budgetFormAmount">
                <View style={styles.section}>
                  <AmountCalculatorField
                    amountMinorUnits={amountMinorUnits}
                    amountSign="+"
                    currencyCode="PHP"
                    label={
                      frequency === "custom_monthly"
                        ? "DEFAULT MONTHLY AMOUNT"
                        : "BUDGET AMOUNT"
                    }
                    onOpenCalculator={() => setIsCalculatorOpen(true)}
                    showSignToggle={false}
                  />
                </View>
              </WalkthroughTarget>

              {/* Frequency Picker Chips */}
              <WalkthroughTarget id="budgetFormFrequency">
                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>FREQUENCY</Text>
                  <ScrollView
                    ref={frequencyScrollRef}
                    contentContainerStyle={styles.frequencyRow}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {frequencyOptions.map((opt) => {
                      const isSelected = frequency === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          onPress={() => handleSelectFrequency(opt.key)}
                          style={[
                            styles.frequencyChip,
                            isSelected && styles.frequencyChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.frequencyChipText,
                              isSelected && styles.frequencyChipTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Text style={styles.frequencyHelpText}>
                    {FREQUENCY_DESCRIPTIONS[frequency]}
                  </Text>
                </View>
              </WalkthroughTarget>

              {/* Custom Monthly 12-Month Table */}
              {frequency === "custom_monthly" && (
                <CustomMonthlyEditor
                  baseAmountCents={amountMinorUnits}
                  monthlyTargets={monthlyTargets}
                  onChange={setMonthlyTargets}
                  year={new Date().getFullYear()}
                />
              )}

              {/* Rollover Settings */}
              <WalkthroughTarget id="budgetFormRollover">
                <View style={styles.switchRow}>
                  <View style={styles.switchTextCol}>
                    <View style={styles.labelWithIcon}>
                      <RotateCw color={theme.colors.primary} size={16} />
                      <Text style={styles.switchTitle}>Rollover Budget</Text>
                      {!isPro && (
                        <View style={styles.proChip}>
                          <Crown color="#D97706" size={10} />
                          <Text style={styles.proChipText}>PRO</Text>
                        </View>
                      )}
                      <HelpIconButton
                        accessibilityHint="Explains budget rollover"
                        accessibilityLabel="Rollover budget help"
                        onPress={() =>
                          setInfoModal({
                            title: "Rollover Budget",
                            message:
                              "Unspent budget from the previous period carries over to the next.",
                          })
                        }
                      />
                    </View>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel="Rollover Budget"
                    disabled={pending}
                    onValueChange={handleToggleRollover}
                    value={allowRollover}
                  />
                </View>
              </WalkthroughTarget>

              {allowRollover && (
                <View style={styles.subOptionContainer}>
                  <Text style={styles.subOptionLabel}>Rollover Behavior:</Text>
                  <View style={styles.segmentedRow}>
                    <Pressable
                      onPress={() => setRolloverMode("positive_only")}
                      style={[
                        styles.segmentButton,
                        rolloverMode === "positive_only" &&
                          styles.segmentButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          rolloverMode === "positive_only" &&
                            styles.segmentButtonTextActive,
                        ]}
                      >
                        Surplus Only (Recommended)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRolloverMode("full")}
                      style={[
                        styles.segmentButton,
                        rolloverMode === "full" && styles.segmentButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          rolloverMode === "full" &&
                            styles.segmentButtonTextActive,
                        ]}
                      >
                        Full (Include Deficit)
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Over-budget Warning Notification Setting */}
              <WalkthroughTarget id="budgetFormAlert">
                <View style={styles.switchRow}>
                  <View style={styles.switchTextCol}>
                    <View style={styles.labelWithIcon}>
                      <AlertTriangle color={theme.colors.warning} size={16} />
                      <Text style={styles.switchTitle}>Over-Budget Alert</Text>
                      {!isPro && (
                        <View style={styles.proChip}>
                          <Crown color="#D97706" size={10} />
                          <Text style={styles.proChipText}>PRO</Text>
                        </View>
                      )}
                      <HelpIconButton
                        accessibilityHint="Explains over-budget alerts"
                        accessibilityLabel="Over-budget alert help"
                        onPress={() =>
                          setInfoModal({
                            title: "Over-Budget Alert",
                            message:
                              "Prompt a confirmation when an expense exceeds this budget.",
                          })
                        }
                      />
                    </View>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel="Over-Budget Alert"
                    disabled={pending}
                    onValueChange={handleToggleNotifyOnExceeded}
                    value={notifyOnExceeded}
                  />
                </View>
              </WalkthroughTarget>
          </View>
        </ScrollView>
      </FullScreenFormModal>

      {/* Category Picker Submodal */}
      <CategoryPickerModal
        categories={categories.filter((c) => c.type === "expense")}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelectCategory={handleSelectCategory}
        selectedCategoryId={categoryId}
        title="Select Expense Category"
        type="expense"
        visible={isCategoryPickerOpen}
      />

      {/* Amount Calculator Modal */}
      <AmountCalculatorModal
        initialMinorUnits={amountMinorUnits}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(val) => {
          setAmountCents(val);
          setIsCalculatorOpen(false);
        }}
        title="Set Budget Amount"
        visible={isCalculatorOpen}
      />

      {/* Error notification */}
      <NotificationModal
        message={errorNotification || ""}
        onClose={() => setErrorNotification(null)}
        title="Check Budget Details"
        variant="error"
        visible={Boolean(errorNotification)}
      />

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />

      <InfoModal
        message={infoModal?.message ?? ""}
        onClose={() => setInfoModal(null)}
        title={infoModal?.title ?? ""}
        visible={infoModal !== null}
      />

      <DraggableTourChip
        onPress={walkthrough.startWalkthrough}
        visible={!walkthrough.isWalkthroughActive}
      />

      <BudgetFormWalkthroughOverlay
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        step={walkthrough.currentStep}
        stepIndex={walkthrough.activeStepIndex}
        targetLayout={walkthrough.activeTargetLayout}
        totalSteps={walkthrough.totalSteps}
        visible={walkthrough.isWalkthroughActive}
      />

      <WalkthroughIntroModal
        visible={visible && !initialBudget && walkthroughIntro.isIntroVisible}
        title={t("budgetFormWalkthrough.introTitle")}
        subtitle={t("budgetFormWalkthrough.introSubtitle")}
        message={t("budgetFormWalkthrough.introMessage")}
        icon={<PieChart color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    proChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(217, 119, 6, 0.4)",
    },
    proChipText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#D97706",
      letterSpacing: 0.4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
    },
    selectorButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    selectorDisabled: {
      opacity: 0.7,
    },
    selectorLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    categoryIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    selectorText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    placeholderText: {
      color: theme.colors.textSecondary,
    },
    switchRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    switchTextCol: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    labelWithIcon: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      marginBottom: 2,
    },
    switchTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    switchDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    subOptionContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      marginTop: -theme.spacing.sm,
      padding: theme.spacing.md,
    },
    subOptionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: theme.spacing.xs,
    },
    segmentedRow: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      overflow: "hidden",
      padding: 2,
    },
    segmentButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flex: 1,
      paddingVertical: 8,
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    segmentButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },
    segmentButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    frequencyRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingVertical: 2,
    },
    frequencyChip: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    frequencyChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    frequencyChipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    frequencyChipTextSelected: {
      color: theme.colors.onPrimary,
    },
    frequencyHelpText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 6,
    },
  });
}
