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
import { previewInstallmentPlan } from "@/modules/credit-cards";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { applySignedAmount } from "@/utils/amount-sign";
import { formatCurrency } from "@/utils/currency";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionAttachmentChanges,
  TransactionListItem,
  TransactionType,
  TransferFeeInput,
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

function formatDateString(value: string | null): string {
  if (!value) return "None";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const [installmentTermOption, setInstallmentTermOption] = useState<
    "3" | "6" | "12" | "24" | "custom"
  >("12");
  const [customTermMonths, setCustomTermMonths] = useState<string>("12");
  const [installmentDeferral, setInstallmentDeferral] = useState<
    "0" | "1" | "2" | "3" | "6" | "custom"
  >("0");
  const [customDeferralMonths, setCustomDeferralMonths] = useState<string>("3");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveAsQuickPreset, setSaveAsQuickPreset] = useState(false);
  const [includePresetAmount, setIncludePresetAmount] = useState(true);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [suggestionsSuppressed, setSuggestionsSuppressed] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeAmountMinorUnits, setFeeAmountMinorUnits] = useState(0);
  const [feeAccountId, setFeeAccountId] = useState("");
  const [feePocketId, setFeePocketId] = useState<string | null>(null);
  const [feeCategoryId, setFeeCategoryId] = useState("");
  const [feeAccountManuallyChanged, setFeeAccountManuallyChanged] = useState(false);

  // Sub-modal states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [dateTimePickerMode, setDateTimePickerMode] = useState<"date" | "time" | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isTransferToAccountPickerOpen, setIsTransferToAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isQuickPresetsOpen, setIsQuickPresetsOpen] = useState(false);
  const [isAttachmentManagerOpen, setIsAttachmentManagerOpen] = useState(false);
  const [isFeeCalculatorOpen, setIsFeeCalculatorOpen] = useState(false);
  const [isFeeAccountPickerOpen, setIsFeeAccountPickerOpen] = useState(false);
  const [isFeeCategoryPickerOpen, setIsFeeCategoryPickerOpen] = useState(false);
  const attachmentDraft = useTransactionAttachmentDraft({
    visible,
    isEditing,
    transactionId: initialTransaction?.id,
  });

  const defaultFeeCategory = useMemo(() => {
    const allExpenseCategories = [];
    for (const cat of categories) {
      if (cat.type === "expense") allExpenseCategories.push(cat);
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          if (sub.type === "expense") allExpenseCategories.push(sub);
        }
      }
    }

    // 1. Exact Seeder ID
    const byId = allExpenseCategories.find((c) => c.id === "cat_sub_financial_fees");
    if (byId) return byId;

    // 2. Contains "bank fee" (case-insensitive)
    const byBankFee = allExpenseCategories.find((c) =>
      c.name.toLowerCase().includes("bank fee"),
    );
    if (byBankFee) return byBankFee;

    // 3. Contains "fee" (case-insensitive)
    const byFee = allExpenseCategories.find((c) =>
      c.name.toLowerCase().includes("fee"),
    );
    if (byFee) return byFee;

    // 4. First available expense category fallback
    return allExpenseCategories[0] ?? null;
  }, [categories]);


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
        setInstallmentTermOption("12");
        setCustomTermMonths("12");
        setInstallmentDeferral("0");
        setCustomDeferralMonths("3");
        setLocalError(null);
        if (initialTransaction.transferFeeAmountMinorUnits) {
          setFeeEnabled(true);
          setFeeAmountMinorUnits(initialTransaction.transferFeeAmountMinorUnits);
          setFeeAccountId(initialTransaction.transferFeeAccountId || initialTransaction.accountId);
          setFeePocketId(initialTransaction.transferFeePocketId ?? null);
          setFeeCategoryId(initialTransaction.transferFeeCategoryId || (defaultFeeCategory?.id ?? ""));
          setFeeAccountManuallyChanged(true);
        } else {
          setFeeEnabled(false);
          setFeeAmountMinorUnits(0);
          setFeeAccountId(initialTransaction.accountId);
          setFeePocketId(initialTransaction.pocketId);
          setFeeCategoryId(defaultFeeCategory?.id ?? "");
          setFeeAccountManuallyChanged(false);
        }
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
        setInstallmentTermOption("12");
        setCustomTermMonths("12");
        setInstallmentDeferral("0");
        setCustomDeferralMonths("3");
        setLocalError(null);
        setFeeEnabled(false);
        setFeeAmountMinorUnits(0);
        setFeeAccountId(firstAccount);
        setFeePocketId(null);
        setFeeCategoryId(defaultFeeCategory?.id ?? "");
        setFeeAccountManuallyChanged(false);
      }
      setSaveAsQuickPreset(false);
      setIncludePresetAmount(true);
      setAppliedPresetId(null);
      setSuggestionsSuppressed(false);
      setIsQuickPresetsOpen(false);
      setIsAttachmentManagerOpen(false);
      setIsFeeCalculatorOpen(false);
      setIsFeeAccountPickerOpen(false);
      setIsFeeCategoryPickerOpen(false);
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

  const resolvedTermMonths = useMemo(() => {
    if (installmentTermOption === "custom") {
      const parsed = parseInt(customTermMonths, 10);
      return Number.isInteger(parsed) ? parsed : 0;
    }
    return parseInt(installmentTermOption, 10);
  }, [installmentTermOption, customTermMonths]);

  const resolvedDeferredMonths = useMemo(() => {
    if (installmentDeferral === "custom") {
      const parsed = parseInt(customDeferralMonths, 10);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
    }
    return parseInt(installmentDeferral, 10) || 0;
  }, [installmentDeferral, customDeferralMonths]);

  const installmentPreview = useMemo(() => {
    if (
      !canUseInstallments ||
      !installmentEnabled ||
      !selectedAccount?.creditCardDetails
    ) {
      return null;
    }
    if (
      !Number.isInteger(resolvedTermMonths) ||
      resolvedTermMonths < 2 ||
      resolvedTermMonths > 120
    ) {
      return null;
    }
    return previewInstallmentPlan({
      amountMinorUnits,
      termMonths: resolvedTermMonths,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      statementDay: selectedAccount.creditCardDetails.statementDay,
      paymentDueDay: selectedAccount.creditCardDetails.paymentDueDay,
      deferredMonths: resolvedDeferredMonths,
    });
  }, [
    canUseInstallments,
    installmentEnabled,
    selectedAccount?.creditCardDetails,
    resolvedTermMonths,
    amountMinorUnits,
    occurredAt,
    resolvedDeferredMonths,
  ]);
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
  const feeAccount = accounts.find((a) => a.id === feeAccountId) ?? selectedAccount;
  const feePocket = pockets.find((pocket) => pocket.id === feePocketId);
  const feeCategory = useMemo(() => {
    for (const cat of categories) {
      if (cat.id === feeCategoryId) return cat;
      if (cat.subcategories) {
        const sub = cat.subcategories.find((s) => s.id === feeCategoryId);
        if (sub) return sub;
      }
    }
    return defaultFeeCategory ?? null;
  }, [categories, feeCategoryId, defaultFeeCategory]);
  const parentOfFeeCategory = useMemo(() => {
    if (!feeCategory || !feeCategory.parentId) return null;
    return categories.find((c) => c.id === feeCategory.parentId) ?? null;
  }, [categories, feeCategory]);
  const feeCategoryColor = useMemo(() => {
    const colorKey = feeCategory?.color || parentOfFeeCategory?.color;
    return resolveEntityColor(colorKey);
  }, [feeCategory, parentOfFeeCategory, resolveEntityColor]);
  const feeAccountColor = useMemo(
    () => accountColor(theme, feeAccount?.accountType?.color ?? null),
    [feeAccount, theme],
  );
  const feeAccountBalance = feeAccount
    ? feeAccount.currentBalanceMinorUnits ?? feeAccount.openingBalanceMinorUnits
    : 0;
  const feeLocationBalance = feePocket
    ? feePocket.currentBalanceMinorUnits
    : feeAccount?.pocketEnabled
      ? feeAccountBalance -
        pockets
          .filter(
            (pocket) =>
              pocket.accountId === feeAccount.id && !pocket.isArchived,
          )
          .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0)
      : feeAccountBalance;
  const feeAccountCurrency = feeAccount?.currencyCode ?? currencyCode;

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
    setInstallmentTermOption("12");
    setCustomTermMonths("12");
    setInstallmentDeferral("0");
    setCustomDeferralMonths("3");
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

      if (feeEnabled) {
        if (feeAmountMinorUnits <= 0) {
          setLocalError("Please enter a fee amount greater than zero, or turn off the transfer fee.");
          return;
        }
        if (!feeAccountId && !selectedAccountId) {
          setLocalError("Please select an account to deduct the fee from.");
          return;
        }
        if (!feeCategoryId && !defaultFeeCategory?.id) {
          setLocalError("Please select a category for the fee.");
          return;
        }
      }

      setLocalError(null);
      const feeInput: TransferFeeInput | null =
        feeEnabled && feeAmountMinorUnits > 0
          ? {
              amountCents: Math.abs(feeAmountMinorUnits),
              accountId: feeAccountId || selectedAccountId,
              pocketId: feePocketId,
              categoryId: feeCategoryId || (defaultFeeCategory?.id ?? ""),
            }
          : null;
      const transferInput: CreateTransferInput = {
        fromAccountId: selectedAccountId,
        toAccountId: transferToAccountId,
        fromPocketId: selectedPocketId,
        toPocketId: transferToPocketId,
        amountCents: Math.abs(amountMinorUnits),
        name: name.trim() || null,
        note: note.trim() || null,
        occurredAt: transactionOccurredAt,
        fee: feeInput,
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
        if (
          !Number.isInteger(resolvedTermMonths) ||
          resolvedTermMonths < 2 ||
          resolvedTermMonths > 120
        ) {
          setLocalError(
            installmentTermOption === "custom"
              ? "Custom installment term must be between 2 and 120 months."
              : "Installment term must be between 2 and 120 months.",
          );
          return;
        }
        if (installmentDeferral === "custom") {
          const customVal = Number(customDeferralMonths);
          if (!Number.isInteger(customVal) || customVal < 1 || customVal > 36) {
            setLocalError("Custom deferred months must be between 1 and 36.");
            return;
          }
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
            ? {
                termMonths: resolvedTermMonths,
                deferredMonths: resolvedDeferredMonths,
              }
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
                <View style={styles.transferFeePanel}>
                  <View style={styles.transferFeeHeader}>
                    <View style={styles.transferFeeHeaderText}>
                      <Text style={styles.transferFeeTitle}>Transfer Fee</Text>
                      <Text style={styles.transferFeeDescription}>
                        Deduct an instant transaction fee (e.g. InstaPay, GCash, bank charges)
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Add transfer fee"
                      onValueChange={setFeeEnabled}
                      trackColor={{
                        false: theme.colors.borderStrong,
                        true: theme.colors.primary,
                      }}
                      value={feeEnabled}
                    />
                  </View>

                  {feeEnabled ? (
                    <View style={styles.transferFeeBody}>
                      {/* Fee Amount */}
                      <View style={styles.transferFeeFieldGroup}>
                        <AmountCalculatorField
                          amountMinorUnits={feeAmountMinorUnits}
                          amountSign="-"
                          currencyCode={feeAccountCurrency}
                          disabled={pending}
                          label="FEE AMOUNT"
                          onOpenCalculator={() => setIsFeeCalculatorOpen(true)}
                          showSignToggle={false}
                        />
                      </View>

                      {/* Deduct Fee From Account */}
                      <View style={styles.transferFeeFieldGroup}>
                        <Text style={styles.fieldLabel}>DEDUCT FEE FROM</Text>
                        <Pressable
                          accessibilityLabel={`Deduct fee from ${feeAccount?.name ?? "none selected"}${feePocket ? `, ${feePocket.name}` : ""}. Tap to change.`}
                          accessibilityRole="button"
                          onPress={() => setIsFeeAccountPickerOpen(true)}
                          style={styles.selectorCard}
                        >
                          <View style={styles.selectorLeft}>
                            <View
                              style={[
                                styles.selectorIconWrap,
                                {
                                  backgroundColor: `${feeAccountColor}18`,
                                  borderColor: `${feeAccountColor}35`,
                                },
                              ]}
                            >
                              <IconHelper
                                name={feeAccount?.iconKey ?? feeAccount?.accountType?.iconKey ?? "wallet"}
                                size={18}
                                color={feeAccountColor}
                              />
                            </View>
                            <View style={styles.selectorTextCol}>
                              <Text
                                style={
                                  feeAccount
                                    ? styles.selectorValueText
                                    : styles.selectorPlaceholderText
                                }
                              >
                                {feeAccount
                                  ? `${feeAccount.name}${feeAccount.pocketEnabled ? ` · ${feePocket?.name ?? "Available"}` : ""}`
                                  : "Select Fee Account"}
                              </Text>
                              {feeAccount && (
                                <Text style={styles.selectorSubText}>
                                  {feePocket
                                    ? "Pocket balance"
                                    : feeAccount.pocketEnabled
                                      ? "Available balance"
                                      : feeAccount.accountType?.name ?? "Account"} ·{" "}
                                  {formatCurrency(
                                    feeLocationBalance,
                                    feeAccount.currencyCode,
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

                      {/* Fee Category */}
                      <View style={styles.transferFeeFieldGroup}>
                        <Text style={styles.fieldLabel}>FEE CATEGORY</Text>
                        <Pressable
                          accessibilityLabel={`Fee category ${feeCategory?.name ?? "none selected"}. Tap to change.`}
                          accessibilityRole="button"
                          onPress={() => setIsFeeCategoryPickerOpen(true)}
                          style={styles.selectorCard}
                        >
                          <View style={styles.selectorLeft}>
                            <View
                              style={[
                                styles.selectorIconWrap,
                                {
                                  backgroundColor: `${feeCategoryColor}18`,
                                  borderColor: `${feeCategoryColor}35`,
                                },
                              ]}
                            >
                              <IconHelper
                                name={feeCategory?.icon ?? "tag"}
                                size={18}
                                color={feeCategoryColor}
                              />
                            </View>
                            <View style={styles.selectorTextCol}>
                              <Text
                                numberOfLines={1}
                                style={
                                  feeCategory
                                    ? styles.selectorValueText
                                    : styles.selectorPlaceholderText
                                }
                              >
                                {feeCategory?.name ?? "Select Fee Category"}
                              </Text>
                              {feeCategory && (
                                <Text style={styles.selectorSubText}>
                                  {parentOfFeeCategory
                                    ? `${parentOfFeeCategory.name} > Subcategory`
                                    : "Expense Category"}
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
                    </View>
                  ) : null}
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
                  <>
                    <View style={styles.installmentTermRow}>
                      <Text style={styles.fieldLabel}>TERM IN MONTHS</Text>
                      <View style={styles.deferralChipsRow}>
                        {[
                          { label: "3m", value: "3" },
                          { label: "6m", value: "6" },
                          { label: "12m", value: "12" },
                          { label: "24m", value: "24" },
                          { label: "Custom", value: "custom" },
                        ].map((opt) => {
                          const isSelected = installmentTermOption === opt.value;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() =>
                                setInstallmentTermOption(
                                  opt.value as
                                    | "3"
                                    | "6"
                                    | "12"
                                    | "24"
                                    | "custom",
                                )
                              }
                              style={[
                                styles.deferralChip,
                                isSelected && styles.deferralChipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.deferralChipText,
                                  isSelected && styles.deferralChipTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {installmentTermOption === "custom" ? (
                        <View style={styles.customDeferralRow}>
                          <Text style={styles.customDeferralLabel}>
                            Number of months:
                          </Text>
                          <TextInput
                            accessibilityLabel="Custom installment term in months"
                            keyboardType="number-pad"
                            maxLength={3}
                            onChangeText={(value) =>
                              setCustomTermMonths(value.replace(/\D/g, ""))
                            }
                            placeholder="12"
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.customDeferralInput}
                            value={customTermMonths}
                          />
                          <Text style={styles.customDeferralSuffix}>months</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.installmentDeferralSection}>
                      <View style={styles.installmentDeferralHeader}>
                        <Text style={styles.fieldLabel}>
                          BILLING START (DEFERRED / BNPL)
                        </Text>
                        {resolvedDeferredMonths > 0 ? (
                          <View style={styles.bnplTag}>
                            <Text style={styles.bnplTagText}>BNPL</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.deferralChipsRow}>
                        {[
                          { label: "Standard", value: "0" },
                          { label: "+1 mo", value: "1" },
                          { label: "+2 mos", value: "2" },
                          { label: "+3 mos (BNPL)", value: "3" },
                          { label: "+6 mos", value: "6" },
                          { label: "Custom", value: "custom" },
                        ].map((opt) => {
                          const isSelected = installmentDeferral === opt.value;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() =>
                                setInstallmentDeferral(
                                  opt.value as
                                    | "0"
                                    | "1"
                                    | "2"
                                    | "3"
                                    | "6"
                                    | "custom",
                                )
                              }
                              style={[
                                styles.deferralChip,
                                isSelected && styles.deferralChipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.deferralChipText,
                                  isSelected && styles.deferralChipTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {installmentDeferral === "custom" ? (
                        <View style={styles.customDeferralRow}>
                          <Text style={styles.customDeferralLabel}>
                            Months to defer:
                          </Text>
                          <TextInput
                            accessibilityLabel="Custom months deferred"
                            keyboardType="number-pad"
                            maxLength={2}
                            onChangeText={(value) =>
                              setCustomDeferralMonths(value.replace(/\D/g, ""))
                            }
                            placeholder="3"
                            placeholderTextColor={theme.colors.textMuted}
                            style={styles.customDeferralInput}
                            value={customDeferralMonths}
                          />
                          <Text style={styles.customDeferralSuffix}>months</Text>
                        </View>
                      ) : null}
                    </View>

                    {installmentPreview ? (
                      <View style={styles.installmentPreviewCard}>
                        <View style={styles.installmentPreviewTopRow}>
                          <Text style={styles.installmentPreviewTitle}>
                            Payment Schedule
                          </Text>
                          <Text style={styles.installmentMonthlyAmount}>
                            {formatCurrency(
                              installmentPreview.monthlyAmountMinorUnits,
                              currencyCode,
                            )}{" "}
                            <Text style={styles.installmentMonthlySub}>
                              / month
                            </Text>
                          </Text>
                        </View>
                        <View style={styles.installmentPreviewDetails}>
                          <View style={styles.installmentPreviewDetailItem}>
                            <Text style={styles.installmentDetailLabel}>
                              First Statement
                            </Text>
                            <Text style={styles.installmentDetailValue}>
                              {formatDateString(
                                installmentPreview.firstStatementOn,
                              )}
                            </Text>
                          </View>
                          <View style={styles.installmentPreviewDetailItem}>
                            <Text style={styles.installmentDetailLabel}>
                              Estimated Due Date
                            </Text>
                            <Text style={styles.installmentDetailValue}>
                              {formatDateString(installmentPreview.firstDueOn)}
                            </Text>
                          </View>
                        </View>
                        {installmentPreview.deferredMonths > 0 ? (
                          <View style={styles.bnplCallout}>
                            <Sparkles color={theme.colors.primary} size={14} />
                            <Text style={styles.bnplCalloutText}>
                              Buy Now, Pay Later active: First bill deferred by{" "}
                              {installmentPreview.deferredMonths}{" "}
                              {installmentPreview.deferredMonths === 1
                                ? "month"
                                : "months"}
                              .
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </>
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
          if (!feeAccountManuallyChanged) {
            setFeeAccountId(acc.id);
            setFeePocketId(pocketId);
          }
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

      <AmountCalculatorModal
        currencyCode={feeAccountCurrency}
        initialMinorUnits={feeAmountMinorUnits}
        onClose={() => setIsFeeCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          setFeeAmountMinorUnits(Math.abs(minorUnits));
          setIsFeeCalculatorOpen(false);
        }}
        title="Enter Transfer Fee Amount"
        visible={isFeeCalculatorOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        pockets={pockets}
        onClose={() => setIsFeeAccountPickerOpen(false)}
        onSelectLocation={(acc, pocketId) => {
          setFeeAccountId(acc.id);
          setFeePocketId(pocketId);
          setFeeAccountManuallyChanged(true);
        }}
        selectedAccountId={feeAccountId || selectedAccountId}
        selectedPocketId={feePocketId}
        title="Deduct Fee From Account"
        visible={isFeeAccountPickerOpen}
      />

      <CategoryPickerModal
        categories={categories}
        onClose={() => setIsFeeCategoryPickerOpen(false)}
        onSelectCategory={(cat) => setFeeCategoryId(cat.id)}
        selectedCategoryId={feeCategoryId || (defaultFeeCategory?.id ?? "")}
        title="Select Fee Category"
        type="expense"
        visible={isFeeCategoryPickerOpen}
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
    installmentTermInputContainer: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    installmentTermInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      minWidth: 70,
      paddingHorizontal: 14,
      paddingVertical: 10,
      textAlign: "center",
    },
    installmentChipGroup: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    installmentChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    installmentChipActive: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    installmentChipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    installmentChipTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    installmentDeferralSection: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      marginTop: 14,
      paddingTop: 12,
    },
    installmentDeferralHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    bnplTag: {
      backgroundColor: `${theme.colors.primary}20`,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    bnplTagText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    deferralChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 8,
    },
    deferralChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    deferralChipActive: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    deferralChipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    deferralChipTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    customDeferralRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    customDeferralLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    customDeferralInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      textAlign: "center",
      width: 54,
    },
    customDeferralSuffix: {
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    installmentPreviewCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginTop: 14,
      padding: 12,
    },
    installmentPreviewTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    installmentPreviewTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    installmentMonthlyAmount: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: "700",
    },
    installmentMonthlySub: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    installmentPreviewDetails: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 8,
    },
    installmentPreviewDetailItem: {
      flex: 1,
    },
    installmentDetailLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginBottom: 2,
    },
    installmentDetailValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    bnplCallout: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    bnplCalloutText: {
      color: theme.colors.primary,
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
    },
    transferFeePanel: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: 16,
      padding: 14,
    },
    transferFeeHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    transferFeeHeaderText: {
      flex: 1,
    },
    transferFeeTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    transferFeeDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    transferFeeBody: {
      gap: 12,
      marginTop: 14,
      paddingTop: 12,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    transferFeeFieldGroup: {
      gap: 4,
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
