import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import {
  AccountPickerModal,
  AmountCalculatorField,
  AmountCalculatorModal,
  CategoryPickerModal,
  FullScreenFormModal,
  IconHelper,
  KeyboardAwareForm,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  accountColor,
  type AccountListItem,
  type PocketListItem,
} from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { useDefaultAccounts } from "@/modules/settings";
import {
  TransactionDateTimePickerModal,
  TransactionTypePicker,
} from "@/modules/transactions";
import { formatCurrency } from "@/utils/currency";
import type {
  SaveScheduledTransactionInput,
  ScheduleEndMode,
  ScheduleFrequency,
  ScheduleWeekendPolicy,
  ScheduledTransaction,
  ScheduledTransactionType,
} from "../types/scheduled-transaction.types";
import { getCurrentTimeZone } from "../utils/recurrence";
import { resolveScheduledDefaultLocation } from "../utils/resolve-scheduled-defaults";

interface ScheduledTransactionFormModalProps {
  visible: boolean;
  initialSchedule: ScheduledTransaction | null;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: SaveScheduledTransactionInput, id?: string) => boolean;
  defaultExpenseAccountId?: string | null;
  defaultExpensePocketId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultIncomePocketId?: string | null;
}

type DateTimePickerTarget = "start-date" | "start-time" | "end-date";

const SHORT_MONTHS = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
  "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec.",
] as const;

function defaultStart(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(value: string, fallback: Date): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day, fallback.getHours(), fallback.getMinutes());
}

function formatDate(value: Date): string {
  return `${SHORT_MONTHS[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
}

function repeatUnit(frequency: ScheduleFrequency): string {
  if (frequency === "daily") return "day(s)";
  if (frequency === "weekly") return "week(s)";
  if (frequency === "monthly") return "month(s)";
  return "year(s)";
}

export function ScheduledTransactionFormModal({
  visible,
  initialSchedule,
  accounts,
  pockets,
  categories,
  pending,
  error,
  onClose,
  onSave,
  defaultExpenseAccountId: propsDefaultExpenseAccountId,
  defaultExpensePocketId: propsDefaultExpensePocketId,
  defaultIncomeAccountId: propsDefaultIncomeAccountId,
  defaultIncomePocketId: propsDefaultIncomePocketId,
}: ScheduledTransactionFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();
  const defaultAccounts = useDefaultAccounts();

  const effectiveDefaultExpenseAccountId =
    propsDefaultExpenseAccountId !== undefined
      ? propsDefaultExpenseAccountId
      : defaultAccounts.defaultExpenseAccountId;
  const effectiveDefaultExpensePocketId =
    propsDefaultExpensePocketId !== undefined
      ? propsDefaultExpensePocketId
      : defaultAccounts.defaultExpensePocketId;
  const effectiveDefaultIncomeAccountId =
    propsDefaultIncomeAccountId !== undefined
      ? propsDefaultIncomeAccountId
      : defaultAccounts.defaultIncomeAccountId;
  const effectiveDefaultIncomePocketId =
    propsDefaultIncomePocketId !== undefined
      ? propsDefaultIncomePocketId
      : defaultAccounts.defaultIncomePocketId;

  const [transactionType, setTransactionType] =
    useState<ScheduledTransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [toPocketId, setToPocketId] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("monthly");
  const [intervalText, setIntervalText] = useState("1");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endMode, setEndMode] = useState<ScheduleEndMode>("never");
  const [maxOccurrencesText, setMaxOccurrencesText] = useState("12");
  const [endsOn, setEndsOn] = useState(dateKey(defaultStart()));
  const [weekendAdjust, setWeekendAdjust] = useState(false);
  const [weekendPolicy, setWeekendPolicy] =
    useState<Exclude<ScheduleWeekendPolicy, "exact">>("next_weekday");
  const [autoPost, setAutoPost] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [accountPicker, setAccountPicker] = useState<"from" | "to" | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [dateTimePicker, setDateTimePicker] =
    useState<DateTimePickerTarget | null>(null);

  useEffect(() => {
    if (!visible) return;
    const start = initialSchedule?.startsAt ?? defaultStart();
    const type = initialSchedule?.transactionType ?? "expense";
    setTransactionType(type);

    if (initialSchedule) {
      setAccountId(initialSchedule.accountId);
      setPocketId(initialSchedule.pocketId ?? null);
      setToAccountId(initialSchedule.toAccountId ?? null);
      setToPocketId(initialSchedule.toPocketId ?? null);
      setCategoryId(initialSchedule.categoryId ?? null);
      setAmountCents(initialSchedule.amountCents);
      setName(initialSchedule.name ?? "");
      setNote(initialSchedule.note ?? "");
      setFrequency(initialSchedule.frequency);
      setIntervalText(String(initialSchedule.intervalCount));
      setStartsAt(start);
      setEndMode(initialSchedule.endMode);
      setMaxOccurrencesText(String(initialSchedule.maxOccurrences ?? 12));
      setEndsOn(initialSchedule.endsOn ?? dateKey(start));
      if (initialSchedule.weekendPolicy !== "exact") {
        setWeekendAdjust(true);
        setWeekendPolicy(initialSchedule.weekendPolicy);
      } else {
        setWeekendAdjust(false);
        setWeekendPolicy("next_weekday");
      }
      setAutoPost(initialSchedule.autoPost);
    } else {
      const resolved = resolveScheduledDefaultLocation({
        transactionType: type,
        accounts,
        pockets,
        defaultExpenseAccountId: effectiveDefaultExpenseAccountId,
        defaultExpensePocketId: effectiveDefaultExpensePocketId,
        defaultIncomeAccountId: effectiveDefaultIncomeAccountId,
        defaultIncomePocketId: effectiveDefaultIncomePocketId,
      });
      setAccountId(resolved.accountId);
      setPocketId(resolved.pocketId);
      setToAccountId(null);
      setToPocketId(null);
      setCategoryId(
        categories.find((item) => item.type === "expense")?.id ?? null,
      );
      setAmountCents(0);
      setName("");
      setNote("");
      setFrequency("monthly");
      setIntervalText("1");
      setStartsAt(start);
      setEndMode("never");
      setMaxOccurrencesText("12");
      setEndsOn(dateKey(start));
      setWeekendAdjust(false);
      setWeekendPolicy("next_weekday");
      setAutoPost(false);
    }
    setLocalError(null);
  }, [
    accounts,
    categories,
    effectiveDefaultExpenseAccountId,
    effectiveDefaultExpensePocketId,
    effectiveDefaultIncomeAccountId,
    effectiveDefaultIncomePocketId,
    initialSchedule,
    pockets,
    visible,
  ]);

  const selectedAccount = accounts.find((item) => item.id === accountId);
  const selectedPocket = pockets.find((item) => item.id === pocketId);
  const destinationAccount = accounts.find((item) => item.id === toAccountId);
  const destinationPocket = pockets.find((item) => item.id === toPocketId);
  const selectedCategory = useMemo(() => {
    for (const category of categories) {
      if (category.id === categoryId) return category;
      const subcategory = category.subcategories?.find((item) => item.id === categoryId);
      if (subcategory) return subcategory;
    }
    return null;
  }, [categories, categoryId]);
  const parentCategory = useMemo(
    () => selectedCategory?.parentId
      ? categories.find((item) => item.id === selectedCategory.parentId) ?? null
      : null,
    [categories, selectedCategory],
  );
  const selectedCategoryColor = resolveEntityColor(
    selectedCategory?.color ?? parentCategory?.color,
  );
  const currencyCode = selectedAccount?.currencyCode ?? "PHP";

  const chooseType = (value: ScheduledTransactionType) => {
    setTransactionType(value);
    setCategoryId(
      value === "transfer"
        ? null
        : (categories.find((item) => item.type === value)?.id ?? null),
    );
    if (value !== "transfer") {
      setToAccountId(null);
      setToPocketId(null);
    }
    if (!initialSchedule) {
      if (value === "expense") {
        const defaultExpense = accounts.find(
          (a) => a.id === effectiveDefaultExpenseAccountId && !a.isArchived,
        );
        if (defaultExpense) {
          setAccountId(defaultExpense.id);
          const defaultPocket = effectiveDefaultExpensePocketId
            ? pockets.find(
                (p) =>
                  p.id === effectiveDefaultExpensePocketId &&
                  p.accountId === defaultExpense.id &&
                  !p.isArchived,
              )
            : null;
          setPocketId(defaultPocket ? defaultPocket.id : null);
        }
      } else if (value === "income") {
        const defaultIncome = accounts.find(
          (a) => a.id === effectiveDefaultIncomeAccountId && !a.isArchived,
        );
        if (defaultIncome) {
          setAccountId(defaultIncome.id);
          const defaultPocket = effectiveDefaultIncomePocketId
            ? pockets.find(
                (p) =>
                  p.id === effectiveDefaultIncomePocketId &&
                  p.accountId === defaultIncome.id &&
                  !p.isArchived,
              )
            : null;
          setPocketId(defaultPocket ? defaultPocket.id : null);
        }
      }
    }
  };

  const handleDateTimeConfirm = (value: Date) => {
    if (dateTimePicker === "end-date") {
      setEndsOn(dateKey(value));
    } else if (dateTimePicker === "start-time") {
      setStartsAt((current) => {
        const next = new Date(current);
        next.setHours(value.getHours(), value.getMinutes(), 0, 0);
        return next;
      });
    } else {
      setStartsAt((current) => {
        const next = new Date(current);
        next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
        return next;
      });
    }
    setDateTimePicker(null);
  };

  const handleSave = () => {
    setLocalError(null);
    const intervalCount = Number(intervalText);
    const maxOccurrences = Number(maxOccurrencesText);

    if (!accountId) {
      setLocalError("Please select an account.");
      return;
    }
    if (amountCents <= 0) {
      setLocalError("Please enter an amount greater than zero.");
      return;
    }
    if (transactionType !== "transfer" && !categoryId) {
      setLocalError("Please select a category.");
      return;
    }
    if (transactionType === "transfer" && !toAccountId) {
      setLocalError("Please select a destination account.");
      return;
    }
    if (frequency !== "once" && (!intervalCount || intervalCount < 1)) {
      setLocalError("Repeat interval must be at least 1.");
      return;
    }

    const resolvedWeekendPolicy: ScheduleWeekendPolicy =
      frequency === "once" || !weekendAdjust ? "exact" : weekendPolicy;

    const success = onSave(
      {
        transactionType,
        accountId,
        pocketId,
        categoryId,
        toAccountId,
        toPocketId,
        amountCents,
        name,
        note,
        frequency,
        intervalCount: frequency === "once" ? 1 : intervalCount,
        startsAt,
        timeZone: initialSchedule?.timeZone ?? getCurrentTimeZone(),
        endMode: frequency === "once" ? "never" : endMode,
        maxOccurrences:
          frequency !== "once" && endMode === "after_count"
            ? maxOccurrences
            : null,
        endsOn:
          frequency !== "once" && endMode === "on_date" ? endsOn : null,
        weekendPolicy: resolvedWeekendPolicy,
        autoPost,
      },
      initialSchedule?.id,
    );
    if (success) onClose();
  };

  const pickerValue =
    dateTimePicker === "end-date"
      ? dateFromKey(endsOn, startsAt)
      : startsAt;

  return (
    <>
      <FullScreenFormModal
        onClose={onClose}
        onSave={handleSave}
        pending={pending}
        saveLabel="Save schedule"
        title={initialSchedule ? "Edit Schedule" : "New Schedule"}
        visible={visible}
      >
        <KeyboardAwareForm contentContainerStyle={styles.formContent}>
          {localError || error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{localError ?? error}</Text>
            </View>
          ) : null}

          <Section title="TRANSACTION">
            <TransactionTypePicker
              disabled={pending}
              onChange={chooseType}
              value={transactionType}
            />

            <View>
              <Text style={styles.fieldLabel}>TRANSACTION NAME</Text>
              <TextInput
                maxLength={100}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.nameInput}
                value={name}
              />
            </View>

            <AmountCalculatorField
              amountMinorUnits={amountCents}
              amountSign={
                transactionType === "transfer"
                  ? "transfer"
                  : transactionType === "expense"
                    ? "-"
                    : "+"
              }
              currencyCode={currencyCode}
              label="Amount"
              onOpenCalculator={() => setCalculatorOpen(true)}
              showSignToggle={false}
            />

            <View>
              {transactionType === "transfer" ? (
                <Text style={styles.fieldLabel}>TRANSFER FROM</Text>
              ) : null}
              <LocationSelector
                account={selectedAccount}
                onPress={() => setAccountPicker("from")}
                pocket={selectedPocket}
                pockets={pockets}
                placeholder={
                  transactionType === "transfer"
                    ? "Select Source Account"
                    : "Select Account"
                }
              />
            </View>

            {transactionType === "transfer" ? (
              <View>
                <Text style={styles.fieldLabel}>TRANSFER TO</Text>
                <LocationSelector
                  account={destinationAccount}
                  onPress={() => setAccountPicker("to")}
                  pocket={destinationPocket}
                  pockets={pockets}
                  placeholder="Select Destination Account"
                />
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Select category"
                accessibilityRole="button"
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
                  <View style={styles.selectorTextCol}>
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
                        {parentCategory
                          ? `${parentCategory.name} > Subcategory`
                          : transactionType === "income"
                            ? "Income Category"
                            : "Expense Category"}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <ChangeBadge />
              </Pressable>
            )}

            <View>
              <Text style={styles.fieldLabel}>NOTE / MEMO (OPTIONAL)</Text>
              <TextInput
                maxLength={200}
                multiline
                onChangeText={setNote}
                placeholder="e.g. Monthly rent, salary, subscription..."
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.noteInput}
                textAlignVertical="top"
                value={note}
              />
            </View>
          </Section>

          <Section title="RECURRENCE">
            <View>
              <Text style={styles.fieldLabel}>STARTING ON</Text>
              <View style={styles.dateTimeRow}>
                <Pressable
                  accessibilityLabel={`Starting date ${formatDate(startsAt)}`}
                  accessibilityRole="button"
                  onPress={() => setDateTimePicker("start-date")}
                  style={({ pressed }) => [
                    styles.dateTimeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.dateTimeText}>{formatDate(startsAt)}</Text>
                </Pressable>
                <Text style={styles.dateTimeSeparator}>|</Text>
                <Pressable
                  accessibilityLabel={`Starting time ${formatTime(startsAt)}`}
                  accessibilityRole="button"
                  onPress={() => setDateTimePicker("start-time")}
                  style={({ pressed }) => [
                    styles.dateTimeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.dateTimeText}>{formatTime(startsAt)}</Text>
                </Pressable>
              </View>
            </View>

            <ChoiceRow wrap>
              {(["once", "daily", "weekly", "monthly", "yearly"] as const).map(
                (value) => (
                  <ChoiceChip
                    key={value}
                    active={frequency === value}
                    label={
                      value === "once"
                        ? "Once"
                        : value === "yearly"
                          ? "Yearly"
                          : `${value[0].toUpperCase()}${value.slice(1)}`
                    }
                    onPress={() => setFrequency(value)}
                  />
                ),
              )}
            </ChoiceRow>

            {frequency !== "once" ? (
              <View>
                <Text style={styles.fieldLabel}>REPEAT</Text>
                <View style={styles.inlineField}>
                  <Text style={styles.fieldText}>Every</Text>
                  <TextInput
                    accessibilityLabel="Repeat interval"
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={(value) =>
                      setIntervalText(value.replace(/\D/g, ""))
                    }
                    style={styles.numberInput}
                    value={intervalText}
                  />
                  <Text style={styles.fieldText}>{repeatUnit(frequency)}</Text>
                </View>
              </View>
            ) : null}
          </Section>

          {frequency !== "once" ? (
            <>
              <Section title="ENDS">
                <ChoiceRow wrap>
                  {(["never", "after_count", "on_date"] as const).map(
                    (value) => (
                      <ChoiceChip
                        key={value}
                        active={endMode === value}
                        label={
                          value === "never"
                            ? "Never"
                            : value === "after_count"
                              ? "After Count"
                              : "On Date"
                        }
                        onPress={() => setEndMode(value)}
                      />
                    ),
                  )}
                </ChoiceRow>
                {endMode === "after_count" ? (
                  <View style={styles.inlineField}>
                    <Text style={styles.fieldText}>After</Text>
                    <TextInput
                      accessibilityLabel="Number of occurrences"
                      keyboardType="number-pad"
                      maxLength={5}
                      onChangeText={(value) =>
                        setMaxOccurrencesText(value.replace(/\D/g, ""))
                      }
                      style={styles.numberInput}
                      value={maxOccurrencesText}
                    />
                    <Text style={styles.fieldText}>occurrences</Text>
                  </View>
                ) : null}
                {endMode === "on_date" ? (
                  <Pressable
                    accessibilityLabel={`End date ${formatDate(
                      dateFromKey(endsOn, startsAt),
                    )}`}
                    accessibilityRole="button"
                    onPress={() => setDateTimePicker("end-date")}
                    style={styles.endDateButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatDate(dateFromKey(endsOn, startsAt))}
                    </Text>
                    <ChevronRight color={theme.colors.textSecondary} size={18} />
                  </Pressable>
                ) : null}
              </Section>

              <Section title="WEEKENDS">
                <View style={styles.toggleCard}>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>
                      If date falls on a weekend
                    </Text>
                    <Text style={styles.toggleDescription}>
                      Automatically adjust execution date when scheduled date lands on a Saturday or Sunday.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="If date falls on a weekend"
                    onValueChange={setWeekendAdjust}
                    trackColor={{
                      false: theme.colors.borderStrong,
                      true: theme.colors.primary,
                    }}
                    value={weekendAdjust}
                  />
                </View>

                {weekendAdjust ? (
                  <View style={styles.weekendOptionsContainer}>
                    <Text style={styles.fieldLabel}>
                      ADJUSTMENT ACTION
                    </Text>
                    <ChoiceRow wrap>
                      {(
                        [
                          ["next_weekday", "Move next weekday"],
                          ["previous_weekday", "Move previous weekday"],
                          ["skip", "Skip"],
                        ] as const
                      ).map(([value, label]) => (
                        <ChoiceChip
                          key={value}
                          active={weekendPolicy === value}
                          label={label}
                          onPress={() => setWeekendPolicy(value)}
                        />
                      ))}
                    </ChoiceRow>
                  </View>
                ) : null}
              </Section>
            </>
          ) : null}

          <View style={styles.autoPostCard}>
            <View style={styles.autoPostText}>
              <Text style={styles.autoPostTitle}>
                Automatically enter transaction
              </Text>
              <Text style={styles.autoPostDescription}>
                Posts when the app processes the due date. Otherwise it appears
                as a due item for your confirmation.
              </Text>
            </View>
            <Switch
              onValueChange={setAutoPost}
              trackColor={{
                false: theme.colors.borderStrong,
                true: theme.colors.primary,
              }}
              value={autoPost}
            />
          </View>
        </KeyboardAwareForm>
      </FullScreenFormModal>

      <AmountCalculatorModal
        currencyCode={currencyCode}
        initialMinorUnits={amountCents}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(value) => {
          setAmountCents(Math.abs(value));
          setCalculatorOpen(false);
        }}
        title="Schedule Amount"
        visible={calculatorOpen}
      />

      <AccountPickerModal
        accounts={accounts}
        defaultExpenseAccountId={effectiveDefaultExpenseAccountId}
        defaultExpensePocketId={effectiveDefaultExpensePocketId}
        defaultIncomeAccountId={effectiveDefaultIncomeAccountId}
        defaultIncomePocketId={effectiveDefaultIncomePocketId}
        onClose={() => setAccountPicker(null)}
        onSelectLocation={(account, selectedPocketId) => {
          if (accountPicker === "to") {
            setToAccountId(account.id);
            setToPocketId(selectedPocketId);
          } else {
            setAccountId(account.id);
            setPocketId(selectedPocketId);
          }
        }}
        onSetDefaultExpense={defaultAccounts.setExpenseAccount}
        onSetDefaultIncome={defaultAccounts.setIncomeAccount}
        pockets={pockets}
        selectedAccountId={accountPicker === "to" ? toAccountId : accountId}
        selectedPocketId={accountPicker === "to" ? toPocketId : pocketId}
        title={
          accountPicker === "to"
            ? "Select Destination Account"
            : transactionType === "transfer"
              ? "Select Source Account"
              : "Select Account"
        }
        visible={accountPicker !== null}
      />

      <CategoryPickerModal
        categories={categories}
        onClose={() => setCategoryPickerOpen(false)}
        onSelectCategory={(category) => setCategoryId(category.id)}
        selectedCategoryId={categoryId}
        title={
          transactionType === "income"
            ? "Select Income Category"
            : "Select Expense Category"
        }
        type={transactionType === "income" ? "income" : "expense"}
        visible={categoryPickerOpen}
      />

      <TransactionDateTimePickerModal
        mode={dateTimePicker === "start-time" ? "time" : "date"}
        onClose={() => setDateTimePicker(null)}
        onConfirm={handleDateTimeConfirm}
        title={
          dateTimePicker === "start-time"
            ? "Schedule Start Time"
            : dateTimePicker === "end-date"
              ? "Schedule End Date"
              : "Schedule Start Date"
        }
        value={pickerValue}
        visible={dateTimePicker !== null}
      />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceRow({
  children,
  wrap = false,
}: {
  children: React.ReactNode;
  wrap?: boolean;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={[styles.choiceRow, wrap && styles.choiceRowWrap]}>
      {children}
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.choiceChip, active && styles.choiceChipActive]}
    >
      <Text
        style={[styles.choiceChipText, active && styles.choiceChipTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LocationSelector({
  account,
  pocket,
  pockets,
  placeholder,
  onPress,
}: {
  account: AccountListItem | undefined;
  pocket: PocketListItem | undefined;
  pockets: PocketListItem[];
  placeholder: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const color = accountColor(theme, account?.accountType?.color ?? null);
  const accountBalance =
    account?.currentBalanceMinorUnits ?? account?.openingBalanceMinorUnits ?? 0;
  const locationBalance = pocket
    ? pocket.currentBalanceMinorUnits
    : account?.pocketEnabled
      ? accountBalance -
        pockets
          .filter(
            (item) => item.accountId === account.id && !item.isArchived,
          )
          .reduce((sum, item) => sum + item.currentBalanceMinorUnits, 0)
      : accountBalance;

  return (
    <Pressable
      accessibilityLabel={`${placeholder}. Tap to choose.`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.selectorCard}
    >
      <View style={styles.selectorLeft}>
        <View
          style={[
            styles.selectorIconWrap,
            {
              backgroundColor: `${color}18`,
              borderColor: `${color}35`,
            },
          ]}
        >
          <IconHelper
            color={color}
            name={account?.iconKey ?? account?.accountType?.iconKey ?? "wallet"}
            size={18}
          />
        </View>
        <View style={styles.selectorTextCol}>
          <Text
            numberOfLines={1}
            style={
              account
                ? styles.selectorValueText
                : styles.selectorPlaceholderText
            }
          >
            {account
              ? `${account.name}${account.pocketEnabled ? ` · ${pocket?.name ?? "Available"}` : ""}`
              : placeholder}
          </Text>
          {account ? (
            <Text numberOfLines={1} style={styles.selectorSubText}>
              {pocket
                ? "Pocket balance"
                : account.pocketEnabled
                  ? "Available balance"
                  : account.accountType?.name ?? "Account"}{" "}
              ·{" "}
              {formatCurrency(
                locationBalance,
                account.currencyCode ?? "PHP",
                false,
              )}
            </Text>
          ) : null}
        </View>
      </View>
      <ChangeBadge />
    </Pressable>
  );
}

function ChangeBadge() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.selectorChangeBadge}>
      <Text style={styles.selectorChangeText}>Change</Text>
      <ChevronRight color={theme.colors.textSecondary} size={14} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    formContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}55`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.7,
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
    choiceRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    choiceRowWrap: {
      flexWrap: "wrap",
    },
    choiceChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    choiceChipActive: {
      backgroundColor: `${theme.colors.primary}22`,
      borderColor: theme.colors.primary,
    },
    choiceChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    choiceChipTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
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
    selectorTextCol: {
      flex: 1,
    },
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
    dateTimeRow: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
    },
    dateTimeButton: {
      borderRadius: theme.borderRadius.small,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: theme.spacing.xs,
    },
    dateTimeSeparator: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.md,
      paddingHorizontal: theme.spacing.xxs,
    },
    dateTimeText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.medium,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    inlineField: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    fieldText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    numberInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      minHeight: 42,
      paddingHorizontal: theme.spacing.sm,
      textAlign: "center",
      width: 76,
    },
    endDateButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    autoPostCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      padding: theme.spacing.md,
    },
    autoPostText: {
      flex: 1,
    },
    autoPostTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    autoPostDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
      marginTop: theme.spacing.xs,
    },
    toggleCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      padding: theme.spacing.md,
    },
    toggleText: {
      flex: 1,
    },
    toggleTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    toggleDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
      marginTop: theme.spacing.xs,
    },
    weekendOptionsContainer: {
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
  });
}
