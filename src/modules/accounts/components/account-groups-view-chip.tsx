import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { AccountsGroupViewMode } from "@/modules/settings";

export interface AccountGroupsViewChipProps {
  viewMode: AccountsGroupViewMode;
  onToggle: (mode: AccountsGroupViewMode) => void;
}

export function AccountGroupsViewChip({
  viewMode,
  onToggle,
}: AccountGroupsViewChipProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <View style={styles.container}>
      <View style={styles.segmentedPill}>
        <Pressable
          accessibilityLabel={t("accounts.expandAll")}
          accessibilityRole="button"
          onPress={() => onToggle("expanded")}
          style={({ pressed }) => [
            styles.segment,
            viewMode === "expanded" && styles.segmentActive,
            pressed && styles.segmentPressed,
          ]}
        >
          <ChevronUp
            color={viewMode === "expanded" ? theme.colors.primary : theme.colors.textSecondary}
            size={13}
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "expanded" && styles.segmentTextActive,
            ]}
          >
            {t("accounts.expand")}
          </Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          accessibilityLabel={t("accounts.collapseAll")}
          accessibilityRole="button"
          onPress={() => onToggle("collapsed")}
          style={({ pressed }) => [
            styles.segment,
            viewMode === "collapsed" && styles.segmentActive,
            pressed && styles.segmentPressed,
          ]}
        >
          <ChevronDown
            color={viewMode === "collapsed" ? theme.colors.primary : theme.colors.textSecondary}
            size={13}
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "collapsed" && styles.segmentTextActive,
            ]}
          >
            {t("accounts.collapse")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: theme.spacing.sm,
      marginTop: -theme.spacing.xs,
    },
    segmentedPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      padding: 3,
    },
    segment: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 4,
    },
    segmentActive: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderWidth: 1,
      ...theme.shadows.card,
    },
    segmentPressed: {
      opacity: 0.7,
    },
    segmentText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
    segmentTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    separator: {
      backgroundColor: theme.colors.border,
      height: 12,
      marginHorizontal: 1,
      width: 1,
    },
  });
}

