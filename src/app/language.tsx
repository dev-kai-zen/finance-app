import { useState } from "react";
import { Stack } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { CircleHelp } from "lucide-react-native";
import { stackChevronBackOptions } from "@/components";
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
          ...stackChevronBackOptions(t("common.goBack")),
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
