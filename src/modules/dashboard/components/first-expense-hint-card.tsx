import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useExperiencePreferences } from "@/modules/settings";

export function FirstExpenseHintCard({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { dismissPrompt } = useExperiencePreferences();

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{t("dashboard.firstExpenseHint")}</Text>
      <Pressable
        accessibilityLabel={t("dashboard.dismissHint")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          dismissPrompt("firstExpenseDismissed");
          onDismiss();
        }}
        style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.7 }]}
      >
        <X color={theme.colors.textMuted} size={18} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    text: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    dismiss: {
      alignItems: "center",
      height: 32,
      justifyContent: "center",
      width: 32,
    },
  });
}
