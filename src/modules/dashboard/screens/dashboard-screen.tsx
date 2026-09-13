import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

interface AccountSnapshot {
  id: string;
  name: string;
  typeName: string;
  categoryColor: string;
  balanceMinorUnits: number;
  isLiability?: boolean;
}

interface TransactionPreview {
  id: string;
  title: string;
  category: string;
  date: string;
  amountMinorUnits: number;
  type: "income" | "expense" | "transfer";
}

// Presentational mock data for initial UI presentation
const DEMO_ACCOUNTS: AccountSnapshot[] = [
  {
    id: "1",
    name: "BDO Everyday Checking",
    typeName: "Checking",
    categoryColor: "blue",
    balanceMinorUnits: 4520000,
  },
  {
    id: "2",
    name: "BPI High-Yield Savings",
    typeName: "Savings",
    categoryColor: "teal",
    balanceMinorUnits: 12500000,
  },
  {
    id: "3",
    name: "Maya Digital Wallet",
    typeName: "E-Wallet",
    categoryColor: "green",
    balanceMinorUnits: 1500000,
  },
  {
    id: "4",
    name: "Metrobank Platinum Card",
    typeName: "Credit Card",
    categoryColor: "orange",
    balanceMinorUnits: -4270000,
    isLiability: true,
  },
];

const DEMO_TRANSACTIONS: TransactionPreview[] = [
  {
    id: "t1",
    title: "Client Retainer Payout",
    category: "Income",
    date: "Today, 10:30 AM",
    amountMinorUnits: 6500000,
    type: "income",
  },
  {
    id: "t2",
    title: "SM Supermarket Supplies",
    category: "Groceries",
    date: "Yesterday, 6:45 PM",
    amountMinorUnits: -435000,
    type: "expense",
  },
  {
    id: "t3",
    title: "Meralco Electric Bill",
    category: "Utilities",
    date: "Sep 11, 2026",
    amountMinorUnits: -582000,
    type: "expense",
  },
  {
    id: "t4",
    title: "Transfer to Savings",
    category: "Transfer",
    date: "Sep 10, 2026",
    amountMinorUnits: -1000000,
    type: "transfer",
  },
];

export function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);
  const [showEmptyStateDemo, setShowEmptyStateDemo] = useState(false);

  // Financial calculations in minor units
  const totalAssetsMinorUnits = 18520000;
  const totalLiabilitiesMinorUnits = 4270000;
  const netWorthMinorUnits = totalAssetsMinorUnits - totalLiabilitiesMinorUnits;

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Overview"
          primaryAction={{
            label: "+ Add Transaction",
            onPress: () => router.navigate("/transactions" as any),
          }}
          secondaryActions={[
            {
              label: "+ Add Account",
              onPress: () => router.navigate("/accounts" as any),
            },
            {
              label: showEmptyStateDemo ? "View Sample Data" : "Preview Empty State",
              onPress: () => setShowEmptyStateDemo((prev) => !prev),
            },
          ]}
          subtitle="Here is your consolidated net worth and recent financial activity."
          title="Financial Overview"
        />
      }
    >
      {showEmptyStateDemo ? (
        <PageEmptyState
          actionLabel="+ Add Your First Account"
          description="Get started by adding your bank accounts, cash wallets, or credit cards to see your consolidated net worth and tracking."
          onAction={() => {
            setShowEmptyStateDemo(false);
            router.navigate("/accounts" as any);
          }}
          title="No Financial Records Yet"
        />
      ) : (
        <View style={styles.contentStack}>
          {/* Net Worth Hero Card */}
          <View style={styles.netWorthCard}>
            <View style={styles.netWorthTopRow}>
              <View>
                <Text style={styles.netWorthLabel}>TOTAL NET WORTH</Text>
                <Text style={styles.netWorthValue}>
                  {formatCurrency(netWorthMinorUnits, "PHP")}
                </Text>
              </View>
              <View style={styles.netWorthBadge}>
                <Text style={styles.netWorthBadgeText}>All Accounts</Text>
              </View>
            </View>

            <View style={styles.netWorthMetricsRow}>
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricDot, styles.assetDot]} />
                  <Text style={styles.metricLabel}>Total Assets</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatCurrency(totalAssetsMinorUnits, "PHP")}
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricDot, styles.liabilityDot]} />
                  <Text style={styles.metricLabel}>Total Liabilities</Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatCurrency(totalLiabilitiesMinorUnits, "PHP")}
                </Text>
              </View>
            </View>
          </View>

          {/* Accounts Overview Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Accounts Snapshot</Text>
              <Pressable
                accessibilityLabel="View all accounts"
                accessibilityRole="link"
                onPress={() => router.navigate("/accounts" as any)}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All ({DEMO_ACCOUNTS.length})</Text>
              </Pressable>
            </View>

            <View style={[styles.accountsGrid, isDesktop && styles.accountsGridDesktop]}>
              {DEMO_ACCOUNTS.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </View>
          </View>

          {/* Recent Transactions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Pressable
                accessibilityLabel="View all transactions"
                accessibilityRole="link"
                onPress={() => router.navigate("/transactions" as any)}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.transactionsCard}>
              {DEMO_TRANSACTIONS.map((tx, idx) => (
                <TransactionRow
                  key={tx.id}
                  isLast={idx === DEMO_TRANSACTIONS.length - 1}
                  tx={tx}
                />
              ))}
            </View>
          </View>
        </View>
      )}
    </PageContainer>
  );
}

function AccountCard({ account }: { account: AccountSnapshot }) {
  const styles = useThemeStyles(createStyles);
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={`${account.name}, balance ${formatCurrency(Math.abs(account.balanceMinorUnits), "PHP")}`}
      accessibilityRole="button"
      onPress={() => router.navigate("/accounts" as any)}
      style={styles.accountCard}
    >
      <View style={styles.accountCardHeader}>
        <Text numberOfLines={1} style={styles.accountCardName}>
          {account.name}
        </Text>
        <View style={styles.accountBadge}>
          <Text style={styles.accountBadgeText}>{account.typeName}</Text>
        </View>
      </View>

      <Text
        style={[
          styles.accountBalance,
          account.isLiability ? styles.accountBalanceLiability : styles.accountBalanceAsset,
        ]}
      >
        {formatCurrency(Math.abs(account.balanceMinorUnits), "PHP")}
      </Text>
    </Pressable>
  );
}

function TransactionRow({
  tx,
  isLast,
}: {
  tx: TransactionPreview;
  isLast: boolean;
}) {
  const styles = useThemeStyles(createStyles);
  const isIncome = tx.type === "income";

  return (
    <View style={[styles.txRow, !isLast && styles.txRowBorder]}>
      <View style={styles.txLeft}>
        <View
          style={[
            styles.txIconBadge,
            isIncome ? styles.txIconIncome : styles.txIconExpense,
          ]}
        >
          <Text style={styles.txIconText}>{isIncome ? "↓" : "↑"}</Text>
        </View>
        <View style={styles.txDetails}>
          <Text numberOfLines={1} style={styles.txTitle}>
            {tx.title}
          </Text>
          <View style={styles.txMetaRow}>
            <Text style={styles.txCategory}>{tx.category}</Text>
            <Text style={styles.txDotSeparator}>•</Text>
            <Text style={styles.txDate}>{tx.date}</Text>
          </View>
        </View>
      </View>

      <Text
        style={[
          styles.txAmount,
          isIncome ? styles.txAmountIncome : styles.txAmountExpense,
        ]}
      >
        {formatCurrency(tx.amountMinorUnits, "PHP", true)}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    contentStack: {
      gap: theme.spacing.xl,
    },
    netWorthCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.xl,
      ...theme.shadows.card,
    },
    netWorthTopRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
    },
    netWorthLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.xs,
    },
    netWorthValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.display,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.display,
    },
    netWorthBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    netWorthBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    netWorthMetricsRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      paddingTop: theme.spacing.lg,
    },
    metricItem: {
      flex: 1,
    },
    metricDivider: {
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
      width: 1,
    },
    metricHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    metricDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    assetDot: {
      backgroundColor: theme.colors.success,
    },
    liabilityDot: {
      backgroundColor: theme.colors.warning,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sectionContainer: {
      gap: theme.spacing.md,
    },
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    viewAllButton: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    accountsGrid: {
      flexDirection: "column",
      gap: theme.spacing.md,
    },
    accountsGridDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    accountCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      minWidth: 240,
      padding: theme.spacing.lg,
    },
    accountCardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    accountCardName: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    accountBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
    },
    accountBadgeText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    accountBalance: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountBalanceAsset: {
      color: theme.colors.textPrimary,
    },
    accountBalanceLiability: {
      color: theme.colors.warning,
    },
    transactionsCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    txRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    txRowBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
    },
    txLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    txIconBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    txIconIncome: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    txIconExpense: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    txIconText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    txDetails: {
      flex: 1,
    },
    txTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      lineHeight: theme.typography.lineHeight.sm,
    },
    txMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: 2,
    },
    txCategory: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    txDotSeparator: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    txDate: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    txAmount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    txAmountIncome: {
      color: theme.colors.success,
    },
    txAmountExpense: {
      color: theme.colors.textPrimary,
    },
  });
}
