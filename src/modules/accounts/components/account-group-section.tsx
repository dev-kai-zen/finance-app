import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountAmountText,
  bigintToSafeNumber,
} from "@/modules/accounts/components/account-amount-text";
import { AccountTypeGroupCard } from "@/modules/accounts/components/account-type-group-card";
import type {
  AccountGroup,
  AccountListItem,
  AccountType,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import { formatOpeningTotal } from "@/modules/accounts/utils/opening-summary";

export function AccountGroupSection({
  group,
  accounts,
  types,
  onSelect,
  onSort,
  onEditType,
  pockets,
}: {
  group: AccountGroup;
  accounts: AccountListItem[];
  types: AccountType[];
  onSelect: (account: AccountListItem) => void;
  onSort?: (groupName: string, accounts: AccountListItem[]) => void;
  onEditType?: (type: AccountType) => void;
  pockets: PocketListItem[];
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

  const typeGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        accountType:
          | AccountType
          | {
              id: string;
              name: string;
              iconKey?: string | null;
              color?: string | null;
              accountGroup?: string;
            };
        sortOrder: number;
        accounts: AccountListItem[];
      }
    >();

    for (const account of grouped) {
      const typeId = account.accountTypeId || "other";
      if (!map.has(typeId)) {
        const foundType =
          types.find((t) => t.id === typeId) || account.accountType;
        const typeInfo = foundType ?? {
          id: typeId,
          name: account.accountType?.name ?? "Other",
          iconKey: account.accountType?.iconKey ?? "landmark",
          color: account.accountType?.color ?? null,
          accountGroup: group,
        };
        map.set(typeId, {
          accountType: typeInfo,
          sortOrder:
            "sortOrder" in typeInfo && typeof typeInfo.sortOrder === "number"
              ? typeInfo.sortOrder
              : 999,
          accounts: [],
        });
      }
      map.get(typeId)!.accounts.push(account);
    }

    const sortedGroups = Array.from(map.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    for (const g of sortedGroups) {
      g.accounts.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return sortedGroups;
  }, [grouped, types, group]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.groupTitle}>
          {isAsset ? "ASSETS" : "LIABILITIES"}
        </Text>
        {groupTotalNumber !== null ? (
          <AccountAmountText amountMinorUnits={groupTotalNumber} variant="title" />
        ) : (
          <Text style={styles.fallbackTotal}>{formatOpeningTotal(groupTotal)}</Text>
        )}
      </View>

      {typeGroups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No {isAsset ? "asset" : "liability"} accounts added yet. Tap + to
            add your first account.
          </Text>
        </View>
      ) : (
        <View style={styles.typeGroupsList}>
          {typeGroups.map((typeGroup) => (
            <AccountTypeGroupCard
              key={typeGroup.accountType.id}
              accountType={typeGroup.accountType}
              accounts={typeGroup.accounts}
              pockets={pockets}
              onEditType={onEditType}
              onSelectAccount={onSelect}
              onSort={onSort}
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
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    groupTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.4,
    },
    fallbackTotal: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    typeGroupsList: {
      gap: theme.spacing.sm,
    },
    emptyCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.lg,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
    },
  });
}
