import { Check } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface ThemePresetCardProps {
  preset: AppTheme;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ThemePresetCard({
  preset,
  selected,
  onPress,
  style,
}: ThemePresetCardProps) {
  const activeTheme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`${preset.name}, ${preset.mode} theme. ${preset.description}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        style,
      ]}
    >
      <FinanceThemePreview preset={preset} />

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {preset.name}
            </Text>
            <Text style={styles.mode}>{preset.mode.toUpperCase()}</Text>
          </View>

          <View
            style={[
              styles.selection,
              selected && styles.selectionSelected,
            ]}
          >
            {selected ? (
              <Check color={activeTheme.colors.onPrimary} size={14} strokeWidth={3} />
            ) : null}
          </View>
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.swatches}
        >
          {[
            preset.colors.background,
            preset.colors.surface,
            preset.colors.primary,
            preset.colors.accent,
          ].map((color, index) => (
            <View
              key={`${preset.id}-${color}-${index}`}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor: preset.colors.borderStrong,
                },
              ]}
            />
          ))}
        </View>

        <Text numberOfLines={2} style={styles.description}>
          {preset.description}
        </Text>
      </View>
    </Pressable>
  );
}

export function ThemeSwatchPreview({ preset }: { preset: AppTheme }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        swatchPreviewStyles.container,
        {
          backgroundColor: preset.colors.background,
          borderColor: preset.colors.borderStrong,
        },
      ]}
    >
      <View
        style={[
          swatchPreviewStyles.surface,
          { backgroundColor: preset.colors.surface },
        ]}
      >
        <View
          style={[
            swatchPreviewStyles.primary,
            { backgroundColor: preset.colors.primary },
          ]}
        />
        <View
          style={[
            swatchPreviewStyles.accent,
            { backgroundColor: preset.colors.accent },
          ]}
        />
      </View>
    </View>
  );
}

function FinanceThemePreview({ preset }: { preset: AppTheme }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        previewStyles.frame,
        {
          backgroundColor: preset.colors.background,
          borderColor: preset.colors.borderStrong,
        },
      ]}
    >
      <View style={previewStyles.header}>
        <View
          style={[
            previewStyles.brandMark,
            { backgroundColor: preset.colors.primary },
          ]}
        />
        <View
          style={[
            previewStyles.headerLine,
            { backgroundColor: preset.colors.textMuted },
          ]}
        />
      </View>

      <View
        style={[
          previewStyles.balanceCard,
          {
            backgroundColor: preset.colors.surface,
            borderColor: preset.colors.border,
          },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1}
          style={[previewStyles.balanceLabel, { color: preset.colors.textMuted }]}
        >
          BALANCE
        </Text>
        <Text
          maxFontSizeMultiplier={1}
          style={[previewStyles.balance, { color: preset.colors.textPrimary }]}
        >
          PHP 48.6k
        </Text>
        <View style={previewStyles.chart}>
          {[8, 13, 18, 12, 22].map((height, index) => (
            <View
              key={`${preset.id}-bar-${index}`}
              style={[
                previewStyles.chartBar,
                {
                  backgroundColor:
                    index === 4 ? preset.colors.accent : preset.colors.primary,
                  height,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={previewStyles.transactionRow}>
        <View
          style={[
            previewStyles.transactionIcon,
            { backgroundColor: preset.colors.controlSecondary },
          ]}
        />
        <View style={previewStyles.transactionCopy}>
          <View
            style={[
              previewStyles.transactionLine,
              { backgroundColor: preset.colors.textSecondary },
            ]}
          />
          <View
            style={[
              previewStyles.transactionLineShort,
              { backgroundColor: preset.colors.textMuted },
            ]}
          />
        </View>
        <View
          style={[
            previewStyles.amountLine,
            { backgroundColor: preset.colors.danger },
          ]}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 142,
      padding: theme.spacing.md,
    },
    cardSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      boxShadow: `0 0 0 2px ${theme.colors.focusRing}33`,
    },
    cardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.99 }],
    },
    details: {
      flex: 1,
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    titleRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    titleCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
      minWidth: 0,
    },
    name: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    mode: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    selection: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    selectionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    swatches: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    swatch: {
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 18,
      width: 18,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
  });
}

const previewStyles = StyleSheet.create({
  frame: {
    borderCurve: "continuous",
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    height: 112,
    overflow: "hidden",
    padding: 8,
    width: 116,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  brandMark: {
    borderRadius: 3,
    height: 8,
    width: 8,
  },
  headerLine: {
    borderRadius: 2,
    height: 3,
    opacity: 0.65,
    width: 24,
  },
  balanceCard: {
    borderCurve: "continuous",
    borderRadius: 7,
    borderWidth: 1,
    height: 61,
    padding: 6,
    position: "relative",
  },
  balanceLabel: {
    fontSize: 6, // Deliberately miniature; this is a visual preview, not app copy.
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  balance: {
    fontSize: 12, // Deliberately miniature; this is a visual preview, not app copy.
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  chart: {
    alignItems: "flex-end",
    bottom: 5,
    flexDirection: "row",
    gap: 3,
    position: "absolute",
    right: 6,
  },
  chartBar: {
    borderRadius: 1,
    opacity: 0.9,
    width: 4,
  },
  transactionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  transactionIcon: {
    borderRadius: 3,
    height: 11,
    width: 11,
  },
  transactionCopy: {
    flex: 1,
    gap: 3,
  },
  transactionLine: {
    borderRadius: 2,
    height: 3,
    opacity: 0.7,
    width: 31,
  },
  transactionLineShort: {
    borderRadius: 2,
    height: 2,
    opacity: 0.5,
    width: 20,
  },
  amountLine: {
    borderRadius: 2,
    height: 3,
    opacity: 0.8,
    width: 16,
  },
});

const swatchPreviewStyles = StyleSheet.create({
  container: {
    borderCurve: "continuous",
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    padding: 5,
    width: 50,
  },
  surface: {
    alignItems: "flex-end",
    borderCurve: "continuous",
    borderRadius: 6,
    flex: 1,
    justifyContent: "flex-end",
    padding: 4,
  },
  primary: {
    borderRadius: 2,
    height: 7,
    width: 22,
  },
  accent: {
    borderRadius: 2,
    height: 4,
    marginTop: 3,
    width: 13,
  },
});
