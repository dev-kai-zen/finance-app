import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, Host } from "@expo/ui";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronRight,
  Paperclip,
  Plus,
  Receipt,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react-native";
import { useLocalization } from "@/infrastructure/localization";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  IconHelper,
  KeyboardAwareFormPreset,
  NotificationModal,
  ThemedSwitch,
} from "@/components";
import {
  DraggableTourChip,
  TransactionFormWalkthroughOverlay,
  useTransactionFormWalkthrough,
  WalkthroughIntroModal,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  WalkthroughRegistryProvider,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountPickerModal,
  accountColor,
  checkMaintainingBalance,
  MaintainingBalanceWarningModal,
  type AccountListItem,
  type MaintainingBalanceCheckResult,
  type PocketListItem,
} from "@/modules/accounts";
import {
  CategoryFormModal,
  CategoryPickerModal,
  resolveDefaultTransactionCategoryId,
  useCategories,
  type Category,
  type CategoryType,
} from "@/modules/categories";
import {
  checkCreditLimitExceeded,
  CreditLimitWarningModal,
  previewInstallmentPlan,
  useInstallmentPlanEditState,
  type CreditLimitCheckResult,
} from "@/modules/credit-cards";
import { useDefaultAccounts, useExperiencePreferences } from "@/modules/settings";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { applySignedAmount } from "@/utils/amount-sign";
import { getExchangeRateMap } from "@/modules/currencies";
import {
  applyExchangeRate,
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
  deriveExchangeRate,
  formatCurrency,
  formatSnapshotExchangeRateDecimal,
  parseExchangeRateDecimalToScaled,
  snapshotExchangeRateFromBook,
} from "@/utils/currency";
import { TransactionCurrencyPickerModal } from "./transaction-currency-picker-modal";
import { TransactionExchangeRateHint } from "./transaction-exchange-rate-hint";
import {
  checkBudgetExceeded,
  BudgetLiveIndicator,
  OverBudgetWarningModal,
  type BudgetCheckResult,
} from "@/modules/budgets";
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
  PresetSortBy,
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
import {
  findLabelById,
  LabelPickerModal,
  useLabels,
  type Label,
} from "@/modules/labels";
import {
  createEmptySplitLine,
  TransactionSplitEditor,
  type SplitLineState,
} from "./transaction-split-editor";
import { TransactionFormFieldPreferencesModal } from "./transaction-form-field-preferences-modal";

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

const INSTALLMENT_TERM_PRESETS = ["3", "6", "12", "24"] as const;

function termMonthsToFormState(termMonths: number): {
  option: "3" | "6" | "12" | "24" | "custom";
  custom: string;
} {
  const preset = String(termMonths);
  if ((INSTALLMENT_TERM_PRESETS as readonly string[]).includes(preset)) {
    return {
      option: preset as "3" | "6" | "12" | "24",
      custom: "12",
    };
  }
  return { option: "custom", custom: String(termMonths) };
}

function deferredMonthsToFormState(deferredMonths: number): {
  option: "0" | "1" | "2" | "3" | "6" | "custom";
  custom: string;
} {
  const preset = String(deferredMonths);
  if (["0", "1", "2", "3", "6"].includes(preset)) {
    return {
      option: preset as "0" | "1" | "2" | "3" | "6",
      custom: "3",
    };
  }
  return { option: "custom", custom: String(deferredMonths) };
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
  onArchivePreset?: (id: string) => Promise<boolean>;
  onRestorePreset?: (id: string) => Promise<boolean>;
  onPermanentlyDeletePreset?: (id: string) => Promise<boolean>;
  onReorderPresets: (orderedIds: string[]) => Promise<boolean>;
  archivedPresets?: TransactionPreset[];
  presetSortBy?: PresetSortBy;
  onChangePresetSortBy?: (sortBy: PresetSortBy) => void;
  pending?: boolean;
  error?: string | null;
  initialTransaction?: TransactionListItem | null;
  isEditing?: boolean;
  initialType?: TransactionType;
  defaultExpenseAccountId?: string | null;
  defaultExpensePocketId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultIncomePocketId?: string | null;
  onCategoriesChanged?: () => void | Promise<void>;
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

function TransactionFormModalInner({
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
  onArchivePreset,
  onRestorePreset,
  onPermanentlyDeletePreset,
  onReorderPresets,
  archivedPresets,
  presetSortBy,
  onChangePresetSortBy,
  pending = false,
  error = null,
  initialTransaction = null,
  isEditing = false,
  initialType,
  defaultExpenseAccountId: propsDefaultExpenseAccountId,
  defaultExpensePocketId: propsDefaultExpensePocketId,
  defaultIncomeAccountId: propsDefaultIncomeAccountId,
  defaultIncomePocketId: propsDefaultIncomePocketId,
  onCategoriesChanged,
}: TransactionFormModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);
  const defaultAccounts = useDefaultAccounts();
  const { formFields, isPromptDismissed } = useExperiencePreferences();
  const {
    saveCategory: saveCategoryRecord,
    saving: categorySaving,
    error: categorySaveError,
    clearError: clearCategorySaveError,
  } = useCategories();
  const [isFieldPreferencesOpen, setIsFieldPreferencesOpen] = useState(false);
  const [categoryFormDraft, setCategoryFormDraft] = useState<{
    applySelection: (categoryId: string) => void;
    initialParentId: string | null;
    initialType: CategoryType;
    parentCategoryName?: string | null;
  } | null>(null);
  const effectiveDefaultExpenseAccountId =
    propsDefaultExpenseAccountId !== undefined
      ? propsDefaultExpenseAccountId
      : defaultAccounts.defaultExpenseAccountId;
  const effectiveDefaultExpensePocketId =
    propsDefaultExpensePocketId !== undefined
      ? propsDefaultExpensePocketId
      : defaultAccounts.defaultExpensePocketId;
  const effectiveDefaultIncomeAccountId =
    propsDefaultIncomeAccountId !== undefined
      ? propsDefaultIncomeAccountId
      : defaultAccounts.defaultIncomeAccountId;
  const effectiveDefaultIncomePocketId =
    propsDefaultIncomePocketId !== undefined
      ? propsDefaultIncomePocketId
      : defaultAccounts.defaultIncomePocketId;

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
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Sub-modal states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [entryCurrencyCode, setEntryCurrencyCode] = useState("PHP");
  const [accountAmountMinorUnits, setAccountAmountMinorUnits] = useState(0);
  const [transferDestinationAmountMinorUnits, setTransferDestinationAmountMinorUnits] =
    useState(0);
  const [exchangeRateScaled, setExchangeRateScaled] = useState<number | null>(
    null,
  );
  const [exchangeRateText, setExchangeRateText] = useState("");
  const [exchangeLastEdited, setExchangeLastEdited] = useState<
    "typed" | "rate" | "account"
  >("typed");
  const [isAccountAmountCalculatorOpen, setIsAccountAmountCalculatorOpen] =
    useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [dateTimePickerMode, setDateTimePickerMode] = useState<"date" | "time" | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isTransferToAccountPickerOpen, setIsTransferToAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categoryFormReturnPicker, setCategoryFormReturnPicker] = useState<
    "transaction" | "fee" | null
  >(null);

  const PICKER_DISMISS_MS = Platform.OS === "ios" ? 320 : 120;

  const presentCategoryFormFromPicker = (
    source: "transaction" | "fee",
    present: () => void,
  ) => {
    setCategoryFormReturnPicker(source);
    if (source === "transaction") {
      setIsCategoryPickerOpen(false);
    } else {
      setIsFeeCategoryPickerOpen(false);
    }
    setTimeout(present, PICKER_DISMISS_MS);
  };

  const closeCategoryFormModal = () => {
    const resumePicker = categoryFormReturnPicker;
    setCategoryFormDraft(null);
    setCategoryFormReturnPicker(null);
    if (resumePicker === "transaction") {
      setIsCategoryPickerOpen(true);
    } else if (resumePicker === "fee") {
      setIsFeeCategoryPickerOpen(true);
    }
  };

  const openNewCategoryForm = (
    categoryType: CategoryType,
    applySelection: (categoryId: string) => void,
  ) => {
    clearCategorySaveError();
    setCategoryFormDraft({
      applySelection,
      initialParentId: null,
      initialType: categoryType,
    });
  };

  const openNewSubcategoryForm = (
    parent: Category,
    categoryType: CategoryType,
    applySelection: (categoryId: string) => void,
  ) => {
    clearCategorySaveError();
    setCategoryFormDraft({
      applySelection,
      initialParentId: parent.id,
      initialType: categoryType,
      parentCategoryName: parent.name,
    });
  };
  const [splitCategoryPickerLineKey, setSplitCategoryPickerLineKey] = useState<
    string | null
  >(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitLines, setSplitLines] = useState<SplitLineState[]>(() => [
    createEmptySplitLine("split-1"),
    createEmptySplitLine("split-2"),
  ]);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
  const [isQuickPresetsOpen, setIsQuickPresetsOpen] = useState(false);
  const [isAttachmentManagerOpen, setIsAttachmentManagerOpen] = useState(false);
  const [isFeeCalculatorOpen, setIsFeeCalculatorOpen] = useState(false);
  const [isFeeAccountPickerOpen, setIsFeeAccountPickerOpen] = useState(false);
  const [isFeeCategoryPickerOpen, setIsFeeCategoryPickerOpen] = useState(false);
  const [pendingBudgetWarning, setPendingBudgetWarning] = useState<BudgetCheckResult | null>(null);
  const [isBudgetWarningOpen, setIsBudgetWarningOpen] = useState(false);
  const [pendingCreditLimitWarning, setPendingCreditLimitWarning] =
    useState<CreditLimitCheckResult | null>(null);
  const [isCreditLimitWarningOpen, setIsCreditLimitWarningOpen] =
    useState(false);
  const [pendingMaintainingWarning, setPendingMaintainingWarning] =
    useState<MaintainingBalanceCheckResult | null>(null);
  const [isMaintainingWarningOpen, setIsMaintainingWarningOpen] =
    useState(false);
  const [focusedFieldType, setFocusedFieldType] = useState<
    "normal" | "description" | null
  >(null);

  useEffect(() => {
    if (!visible) {
      setFocusedFieldType(null);
    }
  }, [visible]);

  const { labels, refresh: refreshLabels } = useLabels({ includeArchived: true });
  const formInitSessionRef = useRef<string | null>(null);

  const selectedLabelsForChips = useMemo(
    () =>
      selectedLabelIds
        .map(
          (id) =>
            labels.find((label) => label.id === id) ?? findLabelById(id),
        )
        .filter((label): label is Label => label != null),
    [labels, selectedLabelIds],
  );

  useEffect(() => {
    if (visible) {
      refreshLabels();
    }
  }, [refreshLabels, visible]);
  const attachmentDraft = useTransactionAttachmentDraft({
    visible,
    isEditing,
    transactionId: initialTransaction?.id,
  });
  const installmentEditState = useInstallmentPlanEditState(
    initialTransaction?.id,
    visible && isEditing,
  );

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
    if (!visible) {
      formInitSessionRef.current = null;
      return;
    }

    const sessionKey = initialTransaction?.id ?? `__create__${initialType ?? "expense"}`;
    if (formInitSessionRef.current === sessionKey) {
      return;
    }
    formInitSessionRef.current = sessionKey;

    if (initialTransaction) {
        setMode(initialTransaction.type);
        setName(initialTransaction.name || "");
        const isNeg = initialTransaction.amountMinorUnits < 0;
        setAmountSign(isNeg ? "-" : "+");
        if (
          initialTransaction.originalAmountMinorUnits !== null &&
          initialTransaction.originalAmountMinorUnits !== undefined
        ) {
          setAmountMinorUnits(initialTransaction.originalAmountMinorUnits);
          setAccountAmountMinorUnits(
            Math.abs(initialTransaction.amountMinorUnits),
          );
          setExchangeRateScaled(initialTransaction.exchangeRateScaled ?? null);
          setExchangeRateText(
            initialTransaction.exchangeRateScaled
              ? formatSnapshotExchangeRateDecimal(
                  initialTransaction.exchangeRateScaled,
                )
              : "",
          );
        } else {
          setAmountMinorUnits(Math.abs(initialTransaction.amountMinorUnits));
          setAccountAmountMinorUnits(
            Math.abs(initialTransaction.amountMinorUnits),
          );
          setExchangeRateScaled(null);
          setExchangeRateText("");
        }
        setExchangeLastEdited("typed");
        setEntryCurrencyCode(initialTransaction.currencyCode ?? "PHP");
        setSelectedAccountId(initialTransaction.accountId);
        setSelectedPocketId(initialTransaction.pocketId);
        setTransferToAccountId(
          initialTransaction.transferAccountId ||
            (accounts.find((a) => a.id !== initialTransaction.accountId)?.id ?? "")
        );
        setTransferToPocketId(initialTransaction.transferPocketId);
        setSelectedCategoryId(initialTransaction.categoryId || "");
        if (
          initialTransaction.isSplit &&
          initialTransaction.splitEntries &&
          initialTransaction.splitEntries.length >= 2
        ) {
          setSplitEnabled(true);
          setSplitLines(
            initialTransaction.splitEntries.map((entry, index) => ({
              key: entry.id || `split-${index}`,
              categoryId: entry.categoryId,
              amountMinorUnits: entry.amountMinorUnits,
              note: entry.note ?? null,
            })),
          );
        } else {
          setSplitEnabled(false);
          setSplitLines([
            {
              key: "split-1",
              categoryId: initialTransaction.categoryId || "",
              amountMinorUnits: Math.abs(initialTransaction.amountMinorUnits),
              note: null,
            },
            createEmptySplitLine("split-2"),
          ]);
        }
        setSplitCategoryPickerLineKey(null);
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
        setSelectedLabelIds(
          initialTransaction.labels
            ? initialTransaction.labels
                .filter((l) => labels.some((lbl) => lbl.id === l.id))
                .map((l) => l.id)
            : [],
        );
      } else {
        const createMode = initialType ?? "expense";
        setMode(createMode);
        setName("");
        setAmountSign(createMode === "income" ? "+" : "-");
        const targetDefaultAccountId =
          createMode === "income"
            ? effectiveDefaultIncomeAccountId
            : effectiveDefaultExpenseAccountId;
        const defaultAccount = accounts.find(
          (a) => a.id === targetDefaultAccountId && !a.isArchived,
        );
        const firstAccount = defaultAccount
          ? defaultAccount.id
          : (accounts.length > 0 ? accounts[0].id : "");
        setSelectedAccountId(firstAccount);
        const targetDefaultPocketId =
          createMode === "income"
            ? effectiveDefaultIncomePocketId
            : effectiveDefaultExpensePocketId;
        const defaultPocket =
          defaultAccount && targetDefaultPocketId
            ? pockets.find(
                (p) =>
                  p.id === targetDefaultPocketId &&
                  p.accountId === defaultAccount.id &&
                  !p.isArchived,
              )
            : null;
        setSelectedPocketId(defaultPocket ? defaultPocket.id : null);
        setTransferToAccountId(accounts.length > 1 ? accounts[1].id : "");
        setTransferToPocketId(null);

        setSelectedCategoryId(
          resolveDefaultTransactionCategoryId(
            categories,
            createMode === "transfer" ? "expense" : createMode,
          ),
        );
        setSplitEnabled(false);
        setSplitLines([
          createEmptySplitLine("split-1"),
          createEmptySplitLine("split-2"),
        ]);
        setSplitCategoryPickerLineKey(null);

        setAmountMinorUnits(0);
        setAccountAmountMinorUnits(0);
        setTransferDestinationAmountMinorUnits(0);
        setExchangeRateScaled(null);
        setExchangeRateText("");
        setExchangeLastEdited("typed");
        setOccurredAt(getCurrentTransactionDate());
        setNote("");
        setSelectedLabelIds([]);
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
  }, [
    visible,
    initialTransaction,
    initialType,
    accounts,
    categories,
    pockets,
    effectiveDefaultExpenseAccountId,
    effectiveDefaultExpensePocketId,
    effectiveDefaultIncomeAccountId,
    effectiveDefaultIncomePocketId,
    labels,
    defaultFeeCategory,
  ]);

  // When accounts, categories, or default settings finish loading asynchronously from SQLite,
  // backfill default account and category if still unselected in create mode
  useEffect(() => {
    if (!visible || initialTransaction || isEditing) {
      return;
    }

    if (!selectedAccountId && accounts.length > 0) {
      const targetDefaultAccountId =
        mode === "income"
          ? effectiveDefaultIncomeAccountId
          : effectiveDefaultExpenseAccountId;
      const defaultAccount = accounts.find(
        (a) => a.id === targetDefaultAccountId && !a.isArchived,
      );
      const chosenAccountId = defaultAccount ? defaultAccount.id : accounts[0].id;
      setSelectedAccountId(chosenAccountId);

      const targetDefaultPocketId =
        mode === "income"
          ? effectiveDefaultIncomePocketId
          : effectiveDefaultExpensePocketId;
      if (defaultAccount && targetDefaultPocketId) {
        const defaultPocket = pockets.find(
          (p) =>
            p.id === targetDefaultPocketId &&
            p.accountId === defaultAccount.id &&
            !p.isArchived,
        );
        if (defaultPocket) {
          setSelectedPocketId(defaultPocket.id);
        }
      }
    }

    if (!selectedCategoryId && categories.length > 0 && mode !== "transfer") {
      const defaultCategory = resolveDefaultTransactionCategoryId(categories, mode);
      if (defaultCategory) {
        setSelectedCategoryId(defaultCategory);
      }
    }
  }, [
    visible,
    initialTransaction,
    isEditing,
    selectedAccountId,
    selectedCategoryId,
    accounts,
    categories,
    pockets,
    mode,
    effectiveDefaultExpenseAccountId,
    effectiveDefaultExpensePocketId,
    effectiveDefaultIncomeAccountId,
    effectiveDefaultIncomePocketId,
  ]);

  useEffect(() => {
    if (!visible || !initialTransaction?.labels?.length) return;
    setSelectedLabelIds((current) => {
      if (current.length > 0) return current;
      const ids = initialTransaction.labels!
        .filter((label) => labels.some((item) => item.id === label.id))
        .map((label) => label.id);
      return ids.length > 0 ? ids : current;
    });
  }, [initialTransaction, labels, visible]);

  useEffect(() => {
    if (!visible || !isEditing || !installmentEditState.plan) return;
    const plan = installmentEditState.plan;
    const term = termMonthsToFormState(plan.termMonths);
    setInstallmentEnabled(true);
    setInstallmentTermOption(term.option);
    setCustomTermMonths(term.custom);
    const deferral = deferredMonthsToFormState(plan.deferredMonths);
    setInstallmentDeferral(deferral.option);
    setCustomDeferralMonths(deferral.custom);
  }, [
    visible,
    isEditing,
    installmentEditState.plan?.id,
    installmentEditState.plan?.termMonths,
    installmentEditState.plan?.deferredMonths,
  ]);

  useEffect(() => {
    if (!visible || mode !== "transfer" || feeAccountManuallyChanged) {
      return;
    }
    setFeeAccountId(selectedAccountId);
    setFeePocketId(selectedPocketId);
  }, [
    visible,
    mode,
    selectedAccountId,
    selectedPocketId,
    feeAccountManuallyChanged,
  ]);

  const handleFeeEnabledChange = (enabled: boolean) => {
    setFeeEnabled(enabled);
    if (
      enabled &&
      mode === "transfer" &&
      !feeAccountManuallyChanged &&
      selectedAccountId
    ) {
      setFeeAccountId(selectedAccountId);
      setFeePocketId(selectedPocketId);
    }
  };

  // When mode changes, switch default category, sign, and default account
  const handleModeChange = (newMode: TransactionType) => {
    setMode(newMode);
    setLocalError(null);
    if (newMode === "expense") {
      setAmountSign("-");
      if (!initialTransaction) {
        const defaultExpense = accounts.find(
          (a) => a.id === effectiveDefaultExpenseAccountId && !a.isArchived,
        );
        if (defaultExpense) {
          setSelectedAccountId(defaultExpense.id);
          const defaultPocket = effectiveDefaultExpensePocketId
            ? pockets.find(
                (p) =>
                  p.id === effectiveDefaultExpensePocketId &&
                  p.accountId === defaultExpense.id &&
                  !p.isArchived,
              )
            : null;
          setSelectedPocketId(defaultPocket ? defaultPocket.id : null);
        }
      }
    } else if (newMode === "income") {
      setAmountSign("+");
      if (!initialTransaction) {
        const defaultIncome = accounts.find(
          (a) => a.id === effectiveDefaultIncomeAccountId && !a.isArchived,
        );
        if (defaultIncome) {
          setSelectedAccountId(defaultIncome.id);
          const defaultPocket = effectiveDefaultIncomePocketId
            ? pockets.find(
                (p) =>
                  p.id === effectiveDefaultIncomePocketId &&
                  p.accountId === defaultIncome.id &&
                  !p.isArchived,
              )
            : null;
          setSelectedPocketId(defaultPocket ? defaultPocket.id : null);
        }
      }
    } else {
      setAmountSign("+");
    }
    if (newMode === "expense" || newMode === "income") {
      setSelectedCategoryId(
        resolveDefaultTransactionCategoryId(categories, newMode),
      );
    }
  };

  const filteredCategories = categories.filter((c) => c.type === mode);
  const flatCategoriesForSplit = useMemo(() => {
    const list: Category[] = [];
    for (const cat of categories) {
      if (cat.type === mode) list.push(cat);
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          if (sub.type === mode) list.push(sub);
        }
      }
    }
    return list;
  }, [categories, mode]);

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
  const accountCurrencyCode = selectedAccount?.currencyCode ?? "PHP";
  const entryCurrency = entryCurrencyCode.trim().toUpperCase();
  const transferToCurrencyCode = transferToAccount?.currencyCode ?? "PHP";
  const isTransferCrossCurrency =
    mode === "transfer" &&
    accountCurrencyCode.trim().toUpperCase() !==
      transferToCurrencyCode.trim().toUpperCase();
  const isCrossCurrencyEntry =
    mode !== "transfer" &&
    entryCurrency !== accountCurrencyCode.trim().toUpperCase();

  useEffect(() => {
    if (isEditing) return;
    setEntryCurrencyCode(accountCurrencyCode);
  }, [selectedAccountId, accountCurrencyCode, isEditing]);

  useEffect(() => {
    if (!visible || !isTransferCrossCurrency || amountMinorUnits <= 0) {
      return;
    }
    const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY);
    const suggested = Math.abs(
      convertCurrencyMinorUnits(
        amountMinorUnits,
        accountCurrencyCode,
        transferToCurrencyCode,
        ratesMap,
        DEFAULT_BASE_CURRENCY,
      ),
    );
    setTransferDestinationAmountMinorUnits(suggested);
  }, [
    visible,
    isTransferCrossCurrency,
    amountMinorUnits,
    accountCurrencyCode,
    transferToCurrencyCode,
  ]);

  useEffect(() => {
    if (!visible || mode === "transfer" || !isCrossCurrencyEntry) {
      return;
    }
    if (exchangeLastEdited === "account") {
      return;
    }
    if (amountMinorUnits <= 0) {
      return;
    }
    const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY);
    let nextRate = exchangeRateScaled;
    if (nextRate === null || nextRate <= 0) {
      try {
        nextRate = snapshotExchangeRateFromBook(
          entryCurrency,
          accountCurrencyCode,
          ratesMap,
          DEFAULT_BASE_CURRENCY,
        );
        setExchangeRateScaled(nextRate);
        setExchangeRateText(formatSnapshotExchangeRateDecimal(nextRate));
      } catch {
        return;
      }
    }
    const nextAccountAmount = applyExchangeRate(
      amountMinorUnits,
      nextRate,
      entryCurrency,
      accountCurrencyCode,
    );
    setAccountAmountMinorUnits(nextAccountAmount);
  }, [
    visible,
    mode,
    isCrossCurrencyEntry,
    amountMinorUnits,
    entryCurrency,
    accountCurrencyCode,
    exchangeLastEdited,
    exchangeRateScaled,
  ]);

  const postedExpenseMinorUnitsAbs = useMemo(() => {
    if (!isCrossCurrencyEntry) {
      return Math.abs(amountMinorUnits);
    }
    if (exchangeLastEdited === "account" && accountAmountMinorUnits > 0) {
      return accountAmountMinorUnits;
    }
    if (exchangeRateScaled && amountMinorUnits > 0) {
      return applyExchangeRate(
        amountMinorUnits,
        exchangeRateScaled,
        entryCurrency,
        accountCurrencyCode,
      );
    }
    return Math.abs(amountMinorUnits);
  }, [
    isCrossCurrencyEntry,
    amountMinorUnits,
    accountAmountMinorUnits,
    exchangeLastEdited,
    exchangeRateScaled,
    entryCurrency,
    accountCurrencyCode,
  ]);

  const canUseSplit =
    mode !== "transfer" && !installmentEnabled && !isCrossCurrencyEntry;
  const splitTotalMinorUnits = postedExpenseMinorUnitsAbs;

  useEffect(() => {
    if (!canUseSplit && splitEnabled) {
      setSplitEnabled(false);
    }
  }, [canUseSplit, splitEnabled]);

  useEffect(() => {
    if (!isCrossCurrencyEntry) {
      return;
    }
    if (exchangeLastEdited !== "account" || amountMinorUnits <= 0) {
      return;
    }
    if (accountAmountMinorUnits <= 0) {
      return;
    }
    try {
      const derived = deriveExchangeRate(
        accountAmountMinorUnits,
        amountMinorUnits,
        entryCurrency,
        accountCurrencyCode,
      );
      setExchangeRateScaled(derived);
      setExchangeRateText(formatSnapshotExchangeRateDecimal(derived));
    } catch {
      // keep prior rate
    }
  }, [
    isCrossCurrencyEntry,
    exchangeLastEdited,
    accountAmountMinorUnits,
    amountMinorUnits,
    entryCurrency,
    accountCurrencyCode,
  ]);
  const isCreditCardExpense =
    mode === "expense" &&
    amountSign === "-" &&
    Boolean(selectedAccount?.creditCardDetails);

  const installmentFieldsLocked =
    isEditing &&
    Boolean(installmentEditState.plan) &&
    !installmentEditState.canModifyInstallmentPlan;

  const canConfigureInstallments =
    isCreditCardExpense &&
    (!isEditing ||
      (installmentEditState.canModifyInstallmentPlan &&
        !installmentEditState.hasChargeStatementEntry));

  const showInstallmentSection =
    isCreditCardExpense &&
    (!isEditing ||
      Boolean(installmentEditState.plan) ||
      (installmentEditState.canModifyInstallmentPlan &&
        !installmentEditState.hasChargeStatementEntry));

  const activeAccountCount = useMemo(
    () => accounts.filter((account) => !account.isArchived).length,
    [accounts],
  );
  const allowTransfer = activeAccountCount >= 2;

  useEffect(() => {
    if (!allowTransfer && mode === "transfer") {
      setMode("expense");
    }
  }, [allowTransfer, mode]);

  const showTransactionNameField =
    formFields.transactionName ||
    Boolean(name.trim()) ||
    Boolean(isEditing && initialTransaction?.name?.trim());
  const showAttachmentsField =
    formFields.attachments || attachmentDraft.totalCount > 0;
  const showLabelsField =
    formFields.labels ||
    selectedLabelIds.length > 0 ||
    Boolean(isEditing && initialTransaction?.labels?.length);
  const showNoteField =
    formFields.note ||
    Boolean(note.trim()) ||
    Boolean(isEditing && initialTransaction?.note?.trim());
  const showSplitField = formFields.split || splitEnabled;
  const showQuickPresetsUi = formFields.quickPresets;
  const showExactTimeField = formFields.exactTime;
  const showInstallmentsUi =
    (formFields.installments || installmentEnabled) && showInstallmentSection;

  const closeRef = useWalkthroughTarget("txFormClose");
  const presetsRef = useWalkthroughTarget("txFormPresets");
  const customizeRef = useWalkthroughTarget("txFormCustomize");
  const typePickerRef = useWalkthroughTarget("txFormTypePicker");
  const nameRef = useWalkthroughTarget("txFormName");
  const attachmentRef = useWalkthroughTarget("txFormAttachment");
  const dateRef = useWalkthroughTarget("txFormDate");
  const timeRef = useWalkthroughTarget("txFormTime");
  const amountRef = useWalkthroughTarget("txFormAmount");
  const currencyRef = useWalkthroughTarget("txFormCurrency");
  const accountRef = useWalkthroughTarget("txFormAccount");
  const categoryRef = useWalkthroughTarget("txFormCategory");
  const splitRef = useWalkthroughTarget("txFormSplit");
  const labelsRef = useWalkthroughTarget("txFormLabels");
  const noteRef = useWalkthroughTarget("txFormNote");
  const cancelRef = useWalkthroughTarget("txFormCancel");
  const saveRef = useWalkthroughTarget("txFormSave");

  const formScrollRef = useRef<React.ComponentRef<typeof KeyboardAwareFormPreset>>(
    null,
  );
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (
        targetId === "txFormClose" ||
        targetId === "txFormPresets" ||
        targetId === "txFormCustomize" ||
        targetId === "txFormTypePicker" ||
        targetId === "txFormCancel" ||
        targetId === "txFormSave"
      ) {
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

  const walkthrough = useTransactionFormWalkthrough({
    showPresets: !isEditing && showQuickPresetsUi,
    showCustomize: true,
    showName: showTransactionNameField,
    showAttachment: showAttachmentsField,
    showTime: showExactTimeField,
    isTransfer: mode === "transfer",
    showSplit: canUseSplit && showSplitField,
    showLabels: showLabelsField,
    showNote: showNoteField,
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "transactionFormWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
    enabled: visible && !isEditing,
  });

  useEffect(() => {
    if (visible && !isEditing && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [visible, isEditing, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

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
      !canConfigureInstallments ||
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
      amountMinorUnits: isCrossCurrencyEntry
        ? postedExpenseMinorUnitsAbs
        : amountMinorUnits,
      termMonths: resolvedTermMonths,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      statementDay: selectedAccount.creditCardDetails.statementDay,
      paymentDueDay: selectedAccount.creditCardDetails.paymentDueDay,
      deferredMonths: resolvedDeferredMonths,
    });
  }, [
    canConfigureInstallments,
    installmentEnabled,
    selectedAccount?.creditCardDetails,
    resolvedTermMonths,
    amountMinorUnits,
    isCrossCurrencyEntry,
    postedExpenseMinorUnitsAbs,
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

  const canSaveAsQuickPreset = Boolean(name.trim()) && !pending;

  useEffect(() => {
    if (!name.trim()) {
      setSaveAsQuickPreset(false);
    }
  }, [name]);

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
  const feeAccountCurrency = feeAccount?.currencyCode ?? accountCurrencyCode;

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
    if (preset.type === "transfer") {
      setFeeAccountId(preset.accountId);
      setFeePocketId(preset.pocketId);
      setFeeAccountManuallyChanged(false);
    }
    setAmountMinorUnits(Math.abs(preset.amountMinorUnits ?? 0));
    setAmountSign(
      preset.type === "expense"
        ? preset.amountMinorUnits !== null && preset.amountMinorUnits > 0
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

  const handleSave = async (
    bypassInput:
      | boolean
      | {
          bypassBudget?: boolean;
          bypassCreditLimit?: boolean;
          bypassMaintainingBalance?: boolean;
        } = false,
  ) => {
    const bypassBudgetCheck =
      typeof bypassInput === "boolean"
        ? bypassInput
        : Boolean(bypassInput?.bypassBudget);
    const bypassCreditLimitCheck =
      typeof bypassInput === "boolean"
        ? bypassInput
        : Boolean(bypassInput?.bypassCreditLimit);
    const bypassMaintainingBalanceCheck =
      typeof bypassInput === "boolean"
        ? bypassInput
        : Boolean(bypassInput?.bypassMaintainingBalance);
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
              amountMinorUnits: Math.abs(feeAmountMinorUnits),
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
        amountMinorUnits: Math.abs(amountMinorUnits),
        destinationAmountMinorUnits: isTransferCrossCurrency
          ? transferDestinationAmountMinorUnits
          : undefined,
        name: name.trim() || null,
        note: note.trim() || null,
        occurredAt: transactionOccurredAt,
        fee: feeInput,
        labelIds: selectedLabelIds.filter((id) => labels.some((lbl) => lbl.id === id)),
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
      const activeSplit = splitEnabled && canUseSplit;
      if (!activeSplit && !selectedCategoryId) {
        setLocalError("Please select a category.");
        return;
      }
      if (activeSplit) {
        if (splitLines.length < 2) {
          setLocalError("Add at least two split lines.");
          return;
        }
        if (splitLines.some((line) => !line.categoryId)) {
          setLocalError("Each split line needs a category.");
          return;
        }
        const assigned = splitLines.reduce(
          (sum, line) => sum + line.amountMinorUnits,
          0,
        );
        if (assigned !== splitTotalMinorUnits) {
          setLocalError("Split line amounts must add up to the transaction total.");
          return;
        }
      }

      const signedAmount =
        amountSign === "-" ? -Math.abs(amountMinorUnits) : Math.abs(amountMinorUnits);

      if (canConfigureInstallments && installmentEnabled) {
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

      if (mode === "expense" && amountMinorUnits > 0) {
        if (!bypassCreditLimitCheck && selectedAccount?.creditCardDetails) {
          const creditCheck = checkCreditLimitExceeded({
            accountId: selectedAccountId,
            expenseAmountMinorUnits: postedExpenseMinorUnitsAbs,
            excludeTransactionId:
              isEditing && initialTransaction ? initialTransaction.id : null,
            occurredAt: transactionOccurredAt,
          });
          if (creditCheck.hasCreditCard && creditCheck.exceeds) {
            setPendingCreditLimitWarning(creditCheck);
            setIsCreditLimitWarningOpen(true);
            return;
          }
        }

        if (
          !bypassMaintainingBalanceCheck &&
          selectedAccount?.maintainingBalanceMinorUnits != null &&
          selectedAccount.maintainingBalanceMinorUnits > 0
        ) {
          const maintainingCheck = checkMaintainingBalance({
            accountId: selectedAccountId,
            expenseAmountMinorUnits: postedExpenseMinorUnitsAbs,
            excludeTransactionId:
              isEditing && initialTransaction ? initialTransaction.id : null,
          });
          if (
            maintainingCheck.hasMaintainingBalance &&
            maintainingCheck.isUnderMaintaining
          ) {
            setPendingMaintainingWarning(maintainingCheck);
            setIsMaintainingWarningOpen(true);
            return;
          }
        }

        if (!bypassBudgetCheck) {
          const budgetLines = activeSplit
            ? splitLines
            : selectedCategoryId
              ? [
                  {
                    categoryId: selectedCategoryId,
                    amountMinorUnits: postedExpenseMinorUnitsAbs,
                  },
                ]
              : [];
          for (const line of budgetLines) {
            const budgetCheck = checkBudgetExceeded({
              categoryId: line.categoryId,
              amountMinorUnits: line.amountMinorUnits,
              expenseCurrencyCode: accountCurrencyCode,
              occurredAt: transactionOccurredAt,
              excludeTransactionId:
                isEditing && initialTransaction ? initialTransaction.id : null,
            });
            if (
              budgetCheck.hasBudget &&
              budgetCheck.isEnabled &&
              budgetCheck.exceeds &&
              budgetCheck.notifyOnExceeded
            ) {
              setPendingBudgetWarning(budgetCheck);
              setIsBudgetWarningOpen(true);
              return;
            }
          }
        }
      }

      setLocalError(null);
      const transactionInput: CreateTransactionInput = {
        accountId: selectedAccountId,
        categoryId: activeSplit ? null : selectedCategoryId,
        splitEntries: activeSplit
          ? splitLines.map(({ categoryId, amountMinorUnits: lineAmount, note }) => ({
              categoryId,
              amountMinorUnits: lineAmount,
              note,
            }))
          : isEditing
            ? []
            : undefined,
        pocketId: selectedPocketId,
        type: mode,
        amountMinorUnits: Math.abs(amountMinorUnits),
        typedAmountMinorUnitsAbs: Math.abs(amountMinorUnits),
        currencyCode: entryCurrency,
        signedAccountAmountMinorUnits:
          isCrossCurrencyEntry && exchangeLastEdited === "account"
            ? amountSign === "-"
              ? -accountAmountMinorUnits
              : accountAmountMinorUnits
            : undefined,
        exchangeRateScaled: isCrossCurrencyEntry ? exchangeRateScaled : null,
        exchangeLastEdited: isCrossCurrencyEntry ? exchangeLastEdited : undefined,
        name: name.trim() || null,
        note: note.trim() || null,
        occurredAt: transactionOccurredAt,
        installment: installmentFieldsLocked
          ? undefined
          : canConfigureInstallments && installmentEnabled
            ? {
                termMonths: resolvedTermMonths,
                deferredMonths: resolvedDeferredMonths,
              }
            : canConfigureInstallments
              ? null
              : undefined,
        labelIds: selectedLabelIds.filter((id) => labels.some((lbl) => lbl.id === id)),
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

  const handleProceedCreditLimit = async () => {
    setIsCreditLimitWarningOpen(false);
    await handleSave({ bypassCreditLimit: true });
  };

  const handleCancelCreditLimit = () => {
    setIsCreditLimitWarningOpen(false);
  };

  const handleProceedMaintaining = async () => {
    setIsMaintainingWarningOpen(false);
    await handleSave({
      bypassCreditLimit: true,
      bypassMaintainingBalance: true,
    });
  };

  const handleCancelMaintaining = () => {
    setIsMaintainingWarningOpen(false);
  };

  const handleProceedOverBudget = async () => {
    setIsBudgetWarningOpen(false);
    await handleSave({
      bypassCreditLimit: true,
      bypassMaintainingBalance: true,
      bypassBudget: true,
    });
  };

  const handleCancelOverBudget = () => {
    setIsBudgetWarningOpen(false);
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
              ref={closeRef}
              accessibilityLabel="Close form"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.topActionsContent}
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={styles.topActionsScroll}
          >
            {!isEditing && showQuickPresetsUi ? (
              <Pressable
                ref={presetsRef}
                accessibilityLabel="Open Quick Presets"
                accessibilityRole="button"
                disabled={pending || presetPending}
                onPress={() => setIsQuickPresetsOpen(true)}
                style={({ pressed }) => [
                  styles.quickPresetsButton,
                  pressed && styles.quickPresetsButtonPressed,
                ]}
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

            <Pressable
              ref={customizeRef}
              accessibilityLabel="Customize fields"
              accessibilityRole="button"
              disabled={pending}
              onPress={() => setIsFieldPreferencesOpen(true)}
              style={({ pressed }) => [
                styles.customizeFieldsButton,
                pressed && !pending && styles.customizeFieldsButtonPressed,
              ]}
            >
              <SlidersHorizontal color={theme.colors.primary} size={16} />
              <Text style={styles.customizeFieldsButtonText}>Customize fields</Text>
            </Pressable>
          </ScrollView>

          <View ref={typePickerRef} style={styles.typePickerSpacing}>
            <TransactionTypePicker
              allowTransfer={allowTransfer}
              disabled={pending}
              onChange={handleModeChange}
              value={mode}
            />
          </View>

          <KeyboardAwareFormPreset
            ref={formScrollRef}
            contentContainerStyle={styles.formScrollContent}
            multilineFocused={focusedFieldType === "description"}
            preset="transactionSheet"
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
          >
            <View ref={scrollContentRef} collapsable={false}>
            <View style={styles.nameDateGroup}>
              {showTransactionNameField || showAttachmentsField ? (
                <View style={styles.nameSuggestionAnchor}>
                  {showTransactionNameField ? (
                    <View ref={nameRef} style={styles.nameInputContainer}>
                      <TextInput
                        maxLength={100}
                        onBlur={() => setFocusedFieldType(null)}
                        onChangeText={(value) => {
                          setName(value);
                          setSuggestionsSuppressed(false);
                        }}
                        onFocus={() => setFocusedFieldType("normal")}
                        placeholder="Name"
                        placeholderTextColor={theme.colors.textSecondary}
                        style={[
                          styles.nameInput,
                          !showAttachmentsField && styles.nameInputWithoutAttachment,
                        ]}
                        value={name}
                      />
                      {showAttachmentsField ? (
                        <Pressable
                          ref={attachmentRef}
                          accessibilityLabel={
                            attachmentDraft.totalCount > 0
                              ? `View ${attachmentDraft.totalCount} attachments`
                              : "Add attachment"
                          }
                          accessibilityRole="button"
                          disabled={pending}
                          hitSlop={4}
                          onPress={() => setIsAttachmentManagerOpen(true)}
                          style={({ pressed }) => [
                            styles.nameAttachmentButton,
                            pressed && !pending && styles.nameAttachmentButtonPressed,
                          ]}
                        >
                          <View style={styles.nameAttachmentClipWrap}>
                            <Paperclip color={theme.colors.primary} size={18} />
                            {attachmentDraft.totalCount > 0 ? (
                              <Text style={styles.nameAttachmentCount}>
                                {attachmentDraft.totalCount > 99
                                  ? "99+"
                                  : attachmentDraft.totalCount}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : showAttachmentsField ? (
                    <Pressable
                      ref={attachmentRef}
                      accessibilityLabel={
                        attachmentDraft.totalCount > 0
                          ? `View ${attachmentDraft.totalCount} attachments`
                          : "Add attachment"
                      }
                      accessibilityRole="button"
                      disabled={pending}
                      onPress={() => setIsAttachmentManagerOpen(true)}
                      style={({ pressed }) => [
                        styles.standaloneAttachmentButton,
                        pressed && !pending && styles.nameAttachmentButtonPressed,
                      ]}
                    >
                      <Paperclip color={theme.colors.primary} size={18} />
                      <Text style={styles.standaloneAttachmentText}>
                        {attachmentDraft.totalCount > 0
                          ? `${attachmentDraft.totalCount} attachment${attachmentDraft.totalCount === 1 ? "" : "s"}`
                          : "Add attachment"}
                      </Text>
                    </Pressable>
                  ) : null}
                  {showTransactionNameField &&
                  showQuickPresetsUi &&
                  !isEditing &&
                  !suggestionsSuppressed ? (
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
              ) : null}
              <View style={styles.dateTimeRow}>
                <Pressable
                  ref={dateRef}
                  accessibilityLabel={`Transaction date ${formatTransactionDate(occurredAt)}. Tap to change.`}
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => setDateTimePickerMode("date")}
                  style={({ pressed }) => [
                    styles.dateTimeButton,
                    pressed && styles.dateTimeButtonPressed,
                    !showExactTimeField && styles.dateTimeButtonFull,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.dateTimeText}>
                    {formatTransactionDate(occurredAt)}
                  </Text>
                </Pressable>
                {showExactTimeField ? (
                  <>
                    <Text accessible={false} style={styles.dateTimeSeparator}>
                      |
                    </Text>
                    <Pressable
                      ref={timeRef}
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
                  </>
                ) : null}
              </View>
            </View>

            <View style={[styles.inputGroup, styles.amountExchangeStack]}>
              <AmountCalculatorField
                amountInputRef={amountRef}
                currencyRef={currencyRef}
                amountMinorUnits={amountMinorUnits}
                amountSign={mode === "transfer" ? "transfer" : amountSign}
                currencyCode={
                  mode === "transfer" ? accountCurrencyCode : entryCurrency
                }
                disabled={pending}
                label="Amount"
                showSignToggle={true}
                onOpenCalculator={() => {
                  setExchangeLastEdited("typed");
                  setIsCalculatorOpen(true);
                }}
                onPressCurrency={
                  mode === "transfer" ? undefined : () => setIsCurrencyPickerOpen(true)
                }
                onToggleSign={
                  mode !== "transfer"
                    ? () => setAmountSign((prev) => (prev === "+" ? "-" : "+"))
                    : undefined
                }
              />
              {mode !== "transfer" && selectedAccount ? (
                <TransactionExchangeRateHint
                  accountCurrencyCode={accountCurrencyCode}
                  amountMinorUnits={amountMinorUnits}
                  amountSign={amountSign}
                  entryCurrencyCode={entryCurrency}
                  onUseCurrentRate={
                    isCrossCurrencyEntry
                      ? () => {
                          const ratesMap = getExchangeRateMap(
                            DEFAULT_BASE_CURRENCY,
                          );
                          const nextRate = snapshotExchangeRateFromBook(
                            entryCurrency,
                            accountCurrencyCode,
                            ratesMap,
                            DEFAULT_BASE_CURRENCY,
                          );
                          setExchangeLastEdited("rate");
                          setExchangeRateScaled(nextRate);
                          setExchangeRateText(
                            formatSnapshotExchangeRateDecimal(nextRate),
                          );
                        }
                      : undefined
                  }
                />
              ) : null}
              {isCrossCurrencyEntry ? (
                <View style={styles.crossCurrencyFields}>
                  <Text style={styles.fieldLabel}>
                    1 {entryCurrency} =
                  </Text>
                  <TextInput
                    accessibilityLabel="Exchange rate"
                    keyboardType="decimal-pad"
                    onBlur={() => setFocusedFieldType(null)}
                    onChangeText={(text) => {
                      setExchangeRateText(text);
                      const parsed = parseExchangeRateDecimalToScaled(text);
                      if (parsed !== null) {
                        setExchangeLastEdited("rate");
                        setExchangeRateScaled(parsed);
                      }
                    }}
                    onFocus={() => setFocusedFieldType("normal")}
                    placeholder="Rate"
                    style={styles.rateInput}
                    value={exchangeRateText}
                  />
                  <Text style={styles.fieldLabel}>{accountCurrencyCode}</Text>
                  <Pressable
                    accessibilityLabel={`Account amount ${formatCurrency(accountAmountMinorUnits, accountCurrencyCode)}`}
                    accessibilityRole="button"
                    onPress={() => {
                      setExchangeLastEdited("account");
                      setIsAccountAmountCalculatorOpen(true);
                    }}
                    style={styles.accountAmountChip}
                  >
                    <Text style={styles.accountAmountChipText}>
                      Account:{" "}
                      {formatCurrency(
                        accountAmountMinorUnits,
                        accountCurrencyCode,
                        false,
                      )}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Account Selector */}
            <View style={styles.inputGroup}>
              {mode === "transfer" ? (
                <Text style={styles.fieldLabel}>TRANSFER FROM</Text>
              ) : null}
              <Pressable
                ref={accountRef}
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
                  {isTransferCrossCurrency && transferToAccount ? (
                    <Pressable
                      accessibilityLabel={`Destination amount ${formatCurrency(transferDestinationAmountMinorUnits, transferToAccount.currencyCode)}`}
                      accessibilityRole="button"
                      onPress={() => setIsAccountAmountCalculatorOpen(true)}
                      style={[styles.accountAmountChip, { marginTop: 8 }]}
                    >
                      <Text style={styles.accountAmountChipText}>
                        Received:{" "}
                        {formatCurrency(
                          transferDestinationAmountMinorUnits,
                          transferToAccount.currencyCode,
                          false,
                        )}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.transferFeePanel}>
                  <View style={styles.transferFeeHeader}>
                    <View style={styles.transferFeeHeaderText}>
                      <Text style={styles.transferFeeTitle}>Transfer Fee</Text>
                      <Text style={styles.transferFeeDescription}>
                        Deduct an instant transaction fee (e.g. InstaPay, GCash, bank charges)
                      </Text>
                    </View>
                    <ThemedSwitch
                      accessibilityLabel="Add transfer fee"
                      onValueChange={handleFeeEnabledChange}
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
              <View style={[styles.inputGroup, styles.splitCategoryGroup]}>
                {!splitEnabled ? (
                  <>
                    <Pressable
                      ref={categoryRef}
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
                    {mode === "expense" && selectedCategoryId && amountMinorUnits > 0 ? (
                      <BudgetLiveIndicator
                        amountMinorUnits={postedExpenseMinorUnitsAbs}
                        categoryId={selectedCategoryId}
                        expenseCurrencyCode={accountCurrencyCode}
                        excludeTransactionId={
                          isEditing && initialTransaction ? initialTransaction.id : null
                        }
                        occurredAt={occurredAt}
                      />
                    ) : null}
                  </>
                ) : null}
                {canUseSplit && showSplitField ? (
                  <View ref={splitRef}>
                    <TransactionSplitEditor
                      categories={flatCategoriesForSplit}
                      currencyCode={accountCurrencyCode}
                      disabled={pending}
                      enabled={splitEnabled}
                      lines={splitLines}
                      onEnabledChange={(value) => {
                        if (value) {
                          setSplitLines([
                            {
                              key: "split-1",
                              categoryId: selectedCategoryId,
                              amountMinorUnits: splitTotalMinorUnits,
                              note: null,
                            },
                            createEmptySplitLine("split-2"),
                          ]);
                        } else if (splitLines[0]?.categoryId) {
                          setSelectedCategoryId(splitLines[0].categoryId);
                        }
                        setSplitEnabled(value);
                      }}
                      onLinesChange={setSplitLines}
                      onPickCategory={(lineKey) => {
                        setSplitCategoryPickerLineKey(lineKey);
                        setIsCategoryPickerOpen(true);
                      }}
                      totalMinorUnits={splitTotalMinorUnits}
                    />
                  </View>
                ) : null}
              </View>
            )}

            {showInstallmentsUi ? (
              <View style={styles.installmentPanel}>
                <View style={styles.installmentHeader}>
                  <View style={styles.installmentHeaderText}>
                    <Text style={styles.installmentTitle}>Installment purchase</Text>
                    <Text style={styles.installmentDescription}>
                      {installmentFieldsLocked
                        ? `${installmentEditState.billedInstallmentCount} installment payment${installmentEditState.billedInstallmentCount === 1 ? "" : "s"} already on a statement. Terms cannot be changed.`
                        : "The full purchase uses your credit limit now; one portion is billed per statement."}
                    </Text>
                  </View>
                  <ThemedSwitch
                    accessibilityLabel="Installment purchase"
                    disabled={installmentFieldsLocked || !canConfigureInstallments}
                    onValueChange={setInstallmentEnabled}
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
                              disabled={installmentFieldsLocked}
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
                                installmentFieldsLocked && styles.deferralChipDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.deferralChipText,
                                  isSelected && styles.deferralChipTextActive,
                                  installmentFieldsLocked && styles.deferralChipTextDisabled,
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
                            editable={!installmentFieldsLocked}
                            keyboardType="number-pad"
                            maxLength={3}
                            onBlur={() => setFocusedFieldType(null)}
                            onChangeText={(value) =>
                              setCustomTermMonths(value.replace(/\D/g, ""))
                            }
                            onFocus={() => setFocusedFieldType("normal")}
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
                              disabled={installmentFieldsLocked}
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
                                installmentFieldsLocked && styles.deferralChipDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.deferralChipText,
                                  isSelected && styles.deferralChipTextActive,
                                  installmentFieldsLocked && styles.deferralChipTextDisabled,
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
                            editable={!installmentFieldsLocked}
                            keyboardType="number-pad"
                            maxLength={2}
                            onBlur={() => setFocusedFieldType(null)}
                            onChangeText={(value) =>
                              setCustomDeferralMonths(value.replace(/\D/g, ""))
                            }
                            onFocus={() => setFocusedFieldType("normal")}
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
                              accountCurrencyCode,
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

            {showLabelsField ? (
            <View ref={labelsRef} style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>LABELS (OPTIONAL)</Text>
              <View style={styles.labelChipsRow}>
                {selectedLabelIds.length === 0 ? (
                  <Pressable
                    accessibilityLabel="Select labels"
                    accessibilityRole="button"
                    onPress={() => setIsLabelPickerOpen(true)}
                    style={styles.labelChipButton}
                  >
                    <Text style={styles.labelChipButtonText}># Label</Text>
                  </Pressable>
                ) : (
                  <>
                    {selectedLabelsForChips.map((lbl) => {
                      const badgeColor = lbl.color || theme.colors.primary;
                      return (
                        <View
                          key={lbl.id}
                          style={[
                            styles.selectedLabelChip,
                            {
                              backgroundColor: `${badgeColor}18`,
                              borderColor: `${badgeColor}44`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.selectedLabelChipText,
                              { color: badgeColor },
                            ]}
                          >
                            #{lbl.name}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Remove label ${lbl.name}`}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={() =>
                              setSelectedLabelIds((prev) =>
                                prev.filter((item) => item !== lbl.id),
                              )
                            }
                            style={styles.removeLabelChipBtn}
                          >
                            <X size={13} color={badgeColor} strokeWidth={2.5} />
                          </Pressable>
                        </View>
                      );
                    })}
                    <Pressable
                      accessibilityLabel="Add more labels"
                      accessibilityRole="button"
                      onPress={() => setIsLabelPickerOpen(true)}
                      style={styles.addLabelChipButton}
                    >
                      <Plus size={13} color={theme.colors.primary} strokeWidth={2.5} />
                      <Text style={styles.addLabelChipButtonText}>Add Label</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
            ) : null}

            {showNoteField ? (
            <View ref={noteRef} style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>NOTE / MEMO (OPTIONAL)</Text>
              <TextInput
                maxLength={200}
                multiline
                onBlur={() => setFocusedFieldType(null)}
                onChangeText={setNote}
                onFocus={() => setFocusedFieldType("description")}
                placeholder="e.g. Grocery run at SM, Grab to airport..."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.noteInput}
                textAlignVertical="top"
                value={note}
              />
            </View>
            ) : null}

            {!isEditing && !appliedPresetId && showQuickPresetsUi ? (
              <View
                pointerEvents={canSaveAsQuickPreset ? "auto" : "none"}
                style={[
                  styles.quickPresetSavePanel,
                  !canSaveAsQuickPreset && styles.quickPresetSavePanelDisabled,
                ]}
              >
                <Host matchContents style={styles.quickPresetCheckbox}>
                  <Checkbox
                    disabled={!canSaveAsQuickPreset}
                    label={
                      matchingPreset
                        ? "Update matching Quick Preset"
                        : "Save as a Quick Preset"
                    }
                    onValueChange={(value) => {
                      if (!canSaveAsQuickPreset) return;
                      setSaveAsQuickPreset(value);
                    }}
                    value={saveAsQuickPreset && canSaveAsQuickPreset}
                  />
                </Host>
                <Text style={styles.quickPresetHelp}>
                  {matchingPreset
                    ? `Reuse this name by updating “${matchingPreset.transactionName}” with the current details.`
                    : name.trim()
                      ? "Reuse these details when you type this transaction name."
                      : "Enter a transaction name above to save as a Quick Preset."}
                </Text>
                {saveAsQuickPreset && canSaveAsQuickPreset ? (
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
            </View>
          </KeyboardAwareFormPreset>

          {/* Action Buttons */}
          <KeyboardStickyView
            offset={{
              closed: 0,
              opened: Math.max(insets.bottom, 20),
            }}
            style={styles.stickyFooter}
          >
            <View style={styles.footerRow}>
              <Pressable
                ref={cancelRef}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                ref={saveRef}
                accessibilityLabel={pending ? "Saving..." : "Save Record"}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => handleSave(false)}
                style={[styles.saveBtn, pending && styles.saveBtnDisabled]}
              >
                <Text style={styles.saveBtnText}>
                  {pending ? "Saving..." : "Save Record"}
                </Text>
              </Pressable>
            </View>
          </KeyboardStickyView>

          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />

          <TransactionFormWalkthroughOverlay
            onNext={walkthrough.nextStep}
            onPrev={walkthrough.prevStep}
            onSkip={walkthrough.skipWalkthrough}
            step={walkthrough.currentStep}
            stepIndex={walkthrough.activeStepIndex}
            targetLayout={walkthrough.activeTargetLayout}
            totalSteps={walkthrough.totalSteps}
            visible={walkthrough.isWalkthroughActive}
          />
        </View>
      </View>

      {/* Sub-Modals */}
      <AmountCalculatorModal
        currencyCode={mode === "transfer" ? accountCurrencyCode : entryCurrency}
        initialMinorUnits={amountMinorUnits}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          setExchangeLastEdited("typed");
          setAmountMinorUnits(Math.abs(minorUnits));
          setIsCalculatorOpen(false);
        }}
        title={`Enter ${mode.toUpperCase()} Amount`}
        visible={isCalculatorOpen}
      />

      <AmountCalculatorModal
        currencyCode={
          mode === "transfer" && isTransferCrossCurrency
            ? transferToCurrencyCode
            : accountCurrencyCode
        }
        initialMinorUnits={
          mode === "transfer" && isTransferCrossCurrency
            ? transferDestinationAmountMinorUnits
            : accountAmountMinorUnits
        }
        onClose={() => setIsAccountAmountCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          if (mode === "transfer" && isTransferCrossCurrency) {
            setTransferDestinationAmountMinorUnits(Math.abs(minorUnits));
          } else {
            setExchangeLastEdited("account");
            setAccountAmountMinorUnits(Math.abs(minorUnits));
          }
          setIsAccountAmountCalculatorOpen(false);
        }}
        title={
          mode === "transfer" && isTransferCrossCurrency
            ? `Enter received amount (${transferToCurrencyCode})`
            : `Enter account amount (${accountCurrencyCode})`
        }
        visible={isAccountAmountCalculatorOpen}
      />

      <TransactionCurrencyPickerModal
        selectedCode={entryCurrency}
        visible={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        onSelect={(code) => {
          setExchangeLastEdited("typed");
          setExchangeRateScaled(null);
          setExchangeRateText("");
          setEntryCurrencyCode(code.trim().toUpperCase());
        }}
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
        defaultExpenseAccountId={effectiveDefaultExpenseAccountId}
        defaultExpensePocketId={effectiveDefaultExpensePocketId}
        defaultIncomeAccountId={effectiveDefaultIncomeAccountId}
        defaultIncomePocketId={effectiveDefaultIncomePocketId}
        onSetDefaultExpense={defaultAccounts.setExpenseAccount}
        onSetDefaultIncome={defaultAccounts.setIncomeAccount}
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
        defaultExpenseAccountId={effectiveDefaultExpenseAccountId}
        defaultExpensePocketId={effectiveDefaultExpensePocketId}
        defaultIncomeAccountId={effectiveDefaultIncomeAccountId}
        defaultIncomePocketId={effectiveDefaultIncomePocketId}
        onSetDefaultExpense={defaultAccounts.setExpenseAccount}
        onSetDefaultIncome={defaultAccounts.setIncomeAccount}
      />

      <CategoryPickerModal
        categories={categories}
        enableQuickAdd
        onClose={() => {
          setIsCategoryPickerOpen(false);
          setSplitCategoryPickerLineKey(null);
        }}
        onRequestAddCategory={(categoryType) => {
          presentCategoryFormFromPicker("transaction", () => {
            openNewCategoryForm(categoryType, (categoryId) => {
              if (splitCategoryPickerLineKey) {
                setSplitLines((lines) =>
                  lines.map((line) =>
                    line.key === splitCategoryPickerLineKey
                      ? { ...line, categoryId }
                      : line,
                  ),
                );
                setSplitCategoryPickerLineKey(null);
              } else {
                setSelectedCategoryId(categoryId);
              }
              setIsCategoryPickerOpen(false);
            });
          });
        }}
        onRequestAddSubcategory={(parent, categoryType) => {
          presentCategoryFormFromPicker("transaction", () => {
            openNewSubcategoryForm(parent, categoryType, (categoryId) => {
              if (splitCategoryPickerLineKey) {
                setSplitLines((lines) =>
                  lines.map((line) =>
                    line.key === splitCategoryPickerLineKey
                      ? { ...line, categoryId }
                      : line,
                  ),
                );
                setSplitCategoryPickerLineKey(null);
              } else {
                setSelectedCategoryId(categoryId);
              }
              setIsCategoryPickerOpen(false);
            });
          });
        }}
        onSelectCategory={(cat) => {
          if (splitCategoryPickerLineKey) {
            setSplitLines((lines) =>
              lines.map((line) =>
                line.key === splitCategoryPickerLineKey
                  ? { ...line, categoryId: cat.id }
                  : line,
              ),
            );
            setSplitCategoryPickerLineKey(null);
          } else {
            setSelectedCategoryId(cat.id);
          }
          setIsCategoryPickerOpen(false);
        }}
        selectedCategoryId={
          splitCategoryPickerLineKey
            ? splitLines.find((line) => line.key === splitCategoryPickerLineKey)
                ?.categoryId ?? ""
            : selectedCategoryId
        }
        title={mode === "income" ? "Select Income Category" : "Select Expense Category"}
        type={mode === "income" ? "income" : "expense"}
        visible={isCategoryPickerOpen}
      />

      <LabelPickerModal
        onClose={() => {
          setIsLabelPickerOpen(false);
          refreshLabels();
        }}
        onSelectLabels={setSelectedLabelIds}
        selectedLabelIds={selectedLabelIds}
        visible={isLabelPickerOpen}
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
        defaultExpenseAccountId={effectiveDefaultExpenseAccountId}
        defaultExpensePocketId={effectiveDefaultExpensePocketId}
        defaultIncomeAccountId={effectiveDefaultIncomeAccountId}
        defaultIncomePocketId={effectiveDefaultIncomePocketId}
        onSetDefaultExpense={defaultAccounts.setExpenseAccount}
        onSetDefaultIncome={defaultAccounts.setIncomeAccount}
      />

      <CategoryPickerModal
        categories={categories}
        enableQuickAdd
        onClose={() => setIsFeeCategoryPickerOpen(false)}
        onRequestAddCategory={(categoryType) => {
          presentCategoryFormFromPicker("fee", () => {
            openNewCategoryForm(categoryType, (categoryId) => {
              setFeeCategoryId(categoryId);
              setIsFeeCategoryPickerOpen(false);
            });
          });
        }}
        onRequestAddSubcategory={(parent, categoryType) => {
          presentCategoryFormFromPicker("fee", () => {
            openNewSubcategoryForm(parent, categoryType, (categoryId) => {
              setFeeCategoryId(categoryId);
              setIsFeeCategoryPickerOpen(false);
            });
          });
        }}
        onSelectCategory={(cat) => setFeeCategoryId(cat.id)}
        selectedCategoryId={feeCategoryId || (defaultFeeCategory?.id ?? "")}
        title="Select Fee Category"
        type="expense"
        visible={isFeeCategoryPickerOpen}
      />

      <CategoryFormModal
        key={
          categoryFormDraft
            ? `${categoryFormDraft.initialType}-${categoryFormDraft.initialParentId ?? "root"}`
            : "category-form-closed"
        }
        error={categorySaveError}
        initialParentId={categoryFormDraft?.initialParentId ?? null}
        initialType={categoryFormDraft?.initialType ?? "expense"}
        onClearError={clearCategorySaveError}
        onClose={closeCategoryFormModal}
        onSave={async (input, id) => {
          const saved = await saveCategoryRecord(input, id);
          if (!saved) {
            return false;
          }
          await onCategoriesChanged?.();
          setCategoryFormReturnPicker(null);
          categoryFormDraft?.applySelection(saved.id);
          setCategoryFormDraft(null);
          return true;
        }}
        parentCategoryName={categoryFormDraft?.parentCategoryName ?? null}
        pending={categorySaving}
        visible={categoryFormDraft !== null}
      />

      <QuickPresetsModal
        accounts={accounts}
        categories={categories}
        error={presetError}
        loading={presetsLoading}
        onClearError={onClearPresetError}
        onClose={() => setIsQuickPresetsOpen(false)}
        onDelete={onDeletePreset}
        onArchive={onArchivePreset}
        onRestore={onRestorePreset}
        onPermanentlyDelete={onPermanentlyDeletePreset}
        onReorder={onReorderPresets}
        onSave={onSavePreset}
        onSelect={applyQuickPreset}
        pending={presetPending}
        pockets={pockets}
        presets={presets}
        archivedPresets={archivedPresets}
        sortBy={presetSortBy}
        onChangeSortBy={onChangePresetSortBy}
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

      <CreditLimitWarningModal
        onCancel={handleCancelCreditLimit}
        onProceed={handleProceedCreditLimit}
        pending={pending}
        result={pendingCreditLimitWarning}
        visible={isCreditLimitWarningOpen}
      />

      <MaintainingBalanceWarningModal
        onCancel={handleCancelMaintaining}
        onProceed={handleProceedMaintaining}
        pending={pending}
        result={pendingMaintainingWarning}
        visible={isMaintainingWarningOpen}
      />

      <OverBudgetWarningModal
        onCancel={handleCancelOverBudget}
        onProceed={handleProceedOverBudget}
        pending={pending}
        result={pendingBudgetWarning}
        visible={isBudgetWarningOpen}
      />

      <TransactionFormFieldPreferencesModal
        onClose={() => setIsFieldPreferencesOpen(false)}
        visible={isFieldPreferencesOpen}
      />

      <WalkthroughIntroModal
        visible={visible && !isEditing && walkthroughIntro.isIntroVisible}
        title={t("transactionFormWalkthrough.introTitle")}
        subtitle={t("transactionFormWalkthrough.introSubtitle")}
        message={t("transactionFormWalkthrough.introMessage")}
        icon={<Receipt color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />
    </>
  );
}

export function TransactionFormModal(props: TransactionFormModalProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <TransactionFormModalInner {...props} />
    </WalkthroughRegistryProvider>
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
    topActionsScroll: {
      flexGrow: 0,
      marginBottom: theme.spacing.sm,
    },
    topActionsContent: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    quickPresetsButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 34,
      paddingHorizontal: theme.spacing.sm,
    },
    quickPresetsButtonPressed: {
      opacity: 0.7,
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
    formScrollContent: {
      paddingBottom: theme.spacing.md,
    },
    inputGroup: {
      marginBottom: 16,
    },
    splitCategoryGroup: {
      gap: theme.spacing.sm,
    },
    amountExchangeStack: {
      gap: theme.spacing.sm,
    },
    crossCurrencyFields: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    rateInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      minWidth: 88,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    accountAmountChip: {
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}33`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    accountAmountChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
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
    nameAttachmentButton: {
      alignItems: "center",
      borderLeftColor: theme.colors.border,
      borderLeftWidth: StyleSheet.hairlineWidth,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    nameAttachmentButtonPressed: {
      opacity: 0.65,
    },
    nameAttachmentClipWrap: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    nameAttachmentCount: {
      color: theme.colors.primary,
      fontSize: 9,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
      position: "absolute",
      right: -8,
      top: -5,
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
    deferralChipDisabled: {
      opacity: 0.55,
    },
    deferralChipTextDisabled: {
      color: theme.colors.textMuted,
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
    labelChipsRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    labelChipButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    labelChipButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    selectedLabelChip: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 6,
    },
    selectedLabelChipText: {
      fontSize: 13,
      fontWeight: "600",
    },
    removeLabelChipBtn: {
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    addLabelChipButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: theme.borderRadius.round,
      borderStyle: "dashed",
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    addLabelChipButtonText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: "600",
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
    quickPresetSavePanelDisabled: {
      opacity: 0.55,
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
    customizeFieldsButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 34,
      paddingHorizontal: theme.spacing.sm,
    },
    customizeFieldsButtonPressed: {
      opacity: 0.7,
    },
    customizeFieldsButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    nameInputWithoutAttachment: {
      flex: 1,
    },
    standaloneAttachmentButton: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
    },
    standaloneAttachmentText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    dateTimeButtonFull: {
      flex: 1,
    },
    stickyFooter: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginHorizontal: -20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 6,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
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
