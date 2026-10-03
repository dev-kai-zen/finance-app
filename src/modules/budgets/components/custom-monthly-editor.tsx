import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, Copy } from "lucide-react-native";
import { AmountCalculatorModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { MonthlyTargetInput } from "../types/budget.types";

export interface CustomMonthlyEditorProps {
  year: number;
  baseAmountCents: number;
  monthlyTargets: MonthlyTargetInput[];
  onChange: (targets: MonthlyTargetInput[]) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const CustomMonthlyEditor = memo(function CustomMonthlyEditor({
  year,
  baseAmountCents,
  monthlyTargets,
  onChange,
}: CustomMonthlyEditorProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [activeEditingMonth, setActiveEditingMonth] = useState<number | null>(
    null,
  );

  const getMonthAmount = (month: number): number => {
    const existing = monthlyTargets.find(
      (t) => t.year === year && t.month === month,
    );
    return existing ? existing.amountCents : baseAmountCents;
  };

  const handleSetMonthAmount = (month: number, amountCents: number) => {
    const updated = [...monthlyTargets];
    const index = updated.findIndex((t) => t.year === year && t.month === month);
    if (index >= 0) {
      updated[index] = { year, month, amountCents };
    } else {
      updated.push({ year, month, amountCents });
    }
    onChange(updated);
  };

  const handleApplyBaseToAll = () => {
    const all12: MonthlyTargetInput[] = [];
    for (let m = 1; m <= 12; m++) {
      all12.push({ year, month: m, amountCents: baseAmountCents });
    }
    onChange(all12);
  };

  let yearTotalCents = 0;
  for (let m = 1; m <= 12; m++) {
    yearTotalCents += getMonthAmount(m);
  }

  const currentEditingAmount =
    activeEditingMonth !== null ? getMonthAmount(activeEditingMonth) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar color={theme.colors.primary} size={18} />
          <Text style={styles.title}>{year} Monthly Targets</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleApplyBaseToAll}
          style={styles.applyAllButton}
        >
          <Copy color={theme.colors.primary} size={14} />
          <Text style={styles.applyAllText}>Apply default to all</Text>
        </Pressable>
      </View>

      <Text style={styles.subtext}>
        Customize budget targets for specific months (e.g. higher in December or
        summer). Tap a month to edit its amount.
      </Text>

      {/* 12 Months Grid */}
      <View style={styles.grid}>
        {MONTH_NAMES.map((name, idx) => {
          const monthNumber = idx + 1;
          const amount = getMonthAmount(monthNumber);
          const isCustomized = monthlyTargets.some(
            (t) => t.year === year && t.month === monthNumber,
          );

          return (
            <Pressable
              key={name}
              accessibilityLabel={`Edit budget for ${name}`}
              accessibilityRole="button"
              onPress={() => setActiveEditingMonth(monthNumber)}
              style={({ pressed }) => [
                styles.monthCard,
                isCustomized && styles.monthCardCustomized,
                pressed && styles.monthCardPressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.monthName}>
                {name.slice(0, 3)}
              </Text>
              <Text numberOfLines={1} style={styles.monthAmount}>
                {formatCurrency(amount, "PHP", false)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Year Total Banner */}
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Annual Total:</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(yearTotalCents, "PHP", false)}
        </Text>
      </View>

      {/* Modal for editing specific month */}
      {activeEditingMonth !== null && (
        <AmountCalculatorModal
          initialMinorUnits={currentEditingAmount}
          onClose={() => setActiveEditingMonth(null)}
          onConfirm={(val) => {
            handleSetMonthAmount(activeEditingMonth, val);
            setActiveEditingMonth(null);
          }}
          title={`${MONTH_NAMES[activeEditingMonth - 1]} ${year} Budget`}
          visible={activeEditingMonth !== null}
        />
      )}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    applyAllButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    applyAllText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "600",
    },
    subtext: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginBottom: theme.spacing.md,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      justifyContent: "space-between",
    },
    monthCard: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      width: "31%",
    },
    monthCardCustomized: {
      borderColor: theme.colors.primary,
    },
    monthCardPressed: {
      opacity: 0.8,
    },
    monthName: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },
    monthAmount: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    totalBanner: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.md,
      padding: theme.spacing.sm,
    },
    totalLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    totalValue: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
