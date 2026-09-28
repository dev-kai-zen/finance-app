import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useThemeController, useThemeStyles } from "@/hooks/use-app-theme";
import { HexColorsModal, useHexColors } from "@/modules/hex-colors";
import { GoogleDriveBackupSettings } from "@/modules/backup";
import { useWorkspace } from "@/modules/onboarding";
import { ThemePickerModal } from "@/modules/settings/components/theme-picker-modal";
import { ThemeSwatchPreview } from "@/modules/settings/components/theme-preset-card";

export function SettingsScreen() {
  const styles = useThemeStyles(createStyles);
  const {
    theme,
    themeId,
    setThemeId,
    isFollowingSystem,
    setFollowSystem,
    availableThemes,
  } = useThemeController();
  const { colors } = useHexColors();
  const workspace = useWorkspace();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isHexColorsOpen, setIsHexColorsOpen] = useState(false);

  return (
    <PageContainer>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WORKSPACE</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {workspace.state.mode === "sample"
                    ? "Sample workspace"
                    : "Personal workspace"}
                </Text>
                <Text style={styles.settingDescription}>
                  {workspace.state.mode === "sample"
                    ? "Fictional records are active and cloud backup is paused."
                    : "Your local accounts and transactions are active."}
                </Text>
              </View>
              {workspace.state.mode === "sample" ? (
                <AppButton
                  accessibilityLabel="Start setting up my personal workspace"
                  label="Start setup"
                  onPress={workspace.requestPersonalSetup}
                  size="small"
                  variant="ghost"
                />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BACKUP &amp; SYNC</Text>
          {workspace.state.mode === "sample" ? (
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>Backup paused</Text>
                  <Text style={styles.settingDescription}>
                    Sample records are temporary and are not uploaded to Google
                    Drive. Start a personal workspace to enable backup.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <GoogleDriveBackupSettings />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEME &amp; COLOR PRESETS</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={`Current theme: ${theme.name}. Tap to change.`}
              accessibilityRole="button"
              onPress={() => setIsThemePickerOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <ThemeSwatchPreview preset={theme} />
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{theme.name}</Text>
                <Text style={styles.settingDescription}>
                  {isFollowingSystem
                    ? "Following device appearance"
                    : `${theme.mode === "light" ? "Light" : "Dark"} palette - saved on this device`}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SOURCE MANAGEMENT</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={`Manage hex colors. ${colors.length} colors available.`}
              accessibilityRole="button"
              onPress={() => setIsHexColorsOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>Hex Colors</Text>
              </View>
              <View style={styles.rowAccessory}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{colors.length}</Text>
                </View>
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      <ThemePickerModal
        isFollowingSystem={isFollowingSystem}
        selectedThemeId={themeId}
        themes={availableThemes}
        visible={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        onFollowSystem={() => setFollowSystem(true)}
        onSelectTheme={setThemeId}
      />

      <HexColorsModal
        visible={isHexColorsOpen}
        onClose={() => setIsHexColorsOpen(false)}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    settingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 68,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    settingRowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    settingCopy: {
      flex: 1,
      gap: 2,
    },
    settingLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    settingDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    rowAccessory: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    countBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      minWidth: 28,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    countBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
  });
}
