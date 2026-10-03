import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Folder,
  Landmark,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  BalanceSheetAccountItem,
  BalanceSheetAccountTypeGroup,
  BalanceSheetData,
} from "@/modules/accounts";
import { formatCurrency } from "@/utils/currency";
import type { CalendarMonth } from "../types/calendar.types";
import { MONTH_NAMES, formatFriendlyDate } from "../utils/calendar-dates";

export interface CalendarBalanceSheetTabProps {
  balanceSheet: BalanceSheetData;
  selectedDay: string | null;
  activeMonth: CalendarMonth;
}

export function CalendarBalanceSheetTab({
  balanceSheet,
  selectedDay,
  activeMonth,
}: CalendarBalanceSheetTabProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  // Set of account IDs with expanded pockets
  const [expandedPockets, setExpandedPockets] = useState<Set<string>>(() => {
    // Default: expand accounts with pockets
    const set = new Set<string>();
    for (const group of [
      ...balanceSheet.assets.accountTypes,
      ...balanceSheet.liabilities.accountTypes,
    ]) {
      for (const acc of group.accounts) {
        if (acc.pockets.length > 0) {
          set.add(acc.id);
        }
      }
    }
    return set;
  });

  const togglePockets = (accountId: string) => {
    setExpandedPockets((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const isNetWorthPositive = balanceSheet.netWorthMinorUnits >= 0;
  const isAssetsPositive = balanceSheet.assets.totalMinorUnits >= 0;
  const isLiabilitiesPositive = balanceSheet.liabilities.totalMinorUnits >= 0;

  const scopeLabel = selectedDay
    ? `Balances as of ${formatFriendlyDate(selectedDay)}`
    : `Balances as of end of ${MONTH_NAMES[activeMonth.month]} ${activeMonth.year}`;

  return (
    <View style={styles.container}>
      {/* 1. As of Date Scope Indicator */}
      <View style={styles.scopeBanner}>
        <View style={styles.scopeLeft}>
          <CalendarIcon color={theme.colors.primary} size={15} />
          <Text style={styles.scopeText}>{scopeLabel}</Text>
        </View>
        <View style={styles.scopeTag}>
          <Text style={styles.scopeTagText}>
            {selectedDay ? "Selected Day" : "Month-End"}
          </Text>
        </View>
      </View>

      {/* 2. Net Worth Hero Card */}
      <View style={styles.netWorthCard}>
        <View style={styles.netWorthHeader}>
          <View style={styles.netWorthIconRow}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor:
                    (isNetWorthPositive
                      ? theme.colors.success
                      : theme.colors.danger) + "18",
                },
              ]}
            >
              <Scale
                color={
                  isNetWorthPositive
                    ? theme.colors.success
                    : theme.colors.danger
                }
                size={16}
              />
            </View>
            <Text style={styles.netWorthTitle}>Net Worth</Text>
          </View>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  (isNetWorthPositive
                    ? theme.colors.success
                    : theme.colors.danger) + "18",
              },
            ]}
          >
            {isNetWorthPositive ? (
              <TrendingUp color={theme.colors.success} size={12} />
            ) : (
              <TrendingDown color={theme.colors.danger} size={12} />
            )}
            <Text
              style={[
                styles.statusChipText,
                {
                  color: isNetWorthPositive
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            >
              {isNetWorthPositive ? "Positive" : "Deficit"}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.netWorthAmount,
            {
              color: isNetWorthPositive
                ? theme.colors.success
                : theme.colors.danger,
            },
          ]}
        >
          {formatCurrency(balanceSheet.netWorthMinorUnits, "PHP", false)}
        </Text>

        <View style={styles.netWorthDivider} />

        <View style={styles.netWorthSubRow}>
          <View style={styles.subItem}>
            <Text style={styles.subItemLabel}>Total Assets</Text>
            <Text
              style={[
                styles.subItemValue,
                {
                  color: isAssetsPositive
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            >
              {formatCurrency(balanceSheet.assets.totalMinorUnits, "PHP", false)}
            </Text>
          </View>

          <View style={styles.subDivider} />

          <View style={styles.subItem}>
            <Text style={styles.subItemLabel}>Total Liabilities</Text>
            <Text
              style={[
                styles.subItemValue,
                {
                  color: isLiabilitiesPositive
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            >
              {formatCurrency(
                balanceSheet.liabilities.totalMinorUnits,
                "PHP",
                false,
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. ASSETS Section */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionHeader, styles.assetSectionHeader]}>
          <View style={styles.sectionHeaderLeft}>
            <View
              style={[
                styles.sectionIconWrap,
                { backgroundColor: theme.colors.success + "18" },
              ]}
            >
              <Landmark color={theme.colors.success} size={16} />
            </View>
            <Text style={styles.sectionTitle}>Assets</Text>
          </View>
          <Text
            style={[
              styles.sectionTotalAmount,
              {
                color: isAssetsPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(balanceSheet.assets.totalMinorUnits, "PHP", false)}
          </Text>
        </View>

        {balanceSheet.assets.accountTypes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No asset accounts recorded.</Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {balanceSheet.assets.accountTypes.map((group) =>
              renderAccountTypeGroup(
                group,
                expandedPockets,
                togglePockets,
                theme,
                styles,
              ),
            )}
          </View>
        )}
      </View>

      {/* 4. LIABILITIES Section */}
      <View style={styles.sectionCard}>
        <View style={[styles.sectionHeader, styles.liabilitySectionHeader]}>
          <View style={styles.sectionHeaderLeft}>
            <View
              style={[
                styles.sectionIconWrap,
                { backgroundColor: theme.colors.danger + "18" },
              ]}
            >
              <CreditCard color={theme.colors.danger} size={16} />
            </View>
            <Text style={styles.sectionTitle}>Liabilities</Text>
          </View>
          <Text
            style={[
              styles.sectionTotalAmount,
              {
                color: isLiabilitiesPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(
              balanceSheet.liabilities.totalMinorUnits,
              "PHP",
              false,
            )}
          </Text>
        </View>

        {balanceSheet.liabilities.accountTypes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No liabilities recorded.</Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {balanceSheet.liabilities.accountTypes.map((group) =>
              renderAccountTypeGroup(
                group,
                expandedPockets,
                togglePockets,
                theme,
                styles,
              ),
            )}
          </View>
        )}
      </View>

      {/* 5. Net Worth Summary Card */}
      <View style={styles.summaryFooterCard}>
        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterLabel}>Assets</Text>
          <Text
            style={[
              styles.summaryFooterValue,
              {
                color: isAssetsPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(balanceSheet.assets.totalMinorUnits, "PHP", false)}
          </Text>
        </View>
        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterLabel}>Liabilities</Text>
          <Text
            style={[
              styles.summaryFooterValue,
              {
                color: isLiabilitiesPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(
              balanceSheet.liabilities.totalMinorUnits,
              "PHP",
              false,
            )}
          </Text>
        </View>
        <View style={styles.summaryFooterDivider} />
        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterTotalLabel}>Net Worth</Text>
          <Text
            style={[
              styles.summaryFooterTotalValue,
              {
                color: isNetWorthPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(balanceSheet.netWorthMinorUnits, "PHP", false)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function renderAccountTypeGroup(
  group: BalanceSheetAccountTypeGroup,
  expandedPockets: Set<string>,
  onTogglePockets: (accountId: string) => void,
  theme: AppTheme,
  styles: ReturnType<typeof createStyles>,
) {
  const isPositive = group.totalBalanceMinorUnits >= 0;

  return (
    <View key={group.id} style={styles.typeCard}>
      {/* Account Type Header */}
      <View style={styles.typeHeader}>
        <View style={styles.typeHeaderLeft}>
          <View
            style={[
              styles.typeIconCircle,
              {
                backgroundColor: group.color
                  ? `${group.color}20`
                  : theme.colors.surfaceMuted,
              },
            ]}
          >
            <IconHelper
              color={group.color ?? theme.colors.primary}
              name={group.iconKey || "landmark"}
              size={14}
            />
          </View>
          <Text numberOfLines={1} style={styles.typeName}>
            {group.name}
          </Text>
          <View style={styles.typeCountBadge}>
            <Text style={styles.typeCountText}>{group.accounts.length}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.typeTotalText,
            { color: isPositive ? theme.colors.success : theme.colors.danger },
          ]}
        >
          {formatCurrency(group.totalBalanceMinorUnits, "PHP", false)}
        </Text>
      </View>

      {/* Accounts List */}
      <View style={styles.accountList}>
        {group.accounts.map((account) =>
          renderAccountItem(
            account,
            expandedPockets.has(account.id),
            () => onTogglePockets(account.id),
            theme,
            styles,
          ),
        )}
      </View>
    </View>
  );
}

function renderAccountItem(
  account: BalanceSheetAccountItem,
  isExpanded: boolean,
  onTogglePockets: () => void,
  theme: AppTheme,
  styles: ReturnType<typeof createStyles>,
) {
  const isPositive = account.balanceMinorUnits >= 0;
  const hasPockets = account.pockets.length > 0;

  return (
    <View key={account.id} style={styles.accountItemWrapper}>
      {/* Account Row */}
      <Pressable
        accessibilityLabel={`${account.name}, balance ${formatCurrency(account.balanceMinorUnits, account.currencyCode, false)}`}
        accessibilityRole="button"
        disabled={!hasPockets}
        onPress={onTogglePockets}
        style={({ pressed }) => [
          styles.accountRow,
          hasPockets && pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.accountRowLeft}>
          <View style={styles.accountIconWrap}>
            <IconHelper
              color={theme.colors.textSecondary}
              name={account.iconKey || "wallet"}
              size={14}
            />
          </View>
          <Text numberOfLines={1} style={styles.accountName}>
            {account.name}
          </Text>
          {hasPockets && (
            <View style={styles.pocketPill}>
              <Text style={styles.pocketPillText}>
                {account.pockets.length}{" "}
                {account.pockets.length === 1 ? "pocket" : "pockets"}
              </Text>
              {isExpanded ? (
                <ChevronDown color={theme.colors.textMuted} size={12} />
              ) : (
                <ChevronRight color={theme.colors.textMuted} size={12} />
              )}
            </View>
          )}
        </View>

        <Text
          style={[
            styles.accountBalance,
            { color: isPositive ? theme.colors.success : theme.colors.danger },
          ]}
        >
          {formatCurrency(account.balanceMinorUnits, account.currencyCode, false)}
        </Text>
      </Pressable>

      {/* Pockets Section (Under Account) */}
      {hasPockets && isExpanded && (
        <View style={styles.pocketsContainer}>
          {/* Available / Unallocated Row */}
          <View style={styles.pocketRow}>
            <View style={styles.pocketRowLeft}>
              <View style={styles.pocketIconWrap}>
                <WalletCards color={theme.colors.textSecondary} size={12} />
              </View>
              <Text numberOfLines={1} style={styles.pocketNameMuted}>
                Available (Unallocated)
              </Text>
            </View>
            <Text
              style={[
                styles.pocketBalance,
                {
                  color:
                    account.availableMinorUnits >= 0
                      ? theme.colors.success
                      : theme.colors.danger,
                },
              ]}
            >
              {formatCurrency(
                account.availableMinorUnits,
                account.currencyCode,
                false,
              )}
            </Text>
          </View>

          {/* Individual Pockets */}
          {account.pockets.map((pocket) => {
            const isPocketPositive = pocket.balanceMinorUnits >= 0;
            return (
              <View key={pocket.id} style={styles.pocketRow}>
                <View style={styles.pocketRowLeft}>
                  <View style={styles.pocketIconWrap}>
                    <Folder color={theme.colors.primary} size={12} />
                  </View>
                  <Text numberOfLines={1} style={styles.pocketName}>
                    {pocket.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pocketBalance,
                    {
                      color: isPocketPositive
                        ? theme.colors.success
                        : theme.colors.danger,
                    },
                  ]}
                >
                  {formatCurrency(
                    pocket.balanceMinorUnits,
                    account.currencyCode,
                    false,
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    scopeBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    scopeLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    scopeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    scopeTag: {
      backgroundColor: theme.colors.primary + "15",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    scopeTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    netWorthCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    netWorthHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    netWorthIconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconBubble: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    netWorthTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: "700",
    },
    netWorthAmount: {
      fontSize: 28,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginVertical: 4,
    },
    netWorthDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
    },
    netWorthSubRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subItem: {
      flex: 1,
    },
    subItemLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    subItemValue: {
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    subDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.sm,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    assetSectionHeader: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    liabilitySectionHeader: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    sectionHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    sectionTotalAmount: {
      fontSize: 16,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    groupList: {
      padding: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    typeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
      marginBottom: 2,
    },
    typeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    typeHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    typeIconCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    typeName: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    typeCountBadge: {
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    typeCountText: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    typeTotalText: {
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    accountList: {
      paddingVertical: 2,
    },
    accountItemWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + "50",
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    accountRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    accountIconWrap: {
      width: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    accountName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    pocketPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary + "12",
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 3,
    },
    pocketPillText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    accountBalance: {
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    pocketsContainer: {
      backgroundColor: theme.colors.surfaceMuted + "80",
      paddingVertical: 4,
      paddingLeft: 28,
      paddingRight: 12,
      gap: 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + "40",
    },
    pocketRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 5,
    },
    pocketRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    pocketIconWrap: {
      width: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    pocketName: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    pocketNameMuted: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    pocketBalance: {
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    emptyWrap: {
      paddingVertical: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
    summaryFooterCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: 6,
    },
    summaryFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryFooterLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    summaryFooterValue: {
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    summaryFooterDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 4,
    },
    summaryFooterTotalLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    summaryFooterTotalValue: {
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
  });
}
