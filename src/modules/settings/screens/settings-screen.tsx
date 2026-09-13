import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop, LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeController, useThemeStyles } from "@/hooks/use-app-theme";

export function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);
  const { theme, themeId, setThemeId, availableThemes } = useThemeController();

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Settings"
          subtitle="Appearance themes, financial preferences, and system architecture."
          title="Settings"
        />
      }
    >
      <View style={styles.container}>
        {/* Theme & Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>THEME & COLOR PRESETS</Text>
            <View style={styles.activeThemeBadge}>
              <Text style={styles.activeThemeBadgeText}>{theme.name}</Text>
            </View>
          </View>

          <View style={[styles.themeGrid, isDesktop && styles.themeGridDesktop]}>
            {availableThemes.map((preset) => {
              const isSelected = preset.id === themeId;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityLabel={`Select ${preset.name} theme (${preset.mode} mode)`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setThemeId(preset.id)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    isSelected && styles.themeCardActive,
                    pressed && styles.themeCardPressed,
                  ]}
                >
                  <View style={styles.themeCardLeft}>
                    {/* Swatch preview */}
                    <View
                      style={[
                        styles.swatchBackground,
                        { backgroundColor: preset.colors.background, borderColor: preset.colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.swatchPrimary,
                          { backgroundColor: preset.colors.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatchAccent,
                          { backgroundColor: preset.colors.accent },
                        ]}
                      />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.themeName,
                          isSelected && styles.themeNameActive,
                        ]}
                      >
                        {preset.name}
                      </Text>
                      <Text style={styles.themeMode}>
                        {preset.mode === "light" ? "Clean Light" : "Obsidian Dark"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleActive,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Financial Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FINANCIAL PREFERENCES</Text>
          <View style={styles.card}>
            <SettingItem
              description="Standard ISO currency for accounts and transactions"
              label="Primary Currency"
              value="PHP (₱)"
            />
            <View style={styles.divider} />
            <SettingItem
              description="Standard formatting for dates and minor-unit amounts"
              label="Locale & Number Formatting"
              value="English (Philippines)"
            />
            <View style={styles.divider} />
            <SettingItem
              description="Day of the month for monthly budget reset"
              label="Fiscal Cycle Start"
              value="1st of the month"
            />
          </View>
        </View>

        {/* Database & Architecture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARCHITECTURE & LOCAL DATA</Text>
          <View style={styles.card}>
            <SettingItem
              description="Single source of truth with offline-first persistence"
              label="Local Database"
              value="Expo SQLite"
            />
            <View style={styles.divider} />
            <SettingItem
              description="Type-safe SQL schemas and automatic migrations"
              label="ORM & Migration Engine"
              value="Drizzle ORM"
            />
            <View style={styles.divider} />
            <SettingItem
              description="Writes commit locally first with background synchronization"
              label="Sync Architecture"
              value="Offline First"
            />
          </View>
        </View>

        {/* Appearance & Version Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM & VERSION</Text>
          <View style={styles.card}>
            <SettingItem
              description="Dynamic theme tokens with 6 obsidian & light palettes"
              label="Theme Engine"
              value={theme.name}
            />
            <View style={styles.divider} />
            <SettingItem
              description="React Native 0.86 with Expo SDK 57"
              label="Framework Version"
              value="Expo SDK 57"
            />
          </View>
        </View>
      </View>
    </PageContainer>
  );
}

function SettingItem({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.settingBadge}>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xl,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.xs,
    },
    activeThemeBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    activeThemeBadgeText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    themeGrid: {
      flexDirection: "column",
      gap: theme.spacing.sm,
    },
    themeGridDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    themeCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1.5,
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 64,
      minWidth: 280,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.card,
    },
    themeCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceMuted,
    },
    themeCardPressed: {
      opacity: 0.85,
    },
    themeCardLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    swatchBackground: {
      borderRadius: 10,
      borderWidth: 1.5,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      width: 44,
    },
    swatchPrimary: {
      borderRadius: 4,
      height: 16,
      width: 16,
    },
    swatchAccent: {
      borderRadius: 3,
      height: 10,
      width: 10,
    },
    themeName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    themeNameActive: {
      color: theme.colors.primary,
    },
    themeMode: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    radioCircle: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: 10,
      borderWidth: 2,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    radioCircleActive: {
      borderColor: theme.colors.primary,
    },
    radioDot: {
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
      height: 10,
      width: 10,
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
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    settingLeft: {
      flex: 1,
    },
    settingLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    settingDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      marginTop: 2,
    },
    settingBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    settingValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginHorizontal: theme.spacing.lg,
    },
  });
}
