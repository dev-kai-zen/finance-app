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
              accessibilityLabel="Chat to encode transaction"
              accessibilityRole="button"
              onPress={handleSelectChat}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.labelPill}>
                <Text style={styles.labelText}>
                  {t("transactions.speedDialChat")}
                </Text>
              </View>
              <View style={[styles.optionIconCircle, styles.chatIconCircle]}>
                <Sparkles color={theme.colors.onPrimary} size={18} />
              </View>
            </Pressable>

            {/* Option 2: Manual Form */}
            <Pressable
              accessibilityLabel="Manual transaction form"
              accessibilityRole="button"
              onPress={handleSelectForm}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.labelPill}>
                <Text style={styles.labelText}>
                  {t("transactions.speedDialForm")}
                </Text>
              </View>
              <View style={[styles.optionIconCircle, styles.formIconCircle]}>
                <FileText color={theme.colors.onPrimary} size={18} />
              </View>
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
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    optionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    labelPill: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      elevation: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    labelText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    optionIconCircle: {
      alignItems: "center",
      borderRadius: 22,
      elevation: 4,
      height: 44,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      width: 44,
    },
    chatIconCircle: {
      backgroundColor: theme.colors.primary,
    },
    formIconCircle: {
      backgroundColor: theme.colors.textSecondary,
    },
    optionPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.95 }],
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
