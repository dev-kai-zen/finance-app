import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Ban,
  Check,
  FileText,
  Play,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ShakeAction } from "@/modules/settings";

interface GesturesSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  shakeAction: ShakeAction;
  onSelectShakeAction: (action: ShakeAction) => void;
  onTestShake?: (action: ShakeAction) => void;
}

export function GesturesSettingsModal({
  visible,
  onClose,
  shakeAction,
  onSelectShakeAction,
  onTestShake,
}: GesturesSettingsModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const handleTest = () => {
    if (shakeAction === "disabled") {
      Alert.alert(
        t("settings.gesturesTitle"),
        t("settings.shakeDisabledAlert"),
      );
      return;
    }
    onClose();
    setTimeout(() => {
      onTestShake?.(shakeAction);
    }, 200);
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
          accessibilityLabel={t("common.close", { defaultValue: "Close" })}
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
              <View style={styles.headerIconContainer}>
                <Smartphone color={theme.colors.primary} size={20} />
              </View>
              <Text style={styles.title}>{t("settings.gesturesTitle")}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.close", { defaultValue: "Close" })}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <X color={theme.colors.textMuted} size={20} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Gesture description card */}
            <View style={styles.infoBanner}>
              <Text style={styles.sectionHeader}>
                {t("settings.shakeGestureTitle")}
              </Text>
              <Text style={styles.subtitle}>
                {t("settings.shakeGestureDescription")}
              </Text>
            </View>

            {/* Option 1: Chat with Kai */}
            <Pressable
              accessibilityLabel={t("settings.shakeActionChatWithKai")}
              accessibilityRole="radio"
              accessibilityState={{ checked: shakeAction === "chat_with_kai" }}
              onPress={() => onSelectShakeAction("chat_with_kai")}
              style={({ pressed }) => [
                styles.optionCard,
                shakeAction === "chat_with_kai" && styles.optionCardSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${theme.colors.primary}18` },
                  ]}
                >
                  <Sparkles color={theme.colors.primary} size={18} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    {t("settings.shakeActionChatWithKai")}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {t("settings.shakeActionChatWithKaiDescription")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    shakeAction === "chat_with_kai" && styles.radioCircleSelected,
                  ]}
                >
                  {shakeAction === "chat_with_kai" && (
                    <Check color={theme.colors.onPrimary} size={13} strokeWidth={3} />
                  )}
                </View>
              </View>
            </Pressable>

            {/* Option 2: Manual Entry */}
            <Pressable
              accessibilityLabel={t("settings.shakeActionManualEntry")}
              accessibilityRole="radio"
              accessibilityState={{ checked: shakeAction === "manual_entry" }}
              onPress={() => onSelectShakeAction("manual_entry")}
              style={({ pressed }) => [
                styles.optionCard,
                shakeAction === "manual_entry" && styles.optionCardSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${theme.colors.accent}18` },
                  ]}
                >
                  <FileText color={theme.colors.accent} size={18} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    {t("settings.shakeActionManualEntry")}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {t("settings.shakeActionManualEntryDescription")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    shakeAction === "manual_entry" && styles.radioCircleSelected,
                  ]}
                >
                  {shakeAction === "manual_entry" && (
                    <Check color={theme.colors.onPrimary} size={13} strokeWidth={3} />
                  )}
                </View>
              </View>
            </Pressable>

            {/* Option 3: Disabled */}
            <Pressable
              accessibilityLabel={t("settings.shakeActionDisabled")}
              accessibilityRole="radio"
              accessibilityState={{ checked: shakeAction === "disabled" }}
              onPress={() => onSelectShakeAction("disabled")}
              style={({ pressed }) => [
                styles.optionCard,
                shakeAction === "disabled" && styles.optionCardSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${theme.colors.textMuted}18` },
                  ]}
                >
                  <Ban color={theme.colors.textMuted} size={18} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>
                    {t("settings.shakeActionDisabled")}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {t("settings.shakeActionDisabledDescription")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    shakeAction === "disabled" && styles.radioCircleSelected,
                  ]}
                >
                  {shakeAction === "disabled" && (
                    <Check color={theme.colors.onPrimary} size={13} strokeWidth={3} />
                  )}
                </View>
              </View>
            </Pressable>

            {/* Test Action Button */}
            {onTestShake && (
              <Pressable
                accessibilityLabel={t("settings.testShakeGesture")}
                accessibilityRole="button"
                onPress={handleTest}
                style={({ pressed }) => [
                  styles.testButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Play color={theme.colors.primary} size={16} />
                <Text style={styles.testButtonText}>
                  {t("settings.testShakeGesture")}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
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
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerIconContainer: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: `${theme.colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: 6,
      borderRadius: 16,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    infoBanner: {
      marginBottom: 6,
    },
    sectionHeader: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    optionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}08`,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    optionIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    optionTextContainer: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    optionDescription: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.textMuted,
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioCircleSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    testButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}40`,
      backgroundColor: `${theme.colors.primary}10`,
    },
    testButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    buttonPressed: {
      opacity: 0.7,
    },
  });
}
