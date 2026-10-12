import { CurrencyPickerModal } from "@/modules/currencies/components/currency-picker-modal";

export function TransactionCurrencyPickerModal({
  visible,
  selectedCode,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedCode: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <CurrencyPickerModal
      selectedCode={selectedCode}
      subtitle="Amounts are entered in this currency. Your account balance uses the account currency at the current rate when they differ."
      title="Transaction currency"
      visible={visible}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
