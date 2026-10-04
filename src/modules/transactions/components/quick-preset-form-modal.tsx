import { Checkbox, Host } from "@expo/ui";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import {
  AmountCalculatorField,
  AmountCalculatorModal,
  FullScreenFormModal,
  IconHelper,
  KeyboardAwareForm,
  NotificationModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountPickerModal,
  accountColor,
  type AccountListItem,
  type PocketListItem,
} from "@/modules/accounts";
import {
  CategoryPickerModal,
  type Category,
} from "@/modules/categories";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type {
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";
import type { TransactionType } from "../types/transaction.types";

interface QuickPresetFormModalProps {
  visible: boolean;
  preset?: TransactionPreset | null;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  pending?: boolean;
  error?: string | null;
  onClearError: () => void;
  onClose: () => void;
  onSave: (input: TransactionPresetInput, id?: string) => Promise<boolean>;
}

function allCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...(category.subcategories ?? []),
  ]);
}

export function QuickPresetFormModal({
  visible,
  preset = null,
  accounts,
  pockets,
  categories,
  pending = false,
  error = null,
  onClearError,
  onClose,
  onSave,
}: QuickPresetFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [transactionName, setTransactionName] = useState("");
  const [mode, setMode] = useState<TransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [toPocketId, setToPocketId] = useState<string | null>(null);
  const [includeAmount, setIncludeAmount] = useState(true);
  const [amountMinorUnits, setAmountMinorUnits] = useState(0);
  const [amountSign, setAmountSign] = useState<"+" | "-">("-");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [accountPicker, setAccountPicker] = useState<"from" | "to" | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const activeAccounts = accounts.filter((account) => !account.isArchived);
    const nextMode = preset?.type ?? "expense";
    const initialCategory = allCategories(categories).find(
      (category) => category.type === nextMode,
    );
    setTransactionName(preset?.transactionName ?? "");
    setMode(nextMode);
    setAccountId(preset?.accountId ?? activeAccounts[0]?.id ?? "");
    setPocketId(preset?.pocketId ?? null);
    setCategoryId(preset?.categoryId ?? initialCategory?.id ?? "");
    setToAccountId(
      preset?.toAccountId ??
        activeAccounts.find(
          (account) => account.id !== (preset?.accountId ?? activeAccounts[0]?.id),
        )?.id ??
        "",
    );
    setToPocketId(preset?.toPocketId ?? null);
    setIncludeAmount(preset ? preset.amountCents !== null : true);
    setAmountMinorUnits(Math.abs(preset?.amountCents ?? 0));
    setAmountSign((preset?.amountCents ?? -1) < 0 ? "-" : "+");
    setNote(preset?.note ?? "");
    setLocalError(null);
  }, [accounts, categories, preset, visible]);

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedPocket = pockets.find((pocket) => pocket.id === pocketId);
  const selectedToAccount = accounts.find(
    (account) => account.id === toAccountId,
  );
  const selectedToPocket = pockets.find((pocket) => pocket.id === toPocketId);
  const selectedCategory = useMemo(
    () => allCategories(categories).find((category) => category.id === categoryId),
    [categories, categoryId],
  );
  const parentOfSelectedCategory = useMemo(() => {
    if (!selectedCategory?.parentId) return null;
    return categories.find((category) => category.id === selectedCategory.parentId) ?? null;
  }, [categories, selectedCategory]);
  const selectedAccountBalance = selectedAccount
    ? selectedAccount.currentBalanceMinorUnits ?? selectedAccount.openingBalanceMinorUnits
    : 0;
  const selectedToAccountBalance = selectedToAccount
    ? selectedToAccount.currentBalanceMinorUnits ??
      selectedToAccount.openingBalanceMinorUnits
    : 0;
  const selectedLocationBalance = selectedPocket
    ? selectedPocket.currentBalanceMinorUnits
    : selectedAccount?.pocketEnabled
      ? selectedAccountBalance -
        pockets
          .filter(
            (pocket) =>
              pocket.accountId === selectedAccount.id && !pocket.isArchived,
          )
          .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0)
      : selectedAccountBalance;
  const selectedToLocationBalance = selectedToPocket
    ? selectedToPocket.currentBalanceMinorUnits
    : selectedToAccount?.pocketEnabled
      ? selectedToAccountBalance -
        pockets
          .filter(
            (pocket) =>
              pocket.accountId === selectedToAccount.id && !pocket.isArchived,
          )
          .reduce((sum, pocket) => sum + pocket.currentBalanceMinorUnits, 0)
      : selectedToAccountBalance;
  const currencyCode = selectedAccount?.currencyCode ?? "PHP";
  const resolveEntityColor = useResolveEntityColor();
  const selectedCategoryColor = useMemo(() => {
    const colorKey = selectedCategory?.color || parentOfSelectedCategory?.color;
    return resolveEntityColor(colorKey);
  }, [parentOfSelectedCategory, resolveEntityColor, selectedCategory]);
  const selectedAccountColor = useMemo(
    () => accountColor(theme, selectedAccount?.accountType?.color ?? null),
    [selectedAccount, theme],
  );
  const selectedToAccountColor = useMemo(
    () => accountColor(theme, selectedToAccount?.accountType?.color ?? null),
    [selectedToAccount, theme],
  );

  const clearFormError = () => {
    setLocalError(null);
    onClearError();
  };

  const handleClose = () => {
    clearFormError();
    onClose();
  };

  const changeMode = (nextMode: TransactionType) => {
    clearFormError();
    setMode(nextMode);
    setAmountSign(nextMode === "expense" ? "-" : "+");
    if (nextMode !== "transfer") {
      setCategoryId(
        allCategories(categories).find((category) => category.type === nextMode)
          ?.id ?? "",
      );
    }
  };

  const handleSave = async () => {
    clearFormError();
    if (!transactionName.trim()) {
      setLocalError("Enter a transaction name.");
      return;
    }
    if (!accountId) {
      setLocalError("Choose an account.");
      return;
    }
    if (includeAmount && amountMinorUnits <= 0) {
      setLocalError("Enter an amount or turn off Include amount.");
      return;
    }

    const signedAmount =
      mode === "transfer"
        ? Math.abs(amountMinorUnits)
        : amountSign === "-"
          ? -Math.abs(amountMinorUnits)
          : Math.abs(amountMinorUnits);
    const saved = await onSave(
      {
        transactionName: transactionName.trim(),
        type: mode,
        accountId,
        pocketId,
        categoryId: mode === "transfer" ? null : categoryId,
        toAccountId: mode === "transfer" ? toAccountId : null,
        toPocketId: mode === "transfer" ? toPocketId : null,
        amountCents: includeAmount ? signedAmount : null,
        note: note.trim() || null,
      },
      preset?.id,
    );
    if (saved) handleClose();
  };

  const displayError = localError || error;

  return (
    <>
      <FullScreenFormModal
        pending={pending}
        saveDisabled={pending}
        saveLabel={preset ? "Update Quick Preset" : "Create Quick Preset"}
        title={preset ? "Edit Quick Preset" : "New Quick Preset"}
        visible={visible}
        onClose={handleClose}
        onSave={() => void handleSave()}
      >
        <KeyboardAwareForm
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tabBar}>
            {(["expense", "income", "transfer"] as const).map((value) => {
              const active = mode === value;
              const label = value[0].toUpperCase() + value.slice(1);
              const activeColor =
                value === "expense"
                  ? theme.colors.danger
                  : value === "income"
                    ? theme.colors.success
                    : theme.colors.info;

              return (
                <Pressable
                  key={value}
                  accessibilityLabel={`Switch to ${label}`}
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => changeMode(value)}
                  style={[
                    styles.tabItem,
                    active && styles.tabItemActive,
                    active && { backgroundColor: activeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      active && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>TRANSACTION NAME</Text>
            <TextInput
              maxLength={100}
              onChangeText={(value) => {
                clearFormError();
                setTransactionName(value);
              }}
              placeholder="Name"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.nameInput}
              value={transactionName}
            />
          </View>

          <View style={styles.includeAmountPanel}>
            <Host matchContents style={styles.nativeControl}>
              <Checkbox
                disabled={pending}
                label="Include amount"
                onValueChange={(value) => {
                  clearFormError();
                  setIncludeAmount(value);
                }}
                value={includeAmount}
              />
            </Host>
          </View>

          {includeAmount ? (
            <View style={styles.inputGroup}>
              <AmountCalculatorField
                amountMinorUnits={amountMinorUnits}
                amountSign={mode === "transfer" ? "transfer" : amountSign}
                currencyCode={currencyCode}
                disabled={pending}
                label="Amount"
                showSignToggle={true}
                onOpenCalculator={() => setCalculatorOpen(true)}
                onToggleSign={
                  mode === "transfer"
                    ? undefined
                    : () => {
                        clearFormError();
                        setAmountSign((value) => (value === "+" ? "-" : "+"));
                      }
                }
              />
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            {mode === "transfer" ? (
              <Text style={styles.fieldLabel}>TRANSFER FROM</Text>
            ) : null}
            <Pressable
              accessibilityLabel={`Account location ${selectedAccount?.name ?? "none selected"}${selectedPocket ? `, ${selectedPocket.name}` : ""}. Tap to choose.`}
              accessibilityRole="button"
              disabled={pending}
              onPress={() => setAccountPicker("from")}
              style={styles.selectorCard}
            >
              <View style={styles.selectorLeft}>
                <View
                  style={[
                    styles.selectorIconWrap,
                    {
                      backgroundColor: `${selectedAccountColor}18`,
                      borderColor: `${selectedAccountColor}35`,
                    },
                  ]}
                >
                  <IconHelper
                    color={selectedAccountColor}
                    name={
                      selectedAccount?.iconKey ??
                      selectedAccount?.accountType?.iconKey ??
                      "wallet"
                    }
                    size={18}
                  />
                </View>
                <View style={styles.selectorTextColumn}>
                  <Text
                    numberOfLines={1}
                    style={
                      selectedAccount
                        ? styles.selectorValueText
                        : styles.selectorPlaceholderText
                    }
                  >
                    {selectedAccount
                      ? `${selectedAccount.name}${selectedAccount.pocketEnabled ? ` · ${selectedPocket?.name ?? "Available"}` : ""}`
                      : "Select Account"}
                  </Text>
                  {selectedAccount ? (
                    <Text style={styles.selectorSubText}>
                      {selectedPocket
                        ? "Pocket balance"
                        : selectedAccount.pocketEnabled
                          ? "Available balance"
                          : selectedAccount.accountType?.name ?? "Account"}{" "}
                      · {formatCurrency(selectedLocationBalance, currencyCode)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.selectorChangeBadge}>
                <Text style={styles.selectorChangeText}>Change</Text>
                <ChevronRight color={theme.colors.textSecondary} size={14} />
              </View>
            </Pressable>
          </View>

          {mode === "transfer" ? (
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>TRANSFER TO</Text>
              <Pressable
                accessibilityLabel={`Destination account location ${selectedToAccount?.name ?? "none selected"}${selectedToPocket ? `, ${selectedToPocket.name}` : ""}. Tap to choose.`}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setAccountPicker("to")}
                style={styles.selectorCard}
              >
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.selectorIconWrap,
                      {
                        backgroundColor: `${selectedToAccountColor}18`,
                        borderColor: `${selectedToAccountColor}35`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={selectedToAccountColor}
                      name={
                        selectedToAccount?.iconKey ??
                        selectedToAccount?.accountType?.iconKey ??
                        "landmark"
                      }
                      size={18}
                    />
                  </View>
                  <View style={styles.selectorTextColumn}>
                    <Text
                      numberOfLines={1}
                      style={
                        selectedToAccount
                          ? styles.selectorValueText
                          : styles.selectorPlaceholderText
                      }
                    >
                      {selectedToAccount
                        ? `${selectedToAccount.name}${selectedToAccount.pocketEnabled ? ` · ${selectedToPocket?.name ?? "Available"}` : ""}`
                        : "Select Destination Account"}
                    </Text>
                    {selectedToAccount ? (
                      <Text style={styles.selectorSubText}>
                        {selectedToPocket
                          ? "Pocket balance"
                          : selectedToAccount.pocketEnabled
                            ? "Available balance"
                            : selectedToAccount.accountType?.name ?? "Account"}{" "}
                        ·{" "}
                        {formatCurrency(
                          selectedToLocationBalance,
                          selectedToAccount.currencyCode,
                        )}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.selectorChangeBadge}>
                  <Text style={styles.selectorChangeText}>Change</Text>
                  <ChevronRight color={theme.colors.textSecondary} size={14} />
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Pressable
                accessibilityLabel={`Category ${selectedCategory?.name ?? "none selected"}. Tap to choose category.`}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setCategoryPickerOpen(true)}
                style={styles.selectorCard}
              >
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.selectorIconWrap,
                      {
                        backgroundColor: `${selectedCategoryColor}18`,
                        borderColor: `${selectedCategoryColor}35`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={selectedCategoryColor}
                      name={selectedCategory?.icon ?? "tag"}
                      size={18}
                    />
                  </View>
                  <View style={styles.selectorTextColumn}>
                    <Text
                      numberOfLines={1}
                      style={
                        selectedCategory
                          ? styles.selectorValueText
                          : styles.selectorPlaceholderText
                      }
                    >
                      {selectedCategory?.name ?? "Select Category"}
                    </Text>
                    {selectedCategory ? (
                      <Text style={styles.selectorSubText}>
                        {parentOfSelectedCategory
                          ? `${parentOfSelectedCategory.name} > Subcategory`
                          : mode === "expense"
                            ? "Expense Category"
                            : "Income Category"}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.selectorChangeBadge}>
                  <Text style={styles.selectorChangeText}>Change</Text>
                  <ChevronRight color={theme.colors.textSecondary} size={14} />
                </View>
              </Pressable>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>NOTE / MEMO (OPTIONAL)</Text>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={(value) => {
                clearFormError();
                setNote(value);
              }}
              placeholder="e.g. Grocery run at SM, Grab to airport..."
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.noteInput}
              textAlignVertical="top"
              value={note}
            />
          </View>
        </KeyboardAwareForm>
      </FullScreenFormModal>

      <AmountCalculatorModal
        currencyCode={currencyCode}
        initialMinorUnits={amountMinorUnits}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(value) => {
          clearFormError();
          setAmountMinorUnits(Math.abs(value));
          setCalculatorOpen(false);
        }}
        title="Preset Amount"
        visible={calculatorOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        pockets={pockets}
        onClose={() => setAccountPicker(null)}
        onSelectLocation={(account, selectedPocketId) => {
          clearFormError();
          if (accountPicker === "to") {
            setToAccountId(account.id);
            setToPocketId(selectedPocketId);
          } else {
            setAccountId(account.id);
            setPocketId(selectedPocketId);
          }
        }}
        selectedAccountId={accountPicker === "to" ? toAccountId : accountId}
        selectedPocketId={accountPicker === "to" ? toPocketId : pocketId}
        title={accountPicker === "to" ? "Select Destination" : "Select Account"}
        visible={accountPicker !== null}
      />

      <CategoryPickerModal
        categories={categories}
        onClose={() => setCategoryPickerOpen(false)}
        onSelectCategory={(category) => {
          clearFormError();
          setCategoryId(category.id);
        }}
        selectedCategoryId={categoryId}
        title={mode === "income" ? "Select Income Category" : "Select Expense Category"}
        type={mode === "income" ? "income" : "expense"}
        visible={categoryPickerOpen}
      />

      <NotificationModal
        message={displayError ?? ""}
        onClose={clearFormError}
        title={localError ? "Check preset details" : "Unable to save Quick Preset"}
        variant={localError ? "warning" : "error"}
        visible={visible && Boolean(displayError)}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    tabBar: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      marginBottom: 16,
      padding: 4,
    },
    tabItem: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      flex: 1,
      paddingVertical: 8,
    },
    tabItemActive: {
      ...theme.shadows.card,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: theme.colors.textInverse,
      fontWeight: "700",
    },
    inputGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    nameInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    includeAmountPanel: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: 16,
      padding: 10,
    },
    nativeControl: { alignSelf: "flex-start" },
    noteInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      minHeight: 92,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectorCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 58,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectorLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 12,
      marginRight: 10,
    },
    selectorIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    selectorTextColumn: { flex: 1 },
    selectorValueText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    selectorPlaceholderText: {
      color: theme.colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
    selectorSubText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    selectorChangeBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}24`,
      borderColor: `${theme.colors.primary}65`,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    selectorChangeText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "600",
    },
  });
}
