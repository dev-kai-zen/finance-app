import { Pressable, StyleSheet, Text, View } from "react-native";
import { AVAILABLE_LEAD_DAYS } from "../constants/reminder-settings.constants";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";

interface ReminderLeadDaysSelectorProps {
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  disabled?: boolean;
}

export function ReminderLeadDaysSelector({
  selectedDays,
  onToggleDay,
  disabled = false,
}: ReminderLeadDaysSelectorProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();

  const getDayLabel = (day: number): string => {
    if (day === 0) return "Exact day";
    if (day === 1) return "1 day before";
    return `${day} days before`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Notify me</Text>
      <View style={styles.chipsContainer}>
        {AVAILABLE_LEAD_DAYS.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityLabel={`Notify ${getDayLabel(day)}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              onPress={() => onToggleDay(day)}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.chipPressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {getDayLabel(day)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginTop: 12,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipDisabled: {
      opacity: 0.5,
    },
    chipPressed: {
      opacity: 0.8,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    chipTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: "600",
    },
    chipTextDisabled: {
      color: theme.colors.textMuted,
    },
  });
}
