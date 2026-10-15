import { AccountPickerModal, useAccounts } from "@/modules/accounts";

export interface SettingsDefaultAccountPickerModalProps {
  allowNoneLabel: string;
  onClose: () => void;
  onSelect: (accountId: string | null, pocketId: string | null) => void;
  selectedAccountId: string | null;
  selectedPocketId: string | null;
  title: string;
}

export function SettingsDefaultAccountPickerModal({
  allowNoneLabel,
  onClose,
  onSelect,
  selectedAccountId,
  selectedPocketId,
  title,
}: SettingsDefaultAccountPickerModalProps) {
  const { accounts, pockets } = useAccounts();

  return (
    <AccountPickerModal
      accounts={accounts}
      allowNone
      noneLabel={allowNoneLabel}
      onClose={onClose}
      onSelectLocation={(account, pocketId) => {
        onSelect(account.id, pocketId);
      }}
      onSelectNone={() => {
        onSelect(null, null);
      }}
      pockets={pockets}
      selectedAccountId={selectedAccountId}
      selectedPocketId={selectedPocketId}
      title={title}
      visible
    />
  );
}
