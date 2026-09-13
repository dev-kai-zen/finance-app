import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type {
  AccountGroup,
  AccountListItem,
  AccountType,
} from "@/modules/accounts/types/account.types";
import { AccountRow } from "@/modules/accounts/components/account-row";
import { formatOpeningTotal } from "@/modules/accounts/utils/opening-summary";

export function AccountGroupSection({
  group,
  accounts,
  types,
  onSelect,
}: {
  group: AccountGroup;
  accounts: AccountListItem[];
  types: AccountType[];
  onSelect: (account: AccountListItem) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const grouped = accounts.filter(
    (a) => a.accountType?.accountGroup === group,
  );
  const isAsset = group === "asset";

  const groupTotal = grouped
    .filter(
      (a) =>
        a.currencyCode === "PHP" &&
        Number.isSafeInteger(a.openingBalanceMinorUnits),
    )
    .reduce((sum, a) => sum + BigInt(a.openingBalanceMinorUnits), 0n);

  return (
    <View style={styles.sectionContainer}>
      {/* Group Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.groupTitle}>
            {isAsset ? "ASSETS" : "LIABILITIES"}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {grouped.length} {grouped.length === 1 ? "account" : "accounts"}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.groupTotalText,
            !isAsset && styles.liabilityTotalText,
          ]}
        >
          {formatOpeningTotal(groupTotal)}
        </Text>
      </View>

      {/* Account Cards List */}
      {grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No {isAsset ? "asset" : "liability"} accounts added yet.
          </Text>
        </View>
      ) : (
        <View style={styles.accountsList}>
          {grouped.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onPress={() => onSelect(account)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sectionContainer: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    headerRow: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.sm,
    },
    headerLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    groupTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    countBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    countBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    groupTotalText: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    liabilityTotalText: {
      color: theme.colors.warning,
    },
    accountsList: {
      gap: theme.spacing.sm,
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
