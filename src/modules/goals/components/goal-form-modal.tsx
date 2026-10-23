import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Calendar,
  Check,
  ChevronRight,
  Landmark,
  Plus,
  WalletCards,
  X,
} from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  DatePickerModal,
  FullScreenFormModal,
  HelpIconButton,
  IconHelper,
  IconPickerModal,
  InfoModal,
  KeyboardAwareFormPreset,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import {
  HexColorFormModal,
  useHexColors,
  type HexColor,
  type HexColorInput,
} from "@/modules/hex-colors";
import { useExperiencePreferences } from "@/modules/settings";
import {
  DraggableTourChip,
  GoalFormWalkthroughOverlay,
  useGoalFormWalkthrough,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WalkthroughTarget,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { formatCurrency } from "@/utils/currency";
import type { GoalInput, GoalWithProgress } from "../types/goal.types";
import { GoalAccountPickerModal } from "./goal-account-picker-modal";

export interface GoalFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: GoalInput, existingId?: string | null) => Promise<boolean> | boolean;
  initialGoal?: GoalWithProgress | null;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date();
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function GoalFormModal(props: GoalFormModalProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <GoalFormModalContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function GoalFormModalContent({
  visible,
  onClose,
  onSave,
  initialGoal = null,
}: GoalFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const { accounts, pockets } = useAccounts();
  const {
    colors: hexColorsList,
    addColor,
    refresh: refreshHexColors,
  } = useHexColors();

  // Form State
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [targetAmountMinorUnits, setTargetAmountMinorUnits] = useState(0);
  const [currencyCode, setCurrencyCode] = useState("PHP");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedPocketIds, setSelectedPocketIds] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [iconKey, setIconKey] = useState<string>("target");
  const [hexColorsId, setHexColorsId] = useState<string>("color_blue");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedFieldType, setFocusedFieldType] = useState<
    "normal" | "description" | null
  >(null);

  // Sub-modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isColorFormOpen, setIsColorFormOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<
    "linkedFunds" | "targetDeadline" | null
  >(null);

  useEffect(() => {
    if (visible) {
      refreshHexColors();
      if (initialGoal) {
        setName(initialGoal.name);
        setNote(initialGoal.note || "");
        setTargetAmountMinorUnits(initialGoal.targetAmountMinorUnits);
        setCurrencyCode(initialGoal.currencyCode || "PHP");
        setSelectedAccountIds(
          initialGoal.accountIds && initialGoal.accountIds.length > 0
            ? initialGoal.accountIds
            : initialGoal.accountId
              ? [initialGoal.accountId]
              : [],
        );
        setSelectedPocketIds(
          initialGoal.pocketIds && initialGoal.pocketIds.length > 0
            ? initialGoal.pocketIds
            : initialGoal.pocketId
              ? [initialGoal.pocketId]
              : [],
        );
        setTargetDate(initialGoal.targetDate || null);
        setIconKey(initialGoal.iconKey || "target");
        setHexColorsId(initialGoal.hexColorsId || "color_blue");
      } else {
        setName("");
        setNote("");
        setTargetAmountMinorUnits(1000000); // ₱10,000.00 default
        setCurrencyCode("PHP");
        setSelectedAccountIds([]);
        setSelectedPocketIds([]);
        setTargetDate(null);
        setIconKey("target");
        setHexColorsId("color_blue");
      }
      setErrorMessage(null);
      setFocusedFieldType(null);
      setHelpTopic(null);
    }
  }, [visible, initialGoal, refreshHexColors]);

  const handleSaveCustomColor = (input: HexColorInput) => {
    const created = addColor(input);
    setHexColorsId(created.id);
    setIsColorFormOpen(false);
    return true;
  };

  const selectedAccounts = useMemo(() => {
    const selectedSet = new Set(selectedAccountIds);
    return accounts.filter((a) => selectedSet.has(a.id));
  }, [accounts, selectedAccountIds]);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const selectedPockets = useMemo(() => {
    const selectedSet = new Set(selectedPocketIds);
    return pockets.filter((p) => selectedSet.has(p.id));
  }, [pockets, selectedPocketIds]);

  const totalLinkedBalance = useMemo(() => {
    const accSum = selectedAccounts.reduce(
      (sum, a) => sum + Math.max(0, a.currentBalanceMinorUnits),
      0,
    );
    const pockSum = selectedPockets.reduce(
      (sum, p) => sum + Math.max(0, p.currentBalanceMinorUnits),
      0,
    );
    return accSum + pockSum;
  }, [selectedAccounts, selectedPockets]);

  const selectedColorObj = hexColorsList.find(
    (c: HexColor) => c.id === hexColorsId,
  );
  const activeColorHex = selectedColorObj?.hex || theme.colors.primary;

  const removeAccount = (id: string) => {
    setSelectedAccountIds((prev) => prev.filter((accId) => accId !== id));
  };

  const removePocket = (id: string) => {
    setSelectedPocketIds((prev) => prev.filter((pId) => pId !== id));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage("Please enter a goal title.");
      return;
    }
    if (targetAmountMinorUnits <= 0) {
      setErrorMessage("Target amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const input: GoalInput = {
        name: name.trim(),
        note: note.trim() || null,
        targetAmountMinorUnits,
        currencyCode,
        accountIds: selectedAccountIds,
        pocketIds: selectedPocketIds,
        accountId: selectedAccountIds[0] ?? null,
        pocketId: selectedPocketIds[0] ?? null,
        targetDate,
        iconKey,
        hexColorsId,
        status: initialGoal?.status || "in_progress",
      };

      const saved = await onSave(input, initialGoal?.id ?? null);
      if (saved) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveRef = useWalkthroughTarget("goalFormSave");
  const formScrollRef =
    useRef<React.ComponentRef<typeof KeyboardAwareFormPreset>>(null);
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();
  const { isPromptDismissed } = useExperiencePreferences();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "goalFormSave") {
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

  const walkthrough = useGoalFormWalkthrough({
    onScrollToTarget: handleScrollToTarget,
  });

  useEffect(() => {
    if (
      didAutoStartWalkthroughRef.current ||
      initialGoal ||
      isPromptDismissed("goalFormWalkthroughDismissed")
    ) {
      return;
    }
    const timer = setTimeout(() => {
      didAutoStartWalkthroughRef.current = true;
      walkthrough.startWalkthrough();
    }, 700);
    return () => clearTimeout(timer);
  }, [initialGoal, isPromptDismissed, walkthrough.startWalkthrough]);

  return (
    <>
      <FullScreenFormModal
        onClose={onClose}
        onSave={() => {
          void handleSubmit();
        }}
        pending={submitting}
        saveButtonRef={saveRef}
        saveLabel={initialGoal ? "Update goal" : "Create goal"}
        title={initialGoal ? "Edit Goal" : "New Savings Goal"}
        titleAlign="left"
        visible={visible}
      >
        <DraggableTourChip
          onPress={walkthrough.startWalkthrough}
          visible={!walkthrough.isWalkthroughActive}
        />
        <KeyboardAwareFormPreset
          ref={formScrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          multilineContentContainerStyle={styles.scrollContentNoteFocused}
          multilineFocused={focusedFieldType === "description"}
          preset="fullScreenForm"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View
            collapsable={false}
            ref={scrollContentRef}
            style={styles.formFields}
          >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Goal Title */}
          <WalkthroughTarget id="goalFormTitle">
            <View style={styles.formField}>
              <Text style={styles.label}>Goal Title</Text>
              <TextInput
                onBlur={() => setFocusedFieldType(null)}
                onChangeText={setName}
                onFocus={() => setFocusedFieldType("normal")}
                placeholder="e.g. Emergency Fund, Japan Trip"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                value={name}
              />
            </View>
          </WalkthroughTarget>

          {/* Target Amount */}
          <WalkthroughTarget id="goalFormAmount">
            <View style={styles.formField}>
              <AmountCalculatorField
                amountMinorUnits={targetAmountMinorUnits}
                currencyCode={currencyCode}
                label="Target Amount"
                onOpenCalculator={() => setIsCalculatorOpen(true)}
                showSignToggle={false}
              />
            </View>
          </WalkthroughTarget>

          {/* Linked Accounts & Pockets */}
          <WalkthroughTarget id="goalFormLinked">
            <View style={styles.formField}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Linked Accounts & Pockets</Text>
                <HelpIconButton
                  accessibilityHint="Shows how linked accounts and pockets work"
                  accessibilityLabel="Linked accounts and pockets help"
                  onPress={() => setHelpTopic("linkedFunds")}
                />
              </View>

              {/* Selected Accounts & Pockets List / Chips */}
              {selectedAccounts.length > 0 || selectedPockets.length > 0 ? (
                <View style={styles.accountsCard}>
                  <View style={styles.accountsCardHeader}>
                    <Text style={styles.accountsCardHeaderTitle}>
                      {selectedAccounts.length > 0 && selectedPockets.length > 0
                        ? `${selectedAccounts.length} ${selectedAccounts.length === 1 ? "account" : "accounts"}, ${selectedPockets.length} ${selectedPockets.length === 1 ? "pocket" : "pockets"} linked`
                        : selectedAccounts.length > 0
                          ? `${selectedAccounts.length} ${selectedAccounts.length === 1 ? "account" : "accounts"} linked`
                          : `${selectedPockets.length} ${selectedPockets.length === 1 ? "pocket" : "pockets"} linked`}
                    </Text>
                    <Text style={styles.accountsCardHeaderBalance}>
                      {formatCurrency(totalLinkedBalance, currencyCode)}
                    </Text>
                  </View>

                  <View style={styles.accountChipsWrapper}>
                    {selectedAccounts.map((account) => (
                      <View key={`acc-${account.id}`} style={styles.accountChip}>
                        <View style={styles.accountChipLeft}>
                          <Landmark color={theme.colors.primary} size={14} />
                          <Text numberOfLines={1} style={styles.accountChipName}>
                            {account.name}
                          </Text>
                          <Text style={styles.accountChipBalance}>
                            ({formatCurrency(account.currentBalanceMinorUnits, account.currencyCode)})
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={`Unlink ${account.name}`}
                          hitSlop={6}
                          onPress={() => removeAccount(account.id)}
                          style={styles.accountChipRemove}
                        >
                          <X color={theme.colors.textMuted} size={14} />
                        </Pressable>
                      </View>
                    ))}

                    {selectedPockets.map((pocket) => {
                      const parent = accountById.get(pocket.accountId);
                      return (
                        <View key={`pock-${pocket.id}`} style={styles.accountChip}>
                          <View style={styles.accountChipLeft}>
                            <WalletCards color={theme.colors.info} size={14} />
                            <Text numberOfLines={1} style={styles.accountChipName}>
                              {pocket.name}
                            </Text>
                            <Text style={styles.accountChipBalance}>
                              ({parent?.name ? `${parent.name} • ` : ""}{formatCurrency(pocket.currentBalanceMinorUnits, parent?.currencyCode ?? "PHP")})
                            </Text>
                          </View>
                          <Pressable
                            accessibilityLabel={`Unlink ${pocket.name}`}
                            hitSlop={6}
                            onPress={() => removePocket(pocket.id)}
                            style={styles.accountChipRemove}
                          >
                            <X color={theme.colors.textMuted} size={14} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => setIsAccountPickerOpen(true)}
                    style={styles.manageAccountsButton}
                  >
                    <Plus color={theme.colors.primary} size={16} />
                    <Text style={styles.manageAccountsText}>
                      Add / Change Linked Funds
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsAccountPickerOpen(true)}
                  style={styles.pickerButton}
                >
                  <View style={styles.pickerLeft}>
                    <Landmark color={theme.colors.primary} size={18} />
                    <View>
                      <Text style={styles.pickerMainText}>
                        Link Accounts & Pockets
                      </Text>
                      <Text style={styles.pickerSubText}>
                        Optional — select accounts or pockets to track
                      </Text>
                    </View>
                  </View>
                  <ChevronRight color={theme.colors.textSecondary} size={18} />
                </Pressable>
              )}
            </View>
          </WalkthroughTarget>

          {/* Target Completion Date */}
          <WalkthroughTarget id="goalFormDate">
            <View style={styles.formField}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Target Date (Deadline)</Text>
                <HelpIconButton
                  accessibilityHint="Shows how the target deadline is used"
                  accessibilityLabel="Target deadline help"
                  onPress={() => setHelpTopic("targetDeadline")}
                />
              </View>
              <View style={styles.datePickerRow}>
                <Pressable
                  onPress={() => setIsDatePickerOpen(true)}
                  style={[styles.pickerButton, { flex: 1 }]}
                >
                  <View style={styles.pickerLeft}>
                    <Calendar color={theme.colors.primary} size={18} />
                    <Text style={styles.pickerMainText}>
                      {targetDate
                        ? targetDate.toLocaleDateString()
                        : "No deadline set"}
                    </Text>
                  </View>
                  <ChevronRight color={theme.colors.textSecondary} size={18} />
                </Pressable>
                {targetDate && (
                  <Pressable
                    onPress={() => setTargetDate(null)}
                    style={styles.clearDateButton}
                  >
                    <Text style={styles.clearDateText}>Clear</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </WalkthroughTarget>

          {/* Icon & Color Selection */}
          <View style={styles.formField}>
            <Text style={styles.label}>Icon & Appearance</Text>
            <View style={styles.appearanceCard}>
              <WalkthroughTarget id="goalFormIcon">
                <Pressable
                  accessibilityLabel={`Current icon: ${iconKey || "target"}. Tap to change icon.`}
                  accessibilityRole="button"
                  onPress={() => setIsIconPickerOpen(true)}
                  style={styles.iconSelectButton}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: `${activeColorHex}22`,
                        borderColor: `${activeColorHex}55`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={activeColorHex}
                      name={iconKey || "target"}
                      size={24}
                    />
                  </View>
                  <View
                    style={[
                      styles.changeIconBadge,
                      {
                        backgroundColor: `${theme.colors.primary}15`,
                        borderColor: `${theme.colors.primary}40`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.iconSelectText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Change Icon
                    </Text>
                  </View>
                </Pressable>
              </WalkthroughTarget>

              <WalkthroughTarget id="goalFormColor">
                <View style={styles.colorBlock}>
                  <Text style={styles.colorPaletteTitle}>Accent Color</Text>
                  <Text style={styles.colorHelperText}>
                    Choose a palette color or add your own.
                  </Text>
                  <View style={styles.colorPalette}>
                    {hexColorsList.map((entry: HexColor) => {
                      const isSelected = hexColorsId === entry.id;
                      return (
                        <Pressable
                          key={entry.id}
                          accessibilityLabel={`Accent color ${entry.name} (${entry.hex})`}
                          accessibilityRole="button"
                          onPress={() => setHexColorsId(entry.id)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: entry.hex },
                            isSelected
                              ? styles.colorSwatchSelected
                              : styles.colorSwatchUnselected,
                          ]}
                        >
                          {isSelected ? (
                            <Check
                              color={theme.colors.textInverse}
                              size={18}
                              strokeWidth={3}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityLabel="Add custom color"
                      accessibilityRole="button"
                      onPress={() => setIsColorFormOpen(true)}
                      style={({ pressed }) => [
                        styles.addColorSwatch,
                        { borderColor: theme.colors.primary },
                        pressed && styles.addColorSwatchPressed,
                      ]}
                    >
                      <Plus
                        color={theme.colors.primary}
                        size={16}
                        strokeWidth={2.5}
                      />
                    </Pressable>
                  </View>
                </View>
              </WalkthroughTarget>
            </View>
          </View>

          {/* Optional Notes */}
          <WalkthroughTarget id="goalFormNotes">
            <View style={styles.formField}>
              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                multiline
                numberOfLines={3}
                onBlur={() => setFocusedFieldType(null)}
                onChangeText={setNote}
                onFocus={() => setFocusedFieldType("description")}
                placeholder="Why this goal matters, milestones, or reminders..."
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, styles.textArea]}
                value={note}
              />
            </View>
          </WalkthroughTarget>
          </View>
        </KeyboardAwareFormPreset>
        <GoalFormWalkthroughOverlay
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

      <AmountCalculatorModal
          currencyCode={currencyCode}
          initialMinorUnits={targetAmountMinorUnits}
          onClose={() => setIsCalculatorOpen(false)}
          onConfirm={(minorUnits: number) => {
            setTargetAmountMinorUnits(minorUnits);
            setIsCalculatorOpen(false);
          }}
          title="Target Amount"
          visible={isCalculatorOpen}
        />

        {/* Multi-Account & Pocket Picker Modal */}
        <GoalAccountPickerModal
          accounts={accounts}
          pockets={pockets}
          onClose={() => setIsAccountPickerOpen(false)}
          onConfirm={(accountIds, pocketIds) => {
            setSelectedAccountIds(accountIds);
            setSelectedPocketIds(pocketIds);
          }}
          selectedAccountIds={selectedAccountIds}
          selectedPocketIds={selectedPocketIds}
          visible={isAccountPickerOpen}
        />

        <DatePickerModal
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDate={(isoString: string) => {
            setTargetDate(parseDateString(isoString));
            setIsDatePickerOpen(false);
          }}
          selectedDate={targetDate ? toDateString(targetDate) : undefined}
          title="Target Completion Date"
          visible={isDatePickerOpen}
        />

        <IconPickerModal
          onClose={() => setIsIconPickerOpen(false)}
          onSelectIcon={(icon) => {
            setIconKey(icon);
            setIsIconPickerOpen(false);
          }}
          selectedIcon={iconKey}
          themeColor={activeColorHex}
          visible={isIconPickerOpen}
        />

        <HexColorFormModal
          onClose={() => setIsColorFormOpen(false)}
          onSave={handleSaveCustomColor}
          visible={isColorFormOpen}
        />

        <InfoModal
          message={
            helpTopic === "linkedFunds"
              ? "Link accounts and/or pockets. Their combined live balances track progress towards this goal."
              : helpTopic === "targetDeadline"
                ? "Used to calculate required monthly savings pace."
                : ""
          }
          onClose={() => setHelpTopic(null)}
          title={
            helpTopic === "linkedFunds"
              ? "Linked Accounts & Pockets"
              : helpTopic === "targetDeadline"
                ? "Target Date (Deadline)"
                : ""
          }
          visible={helpTopic !== null}
        />

    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    formFields: {
      gap: theme.spacing.xl,
    },
    formField: {
      gap: theme.spacing.sm,
    },
    scrollContentNoteFocused: {
      paddingBottom: 160,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}30`,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    labelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: "top",
    },
    pickerButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    pickerMainText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pickerSubText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    accountsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    accountsCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    accountsCardHeaderTitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    accountsCardHeaderBalance: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountChipsWrapper: {
      gap: theme.spacing.xs,
    },
    accountChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    accountChipLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    accountChipName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      maxWidth: 140,
    },
    accountChipBalance: {
      color: theme.colors.textSecondary,
      fontSize: 11,
    },
    accountChipRemove: {
      padding: 2,
    },
    manageAccountsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: theme.spacing.xs,
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: theme.borderRadius.small,
      marginTop: 4,
    },
    manageAccountsText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    datePickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    clearDateButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    clearDateText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    appearanceCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    colorBlock: {
      gap: theme.spacing.xs,
    },
    colorHelperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs * 1.2,
    },
    iconSelectButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    changeIconBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    iconSelectText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    colorPaletteTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    colorPalette: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    colorSwatch: {
      alignItems: "center",
      justifyContent: "center",
    },
    colorSwatchUnselected: {
      borderRadius: 15,
      height: 30,
      opacity: 0.82,
      width: 30,
    },
    colorSwatchSelected: {
      borderColor: theme.colors.textInverse,
      borderRadius: 22,
      borderWidth: 2.5,
      height: 44,
      width: 44,
      ...theme.shadows.card,
    },
    addColorSwatch: {
      alignItems: "center",
      borderRadius: 15,
      borderStyle: "dashed",
      borderWidth: 1.5,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    addColorSwatchPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },
  });
}
