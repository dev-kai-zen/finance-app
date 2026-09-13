import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { localDateInput } from "@/modules/accounts/utils/account-input";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";

export function AccountRow({
  account,
  onPress,
}: {
  account: AccountListItem;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const isLiability = account.accountType?.accountGroup === "liability";
  const amount =
    account.currencyCode === "PHP"
      ? formatCurrency(account.openingBalanceMinorUnits, "PHP")
      : `${account.openingBalanceMinorUnits.toLocaleString()} ${account.currencyCode}`;

  return (
    <Pressable
      accessibilityLabel={`${account.name}, opening balance ${amount}. Open account actions.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        account.isArchived && styles.archivedCard,
        pressed && styles.pressedCard,
      ]}
    >
      <View style={styles.leftCol}>
        <AccountTypeBadge
          color={account.accountType?.color ?? null}
          iconKey={account.accountType?.iconKey ?? null}
        />
        <View style={styles.infoCol}>
          <Text numberOfLines={1} style={styles.accountName}>
            {account.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>
                {account.accountType?.name ?? "Account"}
              </Text>
            </View>
            <Text style={styles.dateText}>
              · {localDateInput(account.openingBalanceAt)}
            </Text>
            {account.isArchived && (
              <Text style={styles.archivedTag}>· Archived</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text
          style={[
            styles.amountText,
            isLiability && styles.liabilityAmountText,
            account.isArchived && styles.archivedAmountText,
          ]}
        >
          {amount}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
      ...theme.shadows.card,
    },
    archivedCard: {
      opacity: 0.65,
    },
    pressedCard: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    leftCol: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    infoCol: {
      flex: 1,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      lineHeight: 20,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 3,
    },
    typeTag: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    typeTagText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    archivedTag: {
      color: theme.colors.warning,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    rightCol: {
      alignItems: "flex-end",
    },
    amountText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    liabilityAmountText: {
      color: theme.colors.warning,
    },
    archivedAmountText: {
      color: theme.colors.textMuted,
    },
  });
}
