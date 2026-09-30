import DateTimePicker from "@expo/ui/community/datetime-picker";

import { useAppTheme } from "@/hooks/use-app-theme";
import type { TransactionDateTimePickerControlProps } from "./transaction-date-time-picker-control.types";

export function TransactionDateTimePickerControl({
  mode,
  onValueChange,
  style,
  value,
}: TransactionDateTimePickerControlProps) {
  const theme = useAppTheme();

  return (
    <DateTimePicker
      accentColor={theme.colors.primary}
      display={mode === "date" ? "inline" : "spinner"}
      mode={mode}
      onValueChange={(_, selectedValue) => onValueChange(selectedValue)}
      presentation="inline"
      style={style}
      themeVariant={theme.mode}
      value={value}
    />
  );
}
