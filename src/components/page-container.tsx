import { PropsWithChildren, ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/app-button";
import {
  getResponsiveGutter,
  isTabletOrDesktop,
  LAYOUT_DIMENSIONS,
} from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface PageContainerProps extends PropsWithChildren {
  header?: ReactNode;
  floatingAction?: ReactNode;
  contentContainerStyle?: ViewStyle;
  maxWidth?: number;
  scrollable?: boolean;
  scrollEnabled?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  scrollContentRef?: React.RefObject<View | null>;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

export function PageContainer({
  children,
  header,
  floatingAction,
  contentContainerStyle,
  maxWidth = LAYOUT_DIMENSIONS.maxContentWidth,
  scrollable = true,
  scrollEnabled = true,
  scrollRef,
  scrollContentRef,
  onRefresh,
  refreshing,
}: PageContainerProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const horizontalPadding = getResponsiveGutter(width, theme.spacing);

  const containerPaddingStyle: ViewStyle = {
    paddingHorizontal: horizontalPadding,
    paddingBottom: Math.max(insets.bottom, 24) + (floatingAction ? 80 : 0),
  };

  const innerContent = (
    <View
      ref={scrollContentRef}
      collapsable={false}
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
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator
        style={styles.scrollWrapper}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
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
  actionRef?: React.Ref<View>;
}

export function PageEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  actionRef,
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
        <View collapsable={false} ref={actionRef} style={styles.emptyAction}>
          <AppButton
            label={actionLabel}
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  );
}

export type PageLoadingSkeletonVariant =
  | "cards"
  | "list"
  | "dashboard"
  | "grid";

export interface PageLoadingStateProps {
  message?: string;
  variant?: PageLoadingSkeletonVariant;
}

export function PageLoadingState({
  message = "Loading...",
  variant = "cards",
}: PageLoadingStateProps) {
  const styles = useThemeStyles(createLoadingStyles);
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      style={[styles.loadingContainer, { opacity: pulseAnim }]}
    >
      {variant === "dashboard" ? (
        <>
          <View style={styles.heroCard}>
            <View style={[styles.bone, styles.boneLabelSm]} />
            <View style={[styles.bone, styles.boneHeroTitle]} />
            <View style={styles.metricRow}>
              <View style={[styles.bone, styles.boneMetricPill]} />
              <View style={[styles.bone, styles.boneMetricPill]} />
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={styles.halfCard}>
              <View style={[styles.bone, styles.boneLabelSm]} />
              <View style={[styles.bone, styles.boneValueMd]} />
            </View>
            <View style={styles.halfCard}>
              <View style={[styles.bone, styles.boneLabelSm]} />
              <View style={[styles.bone, styles.boneValueMd]} />
            </View>
          </View>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.listRowCard}>
              <View style={[styles.bone, styles.boneAvatar]} />
              <View style={styles.listRowBody}>
                <View style={[styles.bone, styles.boneLinePrimary]} />
                <View style={[styles.bone, styles.boneLineSecondary]} />
              </View>
              <View style={[styles.bone, styles.boneAmount]} />
            </View>
          ))}
        </>
      ) : variant === "list" ? (
        <>
          {[0, 1, 2, 3, 4].map((index) => (
            <View key={index} style={styles.listRowCard}>
              <View style={[styles.bone, styles.boneAvatar]} />
              <View style={styles.listRowBody}>
                <View style={[styles.bone, styles.boneLinePrimary]} />
                <View style={[styles.bone, styles.boneLineSecondary]} />
              </View>
              <View style={[styles.bone, styles.boneAmount]} />
            </View>
          ))}
        </>
      ) : variant === "grid" ? (
        <>
          <View style={styles.gridCard}>
            <View style={[styles.bone, styles.boneLinePrimary]} />
            <View style={styles.gridRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                <View key={col} style={[styles.bone, styles.boneGridCell]} />
              ))}
            </View>
            <View style={styles.gridRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                <View key={col} style={[styles.bone, styles.boneGridCell]} />
              ))}
            </View>
            <View style={styles.gridRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                <View key={col} style={[styles.bone, styles.boneGridCell]} />
              ))}
            </View>
          </View>
          {[0, 1].map((index) => (
            <View key={index} style={styles.listRowCard}>
              <View style={[styles.bone, styles.boneAvatar]} />
              <View style={styles.listRowBody}>
                <View style={[styles.bone, styles.boneLinePrimary]} />
                <View style={[styles.bone, styles.boneLineSecondary]} />
              </View>
              <View style={[styles.bone, styles.boneAmount]} />
            </View>
          ))}
        </>
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={[styles.bone, styles.boneLabelSm]} />
            <View style={[styles.bone, styles.boneValueMd]} />
            <View style={[styles.bone, styles.boneProgressBar]} />
          </View>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.cardSkeleton}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.bone, styles.boneAvatar]} />
                <View style={styles.listRowBody}>
                  <View style={[styles.bone, styles.boneLinePrimary]} />
                  <View style={[styles.bone, styles.boneLineSecondary]} />
                </View>
                <View style={[styles.bone, styles.boneAmount]} />
              </View>
              <View style={[styles.bone, styles.boneProgressBar]} />
            </View>
          ))}
        </>
      )}
    </Animated.View>
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
        <AppButton
          label="Retry"
          onPress={onRetry}
          style={styles.retryButton}
        />
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
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderRadius: 36,
      height: 72,
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
      width: 72,
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
      marginTop: theme.spacing.lg,
    },
  });
}

function createLoadingStyles(theme: AppTheme) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
      width: "100%",
    },
    bone: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    twoColRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    halfCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flex: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    metricRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    cardSkeleton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    cardHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    listRowCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    listRowBody: {
      flex: 1,
      gap: 6,
    },
    gridCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    gridRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    boneGridCell: {
      borderRadius: theme.borderRadius.small,
      flex: 1,
      height: 36,
    },
    boneAvatar: {
      borderRadius: 20,
      height: 40,
      width: 40,
    },
    boneLabelSm: {
      height: 12,
      width: "32%",
    },
    boneHeroTitle: {
      height: 28,
      width: "58%",
    },
    boneValueMd: {
      height: 22,
      width: "52%",
    },
    boneMetricPill: {
      flex: 1,
      height: 32,
    },
    boneLinePrimary: {
      height: 14,
      width: "62%",
    },
    boneLineSecondary: {
      height: 11,
      width: "40%",
    },
    boneAmount: {
      height: 16,
      width: 68,
    },
    boneProgressBar: {
      height: 8,
      width: "100%",
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
      marginTop: theme.spacing.lg,
    },
  });
}
