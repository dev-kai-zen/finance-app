import type React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Compass, Sparkles } from "lucide-react-native";

import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

import { useLocalization } from "@/infrastructure/localization";

export interface WalkthroughIntroModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  message: string;
  badge?: string;
  icon?: React.ReactNode;
  startLabel?: string;
  skipLabel?: string;
  onStart: () => void;
  onSkip: () => void;
}

export function WalkthroughIntroModal({
  visible,
  title,
  subtitle,
  message,
  badge,
  icon,
  startLabel,
  skipLabel,
  onStart,
  onSkip,
}: WalkthroughIntroModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const resolvedBadge = badge ?? t("dashboard.walkthroughIntroBadge");
  const resolvedStart = startLabel ?? t("dashboard.walkthroughIntroStart");
  const resolvedSkip = skipLabel ?? t("dashboard.walkthroughIntroSkip");

  return (
    <Modal
      animationType="fade"
      onRequestClose={onSkip}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={resolvedSkip}
          accessibilityRole="button"
          onPress={onSkip}
          style={styles.backdrop}
        />

        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          {/* Header Icon Circle */}
          <View style={styles.iconCircle}>
            {icon ?? <Compass color={theme.colors.primary} size={32} />}
            <View style={styles.sparkleBadge}>
              <Sparkles color="#F59E0B" size={14} />
            </View>
          </View>

          {/* Badge Tag */}
          {resolvedBadge ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{resolvedBadge}</Text>
            </View>
          ) : null}

          {/* Content */}
          <View style={styles.contentGroup}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={resolvedStart}
              accessibilityRole="button"
              onPress={onStart}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Sparkles color={theme.colors.onPrimary} size={18} />
              <Text style={styles.primaryBtnText}>{resolvedStart}</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={resolvedSkip}
              accessibilityRole="button"
              onPress={onSkip}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>{resolvedSkip}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.large * 1.3,
      borderWidth: 1.5,
      gap: theme.spacing.md,
      maxWidth: 380,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl * 1.1,
      width: "100%",
      ...theme.shadows.modal,
      elevation: 24,
      zIndex: 1,
    },
    cardDesktop: {
      maxWidth: 420,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: 40,
      borderWidth: 2,
      height: 76,
      justifyContent: "center",
      position: "relative",
      width: 76,
    },
    sparkleBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 13,
      borderWidth: 1,
      bottom: -3,
      height: 26,
      justifyContent: "center",
      position: "absolute",
      right: -3,
      width: 26,
      ...theme.shadows.card,
    },
    badgeContainer: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 3,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
    },
    contentGroup: {
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm * 1.3,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      width: "100%",
    },
    primaryBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: theme.spacing.lg,
      width: "100%",
    },
    primaryBtnPressed: {
      opacity: 0.88,
    },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    secondaryBtn: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
      width: "100%",
    },
    secondaryBtnPressed: {
      backgroundColor: `${theme.colors.textSecondary}12`,
    },
    secondaryBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
