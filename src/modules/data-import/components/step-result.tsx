import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { ExecuteImportResult, ImportType } from "../types/data-import.types";

interface StepResultProps {
  importType: ImportType;
  result: ExecuteImportResult;
  defaultCurrencyCode: string;
  onDone: () => void;
}

export function StepResult({
  importType,
  result,
  defaultCurrencyCode,
  onDone,
}: StepResultProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const { summary } = result;

  return (
    <View style={styles.container}>
      {/* Success banner */}
      <View style={styles.successCard}>
        <CheckCircle2 color={theme.colors.success} size={48} />
        <Text style={styles.successTitle}>Import completed!</Text>
        <Text style={styles.successSubtitle}>
          Successfully brought {result.importedCount} {result.importedCount === 1 ? "record" : "records"} into Kaizen.
        </Text>
      </View>

      {/* Metrics breakdown */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Import summary</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Imported records:</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{result.importedCount}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Left out rows:</Text>
          <Text style={styles.statValue}>{result.leftOutCount}</Text>
        </View>

        {importType === "transactions" ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total income:</Text>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                {formatCurrency(summary.totalIncomeMinorUnits, defaultCurrencyCode)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total spending:</Text>
              <Text style={[styles.statValue, { color: theme.colors.danger }]}>
                {formatCurrency(summary.totalExpenseMinorUnits, defaultCurrencyCode)}
              </Text>
            </View>

            {summary.earliestDate && summary.latestDate ? (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Date range:</Text>
                <Text style={styles.statValue}>
                  {summary.earliestDate.toLocaleDateString()} – {summary.latestDate.toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Safety backup restoration notice */}
      <View style={styles.safetyCard}>
        <ShieldAlert color={theme.colors.info} size={20} />
        <View style={styles.safetyCopy}>
          <Text style={styles.safetyTitle}>Safety backup created</Text>
          <Text style={styles.safetyText}>
            A safety backup was saved before importing. There is no way to undo part of an import. Restoring the safety backup replaces the whole workspace, including changes made after the backup.
          </Text>
        </View>
      </View>

      {/* Done button */}
      <Pressable accessibilityRole="button" onPress={onDone} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Done</Text>
        <ArrowRight color={theme.colors.primaryContrast} size={18} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    successCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      alignItems: "center",
      textAlign: "center",
      gap: theme.spacing.sm,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
    },
    successSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    detailsCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    safetyCard: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      backgroundColor: `${theme.colors.info}14`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: "flex-start",
    },
    safetyCopy: {
      flex: 1,
      gap: 2,
    },
    safetyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.info,
    },
    safetyText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    doneButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.sm,
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.primaryContrast,
    },
  });
}

