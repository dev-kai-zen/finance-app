import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  Moon,
  Quote,
  Shuffle,
  Sun,
  Sunset,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import {
  getRandomQuote,
  type MotivationalQuote,
} from "../constants/financial-quotes.constants";

export interface DashboardGreetingCardProps {
  nickname?: string | null;
  showQuote?: boolean;
}

export function DashboardGreetingCard({
  nickname,
  showQuote = true,
}: DashboardGreetingCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [quote, setQuote] = useState<MotivationalQuote>(() => getRandomQuote());

  useFocusEffect(
    useCallback(() => {
      setQuote(getRandomQuote());
    }, []),
  );

  const handleShuffleQuote = useCallback(() => {
    setQuote((prev) => getRandomQuote(prev.id));
  }, []);

  const { greetingText, TimeIcon, iconColor } = useMemo(() => {
    const hour = new Date().getHours();
    const name = nickname?.trim();

    if (hour >= 5 && hour < 12) {
      return {
        greetingText: name
          ? t("dashboard.greetingMorning", { name })
          : t("dashboard.greetingMorningGeneric"),
        TimeIcon: Sun,
        iconColor: "#F59E0B",
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greetingText: name
          ? t("dashboard.greetingAfternoon", { name })
          : t("dashboard.greetingAfternoonGeneric"),
        TimeIcon: Sun,
        iconColor: "#EAB308",
      };
    }
    if (hour >= 17 && hour < 21) {
      return {
        greetingText: name
          ? t("dashboard.greetingEvening", { name })
          : t("dashboard.greetingEveningGeneric"),
        TimeIcon: Sunset,
        iconColor: "#F97316",
      };
    }
    return {
      greetingText: name
        ? t("dashboard.greetingNight", { name })
        : t("dashboard.greetingNightGeneric"),
      TimeIcon: Moon,
      iconColor: "#818CF8",
    };
  }, [nickname, t]);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  return (
    <View style={styles.card}>
      {/* Top Greeting Row */}
      <View style={styles.headerRow}>
        <View style={styles.greetingGroup}>
          <View style={[styles.iconPill, { backgroundColor: `${iconColor}18` }]}>
            <TimeIcon color={iconColor} size={18} />
          </View>
          <Text numberOfLines={1} style={styles.greetingTitle}>
            {`${greetingText}!`}
          </Text>
        </View>
        {formattedDate ? (
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        ) : null}
      </View>

      {/* Quote Container with Tap-to-Shuffle */}
      {showQuote ? (
        <Pressable
          accessibilityHint="Tap to show another inspirational quote"
          accessibilityLabel={`${quote.quote} - ${quote.author}`}
          accessibilityRole="button"
          onPress={handleShuffleQuote}
          style={({ pressed }) => [
            styles.quoteBox,
            pressed && styles.quoteBoxPressed,
          ]}
        >
          <Quote color={theme.colors.primary} size={14} style={styles.quoteIcon} />
          <Text style={styles.quoteText}>
            “{quote.quote}” <Text style={styles.authorText}>— {quote.author}</Text>
          </Text>
          <Shuffle color={theme.colors.textMuted} size={13} style={styles.shuffleIcon} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.shadows.card,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    greetingGroup: {
      alignItems: "center",
      flexDirection: "row",
      flex: 1,
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    iconPill: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    greetingTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.3,
    },
    rightActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    datePill: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    customizeIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    quoteBox: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}08`,
      borderColor: `${theme.colors.primary}20`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    quoteBoxPressed: {
      backgroundColor: `${theme.colors.primary}12`,
      opacity: 0.8,
    },
    quoteIcon: {
      flexShrink: 0,
      opacity: 0.75,
    },
    quoteText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      lineHeight: theme.typography.lineHeight.xs * 1.35,
    },
    authorText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "normal",
      fontWeight: theme.typography.fontWeight.semibold,
    },
    shuffleIcon: {
      flexShrink: 0,
      opacity: 0.6,
    },
  });
}
