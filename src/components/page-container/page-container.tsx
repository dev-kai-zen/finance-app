import { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getResponsiveGutter,
  isTabletOrDesktop,
  LAYOUT_DIMENSIONS,
} from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface PageContainerProps extends PropsWithChildren {
  header?: ReactNode;
  floatingAction?: ReactNode;
  contentContainerStyle?: ViewStyle;
  maxWidth?: number;
  scrollable?: boolean;
}

export function PageContainer({
  children,
  header,
  floatingAction,
  contentContainerStyle,
  maxWidth = LAYOUT_DIMENSIONS.maxContentWidth,
  scrollable = true,
}: PageContainerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const horizontalPadding = useThemeStyles((theme) =>
    getResponsiveGutter(width, theme.spacing),
  );

  const containerPaddingStyle: ViewStyle = {
    paddingHorizontal: horizontalPadding,
    paddingBottom: Math.max(insets.bottom, 24) + (floatingAction ? 64 : 0),
  };

  const innerContent = (
    <View
      style={[
        styles.innerConstrained,
        { maxWidth },
        containerPaddingStyle,
        contentContainerStyle,
      ]}
    >
      {header}
      {children}
    </View>
  );

  if (!scrollable) {
    return (
      <View style={styles.outerWrapper}>
        {innerContent}
        {floatingAction}
      </View>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        style={styles.scrollWrapper}
      >
        {innerContent}
      </ScrollView>
      {floatingAction}
    </View>
  );
}

export interface PageEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function PageEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: PageEmptyStateProps) {
  const styles = useThemeStyles(createEmptyStyles);

  return (
    <View style={styles.emptyContainer}>
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={styles.emptyAction}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface PageLoadingStateProps {
  message?: string;
}

export function PageLoadingState({ message = "Loading..." }: PageLoadingStateProps) {
  const styles = useThemeStyles(createLoadingStyles);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={styles.indicator.color} size="large" />
      <Text style={styles.loadingMessage}>{message}</Text>
    </View>
  );
}

export interface PageErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function PageErrorState({ message, onRetry }: PageErrorStateProps) {
  const styles = useThemeStyles(createErrorStyles);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityLabel="Retry"
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    outerWrapper: {
      backgroundColor: theme.colors.background,
      flex: 1,
      position: "relative",
    },
    scrollWrapper: {
      flex: 1,
      width: "100%",
    },
    scrollContent: {
      alignItems: "center",
      flexGrow: 1,
    },
    innerConstrained: {
      width: "100%",
    },
  });
}

function createEmptyStyles(theme: AppTheme) {
  return StyleSheet.create({
    emptyContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      justifyContent: "center",
      marginVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxxl,
    },
    iconWrapper: {
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      marginTop: theme.spacing.xs,
      maxWidth: 400,
      textAlign: "center",
    },
    emptyAction: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      marginTop: theme.spacing.lg,
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyActionText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}

function createLoadingStyles(theme: AppTheme) {
  return StyleSheet.create({
    loadingContainer: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.xxl,
    },
    indicator: {
      color: theme.colors.primary,
    },
    loadingMessage: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.md,
    },
  });
}

function createErrorStyles(theme: AppTheme) {
  return StyleSheet.create({
    errorContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      justifyContent: "center",
      marginVertical: theme.spacing.lg,
      padding: theme.spacing.xxl,
    },
    errorTitle: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    errorMessage: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    retryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
