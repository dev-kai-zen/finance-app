import { Switch, type SwitchProps } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

export type ThemedSwitchProps = SwitchProps;

export function ThemedSwitch(props: ThemedSwitchProps) {
  const theme = useAppTheme();

  return (
    <Switch
      ios_backgroundColor={theme.colors.border}
      thumbColor={theme.colors.textPrimary}
      trackColor={{
        false: theme.colors.borderStrong,
        true: theme.colors.primary,
      }}
      {...props}
    />
  );
}
