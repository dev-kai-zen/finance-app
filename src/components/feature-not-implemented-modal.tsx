import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "./icon-helper";

export interface FeatureNotImplementedModalProps {
  visible: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
}

export function FeatureNotImplementedModal({
  visible,
  onClose,
  featureTitle = "Feature Under Integration",
  featureDescription = "This feature is currently being developed and will be fully available in an upcoming update.",
}: FeatureNotImplementedModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss modal"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Top Icon Badge */}
          <View style={styles.iconCircle}>
            <IconHelper
              color={theme.colors.primary}
              name="sparkles"
              size={28}
            />
          </View>

          <Text style={styles.titleText}>{featureTitle}</Text>
          <Text style={styles.descriptionText}>{featureDescription}</Text>

          <View style={styles.footerRow}>
            <Pressable
              accessibilityLabel="Got it"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 420,
      paddingHorizontal: 24,
      paddingTop: 28,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      maxWidth: 440,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: 30,
      borderWidth: 1,
      height: 60,
      justifyContent: "center",
      marginBottom: 16,
      width: 60,
    },
    titleText: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    descriptionText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
      textAlign: "center",
    },
    footerRow: {
      width: "100%",
    },
    confirmBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      height: 46,
      justifyContent: "center",
      width: "100%",
    },
    confirmBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
