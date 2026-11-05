import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Info, Vibrate, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useSoundAndHaptics } from "../hooks/use-sound-and-haptics";

export interface HapticFeedbackSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HapticFeedbackSettingsModal({
  visible,
  onClose,
}: HapticFeedbackSettingsModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const soundAndHaptics = useSoundAndHaptics();
  const [testTriggered, setTestTriggered] = useState(false);

  const handleTestHaptic = () => {
    soundAndHaptics.testHapticFeedback();
    setTestTriggered(true);
    setTimeout(() => setTestTriggered(false), 1500);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropPressable}
        />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Vibrate color={theme.colors.onPrimary} size={18} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>{t("settings.hapticsMaster")}</Text>
                <Text style={styles.subtitle}>
                  {t("settings.hapticsMasterSubtitle")}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <X color={theme.colors.textPrimary} size={18} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Master Toggle Card */}
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleLabel}>
                    {t("settings.hapticsMaster")}
                  </Text>
                  <Text style={styles.toggleDescription}>
                    {soundAndHaptics.preferences.hapticsEnabled
                      ? t("common.enabled")
                      : t("common.disabled")}
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel={t("settings.hapticsMaster")}
                  onValueChange={(val) => soundAndHaptics.setHapticsEnabled(val)}
                  value={soundAndHaptics.preferences.hapticsEnabled}
                />
              </View>
            </View>

            {/* System OS Notice */}
            <View style={styles.noticeBox}>
              <Info color={theme.colors.textMuted} size={16} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                {t("settings.hapticsDisabledHint")}
              </Text>
            </View>

            {/* Sub-toggles Section */}
            {soundAndHaptics.preferences.hapticsEnabled ? (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>
                  {t("settings.soundAndHapticsSection")}
                </Text>

                <View style={styles.card}>
                  <View style={styles.subToggleRow}>
                    <Text style={styles.subToggleLabel}>
                      {t("settings.hapticsTransactions")}
                    </Text>
                    <ThemedSwitch
                      accessibilityLabel={t("settings.hapticsTransactions")}
                      onValueChange={(val) =>
                        soundAndHaptics.setSubToggle("transactions", val)
                      }
                      value={soundAndHaptics.preferences.subToggles.transactions}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  <View style={styles.subToggleRow}>
                    <Text style={styles.subToggleLabel}>
                      {t("settings.hapticsCalculator")}
                    </Text>
                    <ThemedSwitch
                      accessibilityLabel={t("settings.hapticsCalculator")}
                      onValueChange={(val) =>
                        soundAndHaptics.setSubToggle("calculator", val)
                      }
                      value={soundAndHaptics.preferences.subToggles.calculator}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  <View style={styles.subToggleRow}>
                    <Text style={styles.subToggleLabel}>
                      {t("settings.hapticsAlerts")}
                    </Text>
                    <ThemedSwitch
                      accessibilityLabel={t("settings.hapticsAlerts")}
                      onValueChange={(val) =>
                        soundAndHaptics.setSubToggle("alerts", val)
                      }
                      value={soundAndHaptics.preferences.subToggles.alerts}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  <View style={styles.subToggleRow}>
                    <Text style={styles.subToggleLabel}>
                      {t("settings.hapticsDestructive")}
                    </Text>
                    <ThemedSwitch
                      accessibilityLabel={t("settings.hapticsDestructive")}
                      onValueChange={(val) =>
                        soundAndHaptics.setSubToggle("destructive", val)
                      }
                      value={soundAndHaptics.preferences.subToggles.destructive}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {/* Test Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("settings.testHaptics")}
              onPress={handleTestHaptic}
              style={({ pressed }) => [
                styles.testButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Vibrate color={theme.colors.primary} size={18} />
              <Text style={styles.testButtonText}>
                {testTriggered
                  ? `✓ ${t("settings.testHaptics")}`
                  : t("settings.testHaptics")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    backdropPressable: {
      ...StyleSheet.absoluteFill,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    headerLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    headerIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    scrollContent: {
      paddingBottom: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    toggleRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
    },
    toggleCopy: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    toggleLabel: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    toggleDescription: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    noticeBox: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.textMuted}14`,
      borderRadius: 12,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
    },
    noticeIcon: {
      marginTop: 2,
    },
    noticeText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
    },
    subSection: {
      marginTop: theme.spacing.md,
    },
    subSectionTitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    subToggleRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    subToggleLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      paddingRight: theme.spacing.md,
    },
    rowDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginHorizontal: theme.spacing.md,
    },
    testButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 46,
      justifyContent: "center",
      marginTop: theme.spacing.lg,
    },
    testButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
