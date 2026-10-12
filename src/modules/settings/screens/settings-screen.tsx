import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Archive,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Languages,
  Trash2,
} from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useThemeController, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountPickerModal, useAccounts } from "@/modules/accounts";
import { HexColorsModal, useHexColors } from "@/modules/hex-colors";
import { useLocalization } from "@/infrastructure/localization";
import { useWorkspace } from "@/modules/onboarding";
import { ThemePickerModal } from "@/modules/settings/components/theme-picker-modal";
import { ThemeSwatchPreview } from "@/modules/settings/components/theme-preset-card";
import { ResetDataModal } from "@/modules/settings/components/reset-data-modal";
import { useDefaultAccounts } from "../hooks/use-default-accounts";
import { useResetData } from "../hooks/use-reset-data";

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
  const { accounts, pockets } = useAccounts();
  const {
    defaultExpenseAccountId,
    defaultExpensePocketId,
    defaultIncomeAccountId,
    defaultIncomePocketId,
    setExpenseAccount,
    setIncomeAccount,
  } = useDefaultAccounts();

  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isHexColorsOpen, setIsHexColorsOpen] = useState(false);
  const [isExpensePickerOpen, setIsExpensePickerOpen] = useState(false);
  const [isIncomePickerOpen, setIsIncomePickerOpen] = useState(false);
  const [isResetDataOpen, setIsResetDataOpen] = useState(false);
  const resetData = useResetData();
  const languageValue =
    preference === "system"
      ? t("settings.languageSystemValue", {
          language: activeLanguage.nativeName,
        })
      : activeLanguage.nativeName;

  const expenseAccount = accounts.find(
    (a) => a.id === defaultExpenseAccountId && !a.isArchived,
  );
  const expensePocket =
    expenseAccount && defaultExpensePocketId
      ? pockets.find(
          (p) =>
            p.id === defaultExpensePocketId &&
            p.accountId === expenseAccount.id &&
            !p.isArchived,
        )
      : null;
  const expenseAccountName = expenseAccount
    ? expensePocket
      ? `${expenseAccount.name} · ${expensePocket.name}`
      : expenseAccount.pocketEnabled
        ? `${expenseAccount.name} · ${t("settings.availablePocket")}`
        : expenseAccount.name
    : t("settings.defaultAccountNone");

  const incomeAccount = accounts.find(
    (a) => a.id === defaultIncomeAccountId && !a.isArchived,
  );
  const incomePocket =
    incomeAccount && defaultIncomePocketId
      ? pockets.find(
          (p) =>
            p.id === defaultIncomePocketId &&
            p.accountId === incomeAccount.id &&
            !p.isArchived,
        )
      : null;
  const incomeAccountName = incomeAccount
    ? incomePocket
      ? `${incomeAccount.name} · ${incomePocket.name}`
      : incomeAccount.pocketEnabled
        ? `${incomeAccount.name} · ${t("settings.availablePocket")}`
        : incomeAccount.name
    : t("settings.defaultAccountNone");

  return (
    <PageContainer>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.languageSection")}
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
              <View style={styles.backupIcon}>
                <Languages color={theme.colors.primary} size={21} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.languageTitle")}
                </Text>
                <Text style={styles.settingDescription}>{languageValue}</Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.currencySection")}
          </Text>
          <View style={styles.card}>
            <Pressable
              accessibilityLabel={t("settings.currencySetupAccessibility")}
              accessibilityRole="button"
              onPress={() => router.push("/currency-setup")}
              style={({ pressed }) => [
                styles.settingRow,
                pressed && styles.settingRowPressed,
              ]}
            >
              <View style={styles.backupIcon}>
                <CircleDollarSign color={theme.colors.primary} size={21} />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.defaultAccountsSection")}
          </Text>
          <View style={styles.card}>
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
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{t("settings.expense")}</Text>
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
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{t("settings.income")}</Text>
                <Text style={styles.settingDescription}>
                  {incomeAccountName}
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
              <View style={styles.backupIcon}>
                <Archive color={theme.colors.primary} size={21} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("navigation.localBackup")}
                </Text>
                <Text style={styles.settingDescription}>
                  {t("settings.localBackupDescription")}
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
              <View style={styles.backupIcon}>
                <Cloud color={theme.colors.primary} size={21} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t("settings.googleDrive")}
                </Text>
                <Text style={styles.settingDescription}>
                  {t("settings.googleDriveDescription")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
          {workspace.state.mode === "sample" ? (
            <View style={styles.card}>
              <View style={styles.settingRow}>
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
          <Text style={styles.sectionTitle}>
            {t("settings.appearanceSection")}
          </Text>
          <View style={styles.card}>
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
              <ThemeSwatchPreview preset={theme} />
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{theme.name}</Text>
                <Text style={styles.settingDescription}>
                  {isFollowingSystem
                    ? t("settings.followingAppearance")
                    : t("settings.paletteSaved", {
                        mode: t(
                          theme.mode === "light"
                            ? "settings.light"
                            : "settings.dark",
                        ),
                      })}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.sourceManagementSection")}
          </Text>
          <View style={styles.card}>
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
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
            {t("settings.dangerZone")}
          </Text>
          <View style={[styles.card, styles.dangerCard]}>
            <View style={styles.resetContent}>
              <View style={styles.resetHeading}>
                <View style={styles.resetIcon}>
                  <Trash2 color={theme.colors.danger} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.settingLabel}>
                    {t("settings.resetData")}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {t("settings.resetDataDescription")}
                  </Text>
                </View>
              </View>
              <AppButton
                label={t("settings.resetData")}
                onPress={() => {
                  resetData.clearError();
                  setIsResetDataOpen(true);
                }}
                variant="destructive"
              />
            </View>
          </View>
        </View>
      </View>

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

      <AccountPickerModal
        accounts={accounts}
        allowNone
        noneLabel={t("settings.defaultAccountPickerNone")}
        onClose={() => setIsExpensePickerOpen(false)}
        onSelectLocation={(account, pocketId) => {
          setExpenseAccount(account.id, pocketId);
          setIsExpensePickerOpen(false);
        }}
        onSelectNone={() => {
          setExpenseAccount(null, null);
          setIsExpensePickerOpen(false);
        }}
        pockets={pockets}
        selectedAccountId={defaultExpenseAccountId}
        selectedPocketId={defaultExpensePocketId}
        title={t("settings.defaultExpenseTitle")}
        visible={isExpensePickerOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        allowNone
        noneLabel={t("settings.defaultAccountPickerNone")}
        onClose={() => setIsIncomePickerOpen(false)}
        onSelectLocation={(account, pocketId) => {
          setIncomeAccount(account.id, pocketId);
          setIsIncomePickerOpen(false);
        }}
        onSelectNone={() => {
          setIncomeAccount(null, null);
          setIsIncomePickerOpen(false);
        }}
        pockets={pockets}
        selectedAccountId={defaultIncomeAccountId}
        selectedPocketId={defaultIncomePocketId}
        title={t("settings.defaultIncomeTitle")}
        visible={isIncomePickerOpen}
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
    rowDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: theme.spacing.lg,
    },
    settingCopy: {
      flex: 1,
      gap: 2,
    },
    backupIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
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
    dangerSectionTitle: {
      color: theme.colors.danger,
    },
    dangerCard: {
      borderColor: `${theme.colors.danger}50`,
    },
    resetContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    resetHeading: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    resetIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
  });
}
