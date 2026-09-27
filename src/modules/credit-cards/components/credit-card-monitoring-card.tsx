import { StyleSheet, Text, View } from "react-native";
import { CalendarClock, Layers3 } from "lucide-react-native";
import { CreditUtilizationRing } from "@/components/credit-utilization-ring";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { CreditCardMonitoringItem } from "../types/credit-card.types";

function formatDate(value: string | null) {
  if (!value) return "No payment due";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CreditCardMonitoringCard({
  card,
}: {
  card: CreditCardMonitoringItem;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{card.accountName}</Text>
          <Text style={styles.limit}>
            {formatCurrency(card.creditLimitMinorUnits, card.currencyCode)} limit
          </Text>
        </View>
        <CreditUtilizationRing percent={card.utilizationPercent} />
      </View>

      <View style={styles.metrics}>
        <Metric
          label="Billed"
          value={formatCurrency(card.billedMinorUnits, card.currencyCode)}
        />
        <Metric
          label="Unbilled"
          value={formatCurrency(card.unbilledMinorUnits, card.currencyCode)}
        />
        <Metric
          label="Outstanding"
          value={formatCurrency(card.outstandingMinorUnits, card.currencyCode)}
        />
      </View>

      <View style={styles.detailRow}>
        <CalendarClock color={theme.colors.textSecondary} size={17} />
        <View style={styles.detailText}>
          <Text style={styles.detailLabel}>Next due</Text>
          <Text style={styles.detailValue}>{formatDate(card.nextDueOn)}</Text>
        </View>
        <Text style={styles.dueAmount}>
          {formatCurrency(card.dueThisMonthMinorUnits, card.currencyCode)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Layers3 color={theme.colors.textSecondary} size={17} />
        <View style={styles.detailText}>
          <Text style={styles.detailLabel}>Active installments</Text>
          <Text style={styles.detailValue}>
            {card.activeInstallmentCount}
          </Text>
        </View>
        <Text style={styles.available}>
          {formatCurrency(card.availableCreditMinorUnits, card.currencyCode)} available
        </Text>
      </View>

      {card.billedItems.length > 0 ? (
        <ActivitySection
          currencyCode={card.currencyCode}
          items={card.billedItems}
          title="Billed items"
        />
      ) : null}

      {card.unbilledItems.length > 0 ? (
        <ActivitySection
          currencyCode={card.currencyCode}
          items={card.unbilledItems}
          title="Unbilled activity"
        />
      ) : null}

      {card.statements.slice(0, 3).map((statement) => (
        <View key={statement.id} style={styles.statementRow}>
          <View>
            <Text style={styles.statementTitle}>
              {statement.kind === "opening"
                ? "Opening billed balance"
                : `Statement · ${formatDate(statement.statementOn)}`}
            </Text>
            <Text style={styles.statementDue}>
              Due {formatDate(statement.dueOn)}
            </Text>
          </View>
          <Text style={styles.statementAmount}>
            {formatCurrency(
              statement.remainingAmountMinorUnits,
              card.currencyCode,
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActivitySection({
  currencyCode,
  items,
  title,
}: {
  currencyCode: string;
  items: CreditCardMonitoringItem["billedItems"];
  title: string;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.activitySection}>
      <Text style={styles.activityTitle}>{title}</Text>
      {items.slice(0, 4).map((item) => (
        <View key={item.id} style={styles.activityRow}>
          <View style={styles.activityText}>
            <Text numberOfLines={1} style={styles.activityDescription}>
              {item.description}
            </Text>
            <Text numberOfLines={1} style={styles.activityDetail}>
              {item.detail ?? item.occurredOn}
            </Text>
          </View>
          <Text style={styles.activityAmount}>
            {formatCurrency(item.amountMinorUnits, currencyCode)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    titleColumn: { flex: 1, marginRight: theme.spacing.md },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    limit: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
    },
    metrics: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginVertical: theme.spacing.lg,
    },
    metric: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      minWidth: 0,
      padding: theme.spacing.md,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
    },
    detailRow: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    detailText: { flex: 1 },
    detailLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    detailValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: 2,
    },
    dueAmount: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    available: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activitySection: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingVertical: theme.spacing.md,
    },
    activityTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    activityRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
    },
    activityText: { flex: 1, minWidth: 0 },
    activityDescription: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    activityDetail: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 1,
    },
    activityAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statementRow: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
    },
    statementTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statementDue: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    statementAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
