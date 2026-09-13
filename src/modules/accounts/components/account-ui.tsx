import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function AccountText({ children, muted = false, heading = false }: PropsWithChildren<{ muted?: boolean; heading?: boolean }>) {
  const s = useThemeStyles(accountStyles);
  return <Text accessibilityRole={heading ? "header" : undefined} style={[s.text, muted && s.muted, heading && s.heading]}>{children}</Text>;
}
export function AccountButton({ label, onPress, disabled, primary, danger, selected }: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean; selected?: boolean;
}) {
  const s = useThemeStyles(accountStyles);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.button, (primary || selected) && s.primary, disabled && s.disabled, pressed && s.pressed]}>
      <Text style={[s.buttonText, danger && s.danger, (primary || selected) && s.onPrimary]}>{label}</Text>
    </Pressable>
  );
}
export function AccountField({ label, ...props }: TextInputProps & { label: string }) {
  const s = useThemeStyles(accountStyles);
  return <View style={s.stack}>
    <AccountText>{label}</AccountText>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={s.muted.color}
      style={[s.input, props.editable === false && s.disabled, props.style]} />
  </View>;
}
export function AccountError({ message }: { message?: string | null }) {
  const s = useThemeStyles(accountStyles);
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.text, s.error]}>{message}</Text> : null;
}
export function accountStyles(theme: AppTheme) {
  return StyleSheet.create({
    stack: { gap: theme.spacing.sm },
    section: { gap: theme.spacing.lg, marginBottom: theme.spacing.xl },
    row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.sm },
    spread: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.md },
    grow: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
    card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
      borderRadius: theme.borderRadius.large, padding: theme.spacing.lg, gap: theme.spacing.md, ...theme.shadows.card },
    inset: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.medium, padding: theme.spacing.md, gap: theme.spacing.sm },
    text: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm, lineHeight: theme.typography.lineHeight.lg },
    muted: { color: theme.colors.textSecondary },
    heading: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold },
    amount: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, fontVariant: ["tabular-nums"] },
    button: { minHeight: 44, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.medium,
      alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
    buttonText: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold },
    primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    onPrimary: { color: theme.colors.onPrimary },
    danger: { color: theme.colors.danger },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
    input: { minHeight: 48, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.medium, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base },
    error: { padding: theme.spacing.md, borderColor: theme.colors.danger, borderWidth: 1,
      borderRadius: theme.borderRadius.medium, color: theme.colors.danger },
    badge: { minWidth: 40, minHeight: 40, borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  });
}
