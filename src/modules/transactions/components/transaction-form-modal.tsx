import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AmountCalculatorModal,
  DatePickerModal,
  IconHelper,
} from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import type { Category } from "@/modules/categories/types/category.types";
import { formatCurrency } from "@/utils/currency";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionType,
} from "../types/transaction.types";

export interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTransaction: (input: CreateTransactionInput) => Promise<boolean>;
  onSaveTransfer: (input: CreateTransferInput) => Promise<boolean>;
  accounts: AccountListItem[];
  categories: Category[];
  pending?: boolean;
  error?: string | null;
}

function getTodayIsoString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransactionFormModal({
  visible,
  onClose,
  onSaveTransaction,
  onSaveTransfer,
  accounts,
  categories,
  pending = false,
  error = null,
}: TransactionFormModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [mode, setMode] = useState<TransactionType>("expense");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [amountMinorUnits, setAmountMinorUnits] = useState<number>(0);
  const [dateIsoString, setDateIsoString] = useState<string>(getTodayIsoString());
  const [note, setNote] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Sub-modal states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode("expense");
      const firstAccount = accounts.length > 0 ? accounts[0].id : "";
      setSelectedAccountId(firstAccount);
      setTransferToAccountId(accounts.length > 1 ? accounts[1].id : "");

      const defaultCategory = categories.find((c) => c.type === "expense");
      setSelectedCategoryId(defaultCategory ? defaultCategory.id : (categories[0]?.id ?? ""));

      setAmountMinorUnits(0);
      setDateIsoString(getTodayIsoString());
      setNote("");
      setLocalError(null);
    }
  }, [visible, accounts, categories]);

  // When mode changes, switch default category if applicable
  const handleModeChange = (newMode: TransactionType) => {
    setMode(newMode);
    setLocalError(null);
    if (newMode !== "transfer") {
      const match = categories.find((c) => c.type === newMode);
      if (match) {
        setSelectedCategoryId(match.id);
      }
    }
  };

  const filteredCategories = categories.filter((c) => c.type === mode);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const currencyCode = selectedAccount?.currencyCode ?? "PHP";

  const handleSave = async () => {
    if (amountMinorUnits <= 0) {
      setLocalError("Please enter an amount greater than zero.");
      return;
    }

    if (!selectedAccountId) {
      setLocalError("Please select an account.");
      return;
    }

    const [year, month, day] = dateIsoString.split("-").map(Number);
    const occurredAt = new Date(year, month - 1, day, 12, 0, 0);

    if (mode === "transfer") {
      if (!transferToAccountId) {
        setLocalError("Please select a destination account.");
        return;
      }
      if (selectedAccountId === transferToAccountId) {
        setLocalError("Cannot transfer funds to the same account.");
        return;
      }

      setLocalError(null);
      const success = await onSaveTransfer({
        fromAccountId: selectedAccountId,
        toAccountId: transferToAccountId,
        amountCents: amountMinorUnits,
        note: note.trim() || null,
        occurredAt,
      });

      if (success) {
        onClose();
      }
    } else {
      if (!selectedCategoryId) {
        setLocalError("Please select a category.");
        return;
      }

      setLocalError(null);
      const success = await onSaveTransaction({
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        type: mode,
        amountCents: amountMinorUnits,
        note: note.trim() || null,
        occurredAt,
      });

      if (success) {
        onClose();
      }
    }
  };

  const displayError = localError || error;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss transaction form"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Record Transaction</Text>
            <Pressable
              accessibilityLabel="Close form"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabBar}>
            {(["expense", "income", "transfer"] as const).map((tab) => {
              const active = mode === tab;
              const labels = {
                expense: "Expense",
                income: "Income",
                transfer: "Transfer",
              };

              return (
                <Pressable
                  key={tab}
                  accessibilityLabel={`Switch to ${labels[tab]}`}
                  accessibilityRole="button"
                  onPress={() => handleModeChange(tab)}
                  style={[
                    styles.tabItem,
                    active && styles.tabItemActive,
                    active &&
                      tab === "income" && {
                        backgroundColor: `${theme.colors.success}25`,
                      },
                    active &&
                      tab === "expense" && {
                        backgroundColor: `${theme.colors.danger}25`,
                      },
                    active &&
                      tab === "transfer" && {
                        backgroundColor: `${theme.colors.info}25`,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      active && styles.tabTextActive,
                      active &&
                        tab === "income" && {
                          color: theme.colors.success,
                        },
                      active &&
                        tab === "expense" && {
                          color: theme.colors.danger,
                        },
                      active &&
                        tab === "transfer" && {
                          color: theme.colors.info,
                        },
                    ]}
                  >
                    {labels[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Error Banner */}
          {displayError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
          >
            {/* Amount Field (Triggers Calculator Modal) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>AMOUNT ({currencyCode})</Text>
              <Pressable
                accessibilityLabel={`Amount ${formatCurrency(amountMinorUnits, currencyCode)}. Tap to calculate.`}
                accessibilityRole="button"
                onPress={() => setIsCalculatorOpen(true)}
                style={styles.amountDisplayCard}
              >
                <View>
                  <Text style={styles.amountLabelSmall}>Tap to enter or calculate</Text>
                  <Text
                    style={[
                      styles.amountBigValue,
                      amountMinorUnits > 0 && mode === "income" && {
                        color: theme.colors.success,
                      },
                      amountMinorUnits > 0 && mode === "expense" && {
                        color: theme.colors.danger,
                      },
                      amountMinorUnits > 0 && mode === "transfer" && {
                        color: theme.colors.info,
                      },
                    ]}
                  >
                    {formatCurrency(amountMinorUnits, currencyCode, true)}
                  </Text>
                </View>
                <View style={styles.calcIconBadge}>
                  <Text style={styles.calcIconText}>⌨</Text>
                </View>
              </Pressable>
            </View>

            {/* Account Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                {mode === "transfer" ? "TRANSFER FROM ACCOUNT" : "ACCOUNT"}
              </Text>
              {accounts.length === 0 ? (
                <Text style={styles.emptyPrompt}>
                  No accounts found. Create an account first.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        accessibilityLabel={`Select account ${acc.name}`}
                        accessibilityRole="button"
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {acc.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* If Transfer: Destination Account */}
            {mode === "transfer" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>TRANSFER TO ACCOUNT</Text>
                {accounts.length < 2 ? (
                  <Text style={styles.emptyPrompt}>
                    At least 2 accounts required for transfer.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {accounts.map((acc) => {
                      const isSelected = transferToAccountId === acc.id;
                      const isSameAsSource = selectedAccountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          accessibilityLabel={`Transfer to ${acc.name}`}
                          accessibilityRole="button"
                          disabled={isSameAsSource}
                          onPress={() => setTransferToAccountId(acc.id)}
                          style={[
                            styles.chip,
                            isSelected && styles.chipSelected,
                            isSameAsSource && styles.chipDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                              isSameAsSource && styles.chipTextDisabled,
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ) : (
              /* If Expense / Income: Category Selector */
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                {filteredCategories.length === 0 ? (
                  <Text style={styles.emptyPrompt}>
                    No {mode} categories found.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      const catColor =
                        cat.color && cat.color in theme.colors.categorical
                          ? theme.colors.categorical[cat.color as keyof AppTheme["colors"]["categorical"]]
                          : theme.colors.primary;

                      return (
                        <Pressable
                          key={cat.id}
                          accessibilityLabel={`Select category ${cat.name}`}
                          accessibilityRole="button"
                          onPress={() => setSelectedCategoryId(cat.id)}
                          style={[
                            styles.chip,
                            isSelected && {
                              backgroundColor: `${catColor}25`,
                              borderColor: catColor,
                            },
                          ]}
                        >
                          <IconHelper
                            color={isSelected ? catColor : theme.colors.textSecondary}
                            name={cat.icon}
                            size={14}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              { marginLeft: 6 },
                              isSelected && {
                                color: catColor,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Date Field (Triggers DatePickerModal) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <Pressable
                accessibilityLabel={`Selected date ${dateIsoString}. Tap to change.`}
                accessibilityRole="button"
                onPress={() => setIsDatePickerOpen(true)}
                style={styles.dateDisplayCard}
              >
                <View>
                  <Text style={styles.dateLabelSmall}>Transaction Date</Text>
                  <Text style={styles.dateValueText}>{dateIsoString}</Text>
                </View>
                <View style={styles.calendarIconBadge}>
                  <Text style={styles.calendarIconText}>📅</Text>
                </View>
              </Pressable>
            </View>

            {/* Note / Memo Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>NOTE / MEMO (OPTIONAL)</Text>
              <TextInput
                maxLength={200}
                onChangeText={setNote}
                placeholder="e.g. Grocery run at SM, Grab to airport..."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.noteInput}
                value={note}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={pending ? "Saving..." : "Save Record"}
              accessibilityRole="button"
              disabled={pending}
              onPress={handleSave}
              style={[styles.saveBtn, pending && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>
                {pending ? "Saving..." : "Save Record"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Sub-Modals: Amount Calculator & Date Picker */}
      <AmountCalculatorModal
        currencyCode={currencyCode}
        initialMinorUnits={amountMinorUnits}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          setAmountMinorUnits(minorUnits);
          setIsCalculatorOpen(false);
        }}
        title={`Enter ${mode.toUpperCase()} Amount`}
        visible={isCalculatorOpen}
      />

      <DatePickerModal
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={(iso) => {
          setDateIsoString(iso);
          setIsDatePickerOpen(false);
        }}
        selectedDate={dateIsoString}
        title="Select Transaction Date"
        visible={isDatePickerOpen}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "92%",
      paddingHorizontal: 20,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 500,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "bold",
    },
    tabBar: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      marginBottom: 16,
      padding: 4,
    },
    tabItem: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      flex: 1,
      paddingVertical: 8,
    },
    tabItemActive: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      fontWeight: "700",
    },
    errorBanner: {
      backgroundColor: "rgba(255, 92, 92, 0.15)",
      borderColor: theme.colors.danger,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
      padding: 10,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    formScroll: {
      maxHeight: 460,
    },
    inputGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    amountDisplayCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    amountLabelSmall: {
      color: theme.colors.textSecondary,
      fontSize: 11,
    },
    amountBigValue: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    calcIconBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    calcIconText: {
      fontSize: 18,
    },
    dateDisplayCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    dateLabelSmall: {
      color: theme.colors.textSecondary,
      fontSize: 11,
    },
    dateValueText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginTop: 2,
    },
    calendarIconBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    calendarIconText: {
      fontSize: 16,
    },
    chipsScroll: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipSelected: {
      backgroundColor: `${theme.colors.primary}22`,
      borderColor: theme.colors.primary,
    },
    chipDisabled: {
      opacity: 0.35,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    chipTextSelected: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    chipTextDisabled: {
      textDecorationLine: "line-through",
    },
    emptyPrompt: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontStyle: "italic",
    },
    noteInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 8,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      height: 46,
      justifyContent: "center",
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    saveBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      flex: 2,
      height: 46,
      justifyContent: "center",
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
