import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ChevronRight,
  Fingerprint,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useSecuritySettings } from "../hooks/use-security-settings";
import {
  PasswordFormModal,
  type PasswordModalMode,
} from "./password-form-modal";

export interface SecuritySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SecuritySettingsModal({
  visible,
  onClose,
}: SecuritySettingsModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const {
    config,
    biometrics,
    busy,
    error,
    clearError,
    savePassword,
    deletePassword,
    toggleBiometrics,
  } = useSecuritySettings();

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordModalMode, setPasswordModalMode] =
    useState<PasswordModalMode>("set");

  if (!visible) return null;

  const openPasswordModal = (mode: PasswordModalMode) => {
    clearError();
    setPasswordModalMode(mode);
    setPasswordModalVisible(true);
  };

  const handlePasswordSubmit = async (data: {
    currentPassword?: string;
    newPassword?: string;
  }) => {
    if (passwordModalMode === "remove" && data.currentPassword) {
      return await deletePassword(data.currentPassword);
    }
    if (data.newPassword) {
      return await savePassword(data.newPassword, data.currentPassword);
    }
    return false;
  };

  const handleToggleBiometrics = async (value: boolean) => {
    clearError();
    await toggleBiometrics(value);
  };

  const isBiometricEligible =
    config.isPasswordSet &&
    biometrics.hasHardware &&
    biometrics.isEnrolled;

  const getBiometricSubtitle = () => {
    if (!config.isPasswordSet) {
      return t("security.biometricRequiresPassword");
    }
    if (!biometrics.hasHardware) {
      return t("security.biometricNoHardware");
    }
    if (!biometrics.isEnrolled) {
      return t("security.biometricNotEnrolled");
    }
    return t("security.biometricDescription", {
      biometric: biometrics.biometricLabel,
    });
  };

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={t("common.close")}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <ShieldCheck color={theme.colors.primary} size={22} />
                </View>
                <Text style={styles.headerTitle}>
                  {t("security.menuTitle")}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t("common.close")}
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
              >
                <X color={theme.colors.textMuted} size={20} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              {/* Password Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("security.passwordSection")}
                </Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.rowIconContainer}>
                      <KeyRound color={theme.colors.primary} size={20} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>
                        {t("security.appPassword")}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        {config.isPasswordSet
                          ? t("security.passwordIsConfigured")
                          : t("security.passwordNotConfigured")}
                      </Text>
                    </View>
                    <View style={styles.badgeContainer}>
                      <View
                        style={[
                          styles.statusBadge,
                          config.isPasswordSet
                            ? styles.statusBadgeActive
                            : styles.statusBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            config.isPasswordSet
                              ? styles.statusBadgeTextActive
                              : styles.statusBadgeTextInactive,
                          ]}
                        >
                          {config.isPasswordSet
                            ? t("security.badgeActive")
                            : t("security.badgeOff")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.rowDivider} />

                  <View style={styles.buttonActionRow}>
                    {config.isPasswordSet ? (
                      <>
                        <Pressable
                          accessibilityLabel={t("security.changePasswordButton")}
                          accessibilityRole="button"
                          onPress={() => openPasswordModal("change")}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            pressed && styles.actionBtnPressed,
                          ]}
                        >
                          <Text style={styles.actionBtnText}>
                            {t("security.changePasswordButton")}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={t("security.removePasswordButton")}
                          accessibilityRole="button"
                          onPress={() => openPasswordModal("remove")}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.removeBtn,
                            pressed && styles.actionBtnPressed,
                          ]}
                        >
                          <Text
                            style={[styles.actionBtnText, styles.removeBtnText]}
                          >
                            {t("security.removePasswordButton")}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        accessibilityLabel={t("security.setPasswordButton")}
                        accessibilityRole="button"
                        onPress={() => openPasswordModal("set")}
                        style={({ pressed }) => [
                          styles.actionBtnPrimary,
                          pressed && styles.actionBtnPressed,
                        ]}
                      >
                        <Text style={styles.actionBtnPrimaryText}>
                          {t("security.setPasswordButton")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* Biometrics Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("security.biometricSection")}
                </Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.rowIconContainer}>
                      <Fingerprint color={theme.colors.info} size={20} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>
                        {t("security.biometricTitle", {
                          biometric: biometrics.biometricLabel,
                        })}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        {getBiometricSubtitle()}
                      </Text>
                    </View>
                    <ThemedSwitch
                      accessibilityLabel={t("security.biometricTitle", {
                        biometric: biometrics.biometricLabel,
                      })}
                      disabled={!isBiometricEligible && !config.isBiometricsEnabled}
                      onValueChange={handleToggleBiometrics}
                      value={config.isBiometricsEnabled}
                    />
                  </View>
                </View>
              </View>

              {/* Information Note */}
              <View style={styles.infoBox}>
                <Info color={theme.colors.textMuted} size={18} />
                <Text style={styles.infoText}>
                  {t("security.securityNote")}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PasswordFormModal
        busy={busy}
        error={error}
        mode={passwordModalMode}
        onClose={() => setPasswordModalVisible(false)}
        onSubmit={handlePasswordSubmit}
        visible={passwordModalVisible}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    scrollContent: {
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.xl,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorBannerText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    rowIconContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    rowSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    badgeContainer: {
      justifyContent: "center",
    },
    statusBadge: {
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    statusBadgeActive: {
      backgroundColor: `${theme.colors.success}20`,
    },
    statusBadgeInactive: {
      backgroundColor: `${theme.colors.textMuted}20`,
    },
    statusBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    statusBadgeTextActive: {
      color: theme.colors.success,
    },
    statusBadgeTextInactive: {
      color: theme.colors.textMuted,
    },
    rowDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
    },
    buttonActionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    actionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      height: 40,
      justifyContent: "center",
    },
    actionBtnPressed: {
      opacity: 0.8,
    },
    actionBtnText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    removeBtn: {
      borderColor: `${theme.colors.danger}40`,
      backgroundColor: `${theme.colors.danger}10`,
    },
    removeBtnText: {
      color: theme.colors.danger,
    },
    actionBtnPrimary: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      height: 40,
      justifyContent: "center",
    },
    actionBtnPrimaryText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    infoBox: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    infoText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
  });
}
