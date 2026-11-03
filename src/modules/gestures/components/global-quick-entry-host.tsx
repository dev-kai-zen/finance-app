import React, {
  useCallback,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import {
  TransactionFormModal,
  useTransactionPresets,
  useTransactions,
  type CreateTransactionInput,
  type CreateTransferInput,
  type TransactionAttachmentChanges,
  type TransactionListItem,
  type TransactionPresetSubmission,
  type TransactionType,
} from "@/modules/transactions";
import {
  ChatWithKaiModal,
  type ChatSavedTransactionResult,
} from "@/modules/chat-with-kai";
import { useShakeActionSetting } from "@/modules/settings";
import { QuickEntryContext } from "../context/quick-entry-context";
import { useShakeGesture } from "../hooks/use-shake-gesture";

export function QuickEntryProvider({ children }: PropsWithChildren) {
  const { shakeAction } = useShakeActionSetting();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>("expense");
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [onChatEditSaved, setOnChatEditSaved] =
    useState<((saved: ChatSavedTransactionResult) => void) | null>(null);
  const returnToChatOnFormCloseRef = useRef(false);

  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories, refresh: refreshCategories } = useCategories();
  const { preferences: currencyPrefs } = useCurrencyPreferences();

  const {
    presets,
    archivedPresets,
    sortBy: presetSortBy,
    setSortBy: setPresetSortBy,
    loading: presetsLoading,
    pending: presetPending,
    error: presetError,
    clearError: clearPresetError,
    savePreset,
    archivePreset,
    deletePreset,
    restorePreset,
    permanentlyDeletePreset,
    reorderPresets,
  } = useTransactionPresets();

  const {
    recordTransaction: handleSaveTx,
    recordTransfer: handleSaveTransfer,
    editTransaction,
    editTransfer,
    deleteTx,
    error: transactionError,
    clearError: clearTransactionError,
    pendingAction,
    refresh: refreshTransactions,
  } = useTransactions();

  const isQuickEntryOpen = isChatOpen || isFormOpen;

  const openChatWithKai = useCallback(() => {
    setIsFormOpen(false);
    setIsChatOpen(true);
  }, []);

  const openManualEntry = useCallback((mode: TransactionType = "expense") => {
    setIsChatOpen(false);
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setModalMode(mode);
    setIsFormOpen(true);
  }, []);

  const closeQuickEntry = useCallback(() => {
    setIsChatOpen(false);
    setIsFormOpen(false);
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    returnToChatOnFormCloseRef.current = false;
  }, []);

  const triggerShakeAction = useCallback(() => {
    if (shakeAction === "chat_with_kai") {
      openChatWithKai();
    } else if (shakeAction === "manual_entry") {
      openManualEntry("expense");
    }
  }, [shakeAction, openChatWithKai, openManualEntry]);

  // Hook up shake sensor
  useShakeGesture({
    enabled: shakeAction !== "disabled" && !isQuickEntryOpen,
    onShake: triggerShakeAction,
  });

  const notifyChange = useCallback(() => {
    refreshAccounts();
    void refreshTransactions();
    DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED");
  }, [refreshAccounts, refreshTransactions]);

  const handleSaveTransaction = useCallback(
    async (
      input: CreateTransactionInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ) => {
      const id = await handleSaveTx(input, preset, attachmentChanges);
      if (id) {
        notifyChange();
      }
      return id;
    },
    [handleSaveTx, notifyChange],
  );

  const handleSaveTransferAction = useCallback(
    async (
      input: CreateTransferInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ) => {
      const id = await handleSaveTransfer(input, preset, attachmentChanges);
      if (id) {
        notifyChange();
      }
      return id;
    },
    [handleSaveTransfer, notifyChange],
  );

  const handleFormSaveTransaction = useCallback(
    async (
      input: CreateTransactionInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<boolean> => {
      const id = await handleSaveTx(input, preset, attachmentChanges);
      if (id) {
        notifyChange();
        return true;
      }
      return false;
    },
    [handleSaveTx, notifyChange],
  );

  const handleFormSaveTransfer = useCallback(
    async (
      input: CreateTransferInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<boolean> => {
      const id = await handleSaveTransfer(input, preset, attachmentChanges);
      if (id) {
        notifyChange();
        return true;
      }
      return false;
    },
    [handleSaveTransfer, notifyChange],
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      const success = await deleteTx(id);
      if (success) {
        notifyChange();
      }
      return success;
    },
    [deleteTx, notifyChange],
  );

  return (
    <QuickEntryContext.Provider
      value={{
        openChatWithKai,
        openManualEntry,
        triggerShakeAction,
        closeQuickEntry,
        isQuickEntryOpen,
      }}
    >
      {children}

      {/* Global Chat with Kai Modal */}
      <ChatWithKaiModal
        accounts={accounts}
        categories={categories}
        defaultCurrency={currencyPrefs.defaultCurrency}
        onClose={() => setIsChatOpen(false)}
        onDeleteTransaction={handleDeleteTransaction}
        onEditInForm={(prefilled, onSaved, isEditing = false) => {
          returnToChatOnFormCloseRef.current = true;
          setPrefilledTransaction(prefilled);
          setIsEditingTransaction(isEditing);
          setModalMode((prefilled?.type as TransactionType) ?? "expense");
          setOnChatEditSaved(() => onSaved);
          setIsChatOpen(false);
          setTimeout(
            () => {
              setIsFormOpen(true);
            },
            Platform.OS === "ios" ? 250 : 80,
          );
        }}
        onSaveTransaction={handleSaveTransaction}
        onSaveTransfer={handleSaveTransferAction}
        pockets={pockets}
        visible={isChatOpen}
      />

      {/* Global Manual Entry Transaction Modal */}
      <TransactionFormModal
        accounts={accounts}
        archivedPresets={archivedPresets}
        categories={categories}
        error={transactionError}
        initialTransaction={prefilledTransaction}
        initialType={modalMode}
        isEditing={isEditingTransaction}
        onChangePresetSortBy={setPresetSortBy}
        onClearError={clearTransactionError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          const shouldReturnToChat = returnToChatOnFormCloseRef.current;
          returnToChatOnFormCloseRef.current = false;
          setIsFormOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
          setModalMode("expense");
          setOnChatEditSaved(null);
          if (shouldReturnToChat) {
            setTimeout(
              () => {
                setIsChatOpen(true);
              },
              Platform.OS === "ios" ? 250 : 80,
            );
          }
        }}
        onDeletePreset={deletePreset}
        onArchivePreset={archivePreset}
        onRestorePreset={restorePreset}
        onPermanentlyDeletePreset={permanentlyDeletePreset}
        onReorderPresets={reorderPresets}
        onSavePreset={savePreset}
        onSaveTransaction={handleFormSaveTransaction}
        onSaveTransfer={handleFormSaveTransfer}
        onUpdateTransaction={async (id, input, attachmentChanges) => {
          const success = await editTransaction(id, input, attachmentChanges);
          if (success) {
            notifyChange();
            const cat = categories
              .flatMap((c) => [c, ...(c.subcategories ?? [])])
              .find((c) => c.id === input.categoryId);
            const acc = accounts.find((a) => a.id === input.accountId);
            onChatEditSaved?.({
              id,
              type: input.type,
              amountMinorUnits: Math.abs(input.amountMinorUnits),
              currencyCode: input.currencyCode,
              name: input.name ?? null,
              note: input.note ?? null,
              occurredAt: input.occurredAt ?? new Date(),
              accountId: input.accountId,
              accountName: acc?.name ?? null,
              categoryId: input.categoryId ?? null,
              categoryName: cat?.name ?? null,
              categoryIcon: cat?.icon ?? null,
              categoryColor: cat?.hexColorsId ?? null,
              pocketId: input.pocketId ?? null,
            });
            setOnChatEditSaved(null);
          }
          return success;
        }}
        onUpdateTransfer={async (input, attachmentChanges) => {
          const success = await editTransfer(input, attachmentChanges);
          if (success) {
            notifyChange();
            const fromAcc = accounts.find((a) => a.id === input.fromAccountId);
            const toAcc = accounts.find((a) => a.id === input.toAccountId);
            onChatEditSaved?.({
              id: input.transactionGroupId,
              type: "transfer",
              amountMinorUnits: Math.abs(input.amountMinorUnits),
              name: input.name ?? null,
              note: input.note ?? null,
              occurredAt: input.occurredAt ?? new Date(),
              accountId: input.fromAccountId,
              accountName: fromAcc?.name ?? null,
              transferAccountId: input.toAccountId,
              transferAccountName: toAcc?.name ?? null,
            });
            setOnChatEditSaved(null);
          }
          return success;
        }}
        onCategoriesChanged={() => void refreshCategories()}
        pending={pendingAction}
        pockets={pockets}
        presetError={presetError}
        presetPending={presetPending}
        presets={presets}
        presetsLoading={presetsLoading}
        presetSortBy={presetSortBy}
        visible={isFormOpen}
      />
    </QuickEntryContext.Provider>
  );
}
