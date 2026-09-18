import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, WalletCards } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import {
  AccountButton,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import type { AccountListItem, PocketListItem } from "@/modules/accounts/types/account.types";
import { formatCurrency } from "@/utils/currency";

export function AccountPocketsModal({
  account,
  pockets,
  visible,
  onAddPocket,
  onClose,
  onEditAccount,
  onEditPocket,
  onMoveFunds,
}: {
  account: AccountListItem | null;
  pockets: PocketListItem[];
  visible: boolean;
  onAddPocket: () => void;
  onClose: () => void;
  onEditAccount: () => void;
  onEditPocket: (pocket: PocketListItem) => void;
  onMoveFunds: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const common = useThemeStyles(accountStyles);
  if (!visible || !account) return null;

  const accountPockets = pockets.filter((pocket) => pocket.accountId === account.id);
  const activePockets = accountPockets.filter((pocket) => !pocket.isArchived);
  const allocated = accountPockets.reduce(
    (sum, pocket) => sum + pocket.currentBalanceMinorUnits,
    0,
  );
  const available = account.currentBalanceMinorUnits - allocated;

  return (
    <AccountModalSheet onClose={onClose} title={account.name}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>ACCOUNT BALANCE</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(account.currentBalanceMinorUnits, account.currencyCode)}
        </Text>
        <Text style={styles.balanceMeta}>
          {activePockets.length} {activePockets.length === 1 ? "pocket" : "pockets"} - {formatCurrency(allocated, account.currencyCode)} allocated
        </Text>
      </View>

      <View style={styles.availableRow}>
        <View style={styles.pocketIcon}>
          <WalletCards color={theme.colors.primary} size={18} />
        </View>
        <View style={styles.pocketInfo}>
          <Text style={styles.pocketName}>Available</Text>
          <Text style={styles.pocketMeta}>Not reserved for a pocket</Text>
        </View>
        <Text style={styles.pocketAmount}>
          {formatCurrency(available, account.currencyCode)}
        </Text>
      </View>

      <View style={common.spread}>
        <AccountText heading>Pockets</AccountText>
        <View style={common.row}>
          {activePockets.length > 0 ? (
            <AccountButton label="Move money" onPress={onMoveFunds} />
          ) : null}
          <AccountButton label="Add pocket" onPress={onAddPocket} primary />
        </View>
      </View>

      {activePockets.length === 0 ? (
        <View style={styles.emptyCard}>
          <AccountText muted>
            Create a pocket for bills, emergencies, travel, or another purpose. Your account total stays unchanged.
          </AccountText>
        </View>
      ) : (
        activePockets.map((pocket) => {
          const progress = pocket.targetAmountMinorUnits
            ? Math.max(0, Math.min(1, pocket.currentBalanceMinorUnits / pocket.targetAmountMinorUnits))
            : null;
          return (
            <Pressable
              key={pocket.id}
              accessibilityRole="button"
              onPress={() => onEditPocket(pocket)}
              style={styles.pocketRow}
            >
              <View style={styles.pocketIcon}>
                <WalletCards color={theme.colors.info} size={18} />
              </View>
              <View style={styles.pocketInfo}>
                <Text numberOfLines={1} style={styles.pocketName}>{pocket.name}</Text>
                {pocket.targetAmountMinorUnits ? (
                  <>
                    <Text style={styles.pocketMeta}>
                      Target {formatCurrency(pocket.targetAmountMinorUnits, account.currencyCode)}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${(progress ?? 0) * 100}%` }]} />
                    </View>
                  </>
                ) : (
                  <Text style={styles.pocketMeta}>No target</Text>
                )}
              </View>
              <Text style={styles.pocketAmount}>
                {formatCurrency(pocket.currentBalanceMinorUnits, account.currencyCode)}
              </Text>
              <ChevronRight color={theme.colors.textMuted} size={16} />
            </Pressable>
          );
        })
      )}

      <AccountText muted>
        Pockets are planning allocations inside this app. They do not create bank accounts or move funds at your bank.
      </AccountText>
      <AccountButton label="Edit account settings" onPress={onEditAccount} />
    </AccountModalSheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    balanceCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.large,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
    },
    balanceLabel: { color: theme.colors.textMuted, fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.bold },
    balanceAmount: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.xxl, fontWeight: theme.typography.fontWeight.bold, fontVariant: ["tabular-nums"] },
    balanceMeta: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, textAlign: "center" },
    availableRow: { alignItems: "center", backgroundColor: `${theme.colors.primary}0D`, borderColor: `${theme.colors.primary}40`, borderRadius: theme.borderRadius.medium, borderWidth: 1, flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.md },
    pocketRow: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.borderRadius.medium, borderWidth: 1, flexDirection: "row", gap: theme.spacing.md, minHeight: 64, padding: theme.spacing.md },
    pocketIcon: { alignItems: "center", backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.small, height: 36, justifyContent: "center", width: 36 },
    pocketInfo: { flex: 1, minWidth: 0 },
    pocketName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold },
    pocketMeta: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs, marginTop: 2 },
    pocketAmount: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold, fontVariant: ["tabular-nums"] },
    progressTrack: { backgroundColor: theme.colors.border, borderRadius: 3, height: 5, marginTop: 6, overflow: "hidden" },
    progressFill: { backgroundColor: theme.colors.info, height: "100%" },
    emptyCard: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.medium, padding: theme.spacing.lg },
  });
}
