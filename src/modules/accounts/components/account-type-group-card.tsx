import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowUpDown, ChevronRight } from "lucide-react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountAmountText,
  bigintToSafeNumber,
} from "@/modules/accounts/components/account-amount-text";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import type { AccountListItem, AccountType } from "@/modules/accounts/types/account.types";
import { formatOpeningTotal } from "@/modules/accounts/utils/opening-summary";

interface AccountTypeGroupCardProps {
  accountType:
    | AccountType
    | {
        id: string;
        name: string;
        iconKey?: string | null;
        color?: string | null;
        hexColorsId?: string | null;
        accountGroup?: string;
      };
  accounts: AccountListItem[];
  onSelectAccount: (account: AccountListItem) => void;
  onSort?: (groupName: string, accounts: AccountListItem[]) => void;
  onEditType?: (accountType: AccountType) => void;
}

export function AccountTypeGroupCard({
  accountType,
  accounts,
  onSelectAccount,
  onSort,
  onEditType,
}: AccountTypeGroupCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const rawColor = accountType.color ?? accountType.hexColorsId ?? null;
  const primaryColor = accountColor(theme, rawColor);

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

  const groupTotalNumber = bigintToSafeNumber(groupTotal);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel={`Edit ${accountType.name} account group`}
          accessibilityRole="button"
          disabled={!onEditType}
          onPress={() => onEditType?.(accountType as AccountType)}
          style={({ pressed }) => [
            styles.headerLeft,
            pressed && onEditType && styles.headerLeftPressed,
          ]}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: `${primaryColor}20` }]}
          >
            <IconHelper
              color={primaryColor}
              name={accountType.iconKey ?? "landmark"}
              size={18}
            />
          </View>
          <View style={styles.titleCol}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.groupTitle, { color: primaryColor }]}>
                {accountType.name}
              </Text>
              {onEditType ? (
                <ChevronRight
                  color={theme.colors.textMuted}
                  size={14}
                  style={styles.chevronIcon}
                />
              ) : null}
            </View>
            <Text style={styles.accountCount}>
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerRight}>
          {onSort && accounts.length > 1 ? (
            <TouchableOpacity
              accessibilityLabel={`Sort accounts under ${accountType.name}`}
              onPress={() => onSort(accountType.name, accounts)}
              style={styles.sortBtn}
            >
              <ArrowUpDown color={theme.colors.textSecondary} size={12} />
              <Text style={styles.sortBtnText}>Sort</Text>
            </TouchableOpacity>
          ) : null}
          {groupTotalNumber !== null ? (
            <AccountAmountText amountMinorUnits={groupTotalNumber} variant="body" />
          ) : (
            <Text style={styles.fallbackTotal}>{formatOpeningTotal(groupTotal)}</Text>
          )}
        </View>
      </View>

      <View style={styles.accountsList}>
        {accounts.map((account, index) => {
          const balance =
            account.currentBalanceMinorUnits !== undefined
              ? account.currentBalanceMinorUnits
              : account.openingBalanceMinorUnits;

          return (
            <View key={account.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityLabel={`${account.name}. Open account actions.`}
                accessibilityRole="button"
                onPress={() => onSelectAccount(account)}
                style={({ pressed }) => [
                  styles.accountRow,
                  account.isArchived && styles.archivedRow,
                  pressed && styles.pressedRow,
                ]}
              >
                <View
                  style={[
                    styles.accountIconWrap,
                    {
                      backgroundColor: `${primaryColor}18`,
                      borderColor: `${primaryColor}35`,
                    },
                  ]}
                >
                  <IconHelper
                    color={primaryColor}
                    name={account.iconKey ?? accountType.iconKey ?? "landmark"}
                    size={16}
                  />
                </View>

                <View style={styles.accountInfo}>
                  <Text numberOfLines={1} style={styles.accountName}>
                    {account.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.accountSubtitle}>
                    {accountType.name}
                  </Text>
                </View>

                <View style={styles.accountRight}>
                  <AccountAmountText amountMinorUnits={balance} variant="body" />
                  <ChevronRight color={theme.colors.textMuted} size={16} />
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
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    headerRow: {
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
      borderRadius: theme.borderRadius.small,
      flex: 1,
      flexDirection: "row",
      marginRight: theme.spacing.sm,
      padding: 2,
    },
    headerLeftPressed: {
      opacity: 0.7,
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
      minWidth: 0,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
    },
    chevronIcon: {
      marginLeft: 4,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountCount: {
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
    fallbackTotal: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    accountsList: {
      backgroundColor: theme.colors.surface,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: 54,
    },
    accountRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    archivedRow: {
      opacity: 0.65,
    },
    pressedRow: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    accountIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    accountInfo: {
      flex: 1,
      minWidth: 0,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    accountSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    accountRight: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 0,
      gap: 4,
    },
  });
}
