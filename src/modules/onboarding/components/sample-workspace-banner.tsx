import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlaskConical, MoveRight } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";

export function SampleWorkspaceBanner() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { state, requestPersonalSetup } = useWorkspace();

  if (state.status !== "completed" || state.mode !== "sample") return null;

  return (
    <View accessibilityRole="summary" style={styles.container}>
      <FlaskConical color={theme.colors.info} size={18} />
      <View style={styles.copy}>
        <Text style={styles.title}>Sample workspace</Text>
        <Text numberOfLines={1} style={styles.description}>
          Fictional data—changes here are temporary.
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Start setting up my own finances"
        accessibilityRole="button"
        onPress={requestPersonalSetup}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <Text style={styles.actionText}>Start my setup</Text>
        <MoveRight color={theme.colors.primary} size={16} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: `${theme.colors.info}12`,
      borderBottomColor: `${theme.colors.info}35`,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    action: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 36,
      paddingHorizontal: theme.spacing.sm,
    },
    actionPressed: {
      opacity: 0.65,
    },
    actionText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
