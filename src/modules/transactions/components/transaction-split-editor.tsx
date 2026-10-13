import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { ChevronRight, Plus, Trash2 } from "lucide-react-native";
import { AmountCalculatorField, AmountCalculatorModal, IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Category } from "@/modules/categories";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { TransactionSplitEntryInput } from "../types/transaction.types";

export interface SplitLineState extends TransactionSplitEntryInput {
  key: string;
}

export interface TransactionSplitEditorProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  lines: SplitLineState[];
  onLinesChange: (lines: SplitLineState[]) => void;
  totalMinorUnits: number;
  currencyCode: string;
  categories: Category[];
  disabled?: boolean;
  onPickCategory: (lineKey: string) => void;
}

export function createEmptySplitLine(key: string): SplitLineState {
  return {
    key,
    categoryId: "",
    amountMinorUnits: 0,
    note: null,
  };
}

export function TransactionSplitEditor({
  enabled,
  onEnabledChange,
  lines,
  onLinesChange,
  totalMinorUnits,
  currencyCode,
  categories,
  disabled,
  onPickCategory,
}: TransactionSplitEditorProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();
  const [calculatorLineKey, setCalculatorLineKey] = useState<string | null>(null);

  const calculatorLine = calculatorLineKey
    ? lines.find((line) => line.key === calculatorLineKey)
    : undefined;

  const assignedTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.amountMinorUnits || 0), 0),
    [lines],
  );
  const remaining = totalMinorUnits - assignedTotal;

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const updateLine = (key: string, patch: Partial<SplitLineState>) => {
    onLinesChange(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (key: string) => {
    if (lines.length <= 2) return;
    onLinesChange(lines.filter((line) => line.key !== key));
  };

  const addLine = () => {
    onLinesChange([
      ...lines,
      createEmptySplitLine(`split-${Date.now()}-${lines.length}`),
    ]);
  };

  return (
    <>
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Split by category</Text>
          <Text style={styles.subtitle}>
            Assign parts of this total to different categories.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Split by category"
          disabled={disabled}
          onValueChange={onEnabledChange}
          trackColor={{
            false: theme.colors.borderStrong,
            true: theme.colors.primary,
          }}
          value={enabled}
        />
      </View>

      {enabled ? (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text
              style={[
                styles.summaryValue,
                remaining === 0
                  ? styles.summaryBalanced
                  : remaining < 0
                    ? styles.summaryOver
                    : styles.summaryPending,
              ]}
            >
              {formatCurrency(remaining, currencyCode, false)}
            </Text>
          </View>

          {lines.map((line, index) => {
            const category = line.categoryId
              ? categoryById.get(line.categoryId)
              : undefined;
            const categoryColor = resolveEntityColor(category?.hexColorsId ?? null);

            return (
              <View key={line.key} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <Text style={styles.lineLabel}>Line {index + 1}</Text>
                  {lines.length > 2 ? (
                    <Pressable
                      accessibilityLabel={`Remove split line ${index + 1}`}
                      hitSlop={8}
                      onPress={() => removeLine(line.key)}
                      style={styles.removeButton}
                    >
                      <Trash2 color={theme.colors.danger} size={16} />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  accessibilityLabel={`Category for split line ${index + 1}`}
                  onPress={() => onPickCategory(line.key)}
                  style={styles.selectorCard}
                >
                  <View style={styles.selectorLeft}>
                    <View
                      style={[
                        styles.selectorIconWrap,
                        {
                          backgroundColor: `${categoryColor}18`,
                          borderColor: `${categoryColor}35`,
                        },
                      ]}
                    >
                      <IconHelper
                        color={categoryColor}
                        name={category?.icon ?? "tag"}
                        size={16}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={
                        category
                          ? styles.selectorValueText
                          : styles.selectorPlaceholderText
                      }
                    >
                      {category?.name ?? "Select category"}
                    </Text>
                  </View>
                  <ChevronRight color={theme.colors.textSecondary} size={14} />
                </Pressable>

                <AmountCalculatorField
                  amountMinorUnits={line.amountMinorUnits}
                  amountSign="+"
                  amountUnset={line.amountMinorUnits <= 0}
                  currencyCode={currencyCode}
                  disabled={disabled}
                  label="Line amount"
                  onOpenCalculator={() => setCalculatorLineKey(line.key)}
                  showCurrencyPill={false}
                  showSignToggle={false}
                  unsetDisplayLabel="0.00"
                />
              </View>
            );
          })}

          <Pressable
            accessibilityLabel="Add split line"
            onPress={addLine}
            style={styles.addLineButton}
          >
            <Plus color={theme.colors.primary} size={16} />
            <Text style={styles.addLineText}>Add line</Text>
          </Pressable>
        </>
      ) : null}
    </View>

    <AmountCalculatorModal
      currencyCode={currencyCode}
      initialMinorUnits={calculatorLine?.amountMinorUnits ?? 0}
      onClose={() => setCalculatorLineKey(null)}
      onConfirm={(minorUnits) => {
        if (calculatorLineKey) {
          updateLine(calculatorLineKey, {
            amountMinorUnits: Math.abs(minorUnits),
          });
        }
        setCalculatorLineKey(null);
      }}
      title="Enter split line amount"
      visible={calculatorLineKey !== null}
    />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "700",
    },
    summaryBalanced: {
      color: theme.colors.success,
    },
    summaryPending: {
      color: theme.colors.warning,
    },
    summaryOver: {
      color: theme.colors.danger,
    },
    lineCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    lineHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    lineLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    removeButton: {
      padding: theme.spacing.xs,
    },
    selectorCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    selectorIconWrap: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    selectorValueText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
    },
    selectorPlaceholderText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: 14,
    },
    addLineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    addLineText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
