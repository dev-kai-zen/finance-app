import { CircleHelp } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface HelpIconButtonProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export function HelpIconButton({
  accessibilityHint,
  accessibilityLabel,
  onPress,
}: HelpIconButtonProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createHelpIconStyles);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.helpIconButton,
        pressed && styles.helpIconButtonPressed,
      ]}
    >
      <CircleHelp color={theme.colors.textSecondary} size={18} />
    </Pressable>
  );
}

export interface ScreenTitleWithHelpProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  onPressHelp: () => void;
  title: string;
}

export function ScreenTitleWithHelp({
  accessibilityHint,
  accessibilityLabel,
  onPressHelp,
  title,
}: ScreenTitleWithHelpProps) {
  const styles = useThemeStyles(createTitleStyles);

  return (
    <View style={styles.headerTitleContainer}>
      <Text numberOfLines={1} style={styles.headerTitleText}>
        {title}
      </Text>
      <HelpIconButton
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        onPress={onPressHelp}
      />
    </View>
  );
}

function createHelpIconStyles() {
  return StyleSheet.create({
    helpIconButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    helpIconButtonPressed: {
      opacity: 0.6,
    },
  });
}

function createTitleStyles(theme: AppTheme) {
  return StyleSheet.create({
    headerTitleContainer: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    headerTitleText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
