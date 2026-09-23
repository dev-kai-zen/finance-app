import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { ActionBottomSheet } from "@/components/action-bottom-sheet";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useThemeController, useThemeStyles } from "@/hooks/use-app-theme";
import { HexColorsModal, useHexColors } from "@/modules/hex-colors";
import { GoogleDriveBackupSettings } from "@/modules/backup";
import { useWorkspace } from "@/modules/onboarding";

export function SettingsScreen() {
  const styles = useThemeStyles(createStyles);
  const { theme, themeId, setThemeId, availableThemes } = useThemeController();
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
                <Pressable
                  accessibilityLabel="Start setting up my personal workspace"
                  accessibilityRole="button"
                  onPress={workspace.requestPersonalSetup}
                  style={({ pressed }) => [
                    styles.workspaceAction,
                    pressed && styles.settingRowPressed,
                  ]}
                >
                  <Text style={styles.workspaceActionText}>Start setup</Text>
                </Pressable>
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
              <ThemePreview preset={theme} />
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{theme.name}</Text>
                <Text style={styles.settingDescription}>Tap to change</Text>
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

      <ActionBottomSheet
        items={availableThemes.map((preset) => ({
          id: preset.id,
          label: preset.name,
          description: preset.mode === "light" ? "Light preset" : "Dark preset",
          icon: <ThemePreview compact preset={preset} />,
          selected: preset.id === themeId,
          onPress: () => setThemeId(preset.id),
        }))}
        title="Choose a theme"
        visible={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

      <HexColorsModal
        visible={isHexColorsOpen}
        onClose={() => setIsHexColorsOpen(false)}
      />
    </PageContainer>
  );
}

function ThemePreview({
  preset,
  compact = false,
}: {
  preset: AppTheme;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        previewStyles.container,
        compact && previewStyles.containerCompact,
        {
          backgroundColor: preset.colors.background,
          borderColor: preset.colors.borderStrong,
        },
      ]}
    >
      <View
        style={[
          previewStyles.primary,
          compact && previewStyles.primaryCompact,
          { backgroundColor: preset.colors.primary },
        ]}
      />
      <View
        style={[
          previewStyles.accent,
          compact && previewStyles.accentCompact,
          { backgroundColor: preset.colors.accent },
        ]}
      />
    </View>
  );
}

const previewStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 4,
    height: 40,
    justifyContent: "center",
    width: 48,
  },
  containerCompact: {
    borderRadius: 8,
    height: 30,
    width: 34,
  },
  primary: {
    borderRadius: 4,
    height: 18,
    width: 18,
  },
  primaryCompact: {
    height: 13,
    width: 13,
  },
  accent: {
    borderRadius: 3,
    height: 11,
    width: 11,
  },
  accentCompact: {
    height: 8,
    width: 8,
  },
});

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
    workspaceAction: {
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
    },
    workspaceActionText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
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
