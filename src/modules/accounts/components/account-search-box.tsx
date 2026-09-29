import { Search, X } from "lucide-react-native";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export function AccountSearchBox({
  value,
  onChangeText,
  accessibilityLabel = "Search accounts",
  clearAccessibilityLabel = "Clear account search",
  placeholder = "Search accounts",
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel?: string;
  clearAccessibilityLabel?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      <Search color={theme.colors.textMuted} size={18} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeText("")}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
        >
          <X color={theme.colors.textSecondary} size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    input: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      minHeight: 46,
      paddingVertical: theme.spacing.sm,
    },
    clearButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    pressed: { opacity: 0.65 },
  });
}
