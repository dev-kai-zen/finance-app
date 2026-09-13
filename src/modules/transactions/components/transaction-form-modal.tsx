import React, { useEffect, useMemo, useState } from "react";
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
import { ChevronRight } from "lucide-react-native";
import {
  AccountPickerModal,
  AmountCalculatorModal,
  CategoryPickerModal,
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
  TransactionListItem,
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
  initialTransaction?: TransactionListItem | null;
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
  initialTransaction = null,
}: TransactionFormModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [mode, setMode] = useState<TransactionType>("expense");
  const [name, setName] = useState<string>("");
  const [amountSign, setAmountSign] = useState<"+" | "-">("-");
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
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isTransferToAccountPickerOpen, setIsTransferToAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialTransaction) {
        setMode(initialTransaction.type);
        setName(initialTransaction.name || "");
        const isNeg = initialTransaction.amountCents < 0;
        setAmountSign(isNeg ? "-" : "+");
        setAmountMinorUnits(Math.abs(initialTransaction.amountCents));
        setSelectedAccountId(initialTransaction.accountId);
        setTransferToAccountId(
          initialTransaction.transferAccountId ||
            (accounts.find((a) => a.id !== initialTransaction.accountId)?.id ?? "")
        );
        setSelectedCategoryId(initialTransaction.categoryId || "");
        setDateIsoString(
          initialTransaction.occurredAt
            ? new Date(initialTransaction.occurredAt).toISOString().split("T")[0]
            : getTodayIsoString()
        );
        setNote(initialTransaction.note || "");
        setLocalError(null);
      } else {
        setMode("expense");
        setName("");
        setAmountSign("-");
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
    }
  }, [visible, initialTransaction, accounts, categories]);

  // When mode changes, switch default category and sign
  const handleModeChange = (newMode: TransactionType) => {
    setMode(newMode);
    setLocalError(null);
    if (newMode === "expense") {
      setAmountSign("-");
    } else if (newMode === "income") {
      setAmountSign("+");
    } else {
      setAmountSign("+");
    }
    if (newMode !== "transfer") {
      const match = categories.find((c) => c.type === newMode);
      if (match) {
        setSelectedCategoryId(match.id);
      }
    }
  };

  const filteredCategories = categories.filter((c) => c.type === mode);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const transferToAccount = accounts.find((a) => a.id === transferToAccountId);
  const currencyCode = selectedAccount?.currencyCode ?? "PHP";

  const selectedCategory = useMemo(() => {
    for (const cat of categories) {
      if (cat.id === selectedCategoryId) return cat;
      if (cat.subcategories) {
        const sub = cat.subcategories.find((s) => s.id === selectedCategoryId);
        if (sub) return sub;
      }
    }
    return null;
  }, [categories, selectedCategoryId]);

  const parentOfSelectedCategory = useMemo(() => {
    if (!selectedCategory || !selectedCategory.parentId) return null;
    return categories.find((c) => c.id === selectedCategory.parentId) ?? null;
  }, [categories, selectedCategory]);

  const selectedCategoryColor = useMemo(() => {
    const colorKey = selectedCategory?.color || parentOfSelectedCategory?.color;
    if (!colorKey) return theme.colors.primary;
    const catColors = theme.colors.categorical as Record<string, string>;
    return catColors[colorKey] ?? theme.colors.primary;
  }, [selectedCategory, parentOfSelectedCategory, theme.colors]);

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
        amountCents: Math.abs(amountMinorUnits),
        name: name.trim() || null,
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

      const signedAmount =
        amountSign === "-" ? -Math.abs(amountMinorUnits) : Math.abs(amountMinorUnits);

      setLocalError(null);
      const success = await onSaveTransaction({
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        type: mode,
        amountCents: signedAmount,
        name: name.trim() || null,
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
            {/* Transaction Title / Payee Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>TRANSACTION TITLE / PAYEE</Text>
              <TextInput
                maxLength={100}
                onChangeText={setName}
                placeholder={
                  mode === "transfer"
                    ? "e.g. Monthly Savings Allocation, Card Payment..."
                    : mode === "income"
                      ? "e.g. Salary Payout, Freelance Project, Dividend..."
                      : "e.g. Grocery run at SM, Starbucks, Electric Bill..."
                }
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.nameInput}
                value={name}
              />
            </View>

            {/* Amount Field (with Sign Toggle + Calculator Modal) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>AMOUNT ({currencyCode})</Text>
              <View style={styles.amountRowContainer}>
                {mode !== "transfer" && (
                  <Pressable
                    accessibilityLabel={`Toggle amount sign. Currently ${amountSign === "+" ? "positive" : "negative"}`}
                    accessibilityRole="button"
                    onPress={() => setAmountSign((prev) => (prev === "+" ? "-" : "+"))}
                    style={[
                      styles.signToggleBtn,
                      amountSign === "+" ? styles.signTogglePositive : styles.signToggleNegative,
                    ]}
                  >
                    <Text
                      style={[
                        styles.signToggleText,
                        amountSign === "+" ? styles.signToggleTextPositive : styles.signToggleTextNegative,
                      ]}
                    >
                      {amountSign}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityLabel={`Amount ${mode !== "transfer" ? amountSign : ""}${formatCurrency(amountMinorUnits, currencyCode)}. Tap to calculate.`}
                  accessibilityRole="button"
                  onPress={() => setIsCalculatorOpen(true)}
                  style={[styles.amountDisplayCard, { flex: 1 }]}
                >
                  <View>
                    <Text style={styles.amountLabelSmall}>Tap to enter or calculate</Text>
                    <Text
                      style={[
                        styles.amountBigValue,
                        amountSign === "+" && mode === "income" && {
                          color: theme.colors.success,
                        },
                        amountSign === "-" && {
                          color: theme.colors.danger,
                        },
                        amountSign === "+" && mode === "expense" && {
                          color: theme.colors.success,
                        },
                        mode === "transfer" && {
                          color: theme.colors.info,
                        },
                      ]}
                    >
                      {mode !== "transfer" ? `${amountSign} ` : ""}
                      {formatCurrency(Math.abs(amountMinorUnits), currencyCode, false)}
                    </Text>
                  </View>
                  <View style={styles.calcIconBadge}>
                    <Text style={styles.calcIconText}>⌨</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Account Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                {mode === "transfer" ? "TRANSFER FROM ACCOUNT" : "ACCOUNT"}
              </Text>
              <Pressable
                accessibilityLabel={`Account ${selectedAccount?.name ?? "none selected"}. Tap to choose account.`}
                accessibilityRole="button"
                onPress={() => setIsAccountPickerOpen(true)}
                style={styles.selectorCard}
              >
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.selectorIconWrap,
                      {
                        backgroundColor: `${selectedAccount?.accountType?.color ?? theme.colors.primary}18`,
                        borderColor: `${selectedAccount?.accountType?.color ?? theme.colors.primary}35`,
                      },
                    ]}
                  >
                    <IconHelper
                      name={selectedAccount?.accountType?.iconKey ?? "wallet"}
                      size={18}
                      color={selectedAccount?.accountType?.color ?? theme.colors.primary}
                    />
                  </View>
                  <View style={styles.selectorTextCol}>
                    <Text
                      numberOfLines={1}
                      style={
                        selectedAccount
                          ? styles.selectorValueText
                          : styles.selectorPlaceholderText
                      }
                    >
                      {selectedAccount?.name ?? "Select Account"}
                    </Text>
                    {selectedAccount && (
                      <Text style={styles.selectorSubText}>
                        {selectedAccount.accountType?.name ?? "Account"} ·{" "}
                        {formatCurrency(
                          selectedAccount.currentBalanceMinorUnits ??
                            selectedAccount.openingBalanceMinorUnits,
                          selectedAccount.currencyCode,
                        )}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.selectorChangeBadge}>
                  <Text style={styles.selectorChangeText}>Change</Text>
                  <ChevronRight size={14} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            </View>

            {/* If Transfer: Destination Account */}
            {mode === "transfer" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>TRANSFER TO ACCOUNT</Text>
                <Pressable
                  accessibilityLabel={`Destination account ${transferToAccount?.name ?? "none selected"}. Tap to choose account.`}
                  accessibilityRole="button"
                  onPress={() => setIsTransferToAccountPickerOpen(true)}
                  style={styles.selectorCard}
                >
                  <View style={styles.selectorLeft}>
                    <View
                      style={[
                        styles.selectorIconWrap,
                        {
                          backgroundColor: `${transferToAccount?.accountType?.color ?? theme.colors.primary}18`,
                          borderColor: `${transferToAccount?.accountType?.color ?? theme.colors.primary}35`,
                        },
                      ]}
                    >
                      <IconHelper
                        name={transferToAccount?.accountType?.iconKey ?? "landmark"}
                        size={18}
                        color={transferToAccount?.accountType?.color ?? theme.colors.primary}
                      />
                    </View>
                    <View style={styles.selectorTextCol}>
                      <Text
                        numberOfLines={1}
                        style={
                          transferToAccount
                            ? styles.selectorValueText
                            : styles.selectorPlaceholderText
                        }
                      >
                        {transferToAccount?.name ?? "Select Destination Account"}
                      </Text>
                      {transferToAccount && (
                        <Text style={styles.selectorSubText}>
                          {transferToAccount.accountType?.name ?? "Account"} ·{" "}
                          {formatCurrency(
                            transferToAccount.currentBalanceMinorUnits ??
                              transferToAccount.openingBalanceMinorUnits,
                            transferToAccount.currencyCode,
                          )}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.selectorChangeBadge}>
                    <Text style={styles.selectorChangeText}>Change</Text>
                    <ChevronRight size={14} color={theme.colors.textSecondary} />
                  </View>
                </Pressable>
              </View>
            ) : (
              /* If Expense / Income: Category Selector */
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <Pressable
                  accessibilityLabel={`Category ${selectedCategory?.name ?? "none selected"}. Tap to choose category.`}
                  accessibilityRole="button"
                  onPress={() => setIsCategoryPickerOpen(true)}
                  style={styles.selectorCard}
                >
                  <View style={styles.selectorLeft}>
                    <View
                      style={[
                        styles.selectorIconWrap,
                        {
                          backgroundColor: `${selectedCategoryColor}18`,
                          borderColor: `${selectedCategoryColor}35`,
                        },
                      ]}
                    >
                      <IconHelper
                        name={selectedCategory?.icon ?? "tag"}
                        size={18}
                        color={selectedCategoryColor}
                      />
                    </View>
                    <View style={styles.selectorTextCol}>
                      <Text
                        numberOfLines={1}
                        style={
                          selectedCategory
                            ? styles.selectorValueText
                            : styles.selectorPlaceholderText
                        }
                      >
                        {selectedCategory?.name ?? "Select Category"}
                      </Text>
                      {selectedCategory && (
                        <Text style={styles.selectorSubText}>
                          {parentOfSelectedCategory
                            ? `${parentOfSelectedCategory.name} > Subcategory`
                            : mode === "expense"
                              ? "Expense Category"
                              : "Income Category"}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.selectorChangeBadge}>
                    <Text style={styles.selectorChangeText}>Change</Text>
                    <ChevronRight size={14} color={theme.colors.textSecondary} />
                  </View>
                </Pressable>
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
          if (minorUnits < 0) {
            setAmountMinorUnits(Math.abs(minorUnits));
            setAmountSign("-");
          } else {
            setAmountMinorUnits(minorUnits);
          }
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

      <AccountPickerModal
        accounts={accounts}
        onClose={() => setIsAccountPickerOpen(false)}
        onSelectAccount={(acc) => {
          setSelectedAccountId(acc.id);
          if (mode === "transfer" && transferToAccountId === acc.id) {
            setTransferToAccountId("");
          }
        }}
        selectedAccountId={selectedAccountId}
        title={mode === "transfer" ? "Select Source Account" : "Select Account"}
        visible={isAccountPickerOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        excludeAccountId={selectedAccountId}
        onClose={() => setIsTransferToAccountPickerOpen(false)}
        onSelectAccount={(acc) => setTransferToAccountId(acc.id)}
        selectedAccountId={transferToAccountId}
        title="Select Destination Account"
        visible={isTransferToAccountPickerOpen}
      />

      <CategoryPickerModal
        categories={categories}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelectCategory={(cat) => setSelectedCategoryId(cat.id)}
        selectedCategoryId={selectedCategoryId}
        title={mode === "income" ? "Select Income Category" : "Select Expense Category"}
        type={mode === "income" ? "income" : "expense"}
        visible={isCategoryPickerOpen}
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
    nameInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    amountRowContainer: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    signToggleBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 2,
      height: 56,
      justifyContent: "center",
      width: 56,
    },
    signTogglePositive: {
      backgroundColor: `${theme.colors.success}18`,
      borderColor: theme.colors.success,
    },
    signToggleNegative: {
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: theme.colors.danger,
    },
    signToggleText: {
      fontSize: 26,
      fontWeight: "800",
      lineHeight: 28,
    },
    signToggleTextPositive: {
      color: theme.colors.success,
    },
    signToggleTextNegative: {
      color: theme.colors.danger,
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
    selectorCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 58,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectorLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 12,
      marginRight: 10,
    },
    selectorIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    selectorTextCol: {
      flex: 1,
    },
    selectorValueText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    selectorPlaceholderText: {
      color: theme.colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
    selectorSubText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    selectorChangeBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    selectorChangeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
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
