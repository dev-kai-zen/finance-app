import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Sparkles } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { KaiKnowledgeModal } from "./kai-knowledge-modal";

export interface KaiKnowledgeSelectorRowProps {
  entityType: "category" | "account";
  entityId?: string | null;
  count: number;
  accentColor?: string;
  disabled?: boolean;
  onKeywordsUpdated?: () => void;
}

export function KaiKnowledgeSelectorRow({
  entityType,
  entityId,
  count,
  accentColor,
  disabled = false,
  onKeywordsUpdated,
}: KaiKnowledgeSelectorRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [modalVisible, setModalVisible] = useState(false);

  const isConfigured = Boolean(entityId);
  const color = accentColor || theme.colors.primary;

  const handlePress = () => {
    if (disabled) return;
    if (!isConfigured) {
      Alert.alert(
        t("chatWithKai.selectorTitle"),
        entityType === "category"
          ? t("chatWithKai.selectorSaveFirstCategory")
          : t("chatWithKai.selectorSaveFirstAccount"),
      );
      return;
    }
    setModalVisible(true);
  };

  const subtitle = isConfigured
    ? count === 1
      ? t("chatWithKai.selectorSubtitleSingle")
      : t("chatWithKai.selectorSubtitle", { count: String(count) })
    : entityType === "category"
      ? t("chatWithKai.selectorSaveFirstCategory")
      : t("chatWithKai.selectorSaveFirstAccount");

  return (
    <>
      <Pressable
        accessibilityHint="Opens Kai Knowledge keywords manager"
        accessibilityLabel={`${t("chatWithKai.selectorTitle")}, ${subtitle}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.container,
          pressed && isConfigured && styles.containerPressed,
          !isConfigured && styles.containerInactive,
        ]}
      >
        <View style={styles.leftRow}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isConfigured ? `${color}18` : theme.colors.surface,
                borderColor: isConfigured ? `${color}40` : theme.colors.border,
              },
            ]}
          >
            <Sparkles
              color={isConfigured ? color : theme.colors.textMuted}
              size={18}
            />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.title}>{t("chatWithKai.selectorTitle")}</Text>
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                !isConfigured && styles.subtitleDimmed,
              ]}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {isConfigured && (
          <ChevronRight color={theme.colors.textMuted} size={18} />
        )}
      </Pressable>

      {isConfigured && (
        <KaiKnowledgeModal
          initialSelectedId={entityId}
          initialTab={entityType === "category" ? "categories" : "accounts"}
          onClose={() => setModalVisible(false)}
          onKeywordsUpdated={onKeywordsUpdated}
          visible={modalVisible}
        />
      )}
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 6,
      marginBottom: 12,
    },
    containerPressed: {
      opacity: 0.8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    containerInactive: {
      opacity: 0.75,
    },
    leftRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    textColumn: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    subtitleDimmed: {
      color: theme.colors.textMuted,
    },
  });
