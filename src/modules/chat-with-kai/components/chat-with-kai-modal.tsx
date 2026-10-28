import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type {
  ChatSavedTransactionResult,
  ChatWithKaiModalProps,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { useChatWithKai } from "../hooks/use-chat-with-kai";
import { ChatMessageBubble } from "./chat-message-bubble";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionListItem,
} from "@/modules/transactions";
import { CategoryPickerModal } from "@/modules/categories";
import {
  KaiChatSettingsModal,
  useChatTransactionMode,
  useDefaultAccounts,
} from "@/modules/settings";

export function ChatWithKaiModal({
  visible,
  onClose,
  accounts,
  pockets = [],
  categories,
  defaultExpenseAccountId: propsDefaultExpenseAccountId,
  defaultIncomeAccountId: propsDefaultIncomeAccountId,
  defaultExpensePocketId: propsDefaultExpensePocketId,
  defaultIncomePocketId: propsDefaultIncomePocketId,
  defaultCurrency = "PHP",
  onEditInForm,
  onSaveTransaction,
  onSaveTransfer,
  onDeleteTransaction,
}: ChatWithKaiModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { locale, t } = useLocalization();
  const defaultAccounts = useDefaultAccounts();
  const { mode, setMode } = useChatTransactionMode();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const effectiveDefaultExpenseAccountId =
    propsDefaultExpenseAccountId !== undefined
      ? propsDefaultExpenseAccountId
      : defaultAccounts.defaultExpenseAccountId;
  const effectiveDefaultIncomeAccountId =
    propsDefaultIncomeAccountId !== undefined
      ? propsDefaultIncomeAccountId
      : defaultAccounts.defaultIncomeAccountId;
  const effectiveDefaultExpensePocketId =
    propsDefaultExpensePocketId !== undefined
      ? propsDefaultExpensePocketId
      : defaultAccounts.defaultExpensePocketId;
  const effectiveDefaultIncomePocketId =
    propsDefaultIncomePocketId !== undefined
      ? propsDefaultIncomePocketId
      : defaultAccounts.defaultIncomePocketId;

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [pickerTargetMessageId, setPickerTargetMessageId] = useState<string | null>(null);

  const handleAutoSave = async (
    proposal: ParsedTransactionProposal,
  ): Promise<string | null> => {
    try {
      if (proposal.type === "transfer") {
        if (!onSaveTransfer || !proposal.transferAccountId) return null;
        const transferInput: CreateTransferInput = {
          fromAccountId: proposal.accountId,
          toAccountId: proposal.transferAccountId,
          amountMinorUnits: proposal.amountMinorUnits,
          name: proposal.name ?? null,
          note: proposal.note ?? null,
          occurredAt: proposal.occurredAt ?? new Date(),
        };
        const res = await onSaveTransfer(transferInput);
        if (typeof res === "string" && res.length > 0) return res;
        return null;
      }

      const isNeg = proposal.type === "expense";
      const txInput: CreateTransactionInput = {
        accountId: proposal.accountId,
        pocketId: proposal.pocketId ?? null,
        categoryId: proposal.categoryId ?? null,
        type: proposal.type as "expense" | "income",
        amountMinorUnits: isNeg
          ? -Math.abs(proposal.amountMinorUnits)
          : Math.abs(proposal.amountMinorUnits),
        currencyCode: proposal.currencyCode,
        name: proposal.name ?? null,
        note: proposal.note ?? null,
        occurredAt: proposal.occurredAt ?? new Date(),
      };
      const res = await onSaveTransaction(txInput);
      if (typeof res === "string" && res.length > 0) return res;
      return null;
    } catch {
      return null;
    }
  };

  const {
    messages,
    inputText,
    setInputText,
    processing,
    sendMessage,
    markProposalSaved,
    updateProposalData,
    markProposalDeleted,
    assignCategoryToProposal,
    updateProposalCategory,
    confirmReassignKeyword,
    dismissReassignKeyword,
    clearConversation,
    reloadKeywords,
  } = useChatWithKai(
    {
      accounts,
      pockets,
      categories,
      defaultExpenseAccountId: effectiveDefaultExpenseAccountId,
      defaultIncomeAccountId: effectiveDefaultIncomeAccountId,
      defaultExpensePocketId: effectiveDefaultExpensePocketId,
      defaultIncomePocketId: effectiveDefaultIncomePocketId,
      defaultCurrency,
      language: (locale as "en" | "fil" | "es") || "en",
    },
    {
      mode,
      onAutoSave: handleAutoSave,
    },
  );

  const activePickerMessage = pickerTargetMessageId
    ? messages.find((m) => m.id === pickerTargetMessageId)
    : null;
  const activePickerType =
    activePickerMessage?.partialProposal?.type === "income" ? "income" : "expense";

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages.length]);

  const handleRetryUserMessage = (text: string) => {
    setInputText(text);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  };

  const handleEdit = (proposal: ParsedTransactionProposal) => {
    const isNeg = proposal.type === "expense";
    const signedAmount = isNeg
      ? -Math.abs(proposal.amountMinorUnits)
      : Math.abs(proposal.amountMinorUnits);

    const isAlreadySaved = Boolean(proposal.isSaved && proposal.transactionId);

    const draftItem: TransactionListItem = {
      id: isAlreadySaved ? proposal.transactionId! : `chat-draft-${Date.now()}`,
      accountId: proposal.accountId,
      accountName: proposal.accountName,
      accountCurrency: proposal.currencyCode,
      accountTypeName: "Standard",
      accountPocketEnabled: false,
      accountBalanceAfterMinorUnits: null,
      locationBalanceAfterMinorUnits: null,
      categoryId: proposal.categoryId ?? null,
      categoryName: proposal.categoryName ?? null,
      categoryIcon: proposal.categoryIcon ?? null,
      categoryColor: proposal.categoryColor ?? null,
      pocketId: proposal.pocketId ?? null,
      pocketName: proposal.pocketName ?? null,
      transactionGroupId: null,
      type: proposal.type,
      currencyCode: proposal.currencyCode,
      amountMinorUnits: signedAmount,
      originalAmountMinorUnits: null,
      exchangeRateScaled: null,
      name: proposal.name ?? null,
      note: proposal.note ?? null,
      occurredAt: proposal.occurredAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      attachmentCount: 0,
      transferAccountId: proposal.transferAccountId ?? null,
      transferAccountName: proposal.transferAccountName ?? null,
      transferAccountCurrency: proposal.currencyCode,
      transferAccountTypeName: null,
      transferAccountPocketEnabled: false,
      transferPocketId: null,
      transferPocketName: null,
      destinationBalanceAfterMinorUnits: null,
      destinationLocationBalanceAfterMinorUnits: null,
    };

    const targetMsg = messages.find(
      (m) => m.proposal === proposal || m.partialProposal === proposal,
    );

    onClose();
    onEditInForm(
      draftItem,
      (updatedData?: ChatSavedTransactionResult) => {
        if (targetMsg) {
          if (updatedData) {
            updateProposalData(targetMsg.id, {
              amountMinorUnits:
                updatedData.amountMinorUnits !== undefined
                  ? updatedData.amountMinorUnits
                  : proposal.amountMinorUnits,
              currencyCode: updatedData.currencyCode ?? proposal.currencyCode,
              type: updatedData.type ?? proposal.type,
              name: updatedData.name !== undefined ? updatedData.name : proposal.name,
              note: updatedData.note !== undefined ? updatedData.note : proposal.note,
              occurredAt: updatedData.occurredAt ?? proposal.occurredAt,
              accountId: updatedData.accountId ?? proposal.accountId,
              accountName: updatedData.accountName ?? proposal.accountName,
              categoryId:
                updatedData.categoryId !== undefined
                  ? updatedData.categoryId
                  : proposal.categoryId,
              categoryName:
                updatedData.categoryName !== undefined
                  ? (updatedData.categoryName || proposal.categoryName)
                  : proposal.categoryName,
              categoryIcon:
                updatedData.categoryIcon !== undefined
                  ? (updatedData.categoryIcon || proposal.categoryIcon)
                  : proposal.categoryIcon,
              categoryColor:
                updatedData.categoryColor !== undefined
                  ? (updatedData.categoryColor || proposal.categoryColor)
                  : proposal.categoryColor,
              pocketId:
                updatedData.pocketId !== undefined
                  ? updatedData.pocketId
                  : proposal.pocketId,
              pocketName:
                updatedData.pocketName !== undefined
                  ? updatedData.pocketName
                  : proposal.pocketName,
              transferAccountId:
                updatedData.transferAccountId !== undefined
                  ? updatedData.transferAccountId
                  : proposal.transferAccountId,
              transferAccountName:
                updatedData.transferAccountName !== undefined
                  ? updatedData.transferAccountName
                  : proposal.transferAccountName,
              transactionId: updatedData.id ?? proposal.transactionId,
              isSaved: true,
            });
          } else {
            markProposalSaved(targetMsg.id);
          }
        }
      },
      isAlreadySaved,
    );
  };

  const handleSave = async (
    proposal: ParsedTransactionProposal,
  ): Promise<boolean> => {
    try {
      if (proposal.type === "transfer") {
        if (!onSaveTransfer || !proposal.transferAccountId) {
          handleEdit(proposal);
          return false;
        }

        const transferInput: CreateTransferInput = {
          fromAccountId: proposal.accountId,
          toAccountId: proposal.transferAccountId,
          amountMinorUnits: proposal.amountMinorUnits,
          name: proposal.name ?? null,
          note: proposal.note ?? null,
          occurredAt: proposal.occurredAt ?? new Date(),
        };

        const res = await onSaveTransfer(transferInput);
        const success = Boolean(res);
        if (success) {
          const targetMsg = messages.find((m) => m.proposal === proposal);
          if (targetMsg) {
            markProposalSaved(
              targetMsg.id,
              typeof res === "string" ? res : undefined,
            );
          }
        }
        return success;
      }

      // Expense or Income
      const isNeg = proposal.type === "expense";
      const txInput: CreateTransactionInput = {
        accountId: proposal.accountId,
        pocketId: proposal.pocketId ?? null,
        categoryId: proposal.categoryId ?? null,
        type: proposal.type as "expense" | "income",
        amountMinorUnits: isNeg
          ? -Math.abs(proposal.amountMinorUnits)
          : Math.abs(proposal.amountMinorUnits),
        currencyCode: proposal.currencyCode,
        name: proposal.name ?? null,
        note: proposal.note ?? null,
        occurredAt: proposal.occurredAt ?? new Date(),
      };

      const res = await onSaveTransaction(txInput);
      const success = Boolean(res);
      if (success) {
        const targetMsg = messages.find((m) => m.proposal === proposal);
        if (targetMsg) {
          markProposalSaved(
            targetMsg.id,
            typeof res === "string" ? res : undefined,
          );
        }
      }
      return success;
    } catch {
      return false;
    }
  };

  const handleDelete = async (
    proposal: ParsedTransactionProposal,
  ): Promise<boolean> => {
    if (!proposal.transactionId || !onDeleteTransaction) return false;
    try {
      const ok = await onDeleteTransaction(proposal.transactionId);
      if (ok) {
        const targetMsg = messages.find(
          (m) =>
            m.proposal === proposal ||
            m.proposal?.transactionId === proposal.transactionId,
        );
        if (targetMsg) {
          markProposalDeleted(targetMsg.id);
        }
      }
      return ok;
    } catch {
      return false;
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View
        style={[
          styles.modalRoot,
          {
            paddingTop: insets.top,
            paddingRight: insets.right,
            paddingLeft: insets.left,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Sparkles color={theme.colors.onPrimary} size={18} />
            </View>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {t("chatWithKai.modalTitle")}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Reset conversation"
              accessibilityRole="button"
              onPress={clearConversation}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <RotateCcw color={theme.colors.textMuted} size={18} />
            </Pressable>

            <Pressable
              accessibilityLabel={t("chatWithKai.settingsTitle")}
              accessibilityRole="button"
              onPress={() => setIsSettingsOpen(true)}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <SlidersHorizontal color={theme.colors.textMuted} size={18} />
            </Pressable>

            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <X color={theme.colors.textPrimary} size={20} />
            </Pressable>
          </View>
        </View>

        {/* Messages Stream */}
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.keyboardContainer}
        >
          <FlatList
            ref={listRef}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: theme.spacing.lg },
            ]}
            data={messages}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: true });
            }}
            renderItem={({ item }) => (
              <ChatMessageBubble
                categories={categories}
                defaultCurrency={defaultCurrency}
                message={item}
                mode={mode}
                onConfirmReassignKeyword={confirmReassignKeyword}
                onDelete={handleDelete}
                onDismissReassignKeyword={dismissReassignKeyword}
                onEdit={handleEdit}
                onRequestCategoryPicker={(msgId) => {
                  setPickerTargetMessageId(msgId);
                }}
                onRetryUserMessage={handleRetryUserMessage}
                onSave={handleSave}
                onSelectAmount={(amount) => sendMessage(amount.toString())}
                onSelectCategoryForProposal={(msgId, cat) => {
                  void assignCategoryToProposal(msgId, cat);
                }}
                onSelectPrompt={(p) => sendMessage(p)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />

          {/* Input Bar */}
          <View
            style={[
              styles.inputBar,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
            ]}
          >
            <TextInput
              ref={inputRef}
              accessibilityLabel="Type your transaction message"
              editable={!processing}
              multiline={false}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage()}
              placeholder={t("chatWithKai.inputPlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="send"
              style={styles.textInput}
              value={inputText}
            />

            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={processing || !inputText.trim()}
              onPress={() => sendMessage()}
              style={({ pressed }) => [
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              <SendHorizontal
                color={
                  inputText.trim()
                    ? theme.colors.onPrimary
                    : theme.colors.textMuted
                }
                size={18}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>

      <CategoryPickerModal
        categories={categories}
        onClose={() => setPickerTargetMessageId(null)}
        onSelectCategory={(category) => {
          if (pickerTargetMessageId) {
            const targetMsg = messages.find(
              (m) => m.id === pickerTargetMessageId,
            );
            if (targetMsg?.partialProposal) {
              void assignCategoryToProposal(pickerTargetMessageId, category);
            } else if (targetMsg?.proposal) {
              void updateProposalCategory(pickerTargetMessageId, category);
            }
            setPickerTargetMessageId(null);
          }
        }}
        title={t("chatWithKai.filterCategory") || "Select Category"}
        type={activePickerType}
        visible={pickerTargetMessageId !== null}
      />

      <KaiChatSettingsModal
        mode={mode}
        onClose={() => setIsSettingsOpen(false)}
        onOpenKnowledge={() => router.push("/kai-knowledge")}
        onSelectMode={(newMode) => {
          setMode(newMode);
        }}
        visible={isSettingsOpen}
      />
    </Modal>
  );
}

export const ChatToEncodeModal = ChatWithKaiModal;

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalRoot: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    header: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    headerLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
    },
    headerIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    iconButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    keyboardContainer: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    inputBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    sendButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.surfaceElevated,
      opacity: 0.5,
    },
  });
}
