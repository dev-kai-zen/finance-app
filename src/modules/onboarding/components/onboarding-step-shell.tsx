import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function OnboardingProgressDots({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityRole="progressbar" style={styles.dotsRow}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index <= currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

export function OnboardingStepShell({
  children,
  description,
  footer,
  progressIndex,
  progressTotal,
  title,
}: {
  title: string;
  description: string;
  progressIndex?: number;
  progressTotal?: number;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {progressIndex !== undefined && progressTotal !== undefined ? (
        <OnboardingProgressDots currentIndex={progressIndex} total={progressTotal} />
      ) : null}
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    shell: {
      flex: 1,
      gap: theme.spacing.md,
      minHeight: 360,
    },
    dotsRow: {
      alignSelf: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    dot: {
      borderRadius: theme.borderRadius.round,
      height: 8,
      width: 8,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
    },
    dotInactive: {
      backgroundColor: theme.colors.borderStrong,
    },
    header: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.display,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.7,
      lineHeight: theme.typography.lineHeight.display,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.base,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    footer: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
  });
}
