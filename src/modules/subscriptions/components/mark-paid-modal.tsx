import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar, ChevronRight, Wallet, X } from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import { DatePickerModal } from "@/components/date-picker-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { AccountPickerModal, useAccounts } from "@/modules/accounts";
import { formatCurrency } from "@/utils/currency";
import type { SubscriptionItem } from "../types/subscription.types";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date, locale?: string): string {
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface MarkPaidModalProps {
  visible: boolean;
  subscription: SubscriptionItem | null;
  onClose: () => void;
  onConfirm: (options: {
    accountId: string;
    pocketId?: string | null;
    paidAt: Date;
  }) => void;
}

export function MarkPaidModal({
  visible,
  subscription,
  onClose,
  onConfirm,
}: MarkPaidModalProps) {
  if (!visible || !subscription) {
    return null;
  }

  return (
    <MarkPaidModalContent
      onClose={onClose}
      onConfirm={onConfirm}
      subscription={subscription}
      visible={visible}
    />
  );
}

function MarkPaidModalContent({
  visible,
  subscription,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  subscription: SubscriptionItem;
  onClose: () => void;
  onConfirm: (options: {
    accountId: string;
    pocketId?: string | null;
    paidAt: Date;
  }) => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t, locale } = useLocalization();
  const { accounts, pockets } = useAccounts({
    includeCreditCardMonitoring: false,
  });

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    subscription.accountId || (accounts[0]?.id ?? ""),
  );
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(
    subscription.pocketId ?? null,
  );
  const [selectedPaidAt, setSelectedPaidAt] = useState<Date>(() => new Date());

  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (subscription.accountId) {
      setSelectedAccountId(subscription.accountId);
      setSelectedPocketId(subscription.pocketId ?? null);
    } else if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
      setSelectedPocketId(null);
    }
  }, [subscription.accountId, subscription.pocketId, accounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const selectedPocket = useMemo(() => {
    return pockets.find((p) => p.id === selectedPocketId) || null;
  }, [pockets, selectedPocketId]);

  const accountDisplayLabel = useMemo(() => {
    if (!selectedAccount) {
      return t("subscriptions.selectAccount", {
        defaultValue: "Select Account",
      });
    }
    if (selectedPocket) {
      return `${selectedAccount.name} • ${selectedPocket.name}`;
    }
    return selectedAccount.name;
  }, [selectedAccount, selectedPocket, t]);

  const formattedAmount = formatCurrency(
    subscription.amountMinorUnits,
    subscription.currencyCode,
  );

  const handleConfirm = () => {
    if (!selectedAccountId) return;
    Keyboard.dismiss();
    onConfirm({
      accountId: selectedAccountId,
      pocketId: selectedPocketId,
      paidAt: selectedPaidAt,
    });
  };

  return (
    <>
      <Modal
        animationType="fade"
        onRequestClose={handleClose}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={t("common.close")}
            onPress={handleClose}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.titleCol}>
                  <Text style={styles.title}>
                    {t("subscriptions.recordPaymentTitle", {
                      defaultValue: "Record Payment",
                    })}
                  </Text>
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {subscription.name} • {formattedAmount}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={t("common.close")}
                  hitSlop={12}
                  onPress={handleClose}
                  style={styles.closeBtn}
                >
                  <X color={theme.colors.textSecondary} size={18} />
                </Pressable>
              </View>

              {/* Payment Account Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>
                  {t("subscriptions.selectPaymentAccount", {
                    defaultValue: "Payment Account",
                  })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAccountPickerVisible(true)}
                  style={styles.selectorBtn}
                >
                  <View style={styles.selectorLeft}>
                    <Wallet color={theme.colors.primary} size={18} />
                    <Text numberOfLines={1} style={styles.selectorValue}>
                      {accountDisplayLabel}
                    </Text>
                  </View>
                  <ChevronRight color={theme.colors.textSecondary} size={18} />
                </Pressable>
              </View>

              {/* Payment Date Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>
                  {t("subscriptions.paymentDate", {
                    defaultValue: "Transaction Date",
                  })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsDatePickerOpen(true)}
                  style={styles.selectorBtn}
                >
                  <View style={styles.selectorLeft}>
                    <Calendar color={theme.colors.primary} size={18} />
                    <Text numberOfLines={1} style={styles.selectorValue}>
                      {formatDisplayDate(selectedPaidAt, locale)}
                    </Text>
                  </View>
                  <ChevronRight color={theme.colors.textSecondary} size={18} />
                </Pressable>
              </View>

              <Text style={styles.rollForwardNotice}>
                {t("subscriptions.rollForwardNotice", {
                  defaultValue:
                    "This will log an expense transaction in your ledger and advance the renewal countdown to the next cycle.",
                })}
              </Text>

              <View style={styles.btnRow}>
                <AppButton
                  label={t("common.cancel")}
                  onPress={handleClose}
                  variant="secondary"
                />
                <AppButton
                  disabled={!selectedAccountId}
                  label={t("subscriptions.confirmPayment", {
                    defaultValue: "Confirm Payment",
                  })}
                  onPress={handleConfirm}
                  variant="primary"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Picker Modal */}
      <AccountPickerModal
        accounts={accounts}
        hidePockets={false}
        onClose={() => setAccountPickerVisible(false)}
        onSelectLocation={(acc, pickedPocketId) => {
          setSelectedAccountId(acc.id);
          setSelectedPocketId(pickedPocketId ?? null);
          setAccountPickerVisible(false);
        }}
        pockets={pockets}
        selectedAccountId={selectedAccountId || undefined}
        selectedPocketId={selectedPocketId || undefined}
        visible={accountPickerVisible}
      />

      {/* Payment Date Picker Modal */}
      <DatePickerModal
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={(iso) => {
          const [y, m, d] = iso.split("-").map(Number);
          setSelectedPaidAt(new Date(y, m - 1, d));
          setIsDatePickerOpen(false);
        }}
        selectedDate={toIsoDate(selectedPaidAt)}
        title={t("subscriptions.paymentDate", {
          defaultValue: "Transaction Date",
        })}
        visible={isDatePickerOpen}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      width: "100%",
      maxWidth: 420,
      maxHeight: "90%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 5,
    },
    sheetContent: {
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    titleCol: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    fieldGroup: {
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    selectorBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    selectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    selectorValue: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textPrimary,
      flex: 1,
      flexShrink: 1,
    },
    rollForwardNotice: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      marginBottom: theme.spacing.lg,
    },
    btnRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
    },
  });
}
