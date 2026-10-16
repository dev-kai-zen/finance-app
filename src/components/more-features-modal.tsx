import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { IconHelper } from "@/components/icon-helper";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { db } from "@/infrastructure/database/client";
import {
  applyGuidedWorkspaceSimpleDefaults,
  isGuidedWorkspace,
  useExperiencePreferences,
  type NavVisibilityKey,
} from "@/modules/settings";

const MORE_FEATURE_ROWS: Array<{
  key: NavVisibilityKey;
  labelKey: string;
  icon: string;
}> = [
  { key: "calendar", labelKey: "settings.navCalendar", icon: "calendar" },
  { key: "creditCards", labelKey: "settings.navCreditCards", icon: "credit-card" },
  { key: "categories", labelKey: "settings.navCategories", icon: "layers" },
  { key: "budgets", labelKey: "settings.navBudgets", icon: "pie-chart" },
  { key: "goals", labelKey: "settings.navGoals", icon: "target" },
  { key: "reports", labelKey: "settings.navReports", icon: "file-text" },
  { key: "notes", labelKey: "settings.navNotes", icon: "notebook-pen" },
];

export function MoreFeaturesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const experience = useExperiencePreferences();

  const handleResetSimpleMenu = () => {
    applyGuidedWorkspaceSimpleDefaults(db);
    experience.refresh();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={t("common.close")} onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                {t("navigation.moreFeatures")}
              </Text>
              <Text style={styles.subtitle}>{t("navigation.moreFeaturesDescription")}</Text>
            </View>
            <Pressable accessibilityLabel={t("common.close")} onPress={onClose} style={styles.closeBtn}>
              <X color={theme.colors.textSecondary} size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {MORE_FEATURE_ROWS.map((row) => {
              const isVisible = experience.navVisibility[row.key];
              return (
                <View key={row.key} style={styles.row}>
                  <Pressable
                    accessibilityLabel={t(row.labelKey as never)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isVisible }}
                    onPress={() => experience.setNavVisible(row.key, !isVisible)}
                    style={styles.rowContent}
                  >
                    <View style={styles.iconContainer}>
                      <IconHelper
                        color={
                          isVisible
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                        name={row.icon}
                        size={20}
                      />
                    </View>
                    <Text style={styles.rowLabel}>{t(row.labelKey as never)}</Text>
                  </Pressable>
                  <ThemedSwitch
                    accessibilityLabel={t(row.labelKey as never)}
                    onValueChange={(value) => experience.setNavVisible(row.key, value)}
                    value={isVisible}
                  />
                </View>
              );
            })}
          </ScrollView>
          {isGuidedWorkspace() ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleResetSimpleMenu}
              style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.resetButtonText}>{t("navigation.resetSimpleMenu")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      gap: theme.spacing.md,
      maxHeight: "78%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    headerCopy: { flex: 1, gap: theme.spacing.xs },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    closeBtn: { padding: theme.spacing.xs },
    list: { gap: theme.spacing.xs, paddingBottom: theme.spacing.md },
    row: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 52,
      paddingVertical: theme.spacing.sm,
    },
    rowContent: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      marginRight: theme.spacing.sm,
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 24,
    },
    rowLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    resetButton: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
    },
    resetButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
