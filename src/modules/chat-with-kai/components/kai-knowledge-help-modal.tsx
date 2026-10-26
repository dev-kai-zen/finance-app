import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Globe, HelpCircle, Sparkles, Tag, Wallet, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface KaiKnowledgeHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function KaiKnowledgeHelpModal({
  visible,
  onClose,
}: KaiKnowledgeHelpModalProps) {
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
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBadge}>
                <HelpCircle color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.headerTitleBox}>
                <Text style={styles.headerTitle}>
                  {t("chatWithKai.helpModalTitle")}
                </Text>
                <Text numberOfLines={1} style={styles.headerSubtitle}>
                  {t("chatWithKai.helpModalSubtitle")}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={t("chatWithKai.cancel")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textMuted} size={20} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Actions */}
            <View style={styles.infoSection}>
              <View
                style={[
                  styles.sectionIconWrap,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <Sparkles color={theme.colors.primary} size={18} />
              </View>
              <View style={styles.sectionTextWrap}>
                <Text style={styles.sectionTitle}>
                  {t("chatWithKai.helpActionsTitle")}
                </Text>
                <Text style={styles.sectionDesc}>
                  {t("chatWithKai.helpActionsDesc")}
                </Text>
              </View>
            </View>

            {/* Section 2: Categories */}
            <View style={styles.infoSection}>
              <View
                style={[
                  styles.sectionIconWrap,
                  { backgroundColor: "#10B98118" },
                ]}
              >
                <Tag color="#10B981" size={18} />
              </View>
              <View style={styles.sectionTextWrap}>
                <Text style={styles.sectionTitle}>
                  {t("chatWithKai.helpCategoriesTitle")}
                </Text>
                <Text style={styles.sectionDesc}>
                  {t("chatWithKai.helpCategoriesDesc")}
                </Text>
              </View>
            </View>

            {/* Section 3: Accounts */}
            <View style={styles.infoSection}>
              <View
                style={[
                  styles.sectionIconWrap,
                  { backgroundColor: "#3B82F618" },
                ]}
              >
                <Wallet color="#3B82F6" size={18} />
              </View>
              <View style={styles.sectionTextWrap}>
                <Text style={styles.sectionTitle}>
                  {t("chatWithKai.helpAccountsTitle")}
                </Text>
                <Text style={styles.sectionDesc}>
                  {t("chatWithKai.helpAccountsDesc")}
                </Text>
              </View>
            </View>

            {/* Section 4: Languages */}
            <View style={styles.infoSection}>
              <View
                style={[
                  styles.sectionIconWrap,
                  { backgroundColor: "#F59E0B18" },
                ]}
              >
                <Globe color="#F59E0B" size={18} />
              </View>
              <View style={styles.sectionTextWrap}>
                <Text style={styles.sectionTitle}>
                  {t("chatWithKai.helpLanguagesTitle")}
                </Text>
                <Text style={styles.sectionDesc}>
                  {t("chatWithKai.helpLanguagesDesc")}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel={t("chatWithKai.helpClose")}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.gotItBtn}
            >
              <Text style={styles.gotItBtnText}>
                {t("chatWithKai.helpClose")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 440,
      maxHeight: "82%",
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    headerIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}18`,
      marginRight: 10,
    },
    headerTitleBox: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
    },
    bodyContent: {
      padding: 16,
      gap: 14,
    },
    infoSection: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    sectionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    sectionTextWrap: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 3,
    },
    sectionDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    gotItBtn: {
      width: "100%",
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    gotItBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
  });
