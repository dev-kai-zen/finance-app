import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { LabelBadgeItem } from "../types/label.types";

export interface LabelBadgeProps {
  label: LabelBadgeItem;
  size?: "sm" | "md";
  onPress?: () => void;
  onRemove?: () => void;
}

export function LabelBadge({
  label,
  size = "sm",
  onPress,
  onRemove,
}: LabelBadgeProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isSm = size === "sm";

  const color = label.color;
  const customBg = color ? `${color}20` : undefined;
  const customBorder = color ? `${color}50` : undefined;
  const customText = color ?? undefined;

  const content = (
    <View
      style={[
        styles.badge,
        isSm ? styles.badgeSm : styles.badgeMd,
        customBg ? { backgroundColor: customBg } : null,
        customBorder ? { borderColor: customBorder } : null,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSm ? styles.textSm : styles.textMd,
          customText ? { color: customText } : null,
        ]}
        numberOfLines={1}
      >
        #{label.name}
      </Text>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label.name}`}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.removeBtn}
        >
          <X
            size={isSm ? 10 : 12}
            color={customText ?? theme.colors.textMuted}
          />
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={4}>
        {content}
      </Pressable>
    );
  }

  return content;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    badge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "center",
    },
    badgeSm: {
      gap: 3,
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
    },
    badgeMd: {
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    text: {
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    textSm: {
      fontSize: 10,
      lineHeight: 13,
    },
    textMd: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
    },
    removeBtn: {
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 1,
    },
  });
}
