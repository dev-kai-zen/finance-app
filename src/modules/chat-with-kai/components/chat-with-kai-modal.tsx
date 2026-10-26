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
  Bot,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type {
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

export function ChatWithKaiModal({
  visible,
  onClose,
  accounts,
  pockets = [],
  categories,
  defaultExpenseAccountId,
  defaultIncomeAccountId,
  defaultCurrency = "PHP",
  onEditInForm,
  onSaveTransaction,
  onSaveTransfer,
}: ChatWithKaiModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { locale, t } = useLocalization();

  const listRef = useRef<FlatList>(null);

  const {
    messages,
    inputText,
    setInputText,
    processing,
    sendMessage,
    markProposalSaved,
    clearConversation,
    reloadKeywords,
  } = useChatWithKai({
    accounts,
    pockets,
    categories,
    defaultExpenseAccountId,
    defaultIncomeAccountId,
    defaultCurrency,
    language: (locale as "en" | "fil" | "es") || "en",
  });

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages.length]);

  const handleEdit = (proposal: ParsedTransactionProposal) => {
    const isNeg = proposal.type === "expense";
    const signedAmount = isNeg
      ? -Math.abs(proposal.amountMinorUnits)
      : Math.abs(proposal.amountMinorUnits);

    const draftItem: TransactionListItem = {
      id: `chat-draft-${Date.now()}`,
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

    onClose();
    onEditInForm(draftItem);
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

        const success = await onSaveTransfer(transferInput);
        if (success) {
          // Find message with this proposal and mark saved
          const targetMsg = messages.find((m) => m.proposal === proposal);
          if (targetMsg) {
            markProposalSaved(targetMsg.id);
          }
        }
        return success;
      }

      // Expense or Income
      const isNeg = proposal.type === "expense";
      const txInput: CreateTransactionInput = {
        accountId: proposal.accountId,
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

      const success = await onSaveTransaction(txInput);
      if (success) {
        const targetMsg = messages.find((m) => m.proposal === proposal);
        if (targetMsg) {
          markProposalSaved(targetMsg.id);
        }
      }
      return success;
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
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Sparkles color={theme.colors.onPrimary} size={18} />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {t("chatWithKai.modalTitle")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t("chatWithKai.modalSubtitle")}
              </Text>
            </View>
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
                message={item}
                onEdit={handleEdit}
                onSave={handleSave}
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
              disabled={!inputText.trim() || processing}
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    headerLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
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
    headerSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
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
    keyboardContainer: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    inputBar: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    sendButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.95 }],
    },
  });
}
