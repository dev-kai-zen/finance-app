import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import {
  AccountPickerModal,
  AmountCalculatorField,
  AmountCalculatorModal,
  CategoryPickerModal,
  IconHelper,
  KeyboardAwareForm,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import type { Category } from "@/modules/categories/types/category.types";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { applySignedAmount } from "@/utils/amount-sign";
import { formatCurrency } from "@/utils/currency";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionListItem,
  TransactionType,
  UpdateTransferInput,
} from "../types/transaction.types";
import { TransactionDateTimePickerModal } from "./transaction-date-time-picker-modal";

export interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTransaction: (input: CreateTransactionInput) => Promise<boolean>;
  onSaveTransfer: (input: CreateTransferInput) => Promise<boolean>;
  onUpdateTransaction?: (
    id: string,
    input: CreateTransactionInput,
  ) => Promise<boolean>;
  onUpdateTransfer?: (input: UpdateTransferInput) => Promise<boolean>;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  pending?: boolean;
  error?: string | null;
  initialTransaction?: TransactionListItem | null;
  isEditing?: boolean;
}

const SHORT_MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "Jun.",
  "Jul.",
  "Aug.",
  "Sep.",
  "Oct.",
  "Nov.",
  "Dec.",
] as const;

function getCurrentTransactionDate(): Date {
  const value = new Date();
  value.setSeconds(0, 0);
  return value;
}

function formatTransactionDate(value: Date): string {
  return `${SHORT_MONTHS[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
}

function formatTransactionTime(value: Date): string {
  return value.toLocaleTimeString(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
}

export function TransactionFormModal({
  visible,
  onClose,
  onSaveTransaction,
  onSaveTransfer,
  onUpdateTransaction,
  onUpdateTransfer,
  accounts,
  pockets,
  categories,
  pending = false,
  error = null,
  initialTransaction = null,
  isEditing = false,
}: TransactionFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [mode, setMode] = useState<TransactionType>("expense");
  const [name, setName] = useState<string>("");
  const [amountSign, setAmountSign] = useState<"+" | "-">("-");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [transferToPocketId, setTransferToPocketId] = useState<string | null>(null);
  const [amountMinorUnits, setAmountMinorUnits] = useState<number>(0);
  const [occurredAt, setOccurredAt] = useState<Date>(getCurrentTransactionDate);
  const [note, setNote] = useState<string>("");
  const [installmentEnabled, setInstallmentEnabled] = useState(false);
  const [installmentTerm, setInstallmentTerm] = useState("12");
  const [localError, setLocalError] = useState<string | null>(null);

  // Sub-modal states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [dateTimePickerMode, setDateTimePickerMode] = useState<"date" | "time" | null>(null);
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
        setSelectedPocketId(initialTransaction.pocketId);
        setTransferToAccountId(
          initialTransaction.transferAccountId ||
            (accounts.find((a) => a.id !== initialTransaction.accountId)?.id ?? "")
        );
        setTransferToPocketId(initialTransaction.transferPocketId);
        setSelectedCategoryId(initialTransaction.categoryId || "");
        setOccurredAt(
          initialTransaction.occurredAt
            ? new Date(initialTransaction.occurredAt)
            : getCurrentTransactionDate()
        );
        setNote(initialTransaction.note || "");
        setInstallmentEnabled(false);
        setInstallmentTerm("12");
        setLocalError(null);
      } else {
        setMode("expense");
        setName("");
        setAmountSign("-");
        const firstAccount = accounts.length > 0 ? accounts[0].id : "";
        setSelectedAccountId(firstAccount);
        setSelectedPocketId(null);
        setTransferToAccountId(accounts.length > 1 ? accounts[1].id : "");
        setTransferToPocketId(null);

        const defaultCategory = categories.find((c) => c.type === "expense");
        setSelectedCategoryId(defaultCategory ? defaultCategory.id : (categories[0]?.id ?? ""));

        setAmountMinorUnits(0);
        setOccurredAt(getCurrentTransactionDate());
        setNote("");
        setInstallmentEnabled(false);
        setInstallmentTerm("12");
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
  const selectedPocket = pockets.find((pocket) => pocket.id === selectedPocketId);
  const transferToPocket = pockets.find((pocket) => pocket.id === transferToPocketId);
  const selectedAccountBalance = selectedAccount
    ? selectedAccount.currentBalanceMinorUnits ?? selectedAccount.openingBalanceMinorUnits
    : 0;
  const transferToAccountBalance = transferToAccount
    ? transferToAccount.currentBalanceMinorUnits ?? transferToAccount.openingBalanceMinorUnits
    : 0;
  const selectedLocationBalance = selectedPocket
    ? selectedPocket.currentBalanceMinorUnits
    : selectedAccount?.pocketEnabled
      ? selectedAccountBalance -
        pockets
          .filter(
            (pocket) =>
              pocket.accountId === selectedAccount.id && !pocket.isArchived,
          )
          .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0)
      : selectedAccountBalance;
  const transferToLocationBalance = transferToPocket
    ? transferToPocket.currentBalanceMinorUnits
    : transferToAccount?.pocketEnabled
      ? transferToAccountBalance -
        pockets
          .filter(
            (pocket) =>
              pocket.accountId === transferToAccount.id && !pocket.isArchived,
          )
          .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0)
      : transferToAccountBalance;
  const currencyCode = selectedAccount?.currencyCode ?? "PHP";
  const canUseInstallments =
    mode === "expense" &&
    amountSign === "-" &&
    Boolean(selectedAccount?.creditCardDetails) &&
    !isEditing;

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

  const resolveEntityColor = useResolveEntityColor();
  const selectedCategoryColor = useMemo(() => {
    const colorKey = selectedCategory?.color || parentOfSelectedCategory?.color;
    return resolveEntityColor(colorKey);
  }, [selectedCategory, parentOfSelectedCategory, resolveEntityColor]);
  const selectedAccountColor = useMemo(
    () => accountColor(theme, selectedAccount?.accountType?.color ?? null),
    [selectedAccount, theme],
  );
  const transferToAccountColor = useMemo(
    () => accountColor(theme, transferToAccount?.accountType?.color ?? null),
    [transferToAccount, theme],
  );

  const handleDateTimeConfirm = (selectedValue: Date) => {
    setOccurredAt((currentValue) =>
      dateTimePickerMode === "date"
        ? new Date(
            selectedValue.getFullYear(),
            selectedValue.getMonth(),
            selectedValue.getDate(),
            currentValue.getHours(),
            currentValue.getMinutes(),
          )
        : new Date(
            currentValue.getFullYear(),
            currentValue.getMonth(),
            currentValue.getDate(),
            selectedValue.getHours(),
            selectedValue.getMinutes(),
          ),
    );
    setDateTimePickerMode(null);
  };

  const handleSave = async () => {
    if (amountMinorUnits <= 0) {
      setLocalError("Please enter an amount greater than zero.");
      return;
    }

    if (!selectedAccountId) {
      setLocalError("Please select an account.");
      return;
    }

    const transactionOccurredAt = new Date(occurredAt);

    if (mode === "transfer") {
      if (!transferToAccountId) {
        setLocalError("Please select a destination account.");
        return;
      }
      if (
        selectedAccountId === transferToAccountId &&
        selectedPocketId === transferToPocketId
      ) {
        setLocalError("Choose different pockets when transferring within one account.");
        return;
      }

      setLocalError(null);
      const transferInput: CreateTransferInput = {
        fromAccountId: selectedAccountId,
        toAccountId: transferToAccountId,
        fromPocketId: selectedPocketId,
        toPocketId: transferToPocketId,
        amountCents: Math.abs(amountMinorUnits),
        name: name.trim() || null,
        note: note.trim() || null,
        occurredAt: transactionOccurredAt,
      };
      const success =
        isEditing && initialTransaction && onUpdateTransfer
          ? await onUpdateTransfer({
              ...transferInput,
              transactionGroupId: initialTransaction.transactionGroupId ?? "",
            })
          : await onSaveTransfer(transferInput);

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

      if (canUseInstallments && installmentEnabled) {
        const termMonths = Number(installmentTerm);
        if (
          !Number.isInteger(termMonths) ||
          termMonths < 2 ||
          termMonths > 120
        ) {
          setLocalError("Installment term must be between 2 and 120 months.");
          return;
        }
      }

      setLocalError(null);
      const transactionInput: CreateTransactionInput = {
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        pocketId: selectedPocketId,
        type: mode,
        amountCents: signedAmount,
        name: name.trim() || null,
        note: note.trim() || null,
        occurredAt: transactionOccurredAt,
        installment:
          canUseInstallments && installmentEnabled
            ? { termMonths: Number(installmentTerm) }
            : null,
      };
      const success =
        isEditing && initialTransaction && onUpdateTransaction
          ? await onUpdateTransaction(initialTransaction.id, transactionInput)
          : await onSaveTransaction(transactionInput);

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
            {
              paddingBottom: Math.max(insets.bottom, 20),
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Transaction" : "Record Transaction"}
            </Text>
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
                        backgroundColor: theme.colors.success,
                      },
                    active &&
                      tab === "expense" && {
                        backgroundColor: theme.colors.danger,
                      },
                    active &&
                      tab === "transfer" && {
                        backgroundColor: theme.colors.info,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      active && styles.tabTextActive,
                      active &&
                        tab === "income" && {
                          color: theme.colors.textInverse,
                        },
                      active &&
                        tab === "expense" && {
                          color: theme.colors.textInverse,
                        },
                      active &&
                        tab === "transfer" && {
                          color: theme.colors.textInverse,
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

          <KeyboardAwareForm
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
          >
            <View style={styles.nameDateGroup}>
              <TextInput
                maxLength={100}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.nameInput}
                value={name}
              />
              <View style={styles.dateTimeRow}>
                <Pressable
                  accessibilityLabel={`Transaction date ${formatTransactionDate(occurredAt)}. Tap to change.`}
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => setDateTimePickerMode("date")}
                  style={({ pressed }) => [
                    styles.dateTimeButton,
                    pressed && styles.dateTimeButtonPressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.dateTimeText}>
                    {formatTransactionDate(occurredAt)}
                  </Text>
                </Pressable>
                <Text accessible={false} style={styles.dateTimeSeparator}>
                  |
                </Text>
                <Pressable
                  accessibilityLabel={`Transaction time ${formatTransactionTime(occurredAt)}. Tap to change.`}
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => setDateTimePickerMode("time")}
                  style={({ pressed }) => [
                    styles.dateTimeButton,
                    pressed && styles.dateTimeButtonPressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.dateTimeText}>
                    {formatTransactionTime(occurredAt)}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <AmountCalculatorField
                amountMinorUnits={amountMinorUnits}
                amountSign={mode === "transfer" ? "transfer" : amountSign}
                currencyCode={currencyCode}
                disabled={pending}
                label="Amount"
                showSignToggle={true}
                onOpenCalculator={() => setIsCalculatorOpen(true)}
                onToggleSign={
                  mode !== "transfer"
                    ? () => setAmountSign((prev) => (prev === "+" ? "-" : "+"))
                    : undefined
                }
              />
            </View>

            {/* Account Selector */}
            <View style={styles.inputGroup}>
              {mode === "transfer" ? (
                <Text style={styles.fieldLabel}>TRANSFER FROM</Text>
              ) : null}
              <Pressable
                accessibilityLabel={`Account location ${selectedAccount?.name ?? "none selected"}${selectedPocket ? `, ${selectedPocket.name}` : ""}. Tap to choose.`}
                accessibilityRole="button"
                onPress={() => setIsAccountPickerOpen(true)}
                style={styles.selectorCard}
              >
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.selectorIconWrap,
                      {
                        backgroundColor: `${selectedAccountColor}18`,
                        borderColor: `${selectedAccountColor}35`,
                      },
                    ]}
                  >
                    <IconHelper
                      name={selectedAccount?.iconKey ?? selectedAccount?.accountType?.iconKey ?? "wallet"}
                      size={18}
                      color={selectedAccountColor}
                    />
                  </View>
                  <View style={styles.selectorTextCol}>
                    <Text
                      style={
                        selectedAccount
                          ? styles.selectorValueText
                          : styles.selectorPlaceholderText
                      }
                    >
                      {selectedAccount
                        ? `${selectedAccount.name}${selectedAccount.pocketEnabled ? ` · ${selectedPocket?.name ?? "Available"}` : ""}`
                        : "Select Account"}
                    </Text>
                    {selectedAccount && (
                      <Text style={styles.selectorSubText}>
                        {selectedPocket
                          ? "Pocket balance"
                          : selectedAccount.pocketEnabled
                            ? "Available balance"
                            : selectedAccount.accountType?.name ?? "Account"} ·{" "}
                        {formatCurrency(
                          selectedLocationBalance,
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
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>TRANSFER TO</Text>
                  <Pressable
                  accessibilityLabel={`Destination account location ${transferToAccount?.name ?? "none selected"}${transferToPocket ? `, ${transferToPocket.name}` : ""}. Tap to choose.`}
                  accessibilityRole="button"
                  onPress={() => setIsTransferToAccountPickerOpen(true)}
                  style={styles.selectorCard}
                >
                  <View style={styles.selectorLeft}>
                    <View
                      style={[
                        styles.selectorIconWrap,
                        {
                          backgroundColor: `${transferToAccountColor}18`,
                          borderColor: `${transferToAccountColor}35`,
                        },
                      ]}
                    >
                      <IconHelper
                        name={transferToAccount?.iconKey ?? transferToAccount?.accountType?.iconKey ?? "landmark"}
                        size={18}
                        color={transferToAccountColor}
                      />
                    </View>
                    <View style={styles.selectorTextCol}>
                      <Text
                        style={
                          transferToAccount
                            ? styles.selectorValueText
                            : styles.selectorPlaceholderText
                        }
                      >
                        {transferToAccount
                          ? `${transferToAccount.name}${transferToAccount.pocketEnabled ? ` · ${transferToPocket?.name ?? "Available"}` : ""}`
                          : "Select Destination Account"}
                      </Text>
                      {transferToAccount && (
                        <Text style={styles.selectorSubText}>
                          {transferToPocket
                            ? "Pocket balance"
                            : transferToAccount.pocketEnabled
                              ? "Available balance"
                              : transferToAccount.accountType?.name ?? "Account"} ·{" "}
                          {formatCurrency(
                            transferToLocationBalance,
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
              </>
            ) : (
              /* If Expense / Income: Category Selector */
              <View style={styles.inputGroup}>
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

            {canUseInstallments ? (
              <View style={styles.installmentPanel}>
                <View style={styles.installmentHeader}>
                  <View style={styles.installmentHeaderText}>
                    <Text style={styles.installmentTitle}>Installment purchase</Text>
                    <Text style={styles.installmentDescription}>
                      The full purchase uses your credit limit now; one portion is
                      billed per statement.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Installment purchase"
                    onValueChange={setInstallmentEnabled}
                    trackColor={{
                      false: theme.colors.borderStrong,
                      true: theme.colors.primary,
                    }}
                    value={installmentEnabled}
                  />
                </View>
                {installmentEnabled ? (
                  <View style={styles.installmentTermRow}>
                    <Text style={styles.fieldLabel}>TERM IN MONTHS</Text>
                    <TextInput
                      accessibilityLabel="Installment term in months"
                      keyboardType="number-pad"
                      maxLength={3}
                      onChangeText={(value) =>
                        setInstallmentTerm(value.replace(/\D/g, ""))
                      }
                      placeholder="12"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.installmentTermInput}
                      value={installmentTerm}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Note / Memo Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>NOTE / MEMO (OPTIONAL)</Text>
              <TextInput
                maxLength={200}
                multiline
                onChangeText={setNote}
                placeholder="e.g. Grocery run at SM, Grab to airport..."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.noteInput}
                textAlignVertical="top"
                value={note}
              />
            </View>
          </KeyboardAwareForm>

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

      {/* Sub-Modals */}
      <AmountCalculatorModal
        currencyCode={currencyCode}
        initialMinorUnits={amountMinorUnits}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          setAmountMinorUnits(Math.abs(minorUnits));
          setIsCalculatorOpen(false);
        }}
        title={`Enter ${mode.toUpperCase()} Amount`}
        visible={isCalculatorOpen}
      />

      <TransactionDateTimePickerModal
        mode={dateTimePickerMode ?? "date"}
        onClose={() => setDateTimePickerMode(null)}
        onConfirm={handleDateTimeConfirm}
        value={occurredAt}
        visible={dateTimePickerMode !== null}
      />

      <AccountPickerModal
        accounts={accounts}
        pockets={pockets}
        onClose={() => setIsAccountPickerOpen(false)}
        onSelectLocation={(acc, pocketId) => {
          setSelectedAccountId(acc.id);
          setSelectedPocketId(pocketId);
        }}
        selectedAccountId={selectedAccountId}
        selectedPocketId={selectedPocketId}
        title={mode === "transfer" ? "Select Source Account" : "Select Account"}
        visible={isAccountPickerOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        pockets={pockets}
        onClose={() => setIsTransferToAccountPickerOpen(false)}
        onSelectLocation={(acc, pocketId) => {
          setTransferToAccountId(acc.id);
          setTransferToPocketId(pocketId);
        }}
        selectedAccountId={transferToAccountId}
        selectedPocketId={transferToPocketId}
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
      backgroundColor: theme.colors.overlay,
      flex: 1,
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
      flex: 1,
      paddingHorizontal: 20,
      width: "100%",
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
      backgroundColor: `${theme.colors.danger}26`,
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
      flex: 1,
    },
    inputGroup: {
      marginBottom: 16,
    },
    nameDateGroup: {
      marginBottom: 16,
    },
    installmentPanel: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: 16,
      padding: 14,
    },
    installmentHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    installmentHeaderText: {
      flex: 1,
    },
    installmentTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    installmentDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    installmentTermRow: {
      marginTop: 12,
    },
    installmentTermInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 10,
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
    dateTimeRow: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "flex-start",
      marginTop: theme.spacing.xs,
    },
    dateTimeButton: {
      borderRadius: theme.borderRadius.small,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: theme.spacing.xs,
    },
    dateTimeSeparator: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.md,
      paddingHorizontal: theme.spacing.xxs,
    },
    dateTimeButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    dateTimeText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.medium,
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
      minHeight: 92,
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
      backgroundColor: `${theme.colors.primary}24`,
      borderColor: `${theme.colors.primary}65`,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    selectorChangeText: {
      color: theme.colors.primary,
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
