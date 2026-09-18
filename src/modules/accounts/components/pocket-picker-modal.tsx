import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, WalletCards } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import type { PocketListItem } from "@/modules/accounts/types/account.types";
import { formatCurrency } from "@/utils/currency";

export function PocketPickerModal({
  visible,
  accountId,
  currencyCode,
  pockets,
  selectedPocketId,
  onClose,
  onSelectPocket,
  title = "Select Pocket",
}: {
  visible: boolean;
  accountId: string;
  currencyCode: string;
  pockets: PocketListItem[];
  selectedPocketId: string | null;
  onClose: () => void;
  onSelectPocket: (pocketId: string | null) => void;
  title?: string;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  if (!visible) return null;

  const options = pockets.filter(
    (pocket) =>
      pocket.accountId === accountId &&
      (!pocket.isArchived || pocket.id === selectedPocketId),
  );

  const select = (pocketId: string | null) => {
    onSelectPocket(pocketId);
    onClose();
  };

  return (
    <AccountModalSheet onClose={onClose} title={title}>
      <Text style={styles.explanation}>
        Pockets organize money inside this account. They do not move funds at your bank.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => select(null)}
        style={[styles.option, selectedPocketId === null && styles.selectedOption]}
      >
        <View style={styles.iconBadge}>
          <WalletCards color={theme.colors.primary} size={18} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.name}>Available</Text>
          <Text style={styles.meta}>Not reserved for a pocket</Text>
        </View>
        {selectedPocketId === null ? <Check color={theme.colors.primary} size={20} /> : null}
      </Pressable>
      {options.map((pocket) => (
        <Pressable
          key={pocket.id}
          accessibilityRole="button"
          onPress={() => select(pocket.id)}
          style={[styles.option, selectedPocketId === pocket.id && styles.selectedOption]}
        >
          <View style={styles.iconBadge}>
            <WalletCards color={theme.colors.info} size={18} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.name}>{pocket.name}</Text>
            <Text style={styles.meta}>
              {formatCurrency(pocket.currentBalanceMinorUnits, currencyCode)}
              {pocket.isArchived ? " - Archived" : ""}
            </Text>
          </View>
          {selectedPocketId === pocket.id ? <Check color={theme.colors.primary} size={20} /> : null}
        </Pressable>
      ))}
    </AccountModalSheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    explanation: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
    },
    option: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 60,
      padding: theme.spacing.md,
    },
    selectedOption: {
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: theme.colors.primary,
    },
    iconBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    optionText: { flex: 1 },
    name: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    meta: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs },
  });
}
