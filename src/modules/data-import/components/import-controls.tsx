import { useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { AppButton, type AppButtonProps } from "@/components/app-button";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import { KeyboardAwareForm } from "@/components/keyboard-aware-form";
import { DatePickerModal } from "@/components/date-picker-modal";
import { HelpIconButton } from "@/components/screen-title-with-help";
import { parseImportDate } from "../utils/csv";
import { formatImportDate } from "../utils/import-review";
import type { ImportOptions, ImportTransactionType } from "../types/import.types";

// Solid chip colors maintain readable white text in both light and dark themes.
const CHIP_COLORS = { required: "#B91C1C", optional: "#C2410C", ready: "#15803D", attention: "#B45309", excluded: "#475569" };
export function ImportChip({ label, tone }: { label: string; tone: keyof typeof CHIP_COLORS }) {
  const theme = useAppTheme();
  return <View style={{ alignSelf: "flex-start", borderRadius: theme.borderRadius.round, backgroundColor: CHIP_COLORS[tone], paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
    <Text style={{ color: "#FFFFFF", fontSize: theme.typography.fontSize.xs, fontWeight: "700" }}>{label}</Text>
  </View>;
}
export function ImportFieldButton({ label, value, onPress, disabled, hideLabel = false, tone }: {
  label: string; value: string; onPress: () => void; disabled?: boolean; hideLabel?: boolean; tone?: "ready" | "optional";
}) {
  const theme = useAppTheme();
  return <View style={{ gap: theme.spacing.xs }}>
    {!hideLabel && <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm, fontWeight: "600" }}>{label}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{ disabled: !!disabled }} disabled={disabled}
      onPress={() => { Keyboard.dismiss(); onPress(); }}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.md,
        borderWidth: 1, borderColor: tone ? CHIP_COLORS[tone] : disabled ? theme.colors.border : theme.colors.borderStrong, borderRadius: theme.borderRadius.medium,
        backgroundColor: tone ? CHIP_COLORS[tone] : theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}>
      <Text style={{ flex: 1, color: tone ? "#FFFFFF" : theme.colors.textPrimary, fontSize: theme.typography.fontSize.base }}>{value}</Text>
      <ChevronDown color={tone ? "#FFFFFF" : theme.colors.textPrimary} size={18} />
    </Pressable>
  </View>;
}
export function ImportSelect({ label, value, items, onChange, disabled, hideLabel, tone }: {
  label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean; hideLabel?: boolean; tone?: "ready" | "optional";
}) {
  const theme = useAppTheme(), { t } = useLocalization();
  const [visible, setVisible] = useState(false), [query, setQuery] = useState("");
  const filtered = items.filter((item) => item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <ImportFieldButton label={label} value={items.find((item) => item.value === value)?.label ?? t("dataImport.choose")} disabled={disabled} hideLabel={hideLabel} tone={tone} onPress={() => { setQuery(""); setVisible(true); }} />
    <FullScreenFormModal visible={visible && !disabled} title={label} onClose={() => setVisible(false)}>
      <KeyboardAwareForm contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        {items.length > 8 && <ImportInput label={t("dataImport.ui.searchOptions")} value={query} onChange={setQuery} />}
        {!filtered.length && <Text style={{ color: theme.colors.textSecondary }}>{t("dataImport.ui.noResults")}</Text>}
        {filtered.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: value === item.value }}
          onPress={() => { onChange(item.value); setVisible(false); }}
          style={{ minHeight: 48, padding: theme.spacing.lg, flexDirection: "row", gap: theme.spacing.md, alignItems: "center", borderBottomWidth: 1, borderColor: theme.colors.border, backgroundColor: value === item.value ? theme.colors.surfaceMuted : theme.colors.surface }}>
          <Text style={{ flex: 1, color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.base }}>{item.label}</Text>
          {value === item.value && <Check size={20} color={theme.colors.primary} />}
        </Pressable>)}
      </KeyboardAwareForm>
    </FullScreenFormModal>
  </>;
}
export function ImportInput({ label, value, onChange, disabled, placeholder, onHelp }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; placeholder?: string; onHelp?: () => void;
}) {
  const theme = useAppTheme();
  return <View style={{ gap: theme.spacing.xs }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm, fontWeight: "600", flexShrink: 1 }}>{label}</Text>
      {onHelp && <HelpIconButton accessibilityLabel={label} onPress={() => { Keyboard.dismiss(); onHelp(); }} />}
    </View>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted} autoCorrect={false}
      style={{ minHeight: 48, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.borderRadius.medium, color: theme.colors.textPrimary, padding: theme.spacing.md, backgroundColor: theme.colors.surface }} />
  </View>;
}
export function ImportDateField({ label, value, onChange, disabled, format = "ymd" }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; format?: ImportOptions["dateFormat"];
}) {
  const { t, activeLanguage } = useLocalization();
  const [visible, setVisible] = useState(false);
  let selected: string | undefined, display = value || t("dataImport.choose");
  try {
    const date = parseImportDate(value, format);
    selected = formatImportDate(date, "ymd");
    display = date.toLocaleDateString(activeLanguage.code, { month: "long", day: "numeric", year: "numeric" });
  } catch { /* Keep an invalid source value visible until a date is selected. */ }
  return <>
    <ImportFieldButton label={label} value={display} disabled={disabled} onPress={() => setVisible(true)} />
    <DatePickerModal visible={visible} title={label} selectedDate={selected} onClose={() => setVisible(false)} onSelectDate={(iso) => {
      const date = parseImportDate(iso, "ymd"), clock = /[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(value)?.[1];
      onChange(`${formatImportDate(date, format)}${clock ? ` ${clock}` : ""}`); setVisible(false);
    }} />
  </>;
}
export function ImportTypePicker({ value, onChange, disabled }: { value: string; onChange: (type: ImportTransactionType) => void; disabled?: boolean }) {
  const theme = useAppTheme(), { t } = useLocalization();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
    {(["expense", "income", "transfer"] as const).map((type) => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: value === type, disabled: !!disabled }} disabled={disabled}
      onPress={() => onChange(type)} style={{ flexGrow: 1, minHeight: 48, justifyContent: "center", alignItems: "center", padding: theme.spacing.md,
        borderWidth: 1, borderColor: value === type ? theme.colors.primary : theme.colors.borderStrong, borderRadius: theme.borderRadius.medium,
        backgroundColor: value === type ? theme.colors.primary : theme.colors.surface, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontWeight: "600", color: value === type ? theme.colors.onPrimary : theme.colors.textPrimary }}>{t(`dataImport.types.${type}`)}</Text>
    </Pressable>)}
  </View>;
}
export function ImportAction({ variant = "primary", style, textStyle, ...props }: AppButtonProps) {
  const theme = useAppTheme(), outlined = variant === "secondary" || variant === "ghost";
  return <AppButton {...props} variant={outlined ? "secondary" : variant}
    style={[outlined && { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderWidth: 1 }, style]}
    textStyle={[outlined && { color: theme.colors.textPrimary, fontWeight: "600" }, textStyle]} />;
}
export function ImportChoice({ title, description, selected, disabled, onPress }: {
  title: string; description?: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{ checked: selected, disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ padding: theme.spacing.lg, gap: theme.spacing.sm, minHeight: 48, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
      borderRadius: theme.borderRadius.large, backgroundColor: theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}>
    <Text style={{ color: theme.colors.textPrimary, fontWeight: "600", fontSize: theme.typography.fontSize.base }}>{selected ? "\u25cf " : "\u25cb "}{title}</Text>
    {!!description && <Text style={{ color: theme.colors.textSecondary }}>{description}</Text>}
  </Pressable>;
}
