import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Check,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { ChatTransactionMode } from "../services/chat-transaction-mode.service";

interface KaiChatSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode: ChatTransactionMode;
  onSelectMode: (mode: ChatTransactionMode) => void;
  onOpenKnowledge?: () => void;
}

export function KaiChatSettingsModal({
  visible,
  onClose,
  mode,
  onSelectMode,
  onOpenKnowledge,
}: KaiChatSettingsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel={t("chatWithKai.cancel")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropPressable}
        />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <SlidersHorizontal color={theme.colors.onPrimary} size={16} />
              </View>
              <View>
                <Text style={styles.title}>
                  {t("chatWithKai.settingsTitle")}
                </Text>
                <Text style={styles.subtitle}>
                  {t("chatWithKai.settingsSubtitle")}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={t("chatWithKai.cancel")}
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

          {/* Section: Mode Selection */}
          <Text style={styles.sectionHeader}>
            {t("chatWithKai.modeSectionTitle")}
          </Text>

          <View style={styles.optionsList}>
            {/* Option 1: Review First */}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === "review" }}
              onPress={() => onSelectMode("review")}
              style={({ pressed }) => [
                styles.optionCard,
                mode === "review" && styles.optionCardActive,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionTitleRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      mode === "review"
                        ? styles.iconCircleActive
                        : styles.iconCircleInactive,
                    ]}
                  >
                    <Eye
                      color={
                        mode === "review"
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                      size={18}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>
                      {t("chatWithKai.modeReviewTitle")}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {t("chatWithKai.modeReviewDesc")}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioIndicator,
                    mode === "review" && styles.radioIndicatorActive,
                  ]}
                >
                  {mode === "review" && (
                    <Check color={theme.colors.onPrimary} size={13} />
                  )}
                </View>
              </View>
            </Pressable>

            {/* Option 2: Auto-Save */}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === "auto" }}
              onPress={() => onSelectMode("auto")}
              style={({ pressed }) => [
                styles.optionCard,
                mode === "auto" && styles.optionCardActive,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionTitleRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      mode === "auto"
                        ? styles.iconCircleActive
                        : styles.iconCircleInactive,
                    ]}
                  >
                    <Zap
                      color={
                        mode === "auto"
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                      size={18}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>
                      {t("chatWithKai.modeAutoTitle")}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {t("chatWithKai.modeAutoDesc")}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioIndicator,
                    mode === "auto" && styles.radioIndicatorActive,
                  ]}
                >
                  {mode === "auto" && (
                    <Check color={theme.colors.onPrimary} size={13} />
                  )}
                </View>
              </View>
            </Pressable>
          </View>

          {/* Quick link to Knowledge if available */}
          {onOpenKnowledge && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onOpenKnowledge();
              }}
              style={({ pressed }) => [
                styles.knowledgeLink,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.knowledgeLinkLeft}>
                <Sparkles color="#8B5CF6" size={16} />
                <Text style={styles.knowledgeLinkText}>
                  {t("chatWithKai.manageKnowledgeLink")}
                </Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={16} />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdropPressable: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl + 8,
      gap: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    headerIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    sectionHeader: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    optionsList: {
      gap: theme.spacing.sm,
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1.5,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    optionCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(139, 92, 246, 0.05)",
    },
    cardPressed: {
      opacity: 0.85,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    optionTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    iconCircle: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    iconCircleActive: {
      backgroundColor: "rgba(139, 92, 246, 0.15)",
    },
    iconCircleInactive: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    optionDescription: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
    radioIndicator: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 2,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    radioIndicatorActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    buttonPreviewBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      marginLeft: 42,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    buttonPreviewText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    knowledgeLink: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginTop: 4,
    },
    knowledgeLinkLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    knowledgeLinkText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
