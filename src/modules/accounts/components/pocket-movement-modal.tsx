import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import {
  AccountButton,
  AccountField,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type { AccountListItem, PocketListItem } from "@/modules/accounts/types/account.types";
import { parseMaintainingAmount } from "@/modules/accounts/utils/account-input";
import { formatCurrency } from "@/utils/currency";

const AVAILABLE = "available";

export function PocketMovementModal({
  visible,
  account,
  pockets,
  mutations,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account: AccountListItem | null;
  pockets: PocketListItem[];
  mutations: AccountMutations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const common = useThemeStyles(accountStyles);
  const styles = useThemeStyles(createStyles);
  const [fromId, setFromId] = useState(AVAILABLE);
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const activePockets = useMemo(
    () => pockets.filter((pocket) => !pocket.isArchived),
    [pockets],
  );
  const allocated = pockets.reduce(
    (sum, pocket) => sum + pocket.currentBalanceMinorUnits,
    0,
  );
  const accountBalance = account?.currentBalanceMinorUnits ?? 0;
  const available = accountBalance - allocated;

  useEffect(() => {
    if (visible) {
      setFromId(AVAILABLE);
      setToId(activePockets[0]?.id ?? "");
      setAmount("");
      setNote("");
      setLocalError(null);
      mutations.clearError();
    }
  }, [visible, account?.id]);

  if (!visible || !account) return null;

  const locations = [
    { id: AVAILABLE, name: "Available", balance: available },
    ...activePockets.map((pocket) => ({
      id: pocket.id,
      name: pocket.name,
      balance: pocket.currentBalanceMinorUnits,
    })),
  ];

  const save = async () => {
    try {
      const amountMinorUnits = parseMaintainingAmount(amount);
      if (amountMinorUnits <= 0) throw new Error("Enter an amount greater than zero.");
      setLocalError(null);
      const saved = await mutations.movePocketFunds({
        accountId: account.id,
        fromPocketId: fromId === AVAILABLE ? null : fromId,
        toPocketId: toId === AVAILABLE ? null : toId,
        amountMinorUnits,
        note,
      });
      if (saved) onSaved();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Check the movement details.");
    }
  };

  return (
    <AccountModalSheet
      error={localError || mutations.error}
      onClose={onClose}
      pending={mutations.pending}
      title="Move Pocket Funds"
    >
      <AccountText muted>
        Reallocate money inside {account.name}. The account balance and reports will not change.
      </AccountText>

      <AccountText heading>From</AccountText>
      <View style={common.row}>
        {locations.map((location) => (
          <LocationButton
            key={`from-${location.id}`}
            currencyCode={account.currencyCode}
            location={location}
            selected={fromId === location.id}
            onPress={() => {
              setFromId(location.id);
              if (toId === location.id) {
                setToId(locations.find((item) => item.id !== location.id)?.id ?? "");
              }
            }}
          />
        ))}
      </View>

      <AccountText heading>To</AccountText>
      <View style={common.row}>
        {locations.filter((location) => location.id !== fromId).map((location) => (
          <LocationButton
            key={`to-${location.id}`}
            currencyCode={account.currencyCode}
            location={location}
            selected={toId === location.id}
            onPress={() => setToId(location.id)}
          />
        ))}
      </View>

      <AccountField
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={setAmount}
        placeholder="0.00"
        value={amount}
      />
      <AccountField
        label="Note (optional)"
        maxLength={200}
        onChangeText={setNote}
        placeholder="Why are you moving these funds?"
        value={note}
      />
      <View style={common.row}>
        <AccountButton disabled={mutations.pending} label="Cancel" onPress={onClose} />
        <AccountButton
          disabled={mutations.pending || !toId}
          label={mutations.pending ? "Moving..." : "Move funds"}
          onPress={() => void save()}
          primary
        />
      </View>
    </AccountModalSheet>
  );
}

function LocationButton({
  location,
  currencyCode,
  selected,
  onPress,
}: {
  location: { id: string; name: string; balance: number };
  currencyCode: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.location, selected && styles.locationSelected]}
    >
      <Text style={[styles.locationName, selected && styles.locationNameSelected]}>
        {location.name}
      </Text>
      <Text style={styles.locationBalance}>
        {formatCurrency(location.balance, currencyCode)}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    location: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      minWidth: 132,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    locationSelected: {
      backgroundColor: `${theme.colors.primary}14`,
      borderColor: theme.colors.primary,
    },
    locationName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    locationNameSelected: { color: theme.colors.primary },
    locationBalance: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
    },
  });
}
