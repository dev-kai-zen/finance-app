import { Layers3 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export function FundGroupsChip({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`Fund Groups: ${count}. Tap to manage.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
    >
      <Layers3 color={theme.colors.textSecondary} size={14} />
      <Text style={styles.chipText}>Fund Groups</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    chip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 32,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    chipPressed: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
    badge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.textSecondary}20`,
      borderRadius: theme.borderRadius.round,
      justifyContent: "center",
      minWidth: 18,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    badgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
