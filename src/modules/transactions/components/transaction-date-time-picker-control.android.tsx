import { useCallback, useRef } from "react";
import { Host } from "@expo/ui";
import {
  DateTimePicker,
  type DatePickerElementColors,
  type TimePickerElementColors,
} from "@expo/ui/jetpack-compose";

import { useAppTheme } from "@/hooks/use-app-theme";
import type { TransactionDateTimePickerControlProps } from "./transaction-date-time-picker-control.types";

export function TransactionDateTimePickerControl({
  mode,
  onValueChange,
  style,
  value,
}: TransactionDateTimePickerControlProps) {
  const theme = useAppTheme();

  // Jetpack Compose DateTimePicker internally uses `remember(initialDate, props.is24Hour)`.
  // If `initialDate` updates on every tick while the user interacts with the time picker,
  // Compose invalidates and re-instantiates `TimePickerState`.
  // Because a newly instantiated `TimePickerState` defaults its selection mode to Hour,
  // any minute selection immediately causes the clock dial to snap back to the Hour dial.
  // We keep `initialDate` stable for updates emitted by the picker itself, only refreshing
  // it when an external `value` is passed in.
  const lastEmittedTimestampRef = useRef<number | null>(null);
  const lastEmittedHourRef = useRef<number | null>(null);
  const lastEmittedMinuteRef = useRef<number | null>(null);
  const initialDateIsoRef = useRef<string>(value.toISOString());
  const lastModeRef = useRef(mode);

  const isInternalUpdate =
    lastEmittedTimestampRef.current !== null &&
    (value.getTime() === lastEmittedTimestampRef.current ||
      (value.getHours() === lastEmittedHourRef.current &&
        value.getMinutes() === lastEmittedMinuteRef.current)) &&
    lastModeRef.current === mode;

  if (!isInternalUpdate) {
    initialDateIsoRef.current = value.toISOString();
    lastModeRef.current = mode;
  }

  const handleDateSelected = useCallback(
    (selectedDate: Date) => {
      lastEmittedTimestampRef.current = selectedDate.getTime();
      lastEmittedHourRef.current = selectedDate.getHours();
      lastEmittedMinuteRef.current = selectedDate.getMinutes();
      onValueChange(selectedDate);
    },
    [onValueChange],
  );

  const dateColors: DatePickerElementColors = {
    containerColor: theme.colors.surface,
    titleContentColor: theme.colors.textPrimary,
    headlineContentColor: theme.colors.textPrimary,
    weekdayContentColor: theme.colors.textSecondary,
    subheadContentColor: theme.colors.textPrimary,
    navigationContentColor: theme.colors.textSecondary,
    yearContentColor: theme.colors.textPrimary,
    disabledYearContentColor: theme.colors.textMuted,
    currentYearContentColor: theme.colors.primary,
    selectedYearContentColor: theme.colors.onPrimary,
    disabledSelectedYearContentColor: theme.colors.textMuted,
    selectedYearContainerColor: theme.colors.primary,
    disabledSelectedYearContainerColor: theme.colors.surfaceMuted,
    dayContentColor: theme.colors.textPrimary,
    disabledDayContentColor: theme.colors.textMuted,
    selectedDayContentColor: theme.colors.onPrimary,
    disabledSelectedDayContentColor: theme.colors.textMuted,
    selectedDayContainerColor: theme.colors.primary,
    disabledSelectedDayContainerColor: theme.colors.surfaceMuted,
    todayContentColor: theme.colors.primary,
    todayDateBorderColor: theme.colors.primary,
    dayInSelectionRangeContentColor: theme.colors.textPrimary,
    dayInSelectionRangeContainerColor: theme.colors.surfaceMuted,
    dividerColor: theme.colors.border,
  };

  const timeColors: TimePickerElementColors = {
    containerColor: theme.colors.surface,
    clockDialColor: theme.colors.surfaceMuted,
    clockDialSelectedContentColor: theme.colors.onPrimary,
    clockDialUnselectedContentColor: theme.colors.textPrimary,
    selectorColor: theme.colors.primary,
    periodSelectorBorderColor: theme.colors.borderStrong,
    periodSelectorSelectedContainerColor: theme.colors.primary,
    periodSelectorUnselectedContainerColor: theme.colors.surfaceMuted,
    periodSelectorSelectedContentColor: theme.colors.onPrimary,
    periodSelectorUnselectedContentColor: theme.colors.textPrimary,
    timeSelectorSelectedContainerColor: theme.colors.primary,
    timeSelectorUnselectedContainerColor: theme.colors.surfaceMuted,
    timeSelectorSelectedContentColor: theme.colors.onPrimary,
    timeSelectorUnselectedContentColor: theme.colors.textPrimary,
  };

  return (
    <Host
      colorScheme={theme.mode}
      matchContents={{ vertical: true }}
      seedColor={theme.colors.primary}
      style={style}
    >
      <DateTimePicker
        color={theme.colors.primary}
        displayedComponents={mode === "date" ? "date" : "hourAndMinute"}
        elementColors={mode === "date" ? dateColors : timeColors}
        initialDate={initialDateIsoRef.current}
        is24Hour={false}
        onDateSelected={handleDateSelected}
        showVariantToggle={false}
        variant={mode === "date" ? "picker" : "input"}
      />
    </Host>
  );
}
