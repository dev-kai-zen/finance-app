import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  Plus,
  WalletCards,
} from "lucide-react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountAmountText,
  bigintToSafeNumber,
} from "@/modules/accounts/components/account-amount-text";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import type { AccountListItem, AccountType, PocketListItem } from "@/modules/accounts/types/account.types";
import { formatCurrency } from "@/utils/currency";
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
  pockets: PocketListItem[];
  expandedPocketAccountIds: ReadonlySet<string>;
  onAddPocket: (account: AccountListItem) => void;
  onEditPocket: (pocket: PocketListItem) => void;
  onSelectAccount: (account: AccountListItem) => void;
  onTogglePockets: (accountId: string) => void;
  onSort?: (groupName: string, accounts: AccountListItem[]) => void;
  onEditType?: (accountType: AccountType) => void;
}

export function AccountTypeGroupCard({
  accountType,
  accounts,
  expandedPocketAccountIds,
  pockets,
  onAddPocket,
  onEditPocket,
  onSelectAccount,
  onSort,
  onEditType,
  onTogglePockets,
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
          const accountPockets = pockets.filter(
            (pocket) => pocket.accountId === account.id && !pocket.isArchived,
          );
          const pocketCount = accountPockets.length;
          const allocated = accountPockets.reduce(
            (sum, pocket) => sum + pocket.currentBalanceMinorUnits,
            0,
          );
          const available = balance - allocated;
          const pocketsExpanded =
            account.pocketEnabled && expandedPocketAccountIds.has(account.id);

          return (
            <View key={account.id} style={styles.accountBlock}>
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
              {account.pocketEnabled ? (
                <Pressable
                  accessibilityLabel={`${pocketsExpanded ? "Collapse" : "Expand"} pockets for ${account.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: pocketsExpanded }}
                  onPress={() => onTogglePockets(account.id)}
                  style={({ pressed }) => [
                    styles.pocketToggle,
                    pressed && styles.pocketActionPressed,
                  ]}
                >
                  <Text style={styles.pocketToggleText}>
                    {pocketCount > 0
                      ? `${pocketCount} ${pocketCount === 1 ? "pocket" : "pockets"}`
                      : "Pockets"}
                  </Text>
                  {pocketsExpanded ? (
                    <ChevronUp color={primaryColor} size={14} />
                  ) : (
                    <ChevronDown color={primaryColor} size={14} />
                  )}
                </Pressable>
              ) : null}

              {pocketsExpanded ? (
                <View style={styles.pocketPanel}>
                  <View style={styles.pocketPanelHeader}>
                    <Text style={styles.pocketPanelTitle}>POCKETS</Text>
                    <Pressable
                      accessibilityLabel={`Add pocket to ${account.name}`}
                      accessibilityRole="button"
                      onPress={() => onAddPocket(account)}
                      style={({ pressed }) => [
                        styles.addPocketButton,
                        pressed && styles.pocketActionPressed,
                      ]}
                    >
                      <Plus color={primaryColor} size={16} />
                      <Text style={[styles.addPocketText, { color: primaryColor }]}>Add Pocket</Text>
                    </Pressable>
                  </View>

                  <View
                    accessibilityLabel={`Main balance ${formatCurrency(available, account.currencyCode)}`}
                    style={styles.pocketRow}
                  >
                    <View style={styles.pocketBranch} />
                    <View style={styles.mainPocketIcon}>
                      <WalletCards color={theme.colors.textSecondary} size={17} />
                    </View>
                    <Text numberOfLines={1} style={styles.pocketName}>Main</Text>
                    <AccountAmountText amountMinorUnits={available} variant="body" />
                  </View>

                  {accountPockets.map((pocket) => (
                    <Pressable
                      key={pocket.id}
                      accessibilityLabel={`${pocket.name}, ${formatCurrency(pocket.currentBalanceMinorUnits, account.currencyCode)}. Edit pocket.`}
                      accessibilityRole="button"
                      onPress={() => onEditPocket(pocket)}
                      style={({ pressed }) => [
                        styles.pocketRow,
                        pressed && styles.pocketActionPressed,
                      ]}
                    >
                      <View style={styles.pocketBranch} />
                      <View style={styles.namedPocketIcon}>
                        <Folder color={theme.colors.info} size={17} />
                      </View>
                      <Text numberOfLines={1} style={styles.pocketName}>{pocket.name}</Text>
                      <AccountAmountText
                        amountMinorUnits={pocket.currentBalanceMinorUnits}
                        variant="body"
                      />
                      <ChevronRight color={theme.colors.textMuted} size={15} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const accountRowInset = theme.spacing.xl;
  const accountTextInset = accountRowInset + 28 + theme.spacing.sm;

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
      marginLeft: accountTextInset,
    },
    accountBlock: {
      position: "relative",
    },
    accountRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 56,
      paddingLeft: accountRowInset,
      paddingRight: theme.spacing.md,
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
    pocketToggle: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      marginBottom: theme.spacing.sm,
      marginLeft: accountTextInset,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    pocketToggleText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pocketActionPressed: {
      opacity: 0.65,
    },
    pocketPanel: {
      backgroundColor: theme.colors.background,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    pocketPanelHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
      paddingLeft: accountTextInset - theme.spacing.md,
    },
    pocketPanelTitle: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.medium,
      letterSpacing: 0.4,
    },
    addPocketButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 5,
    },
    addPocketText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pocketRow: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 46,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    pocketBranch: {
      borderBottomColor: theme.colors.borderStrong,
      borderBottomWidth: 1,
      borderLeftColor: theme.colors.borderStrong,
      borderLeftWidth: 1,
      height: 23,
      width: 20,
    },
    mainPocketIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    namedPocketIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.info}18`,
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    pocketName: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
