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
        {breadcrumb && isDesktopLayout ? (
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {breadcrumb}
          </Text>
        ) : null}
        <Text
          style={[styles.title, !isDesktopLayout && styles.titleMobile]}
          accessibilityRole="header"
        >
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
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    containerMobile: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    titleArea: {
      flex: 1,
      justifyContent: "center",
    },
    breadcrumb: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: -0.5,
      lineHeight: 36,
    },
    titleMobile: {
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.regular,
      lineHeight: 20,
      marginTop: 4,
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
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 20,
      paddingVertical: theme.spacing.sm,
      ...theme.shadows.card,
    },
    primaryButtonPressed: {
      opacity: 0.88,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: theme.spacing.sm,
    },
    secondaryButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
  });
}
