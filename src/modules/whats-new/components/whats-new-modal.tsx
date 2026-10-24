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

  const primaryVersion = blocks[0]?.version;

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

        <View
          style={[
            styles.card,
            isTabletOrDesktop(width) && styles.cardDesktop,
          ]}
        >
          {/* Fixed Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Sparkles color={theme.colors.primary} size={24} />
            </View>

            <Text style={styles.heading}>{t("whatsNew.heading")}</Text>

            {primaryVersion ? (
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>
                  {t("whatsNew.versionLabel", { version: primaryVersion })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Scrollable Body */}
          <ScrollView
            contentContainerStyle={styles.bodyScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            style={styles.bodyScrollView}
          >
            {blocks.length === 0 ? (
              <Text style={styles.emptyMessage}>{t("whatsNew.empty")}</Text>
            ) : (
              blocks.map((block) => (
                <View key={block.version} style={styles.block}>
                  {block.titleKey ? (
                    <Text style={styles.blockTitle}>{t(block.titleKey)}</Text>
                  ) : null}

                  {block.sections.map((section, sectionIdx) => (
                    <View
                      key={`${section.categoryKey}-${sectionIdx}`}
                      style={styles.section}
                    >
                      <Text style={styles.categoryTitle}>
                        {t(section.categoryKey)}
                      </Text>
                      <View style={styles.itemList}>
                        {section.itemKeys.map((itemKey) => (
                          <View key={itemKey} style={styles.itemRow}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.itemText}>{t(itemKey)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          {/* Fixed Footer */}
          <View style={styles.footer}>
            <AppButton
              label={t("whatsNew.continue")}
              onPress={onClose}
              style={styles.continueButton}
            />
          </View>
        </View>
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
      padding: theme.spacing.lg,
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      display: "flex",
      flexDirection: "column",
      maxHeight: "82%",
      maxWidth: 440,
      overflow: "hidden",
      width: "100%",
      ...theme.shadows.modal,
    },
    cardDesktop: {
      maxWidth: 480,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: 999,
      borderWidth: 1,
      height: 52,
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
      width: 52,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    versionBadge: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: 999,
      borderWidth: 1,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 3,
    },
    versionBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    bodyScrollView: {
      flexGrow: 1,
      flexShrink: 1,
      width: "100%",
    },
    bodyScrollContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
    emptyMessage: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      paddingVertical: theme.spacing.lg,
      textAlign: "center",
    },
    block: {
      gap: theme.spacing.md,
    },
    blockTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    section: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    categoryTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.2,
    },
    itemList: {
      gap: 6,
      marginTop: 2,
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
      marginTop: 1,
    },
    itemText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    footer: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    continueButton: {
      width: "100%",
    },
  });
}

