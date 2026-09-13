import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop, LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

interface PresentationalAccount {
  id: string;
  name: string;
  group: "asset" | "liability";
  typeName: string;
  currencyCode: string;
  colorKey: keyof AppTheme["colors"]["categorical"];
  balanceMinorUnits: number;
  isArchived?: boolean;
}

const INITIAL_ACCOUNTS: PresentationalAccount[] = [
  {
    id: "acc-1",
    name: "BDO Everyday Checking",
    group: "asset",
    typeName: "Checking",
    currencyCode: "PHP",
    colorKey: "blue",
    balanceMinorUnits: 4520000,
  },
  {
    id: "acc-2",
    name: "BPI High-Yield Savings",
    group: "asset",
    typeName: "Savings",
    currencyCode: "PHP",
    colorKey: "teal",
    balanceMinorUnits: 12500000,
  },
  {
    id: "acc-3",
    name: "Maya Digital Wallet",
    group: "asset",
    typeName: "E-Wallet",
    currencyCode: "PHP",
    colorKey: "green",
    balanceMinorUnits: 1500000,
  },
  {
    id: "acc-4",
    name: "Metrobank Platinum Card",
    group: "liability",
    typeName: "Credit Card",
    currencyCode: "PHP",
    colorKey: "orange",
    balanceMinorUnits: 4270000,
  },
  {
    id: "acc-5",
    name: "Old Closed Savings Account",
    group: "asset",
    typeName: "Savings",
    currencyCode: "PHP",
    colorKey: "slate",
    balanceMinorUnits: 0,
    isArchived: true,
  },
];

export function AccountsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const [showArchived, setShowArchived] = useState(false);
  const [filterGroup, setFilterGroup] = useState<"all" | "asset" | "liability">("all");

  const activeAccounts = INITIAL_ACCOUNTS.filter((a) => !a.isArchived);
  const archivedAccounts = INITIAL_ACCOUNTS.filter((a) => a.isArchived);

  const assetAccounts = activeAccounts.filter((a) => a.group === "asset");
  const liabilityAccounts = activeAccounts.filter((a) => a.group === "liability");

  const totalAssetMinorUnits = assetAccounts.reduce(
    (sum, a) => sum + a.balanceMinorUnits,
    0,
  );
  const totalLiabilityMinorUnits = liabilityAccounts.reduce(
    (sum, a) => sum + a.balanceMinorUnits,
    0,
  );

  const handleAddAccount = () => {
    if (Platform.OS === "web") {
      window.alert("Add Account action triggered. Ready for form modal integration.");
    } else {
      Alert.alert("Add Account", "Add Account action triggered. Ready for form modal integration.");
    }
  };

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Accounts"
          primaryAction={{
            label: "+ Add Account",
            onPress: handleAddAccount,
          }}
          secondaryActions={[
            {
              label: showArchived ? "Hide Archived" : `Archived (${archivedAccounts.length})`,
              onPress: () => setShowArchived((prev) => !prev),
            },
          ]}
          subtitle="Consolidated view of your assets, liabilities, and institution accounts."
          title="Accounts"
        />
      }
    >
      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Pressable
            accessibilityLabel="Filter All Accounts"
            accessibilityRole="button"
            onPress={() => setFilterGroup("all")}
            style={[styles.filterPill, filterGroup === "all" && styles.filterPillActive]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterGroup === "all" && styles.filterPillTextActive,
              ]}
            >
              All Accounts ({activeAccounts.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Filter Assets"
            accessibilityRole="button"
            onPress={() => setFilterGroup("asset")}
            style={[styles.filterPill, filterGroup === "asset" && styles.filterPillActive]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterGroup === "asset" && styles.filterPillTextActive,
              ]}
            >
              Assets ({assetAccounts.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Filter Liabilities"
            accessibilityRole="button"
            onPress={() => setFilterGroup("liability")}
            style={[
              styles.filterPill,
              filterGroup === "liability" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterGroup === "liability" && styles.filterPillTextActive,
              ]}
            >
              Liabilities ({liabilityAccounts.length})
            </Text>
          </Pressable>
        </View>

        {/* Assets Section */}
        {(filterGroup === "all" || filterGroup === "asset") && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View>
                <Text style={styles.groupTitle}>ASSETS</Text>
                <Text style={styles.groupSubtitle}>
                  Cash, savings, investments, and digital balances
                </Text>
              </View>
              <Text style={styles.groupTotal}>
                {formatCurrency(totalAssetMinorUnits, "PHP")}
              </Text>
            </View>

            {assetAccounts.length === 0 ? (
              <PageEmptyState
                actionLabel="+ Add Asset Account"
                description="No asset accounts recorded yet."
                onAction={handleAddAccount}
                title="No Assets Found"
              />
            ) : (
              <View style={[styles.accountsGrid, isDesktop && styles.accountsGridDesktop]}>
                {assetAccounts.map((account) => (
                  <AccountListItem key={account.id} account={account} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Liabilities Section */}
        {(filterGroup === "all" || filterGroup === "liability") && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View>
                <Text style={styles.groupTitle}>LIABILITIES</Text>
                <Text style={styles.groupSubtitle}>
                  Credit cards, revolving credit, and loans
                </Text>
              </View>
              <Text style={[styles.groupTotal, styles.liabilityTotal]}>
                {formatCurrency(totalLiabilityMinorUnits, "PHP")}
              </Text>
            </View>

            {liabilityAccounts.length === 0 ? (
              <PageEmptyState
                actionLabel="+ Add Liability Account"
                description="No liability accounts recorded yet."
                onAction={handleAddAccount}
                title="No Liabilities"
              />
            ) : (
              <View style={[styles.accountsGrid, isDesktop && styles.accountsGridDesktop]}>
                {liabilityAccounts.map((account) => (
                  <AccountListItem key={account.id} account={account} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Archived Section */}
        {showArchived && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View>
                <Text style={styles.groupTitle}>ARCHIVED ACCOUNTS</Text>
                <Text style={styles.groupSubtitle}>Inactive or closed accounts</Text>
              </View>
              <Text style={styles.groupCount}>{archivedAccounts.length} accounts</Text>
            </View>

            {archivedAccounts.length === 0 ? (
              <PageEmptyState
                description="When you archive an account, it will appear here safely preserved."
                title="No Archived Accounts"
              />
            ) : (
              <View style={[styles.accountsGrid, isDesktop && styles.accountsGridDesktop]}>
                {archivedAccounts.map((account) => (
                  <AccountListItem isArchived key={account.id} account={account} />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </PageContainer>
  );
}

function AccountListItem({
  account,
  isArchived = false,
}: {
  account: PresentationalAccount;
  isArchived?: boolean;
}) {
  const styles = useThemeStyles(createStyles);
  const colorToken = useThemeStyles((theme) => theme.colors.categorical[account.colorKey]);

  return (
    <Pressable
      accessibilityLabel={`${account.name}, ${account.typeName}, balance ${formatCurrency(account.balanceMinorUnits, account.currencyCode)}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.accountRow,
        isArchived && styles.accountRowArchived,
        pressed && styles.accountRowPressed,
      ]}
    >
      <View style={styles.accountRowLeft}>
        {/* Account Type Categorical Color Dot */}
        <View style={[styles.colorIndicator, { backgroundColor: colorToken }]} />

        <View style={styles.accountRowInfo}>
          <Text numberOfLines={1} style={styles.accountName}>
            {account.name}
          </Text>
          <View style={styles.accountMetaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{account.typeName}</Text>
            </View>
            <Text style={styles.currencyBadge}>{account.currencyCode}</Text>
          </View>
        </View>
      </View>

      <Text
        style={[
          styles.accountAmount,
          account.group === "liability" && styles.accountAmountLiability,
          isArchived && styles.accountAmountArchived,
        ]}
      >
        {formatCurrency(account.balanceMinorUnits, account.currencyCode)}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xl,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterPillTextActive: {
      color: theme.colors.onPrimary,
    },
    groupSection: {
      gap: theme.spacing.md,
    },
    groupHeader: {
      alignItems: "flex-end",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.sm,
    },
    groupTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    groupSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    groupTotal: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    liabilityTotal: {
      color: theme.colors.warning,
    },
    groupCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    accountsGrid: {
      flexDirection: "column",
      gap: theme.spacing.sm,
    },
    accountsGridDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    accountRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 64,
      minWidth: 320,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.card,
    },
    accountRowArchived: {
      opacity: 0.65,
    },
    accountRowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    accountRowLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    colorIndicator: {
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    accountRowInfo: {
      flex: 1,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    accountMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xxs,
    },
    typeBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 1,
    },
    typeBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    currencyBadge: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.regular,
    },
    accountAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountAmountLiability: {
      color: theme.colors.warning,
    },
    accountAmountArchived: {
      color: theme.colors.textMuted,
    },
  });
}
