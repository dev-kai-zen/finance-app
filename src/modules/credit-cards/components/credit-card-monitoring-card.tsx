import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowDownLeft,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Layers3,
  RotateCcw,
} from "lucide-react-native";
import { CreditUtilizationRing, HorizontalScrollView } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import { formatCurrency } from "@/utils/currency";
import type {
  CreditCardActivityItem,
  CreditCardMonitoringItem,
  CreditCardStatementSummary,
} from "../types/credit-card.types";
import {
  formatBillPillLabel,
  getStatementDisplayItems,
  getStatementPaymentStatus,
  type StatementDisplayItem,
} from "../utils/statement-activity";
import {
  CreditCardActivityModal,
  type CreditCardActivityModalItem,
  type CreditCardStatementSummaryCardProps,
} from "./credit-card-activity-modal";

const ACTIVITY_PREVIEW_COUNT = 4;

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
  const { preferences } = useCurrencyPreferences();
  const { isPrivate } = usePrivacyMode();

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(
    null,
  );
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string | null;
    items: CreditCardActivityModalItem[];
    statementSummary?: CreditCardStatementSummaryCardProps | null;
  } | null>(null);

  const activeStatement = useMemo(() => {
    if (card.statements.length === 0) return null;
    return (
      card.statements.find((s) => s.id === selectedStatementId) ??
      card.statements[0]
    );
  }, [card.statements, selectedStatementId]);

  const activeStatementItems = useMemo(() => {
    if (!activeStatement) return [];
    return getStatementDisplayItems(activeStatement);
  }, [activeStatement]);

  const todayOn = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const openStatementModal = (
    statement: CreditCardStatementSummary,
    items = getStatementDisplayItems(statement),
  ) => {
    setModalConfig({
      visible: true,
      title: formatBillPillLabel(statement),
      subtitle: statement.dueOn
        ? `Payment Due: ${formatDate(statement.dueOn)}`
        : null,
      items,
      statementSummary: {
        issuedAmountMinorUnits: statement.issuedAmountMinorUnits,
        remainingAmountMinorUnits: statement.remainingAmountMinorUnits,
        dueOn: statement.dueOn,
        statementOn: statement.statementOn,
        kind: statement.kind,
      },
    });
  };

  const openUnbilledModal = () => {
    setModalConfig({
      visible: true,
      title: "Unbilled Activity",
      subtitle: "Current billing cycle charges",
      items: card.unbilledItems.map((item) => ({
        id: item.id,
        description: item.description,
        amountMinorUnits: item.amountMinorUnits,
        occurredOn: item.occurredOn,
        detail: item.detail,
        isCredit: false,
      })),
      statementSummary: null,
    });
  };

  const previewStatementItems = activeStatementItems.slice(
    0,
    ACTIVITY_PREVIEW_COUNT,
  );
  const previewUnbilledItems = card.unbilledItems.slice(
    0,
    ACTIVITY_PREVIEW_COUNT,
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{card.accountName}</Text>
          <Text style={styles.limit}>
            {formatPrivacyAmount(
              formatCurrency(card.creditLimitMinorUnits, card.currencyCode),
              isPrivate,
            )}{" "}
            limit
          </Text>
        </View>
        <CreditUtilizationRing percent={card.utilizationPercent} />
      </View>

      <View style={styles.metrics}>
        <Metric
          isPrivate={isPrivate}
          label="Billed"
          value={formatCurrency(card.billedMinorUnits, card.currencyCode)}
        />
        <Metric
          isPrivate={isPrivate}
          label="Unbilled"
          value={formatCurrency(card.unbilledMinorUnits, card.currencyCode)}
        />
        <Metric
          isPrivate={isPrivate}
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
        <Text
          style={[
            styles.dueAmount,
            !preferences.colorAmounts && { color: theme.colors.textPrimary },
          ]}
        >
          {formatPrivacyAmount(
            formatCurrency(card.dueThisMonthMinorUnits, card.currencyCode),
            isPrivate,
          )}
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
        <Text
          style={[
            styles.available,
            !preferences.colorAmounts && { color: theme.colors.textSecondary },
          ]}
        >
          {formatPrivacyAmount(
            formatCurrency(card.availableCreditMinorUnits, card.currencyCode),
            isPrivate,
          )}{" "}
          available
        </Text>
      </View>

      {/* Billed Statements Filter & Items Section */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.activityTitle}>Billed statements</Text>
          {activeStatement && activeStatementItems.length > 0 ? (
            <Text style={styles.activityItemCount}>
              {activeStatementItems.length} item
              {activeStatementItems.length === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>

        {card.statements.length > 0 ? (
          <>
            {/* Horizontal statement filter pills */}
            <HorizontalScrollView
              contentContainerStyle={styles.statementPillsContent}
              style={styles.statementPillsScroll}
            >
              {card.statements.map((statement, index) => {
                const isSelected = statement.id === activeStatement?.id;
                const isLatest = index === 0;
                const status = getStatementPaymentStatus(statement, todayOn);
                const pillLabel = formatBillPillLabel(statement);

                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    key={statement.id}
                    onPress={() => setSelectedStatementId(statement.id)}
                    style={({ pressed }) => [
                      styles.statementPill,
                      isSelected && styles.statementPillActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.statementPillText,
                        isSelected && styles.statementPillTextActive,
                      ]}
                    >
                      {pillLabel}
                    </Text>
                    {isLatest ? (
                      <View
                        style={[
                          styles.pillTag,
                          isSelected
                            ? styles.pillTagActive
                            : styles.pillTagInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillTagText,
                            isSelected
                              ? styles.pillTagTextActive
                              : styles.pillTagTextInactive,
                          ]}
                        >
                          Latest
                        </Text>
                      </View>
                    ) : status === "paid" ? (
                      <View
                        style={[
                          styles.pillTag,
                          isSelected
                            ? styles.pillTagActive
                            : styles.pillTagPaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillTagText,
                            isSelected
                              ? styles.pillTagTextActive
                              : styles.pillTagPaidText,
                          ]}
                        >
                          Paid
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </HorizontalScrollView>

            {/* Selected statement summary card */}
            {activeStatement ? (
              <View style={styles.selectedStatementBox}>
                <View style={styles.selectedStatementTop}>
                  <View style={styles.selectedStatementTextColumn}>
                    <Text
                      numberOfLines={1}
                      style={styles.selectedStatementTitle}
                    >
                      {activeStatement.kind === "opening"
                        ? "Opening billed balance"
                        : `Cutoff: ${formatDate(activeStatement.statementOn)}`}
                    </Text>
                    <Text style={styles.selectedStatementDue}>
                      Due {formatDate(activeStatement.dueOn)}
                    </Text>
                  </View>
                  <View style={styles.selectedStatementAmountColumn}>
                    <Text style={styles.selectedStatementAmount}>
                      {formatPrivacyAmount(
                        formatCurrency(
                          activeStatement.remainingAmountMinorUnits > 0
                            ? activeStatement.remainingAmountMinorUnits
                            : activeStatement.issuedAmountMinorUnits,
                          card.currencyCode,
                        ),
                        isPrivate,
                      )}
                    </Text>
                    {activeStatement.remainingAmountMinorUnits <= 0 ? (
                      <View style={styles.statusBadgePaid}>
                        <Text style={styles.statusBadgePaidText}>Paid in full</Text>
                      </View>
                    ) : activeStatement.remainingAmountMinorUnits <
                      activeStatement.issuedAmountMinorUnits ? (
                      <View style={styles.statusBadgePartial}>
                        <Text style={styles.statusBadgePartialText}>
                          Partially paid
                        </Text>
                      </View>
                    ) : activeStatement.dueOn < todayOn ? (
                      <View style={styles.statusBadgeOverdue}>
                        <Text style={styles.statusBadgeOverdueText}>
                          Past due
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.statementUnpaidNote}>
                        Remaining balance
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Items preview for selected statement */}
            {previewStatementItems.map((item) => (
              <ActivityRow
                currencyCode={card.currencyCode}
                isPrivate={isPrivate}
                item={item}
                key={item.id}
              />
            ))}

            {activeStatementItems.length > ACTIVITY_PREVIEW_COUNT ? (
              <Pressable
                accessibilityLabel={`View all ${activeStatementItems.length} billed items`}
                accessibilityRole="button"
                onPress={() =>
                  activeStatement && openStatementModal(activeStatement)
                }
                style={({ pressed }) => [
                  styles.viewAllButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.viewAllButtonText}>
                  {`View all ${activeStatementItems.length} billed items`}
                </Text>
                <ChevronRight color={theme.colors.primary} size={16} />
              </Pressable>
            ) : activeStatementItems.length === 0 ? (
              <Text style={styles.emptyActivityText}>
                No billed items recorded in this statement.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyActivityText}>
            No billing statements generated yet. Recent card purchases will
            appear under Unbilled activity until your billing cutoff.
          </Text>
        )}
      </View>

      {/* Unbilled Activity Section */}
      {card.unbilledItems.length > 0 ? (
        <View style={styles.activitySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.activityTitle}>Unbilled activity</Text>
            <Text style={styles.activityItemCount}>
              {card.unbilledItems.length} item
              {card.unbilledItems.length === 1 ? "" : "s"}
            </Text>
          </View>

          {previewUnbilledItems.map((item) => (
            <ActivityRow
              currencyCode={card.currencyCode}
              isPrivate={isPrivate}
              item={item}
              key={item.id}
              showDateBelowAmount
            />
          ))}

          {card.unbilledItems.length > ACTIVITY_PREVIEW_COUNT ? (
            <Pressable
              accessibilityLabel={`View all ${card.unbilledItems.length} unbilled items`}
              accessibilityRole="button"
              onPress={openUnbilledModal}
              style={({ pressed }) => [
                styles.viewAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.viewAllButtonText}>
                {`View all ${card.unbilledItems.length} unbilled items`}
              </Text>
              <ChevronRight color={theme.colors.primary} size={16} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Statement History List */}
      {card.statements.length > 0 ? (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Statement history</Text>
          {card.statements.slice(0, 3).map((statement) => (
            <Pressable
              accessibilityRole="button"
              key={statement.id}
              onPress={() => {
                setSelectedStatementId(statement.id);
                openStatementModal(statement);
              }}
              style={({ pressed }) => [
                styles.statementRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.statementTextColumn}>
                <Text style={styles.statementTitle}>
                  {statement.kind === "opening"
                    ? "Opening billed balance"
                    : `Statement · ${formatDate(statement.statementOn)}`}
                </Text>
                <Text style={styles.statementDue}>
                  Due {formatDate(statement.dueOn)}
                </Text>
              </View>
              <View style={styles.statementAmountColumn}>
                <Text style={styles.statementAmount}>
                  {formatPrivacyAmount(
                    formatCurrency(
                      statement.remainingAmountMinorUnits,
                      card.currencyCode,
                    ),
                    isPrivate,
                  )}
                </Text>
                <ChevronRight color={theme.colors.textMuted} size={15} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Dedicated Activity Modal */}
      {modalConfig ? (
        <CreditCardActivityModal
          currencyCode={card.currencyCode}
          items={modalConfig.items}
          onClose={() => setModalConfig(null)}
          statementSummary={modalConfig.statementSummary}
          subtitle={modalConfig.subtitle}
          title={modalConfig.title}
          visible={modalConfig.visible}
        />
      ) : null}
    </View>
  );
}

function ActivityRow({
  currencyCode,
  isPrivate,
  item,
  showDateBelowAmount = false,
}: {
  currencyCode: string;
  isPrivate: boolean;
  item:
    | CreditCardActivityItem
    | StatementDisplayItem;
  showDateBelowAmount?: boolean;
}) {
  const styles = useThemeStyles(createStyles);
  const isCredit = "isCredit" in item ? Boolean(item.isCredit) : false;
  const formatted = formatCurrency(item.amountMinorUnits, currencyCode);
  const displayAmount = isCredit ? `- ${formatted}` : formatted;

  return (
    <View style={styles.activityRow}>
      <View style={styles.activityText}>
        <Text numberOfLines={1} style={styles.activityDescription}>
          {item.description}
        </Text>
        <Text numberOfLines={1} style={styles.activityDetail}>
          {showDateBelowAmount
            ? item.detail
            : (item.detail ?? formatDate(item.occurredOn))}
        </Text>
      </View>
      <View style={styles.activityAmountColumn}>
        <Text
          style={[
            styles.activityAmount,
            isCredit && styles.activityCreditAmount,
          ]}
        >
          {formatPrivacyAmount(displayAmount, isPrivate)}
        </Text>
        {showDateBelowAmount ? (
          <Text style={styles.activityDate}>
            {formatDate(item.occurredOn)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Metric({
  isPrivate,
  label,
  value,
}: {
  isPrivate: boolean;
  label: string;
  value: string;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text selectable style={styles.metricValue}>
        {formatPrivacyAmount(value, isPrivate)}
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
      gap: theme.spacing.xs,
      marginVertical: theme.spacing.lg,
    },
    metric: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
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
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    activityTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    activityItemCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    statementPillsScroll: {
      marginVertical: theme.spacing.xs,
    },
    statementPillsContent: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingVertical: 2,
    },
    statementPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statementPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    statementPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    statementPillTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pillTag: {
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    pillTagActive: {
      backgroundColor: "rgba(255, 255, 255, 0.22)",
    },
    pillTagInactive: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    pillTagPaid: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },
    pillTagText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pillTagTextActive: {
      color: theme.colors.onPrimary,
    },
    pillTagTextInactive: {
      color: theme.colors.textMuted,
    },
    pillTagPaidText: {
      color: theme.colors.success,
    },
    selectedStatementBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    selectedStatementTop: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    selectedStatementTextColumn: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    selectedStatementTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    selectedStatementDue: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    selectedStatementAmountColumn: {
      alignItems: "flex-end",
    },
    selectedStatementAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    statementUnpaidNote: {
      color: theme.colors.danger,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: 2,
    },
    statusBadgePaid: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      borderRadius: theme.borderRadius.small,
      marginTop: 2,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    statusBadgePaidText: {
      color: theme.colors.success,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    statusBadgePartial: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      borderRadius: theme.borderRadius.small,
      marginTop: 2,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    statusBadgePartialText: {
      color: theme.colors.warning,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    statusBadgeOverdue: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      borderRadius: theme.borderRadius.small,
      marginTop: 2,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    statusBadgeOverdueText: {
      color: theme.colors.danger,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
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
    activityAmountColumn: {
      alignItems: "flex-end",
      flexShrink: 0,
    },
    activityAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activityCreditAmount: {
      color: theme.colors.success,
    },
    activityDate: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 1,
    },
    viewAllButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    viewAllButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emptyActivityText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      paddingVertical: theme.spacing.sm,
    },
    historySection: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingTop: theme.spacing.md,
    },
    historyTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
    statementRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
    },
    statementTextColumn: {
      flex: 1,
      marginRight: theme.spacing.sm,
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
    statementAmountColumn: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    statementAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
