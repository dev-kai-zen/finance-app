import { Switch, type SwitchProps } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

export type ThemedSwitchProps = SwitchProps;

export function ThemedSwitch({
  disabled,
  trackColor,
  thumbColor,
  ...rest
}: ThemedSwitchProps) {
  const theme = useAppTheme();

  const resolvedTrackColor = trackColor ?? {
    false: theme.colors.borderStrong,
    true: disabled ? theme.colors.borderStrong : theme.colors.primary,
  };

  const resolvedThumbColor =
    thumbColor ??
    (disabled
      ? theme.mode === "dark"
        ? theme.colors.textMuted
        : theme.colors.surfaceElevated
      : theme.colors.textPrimary);

  return (
    <Switch
      disabled={disabled}
      ios_backgroundColor={theme.colors.border}
      thumbColor={resolvedThumbColor}
      trackColor={resolvedTrackColor}
      {...rest}
    />
  );
}
