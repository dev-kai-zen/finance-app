import { StyleSheet, Text, View } from "react-native";
import { CreditCard } from "lucide-react-native";
import {
  PageContainer,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { CreditCardMonitoringCard } from "../components/credit-card-monitoring-card";
import { useCreditCardMonitoring } from "../hooks/use-credit-card-monitoring";

export function CreditCardMonitoringScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const data = useCreditCardMonitoring();

  return (
    <PageContainer contentContainerStyle={styles.content}>
      {data.loading ? (
        <PageLoadingState message="Preparing credit-card billing..." />
      ) : data.error ? (
        <PageErrorState message={data.error} onRetry={data.refresh} />
      ) : data.cards.length === 0 ? (
        <PageEmptyState
          description="Create a Credit Card account to monitor billing cycles, installments, and utilization."
          icon={<CreditCard color={theme.colors.textMuted} size={32} />}
          title="No credit cards to monitor"
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View>
              <Text style={styles.summaryLabel}>DUE THIS MONTH</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(data.dueThisMonthMinorUnits, "PHP")}
              </Text>
            </View>
            {data.overdueMinorUnits > 0 ? (
              <View style={styles.overdue}>
                <Text style={styles.overdueLabel}>PAST DUE</Text>
                <Text style={styles.overdueAmount}>
                  {formatCurrency(data.overdueMinorUnits, "PHP")}
                </Text>
              </View>
            ) : null}
          </View>
          {data.cards.map((card) => (
            <CreditCardMonitoringCard card={card} key={card.accountId} />
          ))}
        </>
      )}
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: { paddingTop: theme.spacing.lg },
    summary: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.6,
    },
    summaryAmount: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
    },
    overdue: { alignItems: "flex-end" },
    overdueLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    overdueAmount: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
    },
  });
}
