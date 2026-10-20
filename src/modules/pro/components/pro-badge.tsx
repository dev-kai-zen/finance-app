import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface ProBadgeProps {
  size?: "sm" | "md";
}

export function ProBadge({ size = "sm" }: ProBadgeProps) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <View style={[styles.badge, size === "md" && styles.badgeMd]}>
      <Text style={[styles.badgeText, size === "md" && styles.badgeTextMd]}>
        {t("pro.badge")}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  // Use warning/amber token for golden Pro badge
  const proColor = theme.colors.warning;

  return StyleSheet.create({
    badge: {
      backgroundColor: proColor,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 5,
      paddingVertical: 1,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    badgeMd: {
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      color: "#000000",
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    badgeTextMd: {
      fontSize: 11,
      letterSpacing: 0.8,
    },
  });
}
