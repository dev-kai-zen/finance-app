import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowUpDown, ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "@/components/icon-helper";
import { formatCurrency } from "@/utils/currency";
import type { AccountListItem, AccountType } from "@/modules/accounts/types/account.types";
import { localDateInput } from "@/modules/accounts/utils/account-input";
import { formatOpeningTotal } from "@/modules/accounts/utils/opening-summary";

interface AccountTypeGroupCardProps {
  accountType: AccountType | { id: string; name: string; iconKey?: string | null; color?: string | null; accountGroup?: string };
  accounts: AccountListItem[];
  onSelectAccount: (account: AccountListItem) => void;
  onSort?: (groupName: string, accounts: AccountListItem[]) => void;
}

export function AccountTypeGroupCard({
  accountType,
  accounts,
  onSelectAccount,
  onSort,
}: AccountTypeGroupCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isLiability = accountType.accountGroup === "liability";

  const groupTotal = accounts
    .filter(
      (a) =>
        a.currencyCode === "PHP" &&
        Number.isSafeInteger(
          a.currentBalanceMinorUnits !== undefined
            ? a.currentBalanceMinorUnits
            : a.openingBalanceMinorUnits,
        ),
    )
    .reduce(
      (sum, a) =>
        sum +
        BigInt(
          a.currentBalanceMinorUnits !== undefined
            ? a.currentBalanceMinorUnits
            : a.openingBalanceMinorUnits,
        ),
      0n,
    );

  const primaryColor = accountType.color || theme.colors.primary;

  return (
    <View style={styles.groupCard}>
      {/* Group Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: `${primaryColor}20` },
            ]}
          >
            <IconHelper
              name={accountType.iconKey ?? "landmark"}
              size={18}
              color={primaryColor}
            />
          </View>

          <View style={styles.titleCol}>
            <Text
              numberOfLines={1}
              style={[styles.groupTitle, { color: primaryColor }]}
            >
              {accountType.name}
            </Text>
            <Text style={styles.accountCountText}>
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {onSort && accounts.length > 1 && (
            <TouchableOpacity
              onPress={() => onSort(accountType.name, accounts)}
              style={styles.sortBtn}
              activeOpacity={0.7}
              accessibilityLabel={`Sort accounts under ${accountType.name}`}
            >
              <ArrowUpDown size={12} color={theme.colors.textSecondary} />
              <Text style={styles.sortBtnText}>Sort</Text>
            </TouchableOpacity>
          )}

          <Text
            style={[
              styles.totalAmount,
              isLiability && styles.liabilityTotalAmount,
            ]}
          >
            {formatOpeningTotal(groupTotal)}
          </Text>
        </View>
      </View>

      {/* Account Rows Inside Group */}
      <View style={styles.accountsList}>
        {accounts.map((account, index) => {
          const balance =
            account.currentBalanceMinorUnits !== undefined
              ? account.currentBalanceMinorUnits
              : account.openingBalanceMinorUnits;
          const amount =
            account.currencyCode === "PHP"
              ? formatCurrency(balance, "PHP")
              : `${balance.toLocaleString()} ${account.currencyCode}`;

          return (
            <View key={account.id} style={styles.accountRowWrapper}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                onPress={() => onSelectAccount(account)}
                style={({ pressed }) => [
                  styles.accountRow,
                  account.isArchived && styles.archivedRow,
                  pressed && styles.pressedRow,
                ]}
                accessibilityLabel={`${account.name}, balance ${amount}. Open account actions.`}
                accessibilityRole="button"
              >
                <View style={styles.accountLeft}>
                  <View
                    style={[
                      styles.accountIconWrap,
                      {
                        backgroundColor: `${primaryColor}18`,
                        borderColor: `${primaryColor}30`,
                      },
                    ]}
                  >
                    <IconHelper
                      name={accountType.iconKey ?? "wallet"}
                      size={16}
                      color={primaryColor}
                    />
                  </View>

                  <View style={styles.accountInfoCol}>
                    <Text numberOfLines={1} style={styles.accountName}>
                      {account.name}
                    </Text>
                    <Text style={styles.accountMeta}>
                      Opened {localDateInput(account.openingBalanceAt)}
                      {account.isArchived ? " · Archived" : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountRight}>
                  <Text
                    style={[
                      styles.accountAmount,
                      isLiability && styles.liabilityAmount,
                    ]}
                  >
                    {amount}
                  </Text>
                  <ChevronRight
                    size={16}
                    color={theme.colors.textMuted}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    headerLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      marginRight: theme.spacing.sm,
    },
    iconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flexShrink: 0,
      height: 32,
      justifyContent: "center",
      marginRight: 10,
      width: 32,
    },
    titleCol: {
      flex: 1,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountCountText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: 1,
    },
    headerRight: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 0,
      gap: theme.spacing.sm,
    },
    sortBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    sortBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    totalAmount: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    liabilityTotalAmount: {
      color: theme.colors.warning,
    },
    accountsList: {
      backgroundColor: theme.colors.surface,
    },
    accountRowWrapper: {
      width: "100%",
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: 54,
    },
    accountRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    archivedRow: {
      opacity: 0.6,
    },
    pressedRow: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    accountLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
    },
    accountIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    accountInfoCol: {
      flex: 1,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    accountMeta: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    accountRight: {
      alignItems: "center",
      flexDirection: "row",
    },
    accountAmount: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    liabilityAmount: {
      color: theme.colors.warning,
    },
  });
}
