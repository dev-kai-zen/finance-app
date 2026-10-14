import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

export interface StackChevronBackButtonProps {
  accessibilityLabel: string;
}

export function StackChevronBackButton({
  accessibilityLabel,
}: StackChevronBackButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.back()}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <ChevronLeft color={theme.colors.textPrimary} size={28} />
    </Pressable>
  );
}

export function stackChevronBackOptions(accessibilityLabel: string) {
  return {
    headerBackVisible: false,
    headerLeft: () => (
      <StackChevronBackButton accessibilityLabel={accessibilityLabel} />
    ),
  };
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.7,
  },
});
