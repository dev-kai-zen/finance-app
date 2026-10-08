import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ChevronRight,
  RotateCw,
  X,
} from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  AppButton,
  IconHelper,
  NotificationModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { CategoryPickerModal, type Category } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
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

export function BudgetFormModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialBudget = null,
  categories,
  existingBudgets = [],
  pending = false,
}: BudgetFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();
  const { preferences } = useCurrencyPreferences();

  const [categoryId, setCategoryId] = useState<string>("");
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [amountMinorUnits, setAmountCents] = useState<number>(0);
  const [frequency, setFrequency] = useState<BudgetFrequency>("monthly");
  const [allowRollover, setAllowRollover] = useState<boolean>(false);
  const [rolloverMode, setRolloverMode] =
    useState<BudgetRolloverMode>("positive_only");
  const [notifyOnExceeded, setNotifyOnExceeded] = useState<boolean>(true);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTargetInput[]>(
    [],
  );

  // Sub-modals
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(
    null,
  );

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
      setNotifyOnExceeded(true);
      setMonthlyTargets([]);
    }
    setErrorNotification(null);
  }, [initialBudget, categories, existingBudgets, visible]);

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

  const handleDelete = async () => {
    if (!initialBudget || !onDelete) return;
    const success = await onDelete(initialBudget.id);
    if (success) {
      onClose();
    }
  };

  const categoryColor = selectedCategory
    ? resolveEntityColor(selectedCategory.hexColorsId) ||
      selectedCategory.color ||
      theme.colors.primary
    : theme.colors.textSecondary;

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Close budget form"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdrop}
          />

          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                paddingTop: Math.max(insets.top, 16),
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>
                {initialBudget ? "Edit Category Budget" : "New Category Budget"}
              </Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
              >
                <X color={theme.colors.textPrimary} size={20} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Category Picker Selector */}
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

              {/* Enable / Disable Switch */}
              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchTitle}>Enable Budget</Text>
                  <Text style={styles.switchDescription}>
                    Track expenses and evaluate spending limits
                  </Text>
                </View>
                <Switch
                  onValueChange={setIsEnabled}
                  thumbColor={
                    isEnabled
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  value={isEnabled}
                />
              </View>

              {/* Amount Calculator Field */}
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

              {/* Frequency Picker Chips */}
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>FREQUENCY</Text>
                <ScrollView
                  contentContainerStyle={styles.frequencyRow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = frequency === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        accessibilityRole="button"
                        onPress={() => setFrequency(opt.key)}
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
              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <View style={styles.labelWithIcon}>
                    <RotateCw color={theme.colors.primary} size={16} />
                    <Text style={styles.switchTitle}>Rollover Budget</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    Unspent budget from the previous period carries over to the
                    next
                  </Text>
                </View>
                <Switch
                  onValueChange={setAllowRollover}
                  thumbColor={
                    allowRollover
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  value={allowRollover}
                />
              </View>

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
              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <View style={styles.labelWithIcon}>
                    <AlertTriangle color={theme.colors.warning} size={16} />
                    <Text style={styles.switchTitle}>Over-Budget Alert</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    Prompt a confirmation when an expense exceeds this budget
                  </Text>
                </View>
                <Switch
                  onValueChange={setNotifyOnExceeded}
                  thumbColor={
                    notifyOnExceeded
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  value={notifyOnExceeded}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <AppButton
                  label="Save Budget"
                  loading={pending}
                  onPress={handleSave}
                  variant="primary"
                />

                {initialBudget && onDelete && (
                  <View style={styles.deleteWrap}>
                    <AppButton
                      disabled={pending}
                      label="Remove Budget"
                      onPress={handleDelete}
                      variant="destructive"
                    />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0,0,0,0.5)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      maxHeight: "92%",
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    scrollContent: {
      padding: theme.spacing.lg,
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
    actionsContainer: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    deleteWrap: {
      marginTop: theme.spacing.xs,
    },
  });
}
