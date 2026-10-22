import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Crown,
  Database,
  HardDrive,
  Info,
  Languages,
  Palette,
  Pipette,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react-native";
import { ThemedSwitch } from "@/components/themed-switch";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useThemeController, useThemeStyles } from "@/hooks/use-app-theme";
import { ProPaywallModal, useProStatus } from "@/modules/pro";
import { AdBanner, useAdsDevMode } from "@/modules/ads";
import { HexColorsModal, useHexColors } from "@/modules/hex-colors";
import { SecuritySettingsModal, useSecuritySettings } from "@/modules/security";
import { useLocalization } from "@/infrastructure/localization";
import { useWorkspace } from "@/modules/onboarding";
import { getLatestReleaseNotes, WhatsNewModal } from "@/modules/whats-new";
import { ThemePickerModal } from "@/modules/settings/components/theme-picker-modal";
import { ThemeSwatchPreview } from "@/modules/settings/components/theme-preset-card";
import { ResetDataModal } from "@/modules/settings/components/reset-data-modal";
import { SettingsDefaultAccountPickerModal } from "@/modules/settings/components/settings-default-account-picker-modal";
import { EditNicknameModal } from "@/modules/settings/components/edit-nickname-modal";
import { useDefaultAccounts } from "../hooks/use-default-accounts";
import { useExperiencePreferences } from "../hooks/use-experience-preferences";
import { useResetData } from "../hooks/use-reset-data";
import { useUserNickname } from "../hooks/use-user-nickname";

export function SettingsScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const {
    theme,
    themeId,
    setThemeId,
    isFollowingSystem,
    setFollowSystem,
    availableThemes,
  } = useThemeController();
  const { activeLanguage, preference, t } = useLocalization();
  const { colors } = useHexColors();
  const workspace = useWorkspace();
  const {
    defaultExpenseAccountId,
    defaultExpensePocketId,
    defaultIncomeAccountId,
    defaultIncomePocketId,
    expenseLocation,
    incomeLocation,
    setExpenseAccount,
    setIncomeAccount,
  } = useDefaultAccounts();

  const { nickname, setNickname } = useUserNickname();
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isHexColorsOpen, setIsHexColorsOpen] = useState(false);
  const [isExpensePickerOpen, setIsExpensePickerOpen] = useState(false);
  const [isIncomePickerOpen, setIsIncomePickerOpen] = useState(false);
  const [isResetDataOpen, setIsResetDataOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const {
    isPro,
    isDevSimulated,
    toggleDevSimulation,
    resetProStatus,
    restorePurchases,
    isRestoring,
  } = useProStatus();
  const { isForceTestAds, toggleForceTestAds } = useAdsDevMode();
  const security = useSecuritySettings();
  const resetData = useResetData();
  const experience = useExperiencePreferences();
  const languageValue =
    preference === "system"
      ? t("settings.languageSystemValue", {
          language: activeLanguage.nativeName,
        })
      : activeLanguage.nativeName;

  const formatDefaultAccountName = (
    location: typeof expenseLocation,
  ): string => {
    if (!location) return t("settings.defaultAccountNone");
    const { account, pocket } = location;
    if (pocket) {
      return `${account.name} · ${pocket.name}`;
    }
    if (account.pocketEnabled) {
      return `${account.name} · ${t("settings.availablePocket")}`;
    }
    return account.name;
  };

  const expenseAccountName = formatDefaultAccountName(expenseLocation);
  const incomeAccountName = formatDefaultAccountName(incomeLocation);
  const themeValue = isFollowingSystem
    ? t("settings.followingAppearance")
    : `${theme.name} · ${t("settings.paletteSaved", {
        mode: t(theme.mode === "light" ? "settings.light" : "settings.dark"),
      })}`;

  return (
    <PageContainer>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.localizationSection")}
          </Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.languageAccessibility", {
                language: languageValue,
              })}
              accessibilityRole="button"
              onPress={() => router.push("/language")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Languages color={theme.colors.info} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.languageTitle")}
                </Text>
                <Text style={styles.settingDescription}>{languageValue}</Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.currencySetupAccessibility")}
              accessibilityRole="button"
              onPress={() => router.push("/currency-setup")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <CircleDollarSign color={theme.colors.success} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.currencySetup")}
                </Text>
                <Text style={styles.settingDescription}>
                  {t("settings.currencySetupDescription")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        <AdBanner
          placement="settings"
          variant="card"
          style={{ marginBottom: theme.spacing.lg }}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.generalSection")}
          </Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.nicknameTitle")}
              accessibilityRole="button"
              onPress={() => setIsNicknameModalOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Smile color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.nicknameTitle")}
                </Text>
                <Text style={styles.settingDescription}>
                  {nickname?.trim() || t("settings.nicknameNotSet")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.themeAccessibility", {
                theme: theme.name,
              })}
              accessibilityRole="button"
              onPress={() => setIsThemePickerOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Palette color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.themeTitle")}
                </Text>
                <Text style={styles.settingDescription}>{themeValue}</Text>
              </View>
              <View style={styles.rowAccessory}>
                <ThemeSwatchPreview preset={theme} />
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </View>
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.remindersAccessibility", {
                defaultValue: "Configure reminder settings",
              })}
              accessibilityRole="button"
              onPress={() => router.push("/reminder-settings")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Bell color={theme.colors.accent} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.remindersTitle", { defaultValue: "Reminders" })}
                </Text>
                <Text style={styles.settingDescription}>
                  {t("settings.remindersDescription", {
                    defaultValue: "Daily logging and due bill reminders",
                  })}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.defaultExpenseAccessibility", {
                account: expenseAccountName,
              })}
              accessibilityRole="button"
              onPress={() => setIsExpensePickerOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <ArrowUpRight color={theme.colors.danger} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.defaultAccountExpenseLabel")}
                </Text>
                <Text style={styles.settingDescription}>
                  {expenseAccountName}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.defaultIncomeAccessibility", {
                account: incomeAccountName,
              })}
              accessibilityRole="button"
              onPress={() => setIsIncomePickerOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <ArrowDownLeft color={theme.colors.success} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.defaultAccountIncomeLabel")}
                </Text>
                <Text style={styles.settingDescription}>
                  {incomeAccountName}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.hexColorsAccessibility", {
                count: colors.length,
              })}
              accessibilityRole="button"
              onPress={() => setIsHexColorsOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Pipette color={theme.colors.accent} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.hexColors")}
                </Text>
              </View>
              <View style={styles.rowAccessory}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{colors.length}</Text>
                </View>
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </View>
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.resetDataAccessibility")}
              accessibilityRole="button"
              onPress={() => {
                resetData.clearError();
                setIsResetDataOpen(true);
              }}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={[styles.iconContainer, styles.dangerIconContainer]}>
                <Trash2 color={theme.colors.danger} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, styles.dangerLabel]}>
                  {t("settings.resetData")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.backupSection")}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.localBackupAccessibility")}
              accessibilityRole="button"
              onPress={() => router.push("/local-backup")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <HardDrive color={theme.colors.textSecondary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("navigation.localBackup")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityLabel={t("settings.googleDriveAccessibility")}
              accessibilityRole="button"
              onPress={() => router.push("/google-drive-backup")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Cloud color={theme.colors.info} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <View style={styles.titleRow}>
                  <Text style={styles.settingLabel}>
                    {t("settings.googleDrive")}
                  </Text>
                  {!isPro && (
                    <View style={styles.proChip}>
                      <Crown color="#D97706" size={8} />
                      <Text style={styles.proChipText}>PRO</Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
          {workspace.state.mode === "sample" ? (
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.iconContainer}>
                  <Info color={theme.colors.textMuted} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>
                    {t("settings.backupPaused")}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t("settings.backupPausedDescription")}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.securitySection")}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.securityMenuAccessibility")}
              accessibilityRole="button"
              onPress={() => setIsSecurityOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <ShieldCheck color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <View style={styles.titleRow}>
                  <Text style={styles.settingLabel}>
                    {t("settings.securityMenuTitle")}
                  </Text>
                  {!isPro && (
                    <View style={styles.proChip}>
                      <Crown color="#D97706" size={8} />
                      <Text style={styles.proChipText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.settingDescription}>
                  {security.config.isPasswordSet
                    ? t("settings.securityMenuSubtitleConfigured")
                    : t("settings.securityMenuSubtitleNotConfigured")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        {/* Kaizen Pro Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("pro.paywallTitle")}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsPaywallOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Crown color="#D97706" size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {isPro ? t("pro.proActive") : t("pro.sidebarTitle")}
                </Text>
                <Text style={styles.settingDescription}>
                  {isPro
                    ? t("pro.allFeaturesUnlocked")
                    : t("pro.sidebarSubtitle")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityRole="button"
              disabled={isRestoring}
              onPress={async () => {
                const res = await restorePurchases();
                if (res.success && res.restored) {
                  Alert.alert(
                    t("pro.restoreSuccessTitle"),
                    t("pro.restoreSuccessMsg"),
                  );
                } else if (res.success && !res.restored) {
                  Alert.alert(
                    t("pro.restoreNotFoundTitle"),
                    t("pro.restoreNotFoundMsg"),
                  );
                } else if (!res.success && res.error) {
                  Alert.alert(t("pro.restoreErrorTitle"), res.error);
                }
              }}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Sparkles color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("pro.restorePurchases")}
                </Text>
              </View>
              {isRestoring ? (
                <ActivityIndicator
                  color={theme.colors.textSecondary}
                  size="small"
                />
              ) : (
                <ChevronRight color={theme.colors.textMuted} size={18} />
              )}
            </Pressable>
          </View>
        </View>

        {experience.developerMode ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("settings.developerSection")}</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.iconContainer}>
                  <Terminal color={theme.colors.textSecondary} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>{t("settings.developerMode")}</Text>
                  <Text style={styles.settingDescription}>
                    {t("settings.developerModeDescription")}
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel={t("settings.developerMode")}
                  onValueChange={(value) => experience.setDeveloperMode(value)}
                  value={experience.developerMode}
                />
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.toggleRow}>
                <View style={styles.iconContainer}>
                  <Crown color="#D97706" size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>Simulate Pro Version</Text>
                  <Text style={styles.settingDescription}>
                    Test Free vs Pro features locally without real Play store purchases
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel="Simulate Pro Version"
                  onValueChange={(value) => toggleDevSimulation(value)}
                  value={isDevSimulated}
                />
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.toggleRow}>
                <View style={styles.iconContainer}>
                  <Sparkles color="#3B82F6" size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>Force Google Test Ads</Text>
                  <Text style={styles.settingDescription}>
                    Use official Google sample banner ad units to safely verify banner display
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel="Force Google Test Ads"
                  onValueChange={(value) => void toggleForceTestAds(value)}
                  value={isForceTestAds}
                />
              </View>
              <View style={styles.rowDivider} />
              <Pressable
                accessibilityLabel="Reset Pro Status (Dev)"
                accessibilityRole="button"
                onPress={() => {
                  void resetProStatus().then(() => {
                    Alert.alert(
                      "Pro Status Reset",
                      "Pro status has been cleared back to the Free tier for testing.",
                    );
                  });
                }}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && styles.settingRowPressed,
                ]}
              >
                <View style={styles.iconContainer}>
                  <RotateCcw color={theme.colors.warning} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>Reset Pro Status (Dev)</Text>
                  <Text style={styles.settingDescription}>
                    Clear cached purchase and return to Free tier to retest the buy button
                  </Text>
                </View>
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </Pressable>
              <View style={styles.rowDivider} />
              <Pressable
                accessibilityLabel={t("settings.sqliteMonitor")}
                accessibilityRole="button"
                onPress={() => router.push("/monitor")}
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && styles.settingRowPressed,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Database color={theme.colors.info} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>
                    {t("settings.sqliteMonitor")}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t("settings.sqliteMonitorDescription")}
                  </Text>
                </View>
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.aboutSection")}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.whatsNewAccessibility")}
              accessibilityRole="button"
              onPress={() => setIsWhatsNewOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Sparkles color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.whatsNew")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>
      </View>

      <WhatsNewModal
        blocks={getLatestReleaseNotes()}
        visible={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
      />

      <ResetDataModal
        error={resetData.error}
        pending={resetData.pending}
        visible={isResetDataOpen}
        onCancel={() => {
          resetData.clearError();
          setIsResetDataOpen(false);
        }}
        onConfirm={() => {
          void resetData.resetData().then((completed) => {
            if (completed) setIsResetDataOpen(false);
          });
        }}
      />

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

      {isExpensePickerOpen ? (
        <SettingsDefaultAccountPickerModal
          allowNoneLabel={t("settings.defaultAccountPickerNone")}
          onClose={() => setIsExpensePickerOpen(false)}
          onSelect={(accountId, pocketId) => {
            setExpenseAccount(accountId, pocketId);
            setIsExpensePickerOpen(false);
          }}
          selectedAccountId={defaultExpenseAccountId}
          selectedPocketId={defaultExpensePocketId}
          title={t("settings.defaultExpenseTitle")}
        />
      ) : null}

      {isIncomePickerOpen ? (
        <SettingsDefaultAccountPickerModal
          allowNoneLabel={t("settings.defaultAccountPickerNone")}
          onClose={() => setIsIncomePickerOpen(false)}
          onSelect={(accountId, pocketId) => {
            setIncomeAccount(accountId, pocketId);
            setIsIncomePickerOpen(false);
          }}
          selectedAccountId={defaultIncomeAccountId}
          selectedPocketId={defaultIncomePocketId}
          title={t("settings.defaultIncomeTitle")}
        />
      ) : null}

      <SecuritySettingsModal
        onClose={() => {
          setIsSecurityOpen(false);
          void security.refresh();
        }}
        visible={isSecurityOpen}
      />

      <ProPaywallModal
        onClose={() => setIsPaywallOpen(false)}
        visible={isPaywallOpen}
      />

      <EditNicknameModal
        currentNickname={nickname}
        onCancel={() => setIsNicknameModalOpen(false)}
        onSave={setNickname}
        visible={isNicknameModalOpen}
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
    sectionHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    toggleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      minHeight: 56,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
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
    iconContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    dangerIconContainer: {
      backgroundColor: `${theme.colors.danger}18`,
    },
    rowDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: theme.spacing.lg + 40 + theme.spacing.md,
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
    dangerLabel: {
      color: theme.colors.danger,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    proChip: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderColor: "rgba(217, 119, 6, 0.4)",
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    proChipText: {
      color: "#D97706",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
}
