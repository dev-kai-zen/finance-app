import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Calendar,
  ChevronRight,
  FastForward,
  X,
} from "lucide-react-native";

import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { AccountListItem } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import { TransactionDateTimePickerModal } from "@/modules/transactions";
import { formatCurrency } from "@/utils/currency";
import type { ScheduledTransaction } from "../types/scheduled-transaction.types";
import { calculateScheduleOccurrence } from "../utils/recurrence";

export interface AdvancePostModalProps {
  visible: boolean;
  schedule: ScheduledTransaction | null;
  sourceAccount?: AccountListItem;
  destinationAccount?: AccountListItem;
  category?: Category;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (transactionDate: Date) => void;
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function AdvancePostModal({
  visible,
  schedule,
  sourceAccount,
  destinationAccount,
  category,
  pending = false,
  onClose,
  onConfirm,
}: AdvancePostModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPrivate } = usePrivacyMode();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDate(new Date());
      setDatePickerVisible(false);
    }
  }, [visible]);

  const nextOccurrence = useMemo(() => {
    if (!schedule) return null;
    return calculateScheduleOccurrence(
      schedule,
      schedule.nextOccurrenceNumber + 1,
    );
  }, [schedule]);

  if (!schedule) return null;

  const isTransfer = schedule.transactionType === "transfer";
  const signedAmount = isTransfer
    ? Math.abs(schedule.amountMinorUnits)
    : schedule.amountMinorUnits;

  const currentDueDate =
    schedule.nextEffectiveAt ?? schedule.nextNominalAt;
  const nextDueDate = nextOccurrence
    ? nextOccurrence.effectiveAt ?? nextOccurrence.nominalAt
    : null;

  const isToday = isSameCalendarDay(selectedDate, new Date());

  const handleConfirm = () => {
    if (pending) return;
    onConfirm(selectedDate);
  };

  return (
    <>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!pending) onClose();
        }}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={t("common.cancel")}
            disabled={pending}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.card,
              isDesktop ? styles.desktopCard : styles.mobileCard,
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <FastForward color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title}>
                  {t("scheduledTransactions.advancePostTitle")}
                </Text>
                <Text style={styles.subtitle}>
                  {t("scheduledTransactions.advancePostDesc")}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t("common.cancel")}
                disabled={pending}
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <X color={theme.colors.textSecondary} size={18} />
              </Pressable>
            </View>

            {/* Schedule Details Summary Box */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryInfo}>
                  <Text numberOfLines={1} style={styles.summaryTitle}>
                    {schedule.name?.trim() ||
                      category?.name ||
                      (isTransfer
                        ? "Scheduled transfer"
                        : "Scheduled " + schedule.transactionType)}
                  </Text>
                  <Text numberOfLines={1} style={styles.summaryMeta}>
                    {isTransfer
                      ? (sourceAccount?.name ?? "Unknown") +
                        " → " +
                        (destinationAccount?.name ?? "Unknown")
                      : (sourceAccount?.name ?? "Unknown") +
                        " · " +
                        (category?.name ?? "No category")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amountText,
                    isTransfer
                      ? styles.amountTransfer
                      : signedAmount > 0
                        ? styles.amountIncome
                        : styles.amountExpense,
                  ]}
                >
                  {formatPrivacyAmount(
                    formatCurrency(
                      signedAmount,
                      sourceAccount?.currencyCode ?? "PHP",
                      signedAmount > 0 && !isTransfer,
                    ),
                    isPrivate,
                  )}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.cycleInfo}>
                <View style={styles.cycleRow}>
                  <Text style={styles.cycleLabel}>
                    {t("scheduledTransactions.advancePostCurrentDate")}:
                  </Text>
                  <Text style={styles.cycleValue}>
                    {currentDueDate
                      ? currentDueDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </Text>
                </View>
                <View style={styles.cycleRow}>
                  <Text style={styles.cycleLabel}>
                    {t("scheduledTransactions.advancePostNextDate")}:
                  </Text>
                  <Text
                    style={[
                      styles.cycleValue,
                      !nextDueDate && styles.cycleCompletedValue,
                    ]}
                  >
                    {nextDueDate
                      ? nextDueDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : t("scheduledTransactions.advancePostCompletes")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Transaction Date Selector */}
            <View style={styles.dateSection}>
              <Text style={styles.inputLabel}>
                {t("scheduledTransactions.advancePostDateLabel")}
              </Text>
              <Pressable
                accessibilityLabel={t(
                  "scheduledTransactions.advancePostDateLabel",
                )}
                disabled={pending}
                onPress={() => setDatePickerVisible(true)}
                style={styles.dateSelector}
              >
                <View style={styles.dateSelectorLeft}>
                  <Calendar color={theme.colors.primary} size={18} />
                  <Text style={styles.dateSelectorText}>
                    {selectedDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  {isToday ? (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>
                        {t("scheduledTransactions.today")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <ChevronRight color={theme.colors.textMuted} size={18} />
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={t("common.cancel")}
                disabled={pending}
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t(
                  "scheduledTransactions.advancePostConfirm",
                )}
                disabled={pending}
                onPress={handleConfirm}
                style={[styles.button, styles.confirmButton]}
              >
                {pending ? (
                  <ActivityIndicator
                    color={theme.colors.onPrimary}
                    size="small"
                  />
                ) : (
                  <>
                    <FastForward
                      color={theme.colors.onPrimary}
                      size={16}
                    />
                    <Text style={styles.confirmButtonText}>
                      {t("scheduledTransactions.advancePostConfirm")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Sub-Modal */}
      <TransactionDateTimePickerModal
        mode="date"
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(newDate) => {
          setSelectedDate(newDate);
          setDatePickerVisible(false);
        }}
        title={t("scheduledTransactions.advancePostDateLabel")}
        value={selectedDate}
        visible={datePickerVisible}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      padding: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    mobileCard: {
      maxWidth: "100%",
    },
    desktopCard: {
      maxWidth: 440,
    },
    header: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    headerIconContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.primary + "18",
      borderColor: theme.colors.primary + "40",
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    headerTextGroup: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.regular,
      lineHeight: theme.typography.lineHeight.xs,
      marginTop: 2,
    },
    closeButton: {
      padding: 4,
    },
    summaryCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    summaryTopRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryInfo: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    summaryMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.regular,
      marginTop: 2,
    },
    amountText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountExpense: {
      color: theme.colors.danger,
    },
    amountTransfer: {
      color: theme.colors.primary,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginVertical: theme.spacing.sm,
    },
    cycleInfo: {
      gap: 4,
    },
    cycleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cycleLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.regular,
    },
    cycleValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    cycleCompletedValue: {
      color: theme.colors.success,
    },
    dateSection: {
      marginBottom: theme.spacing.lg,
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: theme.spacing.xs,
    },
    dateSelector: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    dateSelectorLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    dateSelectorText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    todayBadge: {
      backgroundColor: theme.colors.primary + "20",
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    todayBadgeText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
    },
    button: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    cancelButton: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    cancelButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    confirmButton: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    confirmButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
