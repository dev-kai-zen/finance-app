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
  HorizontalScrollView,
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

const FREQUENCY_KEYS: BudgetFrequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "semi_monthly",
  "monthly",
  "quarterly",
  "custom_monthly",
  "yearly",
];

export function BudgetFormModal(props: BudgetFormModalProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <BudgetFormModalContent key={props.initialBudget?.id ?? "new-budget"} {...props} />
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

  // Keep the draft denomination stable until this form session unmounts.
  const [budgetCurrencyCode] = useState(
    () => initialBudget?.currencyCode ?? preferences.defaultCurrency,
  );
  const [categoryId, setCategoryId] = useState<string>(() => {
    if (initialBudget) return initialBudget.categoryId;
    const budgetedCategoryIds = new Set(
      existingBudgets.map((b) => b.categoryId),
    );
    const availableExpense = categories.find(
      (c) => c.type === "expense" && !budgetedCategoryIds.has(c.id),
    );
    return availableExpense?.id || "";
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(
    () => initialBudget?.isEnabled ?? true,
  );
  const [amountMinorUnits, setAmountCents] = useState<number>(
    () => initialBudget?.amountMinorUnits ?? 0,
  );
  const [frequency, setFrequency] = useState<BudgetFrequency>(
    () => initialBudget?.frequency ?? "monthly",
  );
  const [allowRollover, setAllowRollover] = useState<boolean>(
    () => initialBudget?.allowRollover ?? false,
  );
  const [rolloverMode, setRolloverMode] = useState<BudgetRolloverMode>(
    () => initialBudget?.rolloverMode ?? "positive_only",
  );
  const [notifyOnExceeded, setNotifyOnExceeded] = useState<boolean>(
    () => initialBudget?.notifyOnExceeded ?? false,
  );
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetInput[]>(() =>
    initialBudget?.monthlyTargets && initialBudget.monthlyTargets.length > 0
      ? initialBudget.monthlyTargets.map((t) => ({
          year: t.year,
          month: t.month,
          amountMinorUnits: t.amountMinorUnits,
        }))
      : [],
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
  const initialSnapshotRef = useRef<string>("");
  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = JSON.stringify({
      categoryId: initialBudget ? initialBudget.categoryId : categoryId,
      isEnabled: initialBudget ? initialBudget.isEnabled : true,
      amountMinorUnits: initialBudget ? initialBudget.amountMinorUnits : 0,
      frequency: initialBudget ? initialBudget.frequency : "monthly",
      allowRollover: initialBudget ? initialBudget.allowRollover : false,
      rolloverMode: initialBudget ? initialBudget.rolloverMode : "positive_only",
      notifyOnExceeded: initialBudget ? initialBudget.notifyOnExceeded : false,
      monthlyTargets: initialBudget?.monthlyTargets?.map((t) => ({
        year: t.year,
        month: t.month,
        amountMinorUnits: t.amountMinorUnits,
      })) || [],
    });
  }

  const frequencyOptions = useMemo(() => {
    const options = FREQUENCY_KEYS.map((key) => ({
      key,
      label: t(`budgets.frequencies.${key}` as any),
    }));
    const selected = options.find((opt) => opt.key === frequency);
    const rest = options.filter((opt) => opt.key !== frequency);
    return selected ? [selected, ...rest] : options;
  }, [frequency, t]);

  const handleSelectFrequency = (nextFrequency: BudgetFrequency) => {
    setFrequency(nextFrequency);
    frequencyScrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  // If a new budget opened before categories finished loading, assign the first unbudgeted category once ready
  useEffect(() => {
    if (!initialBudget && !categoryId && categories.length > 0) {
      const budgetedCategoryIds = new Set(
        existingBudgets.map((b) => b.categoryId),
      );
      const availableExpense = categories.find(
        (c) => c.type === "expense" && !budgetedCategoryIds.has(c.id),
      );
      if (availableExpense?.id) {
        setCategoryId(availableExpense.id);
        if (initialSnapshotRef.current) {
          try {
            const parsed = JSON.parse(initialSnapshotRef.current);
            if (!parsed.categoryId) {
              parsed.categoryId = availableExpense.id;
              initialSnapshotRef.current = JSON.stringify(parsed);
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }, [initialBudget, categoryId, categories, existingBudgets]);

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
      currencyCode: budgetCurrencyCode,
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
  const { isPromptDismissed, guideHelperEnabled } = useExperiencePreferences();

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

  const isDirty = useMemo(() => {
    if (!visible || !initialSnapshotRef.current) return false;
    const currentSnapshot = JSON.stringify({
      categoryId,
      isEnabled,
      amountMinorUnits,
      frequency,
      allowRollover,
      rolloverMode,
      notifyOnExceeded,
      monthlyTargets,
    });
    return currentSnapshot !== initialSnapshotRef.current;
  }, [visible, categoryId, isEnabled, amountMinorUnits, frequency, allowRollover, rolloverMode, notifyOnExceeded, monthlyTargets]);

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
        deleteLabel={t("budgets.form.remove")}
        pending={pending}
        saveButtonRef={saveRef}
        saveLabel={t("budgets.form.save")}
        title={
          initialBudget ? t("budgets.form.editTitle") : t("budgets.form.newTitle")
        }
        titleAlign="left"
        visible={visible}
        isDirty={isDirty}
        onTour={guideHelperEnabled && !initialBudget ? walkthrough.startWalkthrough : undefined}
        tourLabel={t("budgets.form.tour")}
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
                  <Text style={styles.fieldLabel}>{t("budgets.form.categoryLabel")}</Text>
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
                        {selectedCategory ? selectedCategory.name : t("budgets.form.categoryPlaceholder")}
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
                    <Text style={styles.switchTitle}>{t("budgets.form.enableBudget")}</Text>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel={t("budgets.form.enableBudget")}
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
                    currencyCode={budgetCurrencyCode}
                    label={
                      frequency === "custom_monthly"
                        ? t("budgets.form.defaultMonthlyAmount")
                        : t("budgets.form.budgetAmount")
                    }
                    onOpenCalculator={() => setIsCalculatorOpen(true)}
                    showSignToggle={false}
                  />
                </View>
              </WalkthroughTarget>

              {/* Frequency Picker Chips */}
              <WalkthroughTarget id="budgetFormFrequency">
                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>{t("budgets.form.frequencyLabel")}</Text>
                  <HorizontalScrollView
                    ref={frequencyScrollRef}
                    contentContainerStyle={styles.frequencyRow}
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
                  </HorizontalScrollView>
                  <Text style={styles.frequencyHelpText}>
                    {t(`budgets.frequencyDescriptions.${frequency}` as any)}
                  </Text>
                </View>
              </WalkthroughTarget>

              {/* Custom Monthly 12-Month Table */}
              {frequency === "custom_monthly" && (
                <CustomMonthlyEditor
                  baseAmountCents={amountMinorUnits}
                  currencyCode={budgetCurrencyCode}
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
                      <Text style={styles.switchTitle}>{t("budgets.form.rolloverSection")}</Text>
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
                            title: t("budgets.help.rolloverTitle"),
                            message: t("budgets.help.rolloverBody"),
                          })
                        }
                      />
                    </View>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel={t("budgets.form.rolloverSection")}
                    disabled={pending}
                    onValueChange={handleToggleRollover}
                    value={allowRollover}
                  />
                </View>
              </WalkthroughTarget>

              {allowRollover && (
                <View style={styles.subOptionContainer}>
                  <Text style={styles.subOptionLabel}>{t("budgets.form.rolloverMode") + ":"}</Text>
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
                        {t("budgets.form.rolloverPreviousOnly")}
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
                        {t("budgets.form.rolloverCumulative")}
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
                      <Text style={styles.switchTitle}>{t("budgets.form.overBudgetAlerts")}</Text>
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
                            title: t("budgets.help.alertsTitle"),
                            message: t("budgets.help.alertsBody"),
                          })
                        }
                      />
                    </View>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel={t("budgets.form.overBudgetAlerts")}
                    disabled={pending}
                    onValueChange={handleToggleNotifyOnExceeded}
                    value={notifyOnExceeded}
                  />
                </View>
              </WalkthroughTarget>
          </View>
        </ScrollView>

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
      </FullScreenFormModal>

      {/* Category Picker Submodal */}
      <CategoryPickerModal
        categories={categories.filter((c) => c.type === "expense")}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelectCategory={handleSelectCategory}
        selectedCategoryId={categoryId}
        title={t("budgets.form.categoryPlaceholder")}
        type="expense"
        visible={isCategoryPickerOpen}
      />

      {/* Amount Calculator Modal */}
      <AmountCalculatorModal
        currencyCode={budgetCurrencyCode}
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
      textAlign: "center",
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
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 8,
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    segmentButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "center",
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
