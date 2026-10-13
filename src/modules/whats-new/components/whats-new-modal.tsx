import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Sparkles } from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { ReleaseNoteBlock } from "@/modules/whats-new/types/whats-new.types";

interface WhatsNewModalProps {
  blocks: ReleaseNoteBlock[];
  visible: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ blocks, visible, onClose }: WhatsNewModalProps) {
  const { width } = useWindowDimensions();
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
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("whatsNew.dismissAccessibility")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View
            style={[
              styles.card,
              isTabletOrDesktop(width) && styles.cardDesktop,
            ]}
          >
            <View style={styles.iconCircle}>
              <Sparkles color={theme.colors.primary} size={26} />
            </View>

            <Text style={styles.heading}>{t("whatsNew.heading")}</Text>

            {blocks.length === 0 ? (
              <Text style={styles.emptyMessage}>{t("whatsNew.empty")}</Text>
            ) : (
              blocks.map((block) => (
                <View key={block.version} style={styles.block}>
                  <Text style={styles.versionLabel}>
                    {t("whatsNew.versionLabel", { version: block.version })}
                  </Text>
                  <Text style={styles.blockTitle}>{t(block.titleKey)}</Text>
                  <View style={styles.itemList}>
                    {block.itemKeys.map((itemKey) => (
                      <View key={itemKey} style={styles.itemRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.itemText}>{t(itemKey)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}

            <AppButton
              label={t("whatsNew.continue")}
              onPress={onClose}
              style={styles.continueButton}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "center",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    scrollView: {
      flexGrow: 0,
      maxHeight: "100%",
      width: "100%",
    },
    scrollContent: {
      alignItems: "center",
      flexGrow: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      padding: theme.spacing.xl,
      width: "100%",
      ...theme.shadows.modal,
    },
    cardDesktop: {
      maxWidth: 480,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: 999,
      borderWidth: 1,
      height: 58,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 58,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    emptyMessage: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    block: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    versionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    blockTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    itemList: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    itemRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    bullet: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    itemText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    continueButton: {
      marginTop: theme.spacing.sm,
    },
  });
}
