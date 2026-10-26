import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Sparkles, Tag } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "@/components";
import { formatCurrency } from "@/utils/currency";
import { useLocalization } from "@/infrastructure/localization";
import type { Category } from "@/modules/categories";
import type {
  ChatMessage,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { ChatTransactionCard } from "./chat-transaction-card";
import { ChatSuggestionChips } from "./chat-suggestion-chips";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  categories?: Category[];
  defaultCurrency?: string;
  onEdit: (proposal: ParsedTransactionProposal) => void;
  onSave: (proposal: ParsedTransactionProposal) => Promise<boolean>;
  onSelectPrompt: (prompt: string) => void;
  onSelectAmount?: (amount: number) => void;
  onSelectCategoryForProposal?: (messageId: string, category: Category) => void;
  onRequestCategoryPicker?: (messageId: string) => void;
  onConfirmReassignKeyword?: (messageId: string) => void;
  onDismissReassignKeyword?: (messageId: string) => void;
}

export function ChatMessageBubble({
  message,
  categories = [],
  defaultCurrency = "PHP",
  onEdit,
  onSave,
  onSelectPrompt,
  onSelectAmount,
  onSelectCategoryForProposal,
  onRequestCategoryPicker,
  onConfirmReassignKeyword,
  onDismissReassignKeyword,
}: ChatMessageBubbleProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useLocalization();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // Quick categories for missing_category selection (flattened, matching type)
  const targetType =
    message.partialProposal?.type === "income" ? "income" : "expense";
  const allFlattened: Category[] = [];
  for (const c of categories) {
    allFlattened.push(c);
    if (c.subcategories?.length) {
      allFlattened.push(...c.subcategories);
    }
  }
  const quickCategories = allFlattened
    .filter((c) => c.type === targetType)
    .slice(0, 4);

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <Sparkles color={theme.colors.onPrimary} size={14} />
      </View>

      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{message.text}</Text>
        </View>

        {/* Missing Category Selection Section */}
        {message.failureReason === "missing_category" &&
        message.partialProposal ? (
          <View style={styles.interactiveBox}>
            <Text style={styles.interactiveTitle}>
              {t("chatWithKai.selectCategory")}
            </Text>
            <View style={styles.chipsWrap}>
              {quickCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => onSelectCategoryForProposal?.(message.id, cat)}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {cat.icon ? (
                    <IconHelper
                      color={theme.colors.primary}
                      name={cat.icon}
                      size={13}
                    />
                  ) : (
                    <Tag color={theme.colors.primary} size={12} />
                  )}
                  <Text numberOfLines={1} style={styles.categoryChipText}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => onRequestCategoryPicker?.(message.id)}
                style={({ pressed }) => [
                  styles.browseChip,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.browseChipText}>
                  {t("chatWithKai.browseAll")}
                </Text>
                <ChevronRight color={theme.colors.textMuted} size={13} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Multiple Amounts Disambiguation Section */}
        {message.failureReason === "multiple_amounts" &&
        message.suggestedAmounts &&
        message.suggestedAmounts.length > 0 ? (
          <View style={styles.interactiveBox}>
            <Text style={styles.interactiveTitle}>
              {t("chatWithKai.chooseCorrectAmount")}
            </Text>
            <View style={styles.chipsWrap}>
              {message.suggestedAmounts.map((amt) => {
                const formatted = formatCurrency(amt * 100, defaultCurrency);
                return (
                  <Pressable
                    key={amt}
                    onPress={() => onSelectAmount?.(amt)}
                    style={({ pressed }) => [
                      styles.amountChip,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.amountChipText}>{formatted}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {message.proposal ? (
          <ChatTransactionCard
            onEdit={onEdit}
            onSave={onSave}
            proposal={message.proposal}
          />
        ) : null}

        {/* Smart "Teach Kai" Keyword Confirmation Banner */}
        {message.pendingKeywordReassignment ? (
          <View style={styles.teachKaiBanner}>
            <View style={styles.teachKaiHeader}>
              <Sparkles color={theme.colors.primary} size={15} />
              <Text style={styles.teachKaiTitle}>
                {t("chatWithKai.alwaysCategorizeAs")
                  ? t("chatWithKai.alwaysCategorizeAs", {
                      keyword: message.pendingKeywordReassignment.keyword,
                      category: message.pendingKeywordReassignment.newCategoryName,
                    })
                  : `Always categorize "${message.pendingKeywordReassignment.keyword}" as "${message.pendingKeywordReassignment.newCategoryName}"?`}
              </Text>
            </View>
            <View style={styles.teachKaiActions}>
              <Pressable
                onPress={() => onConfirmReassignKeyword?.(message.id)}
                style={({ pressed }) => [
                  styles.teachKaiAlwaysBtn,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.teachKaiAlwaysBtnText}>
                  {t("chatWithKai.yesAlways") || "Yes, Always"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDismissReassignKeyword?.(message.id)}
                style={({ pressed }) => [
                  styles.teachKaiDismissBtn,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.teachKaiDismissBtnText}>
                  {t("chatWithKai.justThisTime") || "Just this time"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {message.suggestedPrompts && message.suggestedPrompts.length > 0 ? (
          <ChatSuggestionChips
            onSelectPrompt={onSelectPrompt}
            prompts={message.suggestedPrompts}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    userRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginVertical: 4,
      paddingLeft: 48,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.large,
      borderTopRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    assistantRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      marginVertical: 6,
      paddingRight: 24,
    },
    assistantAvatar: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      height: 28,
      justifyContent: "center",
      marginTop: 2,
      width: 28,
    },
    assistantContent: {
      flex: 1,
      gap: 4,
    },
    assistantBubble: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderTopLeftRadius: 4,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    assistantText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    interactiveBox: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginTop: 4,
      padding: 10,
    },
    interactiveTitle: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      marginBottom: 8,
      textTransform: "uppercase",
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    categoryChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    categoryChipText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "500",
      maxWidth: 140,
    },
    browseChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    browseChipText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    amountChip: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    amountChipText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    buttonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.96 }],
    },
    teachKaiBanner: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      padding: theme.spacing.sm,
    },
    teachKaiHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    teachKaiTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
    },
    teachKaiActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
      marginTop: 4,
    },
    teachKaiAlwaysBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    teachKaiAlwaysBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    teachKaiDismissBtn: {
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    teachKaiDismissBtnText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "500",
    },
  });
}
