import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { HelpIconButton } from "./screen-title-with-help";

export interface ModalScreenHeaderProps {
  title: string;
  onPressBack?: () => void;
  backAccessibilityLabel?: string;
  onPressHelp?: () => void;
  helpAccessibilityLabel?: string;
  helpAccessibilityHint?: string;
  headerRight?: ReactNode;
}

export function ModalScreenHeader({
  title,
  onPressBack,
  backAccessibilityLabel = "Go back",
  onPressHelp,
  helpAccessibilityLabel,
  helpAccessibilityHint,
  headerRight,
}: ModalScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const handleBack = onPressBack ?? (() => router.back());

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel={backAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ChevronLeft color={theme.colors.textPrimary} size={28} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text numberOfLines={1} style={styles.titleText}>
            {title}
          </Text>
          {onPressHelp ? (
            <HelpIconButton
              accessibilityHint={helpAccessibilityHint}
              accessibilityLabel={helpAccessibilityLabel ?? title}
              onPress={onPressHelp}
            />
          ) : null}
        </View>

        {headerRight ? (
          <View style={styles.rightContainer}>{headerRight}</View>
        ) : null}
      </View>
      <View style={styles.divider} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    headerContainer: {
      backgroundColor: theme.colors.background,
      width: "100%",
    },
    headerBar: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 56,
      paddingHorizontal: theme.spacing.sm,
      width: "100%",
    },
    backButton: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    backButtonPressed: {
      opacity: 0.7,
    },
    titleContainer: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 6,
      minWidth: 0,
    },
    titleText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    rightContainer: {
      alignItems: "center",
      flexDirection: "row",
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      width: "100%",
    },
  });
}
