import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronRight, Lock } from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  ConfirmModal,
  DatePickerModal,
  FullScreenFormModal,
  IconHelper,
  IconPickerModal,
  KeyboardAwareForm,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountTypePickerModal } from "@/modules/accounts/components/account-type-picker-modal";
import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";
import type { AccountInput } from "@/modules/accounts/schemas/account.schema";
import type {
  AccountListItem,
  AccountType,
} from "@/modules/accounts/types/account.types";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import {
  localDateInput,
  creditLimitInput,
  maintainingAmountInput,
  openingAmountInput,
} from "@/modules/accounts/utils/account-input";
import { formatDisplayDate } from "@/modules/accounts/utils/format-display-date";
import {
  isCreditCardAccountType,
  supportsPockets,
} from "@/modules/accounts/utils/pocket-eligibility";
import { applySignedAmount } from "@/utils/amount-sign";

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
  onLockStartingBalance,
}: {
  visible: boolean;
  account?: AccountListItem;
  types: AccountType[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (value: AccountInput, id?: string) => Promise<boolean>;
  onDelete?: (accountId: string) => Promise<boolean>;
  onRestore?: (accountId: string) => Promise<boolean>;
  onLockStartingBalance?: (accountId: string) => Promise<boolean>;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [value, setValue] = useState<AccountInput>(() => ({
    name: account?.name ?? "",
    note: account?.note ?? "",
    iconKey: account?.iconKey ?? null,
    accountTypeId: account?.accountTypeId ?? SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
    openingAmount: openingAmountInput(account?.openingBalanceMinorUnits ?? 0),
    openingDate: localDateInput(account?.openingBalanceAt),
    hideFromSelection: account?.hideFromSelection ?? false,
    hideFromReports: account?.hideFromReports ?? false,
    pocketEnabled: account?.pocketEnabled ?? false,
    maintainingAmount: maintainingAmountInput(account?.maintainingBalanceMinorUnits),
    creditCardDetails: account?.creditCardDetails
      ? {
          creditLimit: creditLimitInput(
            account.creditCardDetails.creditLimitMinorUnits,
          ),
          statementDay: String(account.creditCardDetails.statementDay),
          paymentDueDay: String(account.creditCardDetails.paymentDueDay),
        }
      : undefined,
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
      iconKey: account?.iconKey ?? null,
      accountTypeId: account?.accountTypeId ?? SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
      openingAmount,
      openingDate: localDateInput(account?.openingBalanceAt),
      hideFromSelection: account?.hideFromSelection ?? false,
      hideFromReports: account?.hideFromReports ?? false,
      pocketEnabled: account?.pocketEnabled ?? false,
      maintainingAmount: maintainingAmountInput(account?.maintainingBalanceMinorUnits),
      creditCardDetails: account?.creditCardDetails
        ? {
            creditLimit: creditLimitInput(
              account.creditCardDetails.creditLimitMinorUnits,
            ),
            statementDay: String(account.creditCardDetails.statementDay),
            paymentDueDay: String(account.creditCardDetails.paymentDueDay),
          }
        : undefined,
    });
    if (account) {
      setAmountSign(parseAmountSign(openingAmount));
    } else {
      const defaultType = types.find(
        (t) => t.id === SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
      );
      setAmountSign(defaultType?.accountGroup === "liability" ? "-" : "+");
    }
    setConfirmAction(null);
  }, [visible, account, types]);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [maintainingCalculatorOpen, setMaintainingCalculatorOpen] = useState(false);
  const [creditLimitCalculatorOpen, setCreditLimitCalculatorOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "archive" | "restore" | "lock-balance" | null
  >(null);

  const foreign = !!account && account.currencyCode !== "PHP";
  const startingBalanceLocked = account?.startingBalanceLocked ?? false;
  const openingBalanceReadOnly = pending || foreign || startingBalanceLocked;
  const selectedType = types.find((t) => t.id === value.accountTypeId);
  const currentIconKey = value.iconKey || selectedType?.iconKey || "landmark";
  const isCreditCardType = isCreditCardAccountType(
    value.accountTypeId,
    selectedType?.name,
  );
  const pocketEligible = supportsPockets(
    value.accountTypeId,
    selectedType?.accountGroup,
    selectedType?.name,
  );

  const amountMinorUnits = useMemo(() => {
    const stripped = stripAmountSign(value.openingAmount || "0");
    const parsed = Math.round(parseFloat(stripped || "0") * 100);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }, [value.openingAmount]);

  const maintainingMinorUnits = useMemo(() => {
    const stripped = (value.maintainingAmount ?? "").trim() || "0";
    const parsed = Math.round(parseFloat(stripped || "0") * 100);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }, [value.maintainingAmount]);

  const creditLimitMinorUnits = useMemo(() => {
    const input = value.creditCardDetails?.creditLimit.trim() || "0";
    const parsed = Math.round(parseFloat(input) * 100);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }, [value.creditCardDetails?.creditLimit]);

  const typeColor = accountColor(
    theme,
    selectedType?.color ?? selectedType?.hexColorsId ?? null,
  );

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
      return;
    }
    if (confirmAction === "lock-balance" && onLockStartingBalance) {
      void onLockStartingBalance(account.id).then((locked) => {
        if (locked) setConfirmAction(null);
      });
    }
  };

  const handleSave = () => {
    const stripped = stripAmountSign(value.openingAmount || "0");
    const signedAmount =
      amountSign === "-" && stripped !== "0" && stripped !== "0.00"
        ? `-${stripped}`
        : stripped;
    void onSave(
      {
        ...value,
        openingAmount: signedAmount,
        creditCardDetails: isCreditCardType
          ? value.creditCardDetails
          : null,
      },
      account?.id,
    ).then(
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
        <KeyboardAwareForm
          contentContainerStyle={styles.content}
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

          <Text style={styles.fieldLabel}>Account Icon</Text>
          <Pressable
            accessibilityLabel={`Current icon: ${currentIconKey}. Tap to change icon.`}
            accessibilityRole="button"
            disabled={pending}
            onPress={() => setIconPickerOpen(true)}
            style={styles.iconCard}
          >
            <View style={styles.iconCardLeft}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${typeColor}20`,
                    borderColor: `${typeColor}50`,
                  },
                ]}
              >
                <IconHelper color={typeColor} name={currentIconKey} size={22} />
              </View>
              <View style={styles.iconInfo}>
                <Text style={styles.iconNameText}>{currentIconKey}</Text>
                <Text style={styles.iconSubtext}>
                  {value.iconKey
                    ? "Custom icon selected · Tap to change"
                    : `Using group default (${selectedType?.iconKey ?? "landmark"})`}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor: `${theme.colors.primary}15`,
                  borderColor: `${theme.colors.primary}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.changeBadgeText,
                  { color: theme.colors.primary },
                ]}
              >
                Change Icon
              </Text>
            </View>
          </Pressable>

          <AmountCalculatorField
            amountMinorUnits={amountMinorUnits}
            amountSign={amountSign}
            currencyCode={account?.currencyCode ?? "PHP"}
            disabled={openingBalanceReadOnly}
            label="Starting Balance"
            labelAccessory={
              startingBalanceLocked ? (
                <View style={styles.lockedBadge}>
                  <Lock color={theme.colors.textMuted} size={12} />
                  <Text style={styles.lockedBadgeText}>Locked</Text>
                </View>
              ) : account && onLockStartingBalance ? (
                <Pressable
                  accessibilityLabel="Lock starting balance"
                  accessibilityRole="button"
                  disabled={pending}
                  hitSlop={4}
                  onPress={() => setConfirmAction("lock-balance")}
                  style={styles.lockButton}
                >
                  <Lock color={theme.colors.warning} size={12} />
                  <Text style={styles.lockButtonText}>Lock Starting Balance</Text>
                </Pressable>
              ) : null
            }
            onOpenCalculator={() => setCalculatorOpen(true)}
            onToggleSign={() => {
              setAmountSign((prev) => (prev === "+" ? "-" : "+"));
            }}
          />
          {startingBalanceLocked ? (
            <Text style={styles.helperText}>
              Starting balance is locked and can no longer be changed.
            </Text>
          ) : null}

          <AmountCalculatorField
            amountMinorUnits={maintainingMinorUnits}
            disabled={pending}
            label="Maintaining Balance"
            showCurrencyPill={false}
            showSignToggle={false}
            onOpenCalculator={() => setMaintainingCalculatorOpen(true)}
          />

          {pocketEligible ? (
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Enable pockets</Text>
                <Text style={styles.toggleHint}>
                  Show Main and allow separate pocket balances for this account.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Enable pockets"
                disabled={pending}
                onValueChange={(pocketEnabled) =>
                  setValue((prev) => ({ ...prev, pocketEnabled }))
                }
                thumbColor="#FFFFFF"
                trackColor={{
                  false: theme.colors.borderStrong,
                  true: theme.colors.primary,
                }}
                value={value.pocketEnabled}
              />
            </View>
          ) : null}

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleLabel}>Hide from selection</Text>
              <Text style={styles.toggleHint}>
                Exclude this account from transaction account pickers.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Hide from selection"
              disabled={pending}
              onValueChange={(hideFromSelection) =>
                setValue((prev) => ({ ...prev, hideFromSelection }))
              }
              thumbColor="#FFFFFF"
              trackColor={{
                false: theme.colors.borderStrong,
                true: theme.colors.primary,
              }}
              value={value.hideFromSelection}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleLabel}>Hide from reports</Text>
              <Text style={styles.toggleHint}>
                Exclude this account from net worth and opening totals.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Hide from reports"
              disabled={pending}
              onValueChange={(hideFromReports) =>
                setValue((prev) => ({ ...prev, hideFromReports }))
              }
              thumbColor="#FFFFFF"
              trackColor={{
                false: theme.colors.borderStrong,
                true: theme.colors.primary,
              }}
              value={value.hideFromReports}
            />
          </View>

          <Text style={styles.fieldLabel}>Opening Date</Text>
          <Pressable
            accessibilityLabel="Choose opening date"
            accessibilityRole="button"
            disabled={openingBalanceReadOnly}
            onPress={() => setDatePickerOpen(true)}
            style={styles.selectorPill}
          >
            <Text style={styles.selectorValue}>
              {formatDisplayDate(value.openingDate)}
            </Text>
            <ChevronRight color={theme.colors.textMuted} size={18} />
          </Pressable>

          {isCreditCardType ? (
            <View style={styles.creditCardSection}>
              <Text style={styles.sectionTitle}>Credit Card Details</Text>
              <AmountCalculatorField
                amountMinorUnits={creditLimitMinorUnits}
                currencyCode={account?.currencyCode ?? "PHP"}
                disabled={pending}
                label="Credit Limit"
                showSignToggle={false}
                onOpenCalculator={() => setCreditLimitCalculatorOpen(true)}
              />
              <View style={styles.billingDaysRow}>
                <View style={styles.billingDayField}>
                  <Text style={styles.fieldLabel}>Statement Day</Text>
                  <TextInput
                    accessibilityLabel="Statement day of the month"
                    editable={!pending}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="1–31"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    value={value.creditCardDetails?.statementDay ?? ""}
                    onChangeText={(statementDay) =>
                      setValue((prev) => ({
                        ...prev,
                        creditCardDetails: {
                          creditLimit:
                            prev.creditCardDetails?.creditLimit ?? "",
                          paymentDueDay:
                            prev.creditCardDetails?.paymentDueDay ?? "",
                          statementDay: statementDay.replace(/\D/g, ""),
                        },
                      }))
                    }
                  />
                </View>
                <View style={styles.billingDayField}>
                  <Text style={styles.fieldLabel}>Payment Due Day</Text>
                  <TextInput
                    accessibilityLabel="Payment due day of the month"
                    editable={!pending}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="1–31"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    value={value.creditCardDetails?.paymentDueDay ?? ""}
                    onChangeText={(paymentDueDay) =>
                      setValue((prev) => ({
                        ...prev,
                        creditCardDetails: {
                          creditLimit:
                            prev.creditCardDetails?.creditLimit ?? "",
                          statementDay:
                            prev.creditCardDetails?.statementDay ?? "",
                          paymentDueDay: paymentDueDay.replace(/\D/g, ""),
                        },
                      }))
                    }
                  />
                </View>
              </View>
              <Text style={styles.helperText}>
                For months with fewer days, billing dates use the last day of
                the month.
              </Text>
            </View>
          ) : null}
        </KeyboardAwareForm>
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel={
          confirmAction === "restore"
            ? "Restore"
            : confirmAction === "lock-balance"
              ? "Lock"
              : "Archive"
        }
        message={
          confirmAction === "restore"
            ? `Restore "${account?.name ?? "this account"}" to the active accounts list? It will be included in totals again.`
            : confirmAction === "lock-balance"
              ? `Lock the starting balance for "${account?.name ?? "this account"}"? This cannot be undone and the starting balance will no longer be editable.`
              : `Archive "${account?.name ?? "this account"}"? It will be hidden from the active list and opening totals, but its data stays intact.`
        }
        pending={pending}
        title={
          confirmAction === "restore"
            ? "Restore account?"
            : confirmAction === "lock-balance"
              ? "Lock starting balance?"
              : "Archive account?"
        }
        variant={confirmAction === "restore" ? "restore" : "destructive"}
        visible={confirmAction !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      <AmountCalculatorModal
        currencyCode={account?.currencyCode ?? "PHP"}
        initialMinorUnits={amountMinorUnits}
        title="Starting Balance"
        visible={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(minorUnits, formatted) => {
          const absDecimal = (Math.abs(minorUnits) / 100).toFixed(2);
          setValue((prev) => ({
            ...prev,
            openingAmount: absDecimal || formatted,
          }));
          setCalculatorOpen(false);
        }}
      />

      <AmountCalculatorModal
        allowNegative={false}
        currencyCode={account?.currencyCode ?? "PHP"}
        initialMinorUnits={creditLimitMinorUnits}
        title="Credit Limit"
        visible={creditLimitCalculatorOpen}
        onClose={() => setCreditLimitCalculatorOpen(false)}
        onConfirm={(_minorUnits, formatted) => {
          setValue((prev) => ({
            ...prev,
            creditCardDetails: {
              creditLimit: formatted,
              statementDay: prev.creditCardDetails?.statementDay ?? "",
              paymentDueDay: prev.creditCardDetails?.paymentDueDay ?? "",
            },
          }));
          setCreditLimitCalculatorOpen(false);
        }}
      />

      <AmountCalculatorModal
        currencyCode={account?.currencyCode ?? "PHP"}
        initialMinorUnits={maintainingMinorUnits}
        title="Maintaining Balance"
        visible={maintainingCalculatorOpen}
        onClose={() => setMaintainingCalculatorOpen(false)}
        onConfirm={(_minorUnits, formatted) => {
          setValue((prev) => ({ ...prev, maintainingAmount: formatted }));
          setMaintainingCalculatorOpen(false);
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
        onSelect={(accountTypeId) => {
          const selectedType = types.find((t) => t.id === accountTypeId);
          setValue((prev) => ({
            ...prev,
            accountTypeId,
            creditCardDetails: isCreditCardAccountType(
              accountTypeId,
              selectedType?.name,
            )
              ? prev.creditCardDetails ?? {
                  creditLimit: "",
                  statementDay: "",
                  paymentDueDay: "",
                }
              : prev.creditCardDetails,
            pocketEnabled: supportsPockets(
              accountTypeId,
              selectedType?.accountGroup,
              selectedType?.name,
            )
              ? prev.pocketEnabled
              : false,
          }));
          if (selectedType) {
            setAmountSign(selectedType.accountGroup === "liability" ? "-" : "+");
          }
        }}
      />

      <IconPickerModal
        onClose={() => setIconPickerOpen(false)}
        onSelectIcon={(selected) => {
          setValue((prev) => ({ ...prev, iconKey: selected }));
          setIconPickerOpen(false);
        }}
        selectedIcon={currentIconKey}
        themeColor={typeColor}
        title="Select Account Icon"
        visible={iconPickerOpen}
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
    iconCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    iconCardLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    iconInfo: {
      gap: 2,
    },
    iconNameText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "capitalize",
    },
    iconSubtext: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    changeBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    changeBadgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    creditCardSection: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    billingDaysRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    billingDayField: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    toggleRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    toggleCopy: {
      flex: 1,
      gap: 2,
    },
    toggleLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    toggleHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
    },
    lockButton: {
      alignItems: "center",
      backgroundColor: `${theme.colors.warning}15`,
      borderColor: `${theme.colors.warning}40`,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    lockButtonText: {
      color: theme.colors.warning,
      fontSize: 12,
      fontWeight: "600",
    },
    lockedBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.borderStrong}20`,
      borderColor: theme.colors.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    lockedBadgeText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
