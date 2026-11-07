import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronDown, ChevronUp, AlertCircle, ArrowRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  ACCOUNT_FIELDS,
  TRANSACTION_FIELDS,
  LIMITS,
} from "../constants/data-import.constants";
import type {
  AmountLayout,
  ColumnMappingConfig,
  DateFormatPattern,
  ImportType,
  KaizenFieldKey,
  NormalizedTransactionType,
  ParsedCsvFile,
  TransferStyle,
} from "../types/data-import.types";
import { ColumnMappingRow } from "./column-mapping-row";

interface StepMatchColumnsProps {
  parsedFile: ParsedCsvFile;
  importType: ImportType;
  config: ColumnMappingConfig;
  activeCurrencyCodes: Set<string>;
  defaultCurrencyCode: string;
  onUpdateColumn: (field: KaizenFieldKey, colName: string | undefined) => void;
  onUpdateConfig: (partial: Partial<ColumnMappingConfig>) => void;
  onContinue: () => void;
}

export function StepMatchColumns({
  parsedFile,
  importType,
  config,
  activeCurrencyCodes,
  defaultCurrencyCode,
  onUpdateColumn,
  onUpdateConfig,
  onContinue,
}: StepMatchColumnsProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const fields = importType === "transactions" ? TRANSACTION_FIELDS : ACCOUNT_FIELDS;
  const standardFields = fields.filter((f) => !f.isAdvanced);
  const advancedFields = fields.filter((f) => f.isAdvanced);

  // Extract distinct unrecognized transaction types from file
  const unrecognizedTypes = useMemo(() => {
    if (importType !== "transactions" || !config.typeColumn) return [];
    const colIdx = parsedFile.headers.indexOf(config.typeColumn);
    if (colIdx === -1) return [];

    const distinct = new Set<string>();
    for (const row of parsedFile.rawRows) {
      const val = row[colIdx]?.trim();
      if (!val) continue;
      const lower = val.toLowerCase();
      if (
        lower === "income" ||
        lower === "expense" ||
        lower === "transfer" ||
        lower === "deposit" ||
        lower === "credit" ||
        lower === "withdrawal" ||
        lower === "debit"
      ) {
        continue;
      }
      distinct.add(val);
    }
    return Array.from(distinct);
  }, [config.typeColumn, importType, parsedFile]);

  // Validation before leaving column matching
  const validationError = useMemo((): string | null => {
    if (importType === "transactions") {
      if (!config.dateColumn) {
        return "Please map the Date column.";
      }

      if (config.amountLayout === "separate") {
        if (!config.moneyOutColumn && !config.moneyInColumn) {
          return "Please map Money out, Money in, or switch to one amount column.";
        }
      } else {
        if (!config.amountColumn && !config.moneyOutColumn && !config.moneyInColumn) {
          return "Please map the Amount column.";
        }
      }

      if (!config.accountColumn && !config.defaultAccountName?.trim()) {
        return "Please map an Account column or type an account name for the whole file.";
      }

      if (!config.currencyColumn && !config.defaultCurrencyCode) {
        return "Please select a currency for the file.";
      }

      // Check unrecognized types
      for (const t of unrecognizedTypes) {
        if (!config.typeMap[t.toLowerCase()]) {
          return `Please match transaction type "${t}" to Income, Expense, Transfer, or Leave out.`;
        }
      }
    } else {
      // Accounts only
      if (!config.accountColumn) {
        return "Please map the Account name column.";
      }
      if (!config.currencyColumn && !config.defaultCurrencyCode) {
        return "Please select a currency for the accounts.";
      }
    }

    return null;
  }, [config, importType, unrecognizedTypes]);

  const canContinue = validationError === null;

  return (
    <View style={styles.container}>
      {/* Intro Guidance */}
      <View style={styles.guidanceCard}>
        <Text style={styles.stepTitle}>Match columns</Text>
        <Text style={styles.guidanceText}>
          Tell Kaizen which column in your file matches each detail. We’ve suggested matches where the column names look familiar.
        </Text>
      </View>

      {/* Amount Layout selector (Transactions only) */}
      {importType === "transactions" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How are amounts listed in your file?</Text>
          <Text style={styles.sectionDescription}>
            Banks often separate money in and out, while budgeting apps usually keep amounts together.
          </Text>

          <View style={styles.choiceGroup}>
            <Pressable
              accessibilityRole="radio"
              onPress={() => onUpdateConfig({ amountLayout: "single" })}
              style={[
                styles.choiceCard,
                config.amountLayout === "single" && styles.choiceCardSelected,
              ]}
            >
              <Text style={[styles.choiceTitle, config.amountLayout === "single" && styles.choiceTitleSelected]}>
                One column
              </Text>
              <Text style={styles.choiceText}>
                Spending and income are in a single column. Negative numbers or minus signs represent spending.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              onPress={() => onUpdateConfig({ amountLayout: "separate" })}
              style={[
                styles.choiceCard,
                config.amountLayout === "separate" && styles.choiceCardSelected,
              ]}
            >
              <Text style={[styles.choiceTitle, config.amountLayout === "separate" && styles.choiceTitleSelected]}>
                Two columns
              </Text>
              <Text style={styles.choiceText}>
                Money out and money in are separate columns. Banks commonly label these Debit and Credit.
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Transfer style selector (Transactions only) */}
      {importType === "transactions" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How do transfers look in your file?</Text>
          <Text style={styles.sectionDescription}>
            Transfers move money between your accounts without affecting your total spending.
          </Text>

          <View style={styles.choiceGroup}>
            <Pressable
              accessibilityRole="radio"
              onPress={() => onUpdateConfig({ transferStyle: "single_row" })}
              style={[
                styles.choiceCard,
                config.transferStyle === "single_row" && styles.choiceCardSelected,
              ]}
            >
              <Text style={[styles.choiceTitle, config.transferStyle === "single_row" && styles.choiceTitleSelected]}>
                One row per transfer
              </Text>
              <Text style={styles.choiceText}>
                Each transfer has both the source account and destination account on the same row.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              onPress={() => onUpdateConfig({ transferStyle: "paired_rows" })}
              style={[
                styles.choiceCard,
                config.transferStyle === "paired_rows" && styles.choiceCardSelected,
              ]}
            >
              <Text style={[styles.choiceTitle, config.transferStyle === "paired_rows" && styles.choiceTitleSelected]}>
                Two rows per transfer
              </Text>
              <Text style={styles.choiceText}>
                One row shows money leaving an account, and another row shows the same amount arriving on the same calendar day.
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Field mapping list */}
      <View style={styles.mappingListSection}>
        <Text style={styles.listSectionHeader}>Column mappings</Text>

        {standardFields.map((field) => {
          // If single amount layout, don't show separate money_out / money_in in standard view
          if (config.amountLayout === "single" && (field.key === "money_out" || field.key === "money_in")) {
            return null;
          }
          // If separate amount layout, don't show single amount
          if (config.amountLayout === "separate" && field.key === "amount") {
            return null;
          }

          const propMap: Record<KaizenFieldKey, keyof ColumnMappingConfig> = {
            date: "dateColumn",
            time: "timeColumn",
            amount: "amountColumn",
            money_out: "moneyOutColumn",
            money_in: "moneyInColumn",
            type: "typeColumn",
            account: "accountColumn",
            to_account: "toAccountColumn",
            currency: "currencyColumn",
            category: "categoryColumn",
            subcategory: "subcategoryColumn",
            name: "nameColumn",
            note: "noteColumn",
            labels: "labelsColumn",
            source_id: "sourceIdColumn",
            account_type: "accountTypeColumn",
            opening_balance: "openingBalanceColumn",
            balance_date: "balanceDateColumn",
          };

          const selectedCol = config[propMap[field.key]] as string | undefined;

          return (
            <ColumnMappingRow
              key={field.key}
              activeCurrencyCodes={activeCurrencyCodes}
              activeDateFormat={config.dateFormat}
              field={field}
              headers={parsedFile.headers}
              onSelectColumn={(col) => onUpdateColumn(field.key, col)}
              onSelectDateFormat={(fmt) => onUpdateConfig({ dateFormat: fmt })}
              rawRows={parsedFile.rawRows}
              selectedColumn={selectedCol}
            />
          );
        })}
      </View>

      {/* Fallback Single Account Name if no account column */}
      {!config.accountColumn ? (
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Account for this entire file</Text>
          <Text style={styles.fallbackDescription}>
            Since your file has no account column, type the account name to use for all transactions in this file.
          </Text>
          <TextInput
            maxLength={LIMITS.accountName}
            onChangeText={(txt) => onUpdateConfig({ defaultAccountName: txt })}
            placeholder="e.g. Bank Account or Cash"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.textInput}
            value={config.defaultAccountName || ""}
          />
        </View>
      ) : null}

      {/* Fallback Currency if no currency column */}
      {!config.currencyColumn ? (
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Currency for this file</Text>
          <Text style={styles.fallbackDescription}>
            Since your file has no currency code column, choose the currency used by these records.
          </Text>
          <View style={styles.currencyRow}>
            {Array.from(activeCurrencyCodes).map((code) => {
              const selected = (config.defaultCurrencyCode || defaultCurrencyCode) === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => onUpdateConfig({ defaultCurrencyCode: code })}
                  style={[styles.currencyPill, selected && styles.currencyPillSelected]}
                >
                  <Text style={[styles.currencyPillText, selected && styles.currencyPillTextSelected]}>
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Unrecognized Transaction Types matching */}
      {unrecognizedTypes.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Match transaction types</Text>
          <Text style={styles.sectionDescription}>
            Your file uses types Kaizen does not recognize. Choose what each word means.
          </Text>

          {unrecognizedTypes.map((rawType) => {
            const lower = rawType.toLowerCase();
            const currentChoice: NormalizedTransactionType = config.typeMap[lower] || "expense";

            return (
              <View key={rawType} style={styles.unrecognizedRow}>
                <Text style={styles.unrecognizedWord}>"{rawType}"</Text>
                <View style={styles.typeButtonsRow}>
                  {(["expense", "income", "transfer", "leave_out"] as const).map((tChoice) => {
                    const selected = currentChoice === tChoice;
                    const labels: Record<NormalizedTransactionType, string> = {
                      expense: "Expense",
                      income: "Income",
                      transfer: "Transfer",
                      leave_out: "Leave out",
                    };
                    return (
                      <Pressable
                        key={tChoice}
                        onPress={() =>
                          onUpdateConfig({
                            typeMap: { ...config.typeMap, [lower]: tChoice },
                          })
                        }
                        style={[styles.typeBtn, selected && styles.typeBtnSelected]}
                      >
                        <Text style={[styles.typeBtnText, selected && styles.typeBtnTextSelected]}>
                          {labels[tChoice]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* More details (advanced fields & source name) */}
      <View style={styles.moreDetailsSection}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowMoreDetails((prev) => !prev)}
          style={styles.moreDetailsHeader}
        >
          <Text style={styles.moreDetailsHeaderText}>
            {showMoreDetails ? "Hide more details" : "More details"}
          </Text>
          {showMoreDetails ? (
            <ChevronUp color={theme.colors.textSecondary} size={18} />
          ) : (
            <ChevronDown color={theme.colors.textSecondary} size={18} />
          )}
        </Pressable>

        {showMoreDetails ? (
          <View style={styles.moreDetailsBody}>
            {/* Old app or bank name reminder */}
            <View style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>Old app or bank name</Text>
              <Text style={styles.reminderText}>
                This is only a reminder of where this file came from. Kaizen does not connect to your bank. Please use the same name on your next import so past rows are recognized.
              </Text>
              <TextInput
                maxLength={LIMITS.sourceName}
                onChangeText={(txt) => onUpdateConfig({ sourceName: txt })}
                placeholder="e.g. BDO, Chase, or CSV"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.textInput}
                value={config.sourceName}
              />
            </View>

            {/* Advanced column fields */}
            {advancedFields.map((field) => {
              const propMap: Record<KaizenFieldKey, keyof ColumnMappingConfig> = {
                date: "dateColumn",
                time: "timeColumn",
                amount: "amountColumn",
                money_out: "moneyOutColumn",
                money_in: "moneyInColumn",
                type: "typeColumn",
                account: "accountColumn",
                to_account: "toAccountColumn",
                currency: "currencyColumn",
                category: "categoryColumn",
                subcategory: "subcategoryColumn",
                name: "nameColumn",
                note: "noteColumn",
                labels: "labelsColumn",
                source_id: "sourceIdColumn",
                account_type: "accountTypeColumn",
                opening_balance: "openingBalanceColumn",
                balance_date: "balanceDateColumn",
              };

              const selectedCol = config[propMap[field.key]] as string | undefined;

              return (
                <ColumnMappingRow
                  key={field.key}
                  activeCurrencyCodes={activeCurrencyCodes}
                  activeDateFormat={config.dateFormat}
                  field={field}
                  headers={parsedFile.headers}
                  onSelectColumn={(col) => onUpdateColumn(field.key, col)}
                  onSelectDateFormat={(fmt) => onUpdateConfig({ dateFormat: fmt })}
                  rawRows={parsedFile.rawRows}
                  selectedColumn={selectedCol}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Bottom Continue Action & Validation Warning */}
      <View style={styles.footerContainer}>
        {validationError ? (
          <View style={styles.validationErrorCard}>
            <AlertCircle color={theme.colors.danger} size={16} />
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Continue to account matching"
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={onContinue}
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
        >
          <Text style={styles.continueButtonText}>Next: Match accounts</Text>
          <ArrowRight color={theme.colors.primaryContrast} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    guidanceCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    stepTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 6,
    },
    guidanceText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    sectionCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    sectionDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: theme.spacing.md,
    },
    choiceGroup: {
      gap: theme.spacing.sm,
    },
    choiceCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    choiceCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    choiceTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    choiceTitleSelected: {
      color: theme.colors.primary,
    },
    choiceText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    mappingListSection: {
      gap: theme.spacing.xs,
    },
    listSectionHeader: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.xs,
    },
    fallbackCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    fallbackTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    fallbackDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: theme.spacing.sm,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
    },
    currencyRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    currencyPill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    currencyPillSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    currencyPillText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    currencyPillTextSelected: {
      color: theme.colors.primaryContrast,
    },
    unrecognizedRow: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    unrecognizedWord: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.text,
    },
    typeButtonsRow: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    typeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    typeBtnSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}18`,
    },
    typeBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    typeBtnTextSelected: {
      color: theme.colors.primary,
    },
    moreDetailsSection: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    moreDetailsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    moreDetailsHeaderText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
    },
    moreDetailsBody: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    reminderCard: {
      padding: theme.spacing.sm,
      backgroundColor: `${theme.colors.info}12`,
      borderRadius: theme.borderRadius.sm,
      gap: theme.spacing.xs,
    },
    reminderTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.text,
    },
    reminderText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    footerContainer: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    validationErrorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${theme.colors.danger}15`,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    validationErrorText: {
      fontSize: 13,
      color: theme.colors.danger,
      flex: 1,
      fontWeight: "600",
    },
    continueButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
    },
    continueButtonDisabled: {
      opacity: 0.5,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.primaryContrast,
    },
  });
}

