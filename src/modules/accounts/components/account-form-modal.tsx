import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  ConfirmModal,
  DatePickerModal,
  FullScreenFormModal,
  IconHelper,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountTypePickerModal } from "@/modules/accounts/components/account-type-picker-modal";
import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";
import type { AccountInput } from "@/modules/accounts/schemas/account.schema";
import type { Account, AccountType } from "@/modules/accounts/types/account.types";
import { localDateInput, openingAmountInput } from "@/modules/accounts/utils/account-input";
import { formatDisplayDate } from "@/modules/accounts/utils/format-display-date";

function parseAmountSign(openingAmount: string): "+" | "-" {
  return openingAmount.trim().startsWith("-") ? "-" : "+";
}

function stripAmountSign(openingAmount: string): string {
  const trimmed = openingAmount.trim();
  return trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;
}

export function AccountFormModal({
  visible,
  account,
  types,
  pending,
  error,
  onClose,
  onSave,
  onDelete,
  onRestore,
}: {
  visible: boolean;
  account?: Account;
  types: AccountType[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (value: AccountInput, id?: string) => Promise<boolean>;
  onDelete?: (accountId: string) => Promise<boolean>;
  onRestore?: (accountId: string) => Promise<boolean>;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [value, setValue] = useState<AccountInput>(() => ({
    name: account?.name ?? "",
    note: account?.note ?? "",
    accountTypeId: account?.accountTypeId ?? SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
    openingAmount: openingAmountInput(account?.openingBalanceMinorUnits ?? 0),
    openingDate: localDateInput(account?.openingBalanceAt),
  }));
  const [amountSign, setAmountSign] = useState<"+" | "-">(() =>
    parseAmountSign(openingAmountInput(account?.openingBalanceMinorUnits ?? 0)),
  );

  useEffect(() => {
    if (!visible) return;
    const openingAmount = openingAmountInput(account?.openingBalanceMinorUnits ?? 0);
    setValue({
      name: account?.name ?? "",
      note: account?.note ?? "",
      accountTypeId: account?.accountTypeId ?? SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
      openingAmount,
      openingDate: localDateInput(account?.openingBalanceAt),
    });
    setAmountSign(parseAmountSign(openingAmount));
    setConfirmAction(null);
  }, [visible, account]);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | null>(
    null,
  );

  const foreign = !!account && account.currencyCode !== "PHP";
  const selectedType = types.find((t) => t.id === value.accountTypeId);
  const isCreditCardType =
    value.accountTypeId === SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_CREDIT_CARD ||
    selectedType?.name.toLowerCase().includes("credit card");

  const amountMinorUnits = useMemo(() => {
    const stripped = stripAmountSign(value.openingAmount || "0");
    const parsed = Math.round(parseFloat(stripped || "0") * 100);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }, [value.openingAmount]);

  const typeColor = selectedType?.color
    ? theme.colors.categorical[
        selectedType.color as keyof typeof theme.colors.categorical
      ] ?? theme.colors.primary
    : theme.colors.primary;

  const handleConfirmAction = () => {
    if (!account) return;
    if (confirmAction === "restore" && onRestore) {
      void onRestore(account.id).then((restored) => {
        if (restored) {
          setConfirmAction(null);
          onClose();
        }
      });
      return;
    }
    if (confirmAction === "archive" && onDelete) {
      void onDelete(account.id).then((archived) => {
        if (archived) {
          setConfirmAction(null);
          onClose();
        }
      });
    }
  };

  const handleSave = () => {
    const stripped = stripAmountSign(value.openingAmount || "0");
    const signedAmount =
      amountSign === "-" && stripped !== "0" && stripped !== "0.00"
        ? `-${stripped}`
        : stripped;
    void onSave({ ...value, openingAmount: signedAmount }, account?.id).then(
      (saved) => {
        if (saved) onClose();
      },
    );
  };

  if (!visible) return null;

  return (
    <>
      <FullScreenFormModal
        deleteAction={account?.isArchived ? "restore" : "delete"}
        deleteLabel={account?.isArchived ? "Restore account" : "Archive account"}
        pending={pending}
        title={account ? "Edit Account" : "New Account"}
        visible={visible}
        onClose={onClose}
        onDelete={
          account?.isArchived && onRestore
            ? () => setConfirmAction("restore")
            : account && !account.isArchived && onDelete
              ? () => setConfirmAction("archive")
              : undefined
        }
        onSave={handleSave}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Account Name</Text>
          <TextInput
            editable={!pending}
            maxLength={100}
            placeholder="Account Name"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.textInput}
            value={value.name}
            onChangeText={(name) => setValue((prev) => ({ ...prev, name }))}
          />

          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            editable={!pending}
            maxLength={1000}
            multiline
            placeholder="Note"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.textInput, styles.textArea]}
            value={value.note ?? ""}
            onChangeText={(note) => setValue((prev) => ({ ...prev, note }))}
          />

          <AmountCalculatorField
            amountMinorUnits={amountMinorUnits}
            amountSign={amountSign}
            currencyCode={account?.currencyCode ?? "PHP"}
            disabled={pending || foreign}
            label="Starting Balance"
            onOpenCalculator={() => setCalculatorOpen(true)}
            onToggleSign={() => {
              setAmountSign((prev) => (prev === "+" ? "-" : "+"));
            }}
          />
          {selectedType?.accountGroup === "liability" ? (
            <Text style={styles.helperText}>
              Use a negative amount for money owed. A positive amount means an
              overpayment or credit balance.
            </Text>
          ) : (
            <Text style={styles.helperText}>
              Use a negative amount for an overdraft; positive means money
              available.
            </Text>
          )}

          <Text style={styles.fieldLabel}>Opening Date</Text>
          <Pressable
            accessibilityLabel="Choose opening date"
            accessibilityRole="button"
            disabled={pending || foreign}
            onPress={() => setDatePickerOpen(true)}
            style={styles.selectorPill}
          >
            <Text style={styles.selectorValue}>
              {formatDisplayDate(value.openingDate)}
            </Text>
            <ChevronRight color={theme.colors.textMuted} size={18} />
          </Pressable>

          <Text style={styles.fieldLabel}>Account Type</Text>
          <Pressable
            accessibilityLabel="Choose account type"
            accessibilityRole="button"
            disabled={pending}
            onPress={() => setTypePickerOpen(true)}
            style={styles.selectorPill}
          >
            <View style={[styles.typeIcon, { backgroundColor: `${typeColor}20` }]}>
              <IconHelper
                color={typeColor}
                name={selectedType?.iconKey ?? "landmark"}
                size={18}
              />
            </View>
            <Text numberOfLines={1} style={styles.selectorValue}>
              {selectedType?.name ?? "Select type"}
            </Text>
            <ChevronRight color={theme.colors.textMuted} size={18} />
          </Pressable>

          {isCreditCardType ? (
            <View style={styles.devSection}>
              <Text style={styles.fieldLabel}>Credit Card Details</Text>
              <View style={styles.devCard}>
                <Text style={styles.devTitle}>Ongoing Development</Text>
                <Text style={styles.devText}>
                  Credit limit, statement day, and payment due fields will be
                  added here. The layout follows Kaizen Finance, but the logic is
                  not wired yet.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel={confirmAction === "restore" ? "Restore" : "Archive"}
        message={
          confirmAction === "restore"
            ? `Restore "${account?.name ?? "this account"}" to the active accounts list? It will be included in totals again.`
            : `Archive "${account?.name ?? "this account"}"? It will be hidden from the active list and opening totals, but its data stays intact.`
        }
        pending={pending}
        title={confirmAction === "restore" ? "Restore account?" : "Archive account?"}
        variant={confirmAction === "restore" ? "restore" : "destructive"}
        visible={confirmAction !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      <AmountCalculatorModal
        allowNegative={false}
        currencyCode={account?.currencyCode ?? "PHP"}
        initialMinorUnits={amountMinorUnits}
        title="Starting Balance"
        visible={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(_minorUnits, formatted) => {
          setValue((prev) => ({ ...prev, openingAmount: formatted }));
          setCalculatorOpen(false);
        }}
      />

      <DatePickerModal
        selectedDate={value.openingDate}
        title="Opening Date"
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(dateStr) =>
          setValue((prev) => ({ ...prev, openingDate: dateStr }))
        }
      />

      <AccountTypePickerModal
        existingTypeId={account?.accountTypeId}
        types={types}
        value={value.accountTypeId}
        visible={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        onSelect={(accountTypeId) =>
          setValue((prev) => ({ ...prev, accountTypeId }))
        }
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.5,
      marginBottom: -4,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    textArea: {
      minHeight: 96,
      textAlignVertical: "top",
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
      marginTop: -4,
    },
    selectorPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.lg,
    },
    selectorValue: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    typeIcon: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    devSection: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    devCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
    },
    devTitle: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    devText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
    },
  });
}
