import { memo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { isTabletOrDesktop, LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface PageHeaderAction {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
}

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  breadcrumb,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  const { width } = useWindowDimensions();
  const isDesktopLayout = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const hasActions = Boolean(primaryAction || (secondaryActions && secondaryActions.length > 0));

  return (
    <View style={[styles.container, !isDesktopLayout && styles.containerMobile]}>
      <View style={styles.titleArea}>
        {breadcrumb ? (
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {breadcrumb}
          </Text>
        ) : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {hasActions && (
        <View style={[styles.actionsArea, !isDesktopLayout && styles.actionsAreaMobile]}>
          {secondaryActions?.map((action, idx) => (
            <Pressable
              key={action.label + idx}
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityRole="button"
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              testID={action.testID}
            >
              <Text style={styles.secondaryButtonText}>{action.label}</Text>
            </Pressable>
          ))}

          {primaryAction && (
            <Pressable
              accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
              accessibilityRole="button"
              onPress={primaryAction.onPress}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              testID={primaryAction.testID}
            >
              <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    containerMobile: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: theme.spacing.md,
    },
    titleArea: {
      flex: 1,
      justifyContent: "center",
    },
    breadcrumb: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xxs,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.title,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.title,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.regular,
      lineHeight: theme.typography.lineHeight.sm,
      marginTop: theme.spacing.xs,
    },
    actionsArea: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
    },
    actionsAreaMobile: {
      justifyContent: "flex-start",
      width: "100%",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      ...theme.shadows.card,
    },
    primaryButtonPressed: {
      opacity: 0.88,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    secondaryButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
}
