import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Clock } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { TransactionDateTimePickerModal } from "@/modules/transactions";
import {
  BACKUP_SCHEDULE_WEEKDAY_LABELS,
  formatBackupScheduleTimeDisplay,
  type BackupScheduleFields,
  type BackupScheduleFrequency,
} from "@/utils/backup-schedule";

interface BackupScheduleOptionsProps {
  disabled?: boolean;
  onChange: (schedule: BackupScheduleFields) => void;
  schedule: BackupScheduleFields;
}

export function BackupScheduleOptions({
  disabled = false,
  onChange,
  schedule,
}: BackupScheduleOptionsProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const timePickerValue = useMemo(() => {
    const date = new Date();
    const [hourPart, minutePart] = schedule.timeOfDay.split(":");
    date.setHours(
      Number.parseInt(hourPart ?? "2", 10),
      Number.parseInt(minutePart ?? "0", 10),
      0,
      0,
    );
    return date;
  }, [schedule.timeOfDay]);

  const setFrequency = (frequency: BackupScheduleFrequency) => {
    if (frequency === schedule.frequency) return;
    onChange({ ...schedule, frequency });
  };

  const adjustDayOfMonth = (delta: number) => {
    const next = Math.min(28, Math.max(1, schedule.dayOfMonth + delta));
    if (next === schedule.dayOfMonth) return;
    onChange({ ...schedule, dayOfMonth: next });
  };

  return (
    <>
      <View style={styles.frequencyRow}>
        <Text style={styles.frequencyLabel}>Frequency</Text>
        <View style={styles.frequencyOptions}>
          {(["daily", "weekly", "monthly"] as const).map((frequency) => {
            const selected = schedule.frequency === frequency;
            return (
              <Pressable
                key={frequency}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={disabled}
                onPress={() => setFrequency(frequency)}
                style={({ pressed }) => [
                  styles.frequencyOption,
                  selected && styles.frequencyOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.frequencyOptionText,
                    selected && styles.frequencyOptionTextSelected,
                  ]}
                >
                  {frequency === "daily"
                    ? "Daily"
                    : frequency === "weekly"
                      ? "Weekly"
                      : "Monthly"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityLabel={`Backup time: ${formatBackupScheduleTimeDisplay(schedule.timeOfDay)}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setTimePickerVisible(true)}
        style={({ pressed }) => [
          styles.selectableRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.rowIconMuted}>
          <Clock color={theme.colors.textSecondary} size={18} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>Time</Text>
          <Text style={styles.rowDescription}>
            Runs after this time when you open the app
          </Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>
            {formatBackupScheduleTimeDisplay(schedule.timeOfDay)}
          </Text>
          <ChevronRight color={theme.colors.textMuted} size={18} />
        </View>
      </Pressable>

      {schedule.frequency === "weekly" ? (
        <>
          <View style={styles.divider} />
          <View style={styles.weekdaySection}>
            <Text style={styles.frequencyLabel}>Day of week</Text>
            <View style={styles.weekdayOptions}>
              {BACKUP_SCHEDULE_WEEKDAY_LABELS.map((label, weekday) => {
                const selected = schedule.weekday === weekday;
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={disabled}
                    onPress={() => onChange({ ...schedule, weekday })}
                    style={({ pressed }) => [
                      styles.weekdayOption,
                      selected && styles.weekdayOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayOptionText,
                        selected && styles.weekdayOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      ) : null}

      {schedule.frequency === "monthly" ? (
        <>
          <View style={styles.divider} />
          <View style={styles.dayOfMonthRow}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Day of month</Text>
              <Text style={styles.rowDescription}>Uses day 1–28 each month</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel="Earlier day of month"
                accessibilityRole="button"
                disabled={disabled || schedule.dayOfMonth <= 1}
                onPress={() => adjustDayOfMonth(-1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{schedule.dayOfMonth}</Text>
              <Pressable
                accessibilityLabel="Later day of month"
                accessibilityRole="button"
                disabled={disabled || schedule.dayOfMonth >= 28}
                onPress={() => adjustDayOfMonth(1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      <TransactionDateTimePickerModal
        mode="time"
        onClose={() => setTimePickerVisible(false)}
        onConfirm={(date) => {
          const h = date.getHours().toString().padStart(2, "0");
          const m = date.getMinutes().toString().padStart(2, "0");
          onChange({ ...schedule, timeOfDay: `${h}:${m}` });
          setTimePickerVisible(false);
        }}
        title="Backup time"
        value={timePickerValue}
        visible={timePickerVisible}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    divider: { backgroundColor: theme.colors.border, height: 1 },
    frequencyRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      padding: theme.spacing.lg,
    },
    frequencyLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    frequencyOptions: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      flexShrink: 1,
      flexWrap: "wrap",
      justifyContent: "flex-end",
      padding: theme.spacing.xxs,
    },
    frequencyOption: {
      borderRadius: theme.borderRadius.small,
      minWidth: 64,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    frequencyOptionSelected: { backgroundColor: theme.colors.primary },
    frequencyOptionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    frequencyOptionTextSelected: { color: theme.colors.onPrimary },
    selectableRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 72,
      padding: theme.spacing.lg,
    },
    rowIconMuted: {
      alignItems: "center",
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    rowCopy: { flex: 1, gap: theme.spacing.xxs },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    rowDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    timeBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xxs,
    },
    timeBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    weekdaySection: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    weekdayOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    weekdayOption: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      minWidth: 44,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    weekdayOptionSelected: { backgroundColor: theme.colors.primary },
    weekdayOptionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    weekdayOptionTextSelected: { color: theme.colors.onPrimary },
    dayOfMonthRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    stepper: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    stepperButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    stepperButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    stepperValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      minWidth: 28,
      textAlign: "center",
    },
    pressed: { opacity: 0.78 },
  });
}
