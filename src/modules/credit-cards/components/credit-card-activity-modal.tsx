import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowDownLeft,
  CreditCard,
  Layers3,
  RotateCcw,
  Search,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import { localizeCreditCardActivityDescription } from "../utils/localize-credit-card-activity";
import { getStatementPaymentPresentation } from "../utils/statement-activity";

export interface CreditCardActivityModalItem {
  id: string;
  description: string;
  amountMinorUnits: number;
  occurredOn: string;
  detail?: string | null;
  isCredit?: boolean;
  entryType?: string;
}

export interface CreditCardStatementSummaryCardProps {
  issuedAmountMinorUnits: number;
  remainingAmountMinorUnits: number;
  dueOn: string | null;
  statementOn?: string | null;
  kind?: string | null;
}

export interface CreditCardActivityModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  currencyCode: string;
  items: CreditCardActivityModalItem[];
  statementSummary?: CreditCardStatementSummaryCardProps | null;
  evaluatedCalendarDate: string;
}

function formatLocalizedDate(value: string | null, noDateLabel: string): string {
  if (!value) {
    return noDateLabel;
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CreditCardActivityModal(props: CreditCardActivityModalProps) {
  if (!props.visible) {
    return null;
  }
  return <CreditCardActivityModalContent {...props} />;
}

function CreditCardActivityModalContent({
  visible,
  onClose,
  title,
  subtitle,
  currencyCode,
  items,
  statementSummary,
  evaluatedCalendarDate,
}: CreditCardActivityModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [search, setSearch] = useState("");
  const noDateLabel = t("creditCardMonitoring.dates.noDate");
  const formatDisplayDate = (value: string | null) =>
    formatLocalizedDate(value, noDateLabel);

  const handleClose = () => {
    Keyboard.dismiss();
    setSearch("");
    onClose();
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const descMatch = item.description.toLowerCase().includes(query);
      const detailMatch = (item.detail ?? "").toLowerCase().includes(query);
      const dateMatch = item.occurredOn.includes(query);
      return descMatch || detailMatch || dateMatch;
    });
  }, [items, search]);

  const status = useMemo(() => {
    if (!statementSummary?.dueOn) return null;
    const presentation = getStatementPaymentPresentation(
      {
        issuedAmountMinorUnits: statementSummary.issuedAmountMinorUnits,
        remainingAmountMinorUnits: statementSummary.remainingAmountMinorUnits,
        dueOn: statementSummary.dueOn,
      },
      evaluatedCalendarDate,
    );
    if (presentation.badgeKind === "none") {
      return { label: t(presentation.labelKey), kind: "unpaid" as const };
    }
    return {
      label: t(presentation.labelKey),
      kind: presentation.badgeKind,
    };
  }, [evaluatedCalendarDate, statementSummary, t]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top ? insets.top : 16,
            paddingBottom: insets.bottom ? insets.bottom : 16,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleColumn}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={styles.headerSubtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={t("creditCardMonitoring.modal.closeAccessibility")}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <X color={theme.colors.textSecondary} size={22} />
          </Pressable>
        </View>

        {statementSummary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.summaryCardLabel}>
                  {statementSummary.kind === "opening"
                    ? t("creditCardMonitoring.statement.openingBalanceStatement")
                    : t("creditCardMonitoring.statement.billedStatementTitle", {
                        date: formatDisplayDate(statementSummary.statementOn ?? null),
                      })}
                </Text>
                <Text style={styles.summaryCardDue}>
                  {statementSummary.dueOn
                    ? t("creditCardMonitoring.statement.paymentDue", {
                        date: formatDisplayDate(statementSummary.dueOn),
                      })
                    : t("creditCardMonitoring.statement.noPaymentDueDate")}
                </Text>
              </View>
              {status ? (
                <View
                  style={[
                    styles.statusBadge,
                    status.kind === "paid" && styles.statusBadgePaid,
                    status.kind === "partial" && styles.statusBadgePartial,
                    status.kind === "overdue" && styles.statusBadgeOverdue,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      status.kind === "paid" && styles.statusBadgePaidText,
                      status.kind === "partial" && styles.statusBadgePartialText,
                      status.kind === "overdue" && styles.statusBadgeOverdueText,
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryMetricItem}>
                <Text style={styles.summaryMetricLabel}>
                  {t("creditCardMonitoring.statement.totalBilled")}
                </Text>
                <Text style={styles.summaryMetricValue}>
                  {formatCurrency(
                    statementSummary.issuedAmountMinorUnits,
                    currencyCode,
                  )}
                </Text>
              </View>
              <View style={styles.summaryMetricItem}>
                <Text style={styles.summaryMetricLabel}>
                  {t("creditCardMonitoring.statement.remainingBalance")}
                </Text>
                <Text
                  style={[
                    styles.summaryMetricValue,
                    statementSummary.remainingAmountMinorUnits > 0
                      ? styles.summaryRemainingActive
                      : styles.summaryRemainingPaid,
                  ]}
                >
                  {formatCurrency(
                    statementSummary.remainingAmountMinorUnits,
                    currencyCode,
                  )}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.searchBar}>
          <Search color={theme.colors.textMuted} size={18} />
          <TextInput
            accessibilityLabel={t(
              "creditCardMonitoring.modal.searchAccessibility",
            )}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder={t("creditCardMonitoring.modal.searchPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityLabel={t("creditCardMonitoring.modal.clearSearch")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearch("")}
              style={styles.searchClearButton}
            >
              <X color={theme.colors.textSecondary} size={16} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {search.trim().length > 0
              ? t("creditCardMonitoring.modal.showingCount", {
                  shown: filteredItems.length,
                  total: items.length,
                })
              : t("creditCardMonitoring.modal.itemsCount", {
                  count: items.length,
                })}
          </Text>
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredItems}
          initialNumToRender={20}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {search.trim().length > 0
                  ? t("creditCardMonitoring.modal.emptyNoMatch")
                  : t("creditCardMonitoring.modal.emptyNoActivity")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.trim().length > 0
                  ? t("creditCardMonitoring.modal.emptyNoMatchHint")
                  : t("creditCardMonitoring.modal.emptyNoActivityHint")}
              </Text>
            </View>
          }
          maxToRenderPerBatch={25}
          renderItem={({ item }) => {
            const isCredit = Boolean(item.isCredit);
            const formatted = formatCurrency(
              item.amountMinorUnits,
              currencyCode,
            );
            const amountText = isCredit ? `- ${formatted}` : formatted;

            return (
              <View style={styles.itemRow}>
                <View
                  style={[
                    styles.itemIconWrapper,
                    isCredit
                      ? styles.itemIconCredit
                      : styles.itemIconCharge,
                  ]}
                >
                  {item.entryType === "payment" ? (
                    <ArrowDownLeft color={theme.colors.success} size={18} />
                  ) : item.entryType === "refund" ? (
                    <RotateCcw color={theme.colors.success} size={18} />
                  ) : item.entryType === "installment" ? (
                    <Layers3 color={theme.colors.primary} size={18} />
                  ) : (
                    <CreditCard color={theme.colors.textSecondary} size={18} />
                  )}
                </View>
                <View style={styles.itemTextColumn}>
                  <Text numberOfLines={1} style={styles.itemDescription}>
                    {localizeCreditCardActivityDescription(item.description, t)}
                  </Text>
                  <Text numberOfLines={1} style={styles.itemDetail}>
                    {item.detail
                      ? `${formatDisplayDate(item.occurredOn)} · ${item.detail}`
                      : formatDisplayDate(item.occurredOn)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.itemAmount,
                    isCredit && styles.itemCreditAmount,
                  ]}
                >
                  {amountText}
                </Text>
              </View>
            );
          }}
          windowSize={11}
        />
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
    },
    headerTitleColumn: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    headerSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    pressed: {
      opacity: 0.75,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    summaryTopRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryCardLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    summaryCardDue: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    statusBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusBadgePaid: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },
    statusBadgePartial: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
    },
    statusBadgeOverdue: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
    },
    statusBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
    },
    statusBadgePaidText: {
      color: theme.colors.success,
    },
    statusBadgePartialText: {
      color: theme.colors.warning,
    },
    statusBadgeOverdueText: {
      color: theme.colors.danger,
    },
    summaryMetricsRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    summaryMetricItem: {
      flex: 1,
    },
    summaryMetricLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    summaryMetricValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    summaryRemainingActive: {
      color: theme.colors.danger,
    },
    summaryRemainingPaid: {
      color: theme.colors.success,
    },
    searchBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      paddingVertical: theme.spacing.xs,
    },
    searchClearButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    counterRow: {
      marginVertical: theme.spacing.xs,
    },
    counterText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    listContent: {
      paddingBottom: theme.spacing.xl,
    },
    itemRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    itemIconWrapper: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    itemIconCharge: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    itemIconCredit: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },
    itemTextColumn: {
      flex: 1,
      minWidth: 0,
    },
    itemDescription: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    itemDetail: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    itemAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    itemCreditAmount: {
      color: theme.colors.success,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
  });
}
