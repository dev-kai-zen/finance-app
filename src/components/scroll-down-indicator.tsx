import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface ScrollDownIndicatorProps {
  visible: boolean;
  onPress: () => void;
  bottomOffset?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  size?: number;
  iconSize?: number;
}

export function ScrollDownIndicator({
  visible,
  onPress,
  bottomOffset = 2,
  accessibilityLabel,
  style,
  buttonStyle,
  size = 30,
  iconSize = 16,
}: ScrollDownIndicatorProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        bottomOffset !== undefined ? { bottom: bottomOffset } : null,
        style,
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel ?? t("navigation.scrollDown")}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          size !== 30
            ? { width: size, height: size, borderRadius: size / 2 }
            : null,
          buttonStyle,
          pressed && styles.buttonPressed,
        ]}
      >
        <ChevronDown color={theme.colors.textSecondary} size={iconSize} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      bottom: 2,
      justifyContent: "center",
      left: 0,
      pointerEvents: "box-none",
      position: "absolute",
      right: 0,
      zIndex: 10,
    },
    button: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 15,
      borderWidth: 1,
      height: 30,
      justifyContent: "center",
      width: 30,
      ...theme.shadows.card,
    },
    buttonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      transform: [{ scale: 0.92 }],
    },
  });
}

