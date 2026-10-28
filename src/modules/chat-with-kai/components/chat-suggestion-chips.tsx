import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

interface ChatSuggestionChipsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function ChatSuggestionChips({
  prompts,
  onSelectPrompt,
}: ChatSuggestionChipsProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();

  if (!prompts || prompts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Sparkles color={theme.colors.primary} size={14} />
        <Text style={styles.headerText}>Suggestions</Text>
      </View>
      <View style={styles.chipsContainer}>
        {prompts.map((prompt, index) => (
          <Pressable
            key={`prompt-${index}`}
            accessibilityLabel={`Try suggestion: ${prompt}`}
            accessibilityRole="button"
            onPress={() => onSelectPrompt(prompt)}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.chipText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    headerText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "500",
    },
  });
}
