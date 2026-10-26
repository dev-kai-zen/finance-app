import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Search } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useSearch } from "../context/search-context";

interface SearchTriggerButtonProps {
  variant?: "icon" | "bar";
  onPressOverride?: () => void;
}

export const SearchTriggerButton = memo(function SearchTriggerButton({
  variant = "icon",
  onPressOverride,
}: SearchTriggerButtonProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { openSearch } = useSearch();

  const handlePress = () => {
    if (onPressOverride) {
      onPressOverride();
    }
    openSearch();
  };

  if (variant === "bar") {
    return (
      <Pressable
        accessibilityLabel={t("search.openSearch")}
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.barContainer,
          pressed && styles.barPressed,
        ]}
      >
        <Search color={theme.colors.textMuted} size={16} />
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.barPlaceholder}
        >
          {t("search.searchPlaceholder")}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityLabel={t("search.openSearch")}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.iconButtonPressed,
      ]}
    >
      <Search color={theme.colors.textSecondary} size={20} />
    </Pressable>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    iconButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    iconButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.8,
    },
    barContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      height: 38,
      marginHorizontal: 0,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    barPressed: {
      borderColor: theme.colors.primary,
      opacity: 0.85,
    },
    barPlaceholder: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: 13,
      fontWeight: "400",
      minWidth: 0,
    },
  });
}
