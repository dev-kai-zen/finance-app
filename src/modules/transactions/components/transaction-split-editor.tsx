import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Info, Plus, Trash2 } from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  IconHelper,
  InfoModal,
  ThemedSwitch,
} from "@/components";
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
  const [showInfoModal, setShowInfoModal] = useState(false);

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
          <View style={styles.titleRow}>
            <Text style={styles.title}>Split by category</Text>
            <Pressable
              accessibilityHint="Shows explanation of split transactions"
              accessibilityLabel="Split by category info"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowInfoModal(true)}
              style={styles.infoButton}
            >
              <Info color={theme.colors.textMuted} size={15} />
            </Pressable>
          </View>
        </View>
        <ThemedSwitch
          accessibilityLabel="Split by category"
          disabled={disabled}
          onValueChange={onEnabledChange}
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
                <View style={styles.selectorRow}>
                  <Pressable
                    accessibilityLabel={`Category for split ${index + 1}`}
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
                    <ChevronRight color={theme.colors.textMuted} size={16} />
                  </Pressable>

                  {lines.length > 2 ? (
                    <Pressable
                      accessibilityLabel={`Remove split ${index + 1}`}
                      hitSlop={8}
                      onPress={() => removeLine(line.key)}
                      style={styles.removeButton}
                    >
                      <Trash2 color={theme.colors.danger} size={18} />
                    </Pressable>
                  ) : null}
                </View>

                <AmountCalculatorField
                  amountMinorUnits={line.amountMinorUnits}
                  amountSign="+"
                  amountUnset={line.amountMinorUnits <= 0}
                  currencyCode={currencyCode}
                  disabled={disabled}
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

    <InfoModal
      message="Assign parts of this total to different categories."
      onClose={() => setShowInfoModal(false)}
      title="Split by Category"
      visible={showInfoModal}
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
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    infoButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
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
    selectorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    removeButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.xs,
    },
    selectorCard: {
      flex: 1,
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
