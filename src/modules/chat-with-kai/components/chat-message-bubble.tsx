import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bot, Sparkles } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  ChatMessage,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { ChatTransactionCard } from "./chat-transaction-card";
import { ChatSuggestionChips } from "./chat-suggestion-chips";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onEdit: (proposal: ParsedTransactionProposal) => void;
  onSave: (proposal: ParsedTransactionProposal) => Promise<boolean>;
  onSelectPrompt: (prompt: string) => void;
}

export function ChatMessageBubble({
  message,
  onEdit,
  onSave,
  onSelectPrompt,
}: ChatMessageBubbleProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
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

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <Sparkles color={theme.colors.onPrimary} size={14} />
      </View>

      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{message.text}</Text>
        </View>

        {message.proposal ? (
          <ChatTransactionCard
            onEdit={onEdit}
            onSave={onSave}
            proposal={message.proposal}
          />
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
  });
}
