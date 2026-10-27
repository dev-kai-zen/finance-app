import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, Plus, Sparkles, X } from "lucide-react-native";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface TransactionSpeedDialFabProps {
  onPressForm: () => void;
  onPressChat: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  fabRef?: React.Ref<View>;
}

export function TransactionSpeedDialFab({
  onPressForm,
  onPressChat,
  accessibilityLabel = "Record options",
  style,
  fabRef,
}: TransactionSpeedDialFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const bottomPosition = Math.max(24, insets.bottom + 20);
  const rightPosition = Math.max(20, insets.right + 20);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSelectForm = () => {
    setIsOpen(false);
    onPressForm();
  };

  const handleSelectChat = () => {
    setIsOpen(false);
    onPressChat();
  };

  return (
    <>
      {/* Dimmed backdrop when speed dial is open */}
      {isOpen ? (
        <Pressable
          accessibilityLabel="Dismiss options"
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          { bottom: bottomPosition, right: rightPosition },
          style,
        ]}
      >
        {/* Speed Dial Options Container */}
        {isOpen ? (
          <View style={styles.optionsContainer}>
            {/* Option 1: Chat to Encode */}
            <Pressable
              accessibilityLabel={t("transactions.speedDialChat")}
              accessibilityRole="button"
              onPress={handleSelectChat}
              style={({ pressed }) => [
                styles.optionCapsule,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionIconContainer, styles.chatIconContainer]}>
                <Sparkles color={theme.colors.onPrimary} size={18} />
              </View>
              <Text style={styles.optionLabelText}>
                {t("transactions.speedDialChat")}
              </Text>
            </Pressable>

            {/* Option 2: Manual Entry */}
            <Pressable
              accessibilityLabel={t("transactions.speedDialForm")}
              accessibilityRole="button"
              onPress={handleSelectForm}
              style={({ pressed }) => [
                styles.optionCapsule,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionIconContainer, styles.formIconContainer]}>
                <FileText color={theme.colors.textPrimary} size={18} />
              </View>
              <Text style={styles.optionLabelText}>
                {t("transactions.speedDialForm")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Main Floating Action Button */}
        <Pressable
          ref={fabRef as any}
          collapsable={false}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.fab,
            isOpen && styles.fabOpen,
            pressed && styles.fabPressed,
          ]}
        >
          {isOpen ? (
            <X color={theme.colors.onPrimary} size={26} strokeWidth={2.5} />
          ) : (
            <Plus color={theme.colors.onPrimary} size={28} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
    </>
  );
}

function createStyles(theme: AppTheme) {
  const size = LAYOUT_DIMENSIONS.fabSize;

  return StyleSheet.create({
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      zIndex: 998,
    },
    container: {
      alignItems: "flex-end",
      position: "absolute",
      zIndex: 999,
      elevation: 10,
    },
    optionsContainer: {
      alignItems: "flex-end",
      gap: theme.spacing.sm + 4,
      marginBottom: theme.spacing.md,
    },
    optionCapsule: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      elevation: 5,
      flexDirection: "row",
      gap: 12,
      minHeight: 52,
      paddingHorizontal: 16,
      paddingVertical: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 6,
    },
    optionIconContainer: {
      alignItems: "center",
      borderRadius: 18,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    chatIconContainer: {
      backgroundColor: theme.colors.primary,
    },
    formIconContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    optionLabelText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
    optionPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
    fab: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: size / 2,
      elevation: 6,
      height: size,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      width: size,
    },
    fabOpen: {
      backgroundColor: theme.colors.textPrimary,
    },
    fabPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.95 }],
    },
  });
}
