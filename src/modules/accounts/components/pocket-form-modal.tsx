import { useEffect, useState } from "react";
import { View } from "react-native";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import {
  AccountButton,
  AccountField,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type { AccountListItem, PocketListItem } from "@/modules/accounts/types/account.types";
import { maintainingAmountInput } from "@/modules/accounts/utils/account-input";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function PocketFormModal({
  visible,
  account,
  pocket,
  mutations,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account: AccountListItem | null;
  pocket?: PocketListItem;
  mutations: AccountMutations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const styles = useThemeStyles(accountStyles);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  useEffect(() => {
    if (visible) {
      setName(pocket?.name ?? "");
      setTargetAmount(maintainingAmountInput(pocket?.targetAmountMinorUnits));
      mutations.clearError();
    }
  }, [visible, pocket]);

  if (!visible || !account) return null;

  const save = async () => {
    const saved = await mutations.savePocket(
      { accountId: account.id, name, targetAmount },
      pocket?.id,
    );
    if (saved) onSaved();
  };

  const archive = async () => {
    if (!pocket) return;
    const saved = await mutations.archivePocket(pocket.id, !pocket.isArchived);
    if (saved) onSaved();
  };

  return (
    <AccountModalSheet
      error={mutations.error}
      onClose={onClose}
      pending={mutations.pending}
      title={pocket ? "Edit Pocket" : "Add Pocket"}
    >
      <AccountText muted>
        {account.name} - {account.currencyCode}. This is an app-only allocation and does not move money at your bank.
      </AccountText>
      <AccountField
        autoCapitalize="words"
        label="Pocket name"
        maxLength={60}
        onChangeText={setName}
        placeholder="e.g. Emergency Fund, Bills, Travel"
        value={name}
      />
      <AccountField
        keyboardType="decimal-pad"
        label="Target amount (optional)"
        onChangeText={setTargetAmount}
        placeholder="0.00"
        value={targetAmount}
      />
      <View style={styles.row}>
        <AccountButton disabled={mutations.pending} label="Cancel" onPress={onClose} />
        <AccountButton
          disabled={mutations.pending}
          label={mutations.pending ? "Saving..." : "Save pocket"}
          onPress={() => void save()}
          primary
        />
      </View>
      {pocket ? (
        <>
          <AccountText heading>{pocket.isArchived ? "Restore pocket" : "Archive pocket"}</AccountText>
          <AccountText muted>
            A pocket must have a zero balance before it can be archived. Its history stays intact.
          </AccountText>
          <AccountButton
            disabled={mutations.pending}
            label={pocket.isArchived ? "Restore pocket" : "Archive pocket"}
            onPress={() => void archive()}
          />
        </>
      ) : null}
    </AccountModalSheet>
  );
}
