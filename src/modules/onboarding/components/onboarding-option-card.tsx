import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

interface OnboardingOptionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
}

export function OnboardingOptionCard({
  title,
  description,
  icon,
  badge,
  disabled = false,
  selected = false,
  onPress,
}: OnboardingOptionCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={[styles.iconContainer, selected && styles.iconSelected]}>
        {icon}
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <ChevronRight color={theme.colors.textMuted} size={19} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 92,
      padding: theme.spacing.lg,
    },
    cardSelected: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    cardPressed: {
      opacity: 0.82,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 46,
      justifyContent: "center",
      width: 46,
    },
    iconSelected: {
      backgroundColor: `${theme.colors.primary}18`,
    },
    copy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    badge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      overflow: "hidden",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
  });
}
