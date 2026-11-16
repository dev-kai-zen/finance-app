import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle2, X } from "lucide-react-native";

import { AppButton } from "@/components/app-button";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useAccounts } from "@/modules/accounts";
import { formatCurrency } from "@/utils/currency";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import type { SubscriptionItem } from "../types/subscription.types";

export interface MarkPaidModalProps {
  visible: boolean;
  subscription: SubscriptionItem | null;
  onClose: () => void;
  onConfirm: (options: { accountId: string; paidAt: Date }) => void;
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
  onConfirm: (options: { accountId: string; paidAt: Date }) => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { accounts } = useAccounts();
  const { isPrivate } = usePrivacyMode();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    subscription.accountId || (accounts[0]?.id ?? ""),
  );

  useEffect(() => {
    if (subscription.accountId) {
      setSelectedAccountId(subscription.accountId);
    } else if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [subscription.accountId, accounts]);

  const formattedAmount = formatCurrency(
    subscription.amountMinorUnits,
    subscription.currencyCode,
  );
  const displayAmount = formatPrivacyAmount(formattedAmount, isPrivate);

  const handleConfirm = () => {
    if (!selectedAccountId) return;
    onConfirm({
      accountId: selectedAccountId,
      paidAt: new Date(),
    });
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleCol}>
              <Text style={styles.title}>
                {t("subscriptions.recordPaymentTitle", {
                  defaultValue: "Record Payment",
                })}
              </Text>
              <Text style={styles.subtitle}>
                {subscription.name} • {displayAmount}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.close")}
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>
            {t("subscriptions.selectPaymentAccount", {
              defaultValue: "Payment Account",
            })}
          </Text>

          <ScrollView style={styles.accountList}>
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <Pressable
                  key={acc.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedAccountId(acc.id)}
                  style={({ pressed }) => [
                    styles.accountRow,
                    isSelected && styles.accountRowSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.accountName,
                      isSelected && styles.accountNameSelected,
                    ]}
                  >
                    {acc.name}
                  </Text>
                  {isSelected ? (
                    <CheckCircle2 color={theme.colors.primary} size={18} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.rollForwardNotice}>
            {t("subscriptions.rollForwardNotice", {
              defaultValue:
                "This will log an expense transaction in your ledger and advance the renewal countdown to the next cycle.",
            })}
          </Text>

          <View style={styles.btnRow}>
            <AppButton
              label={t("common.cancel")}
              onPress={onClose}
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
        </View>
      </View>
    </Modal>
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
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 5,
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
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    accountList: {
      maxHeight: 180,
      marginBottom: theme.spacing.md,
    },
    accountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    accountRowSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(34, 197, 94, 0.08)",
    },
    accountName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    accountNameSelected: {
      fontWeight: "700",
      color: theme.colors.primary,
    },
    rollForwardNotice: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      marginBottom: theme.spacing.lg,
    },
    btnRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
    },
  });
}
