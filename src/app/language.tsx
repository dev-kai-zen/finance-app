import { useState } from "react";
import { Stack, router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft, CircleHelp } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { LanguageScreen } from "@/modules/localization";

export default function LanguageRoute() {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityLabel={t("language.backAccessibility")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft color={theme.colors.textPrimary} size={28} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityLabel={t("language.helpTitle")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setHelpVisible(true)}
              style={({ pressed }) => [
                styles.helpButton,
                { backgroundColor: theme.colors.surfaceMuted },
                pressed && styles.pressed,
              ]}
            >
              <CircleHelp color={theme.colors.textPrimary} size={25} />
            </Pressable>
          ),
          title: t("navigation.language"),
        }}
      />
      <LanguageScreen
        helpVisible={helpVisible}
        onCloseHelp={() => setHelpVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  helpButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.7,
  },
});
