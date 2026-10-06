import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  ChevronRight,
  Landmark,
  Plus,
  Trash2,
  WalletCards,
  X,
} from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  AppButton,
  DatePickerModal,
  IconHelper,
  IconPickerModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useHexColors, type HexColor } from "@/modules/hex-colors";
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

export function GoalFormModal({
  visible,
  onClose,
  onSave,
  initialGoal = null,
}: GoalFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const { accounts, pockets } = useAccounts();
  const { colors: hexColorsList } = useHexColors();

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

  // Sub-modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
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
    }
  }, [visible, initialGoal]);

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

      await onSave(input, initialGoal?.id ?? null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save goal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close"
            hitSlop={8}
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={theme.colors.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {initialGoal ? "Edit Goal" : "New Savings Goal"}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Goal Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Goal Title</Text>
            <TextInput
              onChangeText={setName}
              placeholder="e.g. Emergency Fund, Japan Trip, New Laptop"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={name}
            />
          </View>

          {/* Target Amount */}
          <View style={styles.section}>
            <AmountCalculatorField
              amountMinorUnits={targetAmountMinorUnits}
              currencyCode={currencyCode}
              label="Target Amount"
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              showSignToggle={false}
            />
          </View>

          {/* Linked Accounts & Pockets */}
          <View style={styles.section}>
            <Text style={styles.label}>Linked Accounts & Pockets</Text>
            <Text style={styles.helperText}>
              Link accounts and/or pockets. Their combined live balances track progress towards this goal.
            </Text>

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

          {/* Target Completion Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Target Date (Deadline)</Text>
            <Text style={styles.helperText}>
              Used to calculate required monthly savings pace.
            </Text>
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

          {/* Icon & Color Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Icon & Appearance</Text>
            <View style={styles.appearanceRow}>
              <Pressable
                onPress={() => setIsIconPickerOpen(true)}
                style={styles.iconSelectButton}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${activeColorHex}22` },
                  ]}
                >
                  <IconHelper
                    color={activeColorHex}
                    name={iconKey || "target"}
                    size={24}
                  />
                </View>
                <Text style={styles.iconSelectText}>Change Icon</Text>
              </Pressable>

              <View style={styles.colorPaletteWrapper}>
                <Text style={styles.colorPaletteTitle}>Accent Color</Text>
                <View style={styles.colorPalette}>
                  {hexColorsList.slice(0, 10).map((entry: HexColor) => {
                    const isSelected = hexColorsId === entry.id;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => setHexColorsId(entry.id)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: entry.hex },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                      >
                        {isSelected && (
                          <Text style={styles.colorCheckMark}>✓</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Optional Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setNote}
              placeholder="Why this goal matters, milestones, or reminders..."
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.textArea]}
              value={note}
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <AppButton
            disabled={submitting}
            label={initialGoal ? "Update Goal" : "Create Goal"}
            loading={submitting}
            onPress={handleSubmit}
            variant="primary"
          />
        </View>

        {/* Sub-modals */}
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
          visible={isIconPickerOpen}
        />
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
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
    section: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginBottom: 4,
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
    appearanceRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    iconSelectButton: {
      alignItems: "center",
      gap: 6,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
      alignItems: "center",
      justifyContent: "center",
    },
    iconSelectText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    colorPaletteWrapper: {
      flex: 1,
    },
    colorPaletteTitle: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginBottom: 8,
      fontWeight: theme.typography.fontWeight.medium,
    },
    colorPalette: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    colorSwatchSelected: {
      borderWidth: 2,
      borderColor: theme.colors.onPrimary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    colorCheckMark: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold",
    },
    footer: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
