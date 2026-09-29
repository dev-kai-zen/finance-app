import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface CreditUtilizationRingProps {
  percent: number;
  size?: number;
}

export function CreditUtilizationRing({
  percent,
  size = 88,
}: CreditUtilizationRingProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const strokeWidth = size >= 80 ? 9 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const renderedPercent = Math.min(100, Math.max(0, percent));
  const color =
    percent >= 90
      ? theme.colors.danger
      : percent >= 70
        ? theme.colors.warning
        : theme.colors.success;

  return (
    <View
      accessibilityLabel={`${Math.round(percent)} percent of credit limit used`}
      style={{ height: size, width: size }}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          origin={`${size / 2}, ${size / 2}`}
          r={radius}
          rotation="-90"
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={
            circumference - (renderedPercent / 100) * circumference
          }
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        <Text
          maxFontSizeMultiplier={size >= 80 ? 1.35 : 1.1}
          style={[
            styles.percent,
            size < 80 && styles.percentCompact,
            { color },
          ]}
        >
          {Math.round(percent)}%
        </Text>
        {size >= 80 ? <Text style={styles.used}>used</Text> : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    center: {
      alignItems: "center",
      bottom: 0,
      justifyContent: "center",
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    percent: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    percentCompact: {
      fontSize: 9,
      lineHeight: 11,
    },
    used: {
      color: theme.colors.textMuted,
      fontSize: 10,
      marginTop: -2,
    },
  });
}
