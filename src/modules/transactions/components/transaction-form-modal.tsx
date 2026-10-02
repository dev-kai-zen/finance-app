import React, { useEffect, useMemo, useState } from "react";
import { Checkbox, Host } from "@expo/ui";
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
import { ChevronRight, Paperclip, Sparkles } from "lucide-react-native";
import {
  AccountPickerModal,
  AmountCalculatorField,
  AmountCalculatorModal,
  CategoryPickerModal,
  IconHelper,
  KeyboardAwareForm,
  NotificationModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts";
import { accountColor } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { applySignedAmount } from "@/utils/amount-sign";
import { formatCurrency } from "@/utils/currency";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionAttachmentChanges,
  TransactionListItem,
  TransactionType,
  UpdateTransferInput,
} from "../types/transaction.types";
import type {
  TransactionPreset,
  TransactionPresetInput,
  TransactionPresetSubmission,
} from "../types/transaction-preset.types";
import { normalizeQuickPresetTransactionName } from "../services/save-transaction-preset.service";
import { TransactionDateTimePickerModal } from "./transaction-date-time-picker-modal";
import { TransactionTypePicker } from "./transaction-type-picker";
import { QuickPresetsModal } from "./quick-presets-modal";
import { QuickPresetSuggestions } from "./quick-preset-suggestions";
import { TransactionAttachmentManagerModal } from "./transaction-attachment-manager-modal";
import { useTransactionAttachmentDraft } from "../hooks/use-transaction-attachments";

export interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTransaction: (
    input: CreateTransactionInput,
    preset?: TransactionPresetSubmission,
    attachmentChanges?: TransactionAttachmentChanges,
  ) => Promise<boolean>;
  onSaveTransfer: (
    input: CreateTransferInput,
    preset?: TransactionPresetSubmission,
    attachmentChanges?: TransactionAttachmentChanges,
  ) => Promise<boolean>;
  onUpdateTransaction?: (
    id: string,
    input: CreateTransactionInput,
    attachmentChanges?: TransactionAttachmentChanges,
  ) => Promise<boolean>;
  onUpdateTransfer?: (
    input: UpdateTransferInput,
    attachmentChanges?: TransactionAttachmentChanges,
  ) => Promise<boolean>;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  presets: TransactionPreset[];
  presetsLoading?: boolean;
  presetPending?: boolean;
  presetError?: string | null;
  onClearError?: () => void;
  onClearPresetError: () => void;
  onSavePreset: (
    input: TransactionPresetInput,
    id?: string,
  ) => Promise<boolean>;
  onDeletePreset: (id: string) => Promise<boolean>;
  onReorderPresets: (orderedIds: string[]) => Promise<boolean>;
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
  presets,
  presetsLoading = false,
  presetPending = false,
  presetError = null,
  onClearError,
  onClearPresetError,
  onSavePreset,
  onDeletePreset,
  onReorderPresets,
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
  const [saveAsQuickPreset, setSaveAsQuickPreset] = useState(false);
  const [includePresetAmount, setIncludePresetAmount] = useState(true);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [suggestionsSuppressed, setSuggestionsSuppressed] = useState(false);

  // Sub-modal states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [dateTimePickerMode, setDateTimePickerMode] = useState<"date" | "time" | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isTransferToAccountPickerOpen, setIsTransferToAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isQuickPresetsOpen, setIsQuickPresetsOpen] = useState(false);
  const [isAttachmentManagerOpen, setIsAttachmentManagerOpen] = useState(false);
  const attachmentDraft = useTransactionAttachmentDraft({
    visible,
    isEditing,
    transactionId: initialTransaction?.id,
  });

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
      setSaveAsQuickPreset(false);
      setIncludePresetAmount(true);
      setAppliedPresetId(null);
      setSuggestionsSuppressed(false);
      setIsQuickPresetsOpen(false);
      setIsAttachmentManagerOpen(false);
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
  const matchingPreset = useMemo(() => {
    const normalizedName = normalizeQuickPresetTransactionName(name);
    if (!normalizedName) return null;
    return (
      presets.find(
        (preset) =>
          preset.id !== appliedPresetId &&
          normalizeQuickPresetTransactionName(preset.transactionName) ===
          normalizedName,
      ) ?? null
    );
  }, [appliedPresetId, name, presets]);

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

  const applyQuickPreset = (preset: TransactionPreset) => {
    setMode(preset.type);
    setName(preset.transactionName);
    setSelectedAccountId(preset.accountId);
    setSelectedPocketId(preset.pocketId);
    setSelectedCategoryId(preset.categoryId ?? "");
    setTransferToAccountId(preset.toAccountId ?? "");
    setTransferToPocketId(preset.toPocketId);
    setAmountMinorUnits(Math.abs(preset.amountCents ?? 0));
    setAmountSign(
      preset.type === "expense"
        ? preset.amountCents !== null && preset.amountCents > 0
          ? "+"
          : "-"
        : "+",
    );
    setNote(preset.note ?? "");
    setOccurredAt(getCurrentTransactionDate());
    setInstallmentEnabled(false);
    setInstallmentTerm("12");
    setSaveAsQuickPreset(false);
    setAppliedPresetId(preset.id);
    setSuggestionsSuppressed(true);
    setIsQuickPresetsOpen(false);
    setLocalError(null);
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

    if (!isEditing && saveAsQuickPreset && !name.trim()) {
      setLocalError("Enter a transaction name to save a Quick Preset.");
      return;
    }

    const presetSubmission: TransactionPresetSubmission | undefined = isEditing
      ? undefined
      : saveAsQuickPreset
        ? {
            saveRequest: {
              includeAmount: includePresetAmount,
              existingPresetId: matchingPreset?.id ?? null,
            },
          }
        : appliedPresetId
          ? { appliedPresetId }
          : undefined;

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
          ? await onUpdateTransfer(
              {
                ...transferInput,
                transactionGroupId: initialTransaction.transactionGroupId ?? "",
              },
              attachmentDraft.changes,
            )
          : await onSaveTransfer(
              transferInput,
              presetSubmission,
              attachmentDraft.changes,
            );

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
          ? await onUpdateTransaction(
              initialTransaction.id,
              transactionInput,
              attachmentDraft.changes,
            )
          : await onSaveTransaction(
              transactionInput,
              presetSubmission,
              attachmentDraft.changes,
            );

      if (success) {
        onClose();
      }
    }
  };

  const displayError = localError || error;
  const dismissNotification = () => {
    setLocalError(null);
    onClearError?.();
  };

  return (
    <>
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

          {!isEditing ? (
            <Pressable
              accessibilityLabel="Open Quick Presets"
              accessibilityRole="button"
              disabled={pending || presetPending}
              onPress={() => setIsQuickPresetsOpen(true)}
              style={styles.quickPresetsButton}
            >
              <Sparkles color={theme.colors.primary} size={16} />
              <Text style={styles.quickPresetsButtonText}>Quick Presets</Text>
              {presets.length > 0 ? (
                <View style={styles.quickPresetsCount}>
                  <Text style={styles.quickPresetsCountText}>{presets.length}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          <View style={styles.typePickerSpacing}>
            <TransactionTypePicker
              disabled={pending}
              onChange={handleModeChange}
              value={mode}
            />
          </View>

          <KeyboardAwareForm
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
          >
            <View style={styles.nameDateGroup}>
              <View style={styles.nameSuggestionAnchor}>
                <View style={styles.nameInputContainer}>
                  <TextInput
                    maxLength={100}
                    onChangeText={(value) => {
                      setName(value);
                      setSuggestionsSuppressed(false);
                    }}
                    placeholder="Name"
                    placeholderTextColor={theme.colors.textSecondary}
                    style={styles.nameInput}
                    value={name}
                  />
                </View>
                {!isEditing && !suggestionsSuppressed ? (
                  <QuickPresetSuggestions
                    accounts={accounts}
                    categories={categories}
                    onSelect={applyQuickPreset}
                    pockets={pockets}
                    presets={presets}
                    value={name}
                  />
                ) : null}
              </View>
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
              <Pressable
                accessibilityLabel={
                  attachmentDraft.totalCount > 0
                    ? `View ${attachmentDraft.totalCount} attachments`
                    : "Add attachment"
                }
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setIsAttachmentManagerOpen(true)}
                style={styles.attachmentSummary}
              >
                <Paperclip color={theme.colors.primary} size={16} />
                <Text style={styles.attachmentSummaryText}>
                  {attachmentDraft.totalCount > 0
                    ? `Attachments (${attachmentDraft.totalCount})`
                    : "Add attachment"}
                </Text>
                <Text style={styles.attachmentSummaryAction}>
                  {attachmentDraft.totalCount > 0 ? "View all" : "Add"}
                </Text>
              </Pressable>
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

            {!isEditing && !appliedPresetId ? (
              <View style={styles.quickPresetSavePanel}>
                <Host matchContents style={styles.quickPresetCheckbox}>
                  <Checkbox
                    disabled={pending || !name.trim()}
                    label={
                      matchingPreset
                        ? "Update matching Quick Preset"
                        : "Save as a Quick Preset"
                    }
                    onValueChange={setSaveAsQuickPreset}
                    value={saveAsQuickPreset}
                  />
                </Host>
                <Text style={styles.quickPresetHelp}>
                  {matchingPreset
                    ? `Reuse this name by updating “${matchingPreset.transactionName}” with the current details.`
                    : name.trim()
                      ? "Reuse these details when you type this transaction name."
                      : "Enter a transaction name to enable Quick Presets."}
                </Text>
                {saveAsQuickPreset ? (
                  <Host matchContents style={styles.quickPresetCheckbox}>
                    <Checkbox
                      disabled={pending}
                      label="Include amount"
                      onValueChange={setIncludePresetAmount}
                      value={includePresetAmount}
                    />
                  </Host>
                ) : null}
              </View>
            ) : appliedPresetId ? (
              <View style={styles.appliedPresetBanner}>
                <Sparkles color={theme.colors.primary} size={15} />
                <Text style={styles.appliedPresetText}>
                  Quick Preset applied. Review the details before saving.
                </Text>
              </View>
            ) : null}
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

      <QuickPresetsModal
        accounts={accounts}
        categories={categories}
        error={presetError}
        loading={presetsLoading}
        onClearError={onClearPresetError}
        onClose={() => setIsQuickPresetsOpen(false)}
        onDelete={onDeletePreset}
        onReorder={onReorderPresets}
        onSave={onSavePreset}
        onSelect={applyQuickPreset}
        pending={presetPending}
        pockets={pockets}
        presets={presets}
        visible={isQuickPresetsOpen}
      />
      </Modal>

      <TransactionAttachmentManagerModal
        error={attachmentDraft.error}
        items={attachmentDraft.items}
        loadingMore={attachmentDraft.loadingMore}
        onAdd={attachmentDraft.addDrafts}
        onClearError={attachmentDraft.clearError}
        onClose={() => setIsAttachmentManagerOpen(false)}
        onLoadMore={attachmentDraft.loadMore}
        onOpen={attachmentDraft.openItem}
        onRemove={attachmentDraft.removeItem}
        totalCount={attachmentDraft.totalCount}
        visible={visible && isAttachmentManagerOpen}
      />

      <NotificationModal
        message={displayError ?? ""}
        onClose={dismissNotification}
        title={localError ? "Check transaction details" : "Unable to save transaction"}
        variant={localError ? "warning" : "error"}
        visible={visible && Boolean(displayError)}
      />
    </>
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
    quickPresetsButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      minHeight: 34,
      paddingHorizontal: theme.spacing.sm,
    },
    quickPresetsButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    quickPresetsCount: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
      height: 20,
      justifyContent: "center",
      minWidth: 20,
      paddingHorizontal: 5,
    },
    quickPresetsCountText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
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
    typePickerSpacing: {
      marginBottom: 16,
    },
    formScroll: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: 16,
    },
    nameDateGroup: {
      marginBottom: 16,
      zIndex: 30,
    },
    nameSuggestionAnchor: {
      position: "relative",
      zIndex: 40,
    },
    nameInputContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
    },
    attachmentSummary: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    attachmentSummaryText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    attachmentSummaryAction: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
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
      color: theme.colors.textPrimary,
      flex: 1,
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
    quickPresetSavePanel: {
      backgroundColor: `${theme.colors.primary}0D`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    quickPresetCheckbox: { alignSelf: "flex-start" },
    quickPresetHelp: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      paddingHorizontal: 2,
    },
    appliedPresetBanner: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}0D`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    appliedPresetText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
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
