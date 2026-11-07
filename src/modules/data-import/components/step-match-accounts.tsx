import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRight, Check, CheckCircle2, Plus, Wallet, AlertCircle } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem, AccountType } from "@/modules/accounts";
import { AccountTypePickerModal } from "@/modules/accounts";
import type { CurrencyListItem } from "@/modules/currencies";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { LIMITS } from "../constants/data-import.constants";
import type {
  AccountMatchDecision,
  ImportType,
} from "../types/data-import.types";

interface StepMatchAccountsProps {
  importType: ImportType;
  accountMatches: Record<string, AccountMatchDecision>;
  existingAccounts: AccountListItem[];
  availableAccountTypes: AccountType[];
  activeCurrencies: CurrencyListItem[];
  defaultCurrencyCode: string;
  onUpdateAccountMatch: (key: string, decision: AccountMatchDecision) => void;
  onContinue: () => void;
}

export function StepMatchAccounts({
  importType,
  accountMatches,
  existingAccounts,
  availableAccountTypes,
  activeCurrencies,
  defaultCurrencyCode,
  onUpdateAccountMatch,
  onContinue,
}: StepMatchAccountsProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [activeTypePickerKey, setActiveTypePickerKey] = useState<string | null>(null);

  // Eligible existing accounts (no archived, no credit cards, no liabilities)
  const eligibleExisting = existingAccounts.filter(
    (a) => !a.isArchived && a.accountType?.accountGroup === "asset" && a.creditCardDetails === null,
  );

  const matchKeys = Object.keys(accountMatches);

  // Validation
  let hasIncomplete = false;
  for (const key of matchKeys) {
    const decision = accountMatches[key];
    if (decision.mode === "existing" && !decision.existingAccountId) {
      hasIncomplete = true;
    }
    if (decision.mode === "new" && (!decision.newAccount?.name?.trim() || !decision.newAccount?.accountTypeId)) {
      hasIncomplete = true;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.guidanceCard}>
        <Text style={styles.stepTitle}>Match accounts</Text>
        <Text style={styles.guidanceText}>
          Match each account name from your file to an existing account in Kaizen, or create a new account.
        </Text>
      </View>

      {matchKeys.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No account names found in your file.</Text>
        </View>
      ) : (
        matchKeys.map((key) => {
          const decision = accountMatches[key];
          const isExisting = decision.mode === "existing";

          const selectedExisting = eligibleExisting.find((a) => a.id === decision.existingAccountId);
          const newAcc = decision.newAccount;

          const selectedType = availableAccountTypes.find(
            (t) => t.id === newAcc?.accountTypeId,
          );

          return (
            <View key={key} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <Wallet color={theme.colors.primary} size={18} />
                <Text style={styles.sourceAccountName}>"{decision.sourceName}"</Text>
              </View>

              {/* Mode Toggle: Existing vs New */}
              <View style={styles.toggleRow}>
                <Pressable
                  accessibilityRole="radio"
                  onPress={() => {
                    const firstMatch = eligibleExisting.find(
                      (a) => a.name.toLowerCase() === key,
                    );
                    onUpdateAccountMatch(key, {
                      sourceName: decision.sourceName,
                      mode: "existing",
                      existingAccountId: firstMatch?.id || eligibleExisting[0]?.id,
                    });
                  }}
                  style={[styles.toggleBtn, isExisting && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, isExisting && styles.toggleBtnTextActive]}>
                    Use existing account
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="radio"
                  onPress={() => {
                    const defaultAssetType =
                      availableAccountTypes.find((t) => t.accountGroup === "asset") ||
                      availableAccountTypes[0];

                    onUpdateAccountMatch(key, {
                      sourceName: decision.sourceName,
                      mode: "new",
                      newAccount: {
                        name: decision.sourceName.slice(0, LIMITS.accountName),
                        accountTypeId: defaultAssetType?.id || "",
                        currencyCode: defaultCurrencyCode,
                        openingBalanceMinorUnits: 0,
                        balanceDate: new Date(),
                      },
                    });
                  }}
                  style={[styles.toggleBtn, !isExisting && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, !isExisting && styles.toggleBtnTextActive]}>
                    Set up new account
                  </Text>
                </Pressable>
              </View>

              {/* Existing Account View */}
              {isExisting ? (
                <View style={styles.subSection}>
                  <Text style={styles.subLabel}>Choose Kaizen account:</Text>
                  <View style={styles.pickerOptionsList}>
                    {eligibleExisting.map((acc) => {
                      const isSelected = decision.existingAccountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() =>
                            onUpdateAccountMatch(key, {
                              ...decision,
                              existingAccountId: acc.id,
                            })
                          }
                          style={[styles.accOption, isSelected && styles.accOptionSelected]}
                        >
                          <View style={styles.accOptionCopy}>
                            <Text style={[styles.accOptionName, isSelected && styles.accOptionNameSelected]}>
                              {acc.name}
                            </Text>
                            <Text style={styles.accOptionDetails}>
                              {acc.accountType?.name || "Account"} • {acc.currencyCode}
                            </Text>
                          </View>
                          {isSelected && <Check color={theme.colors.primary} size={18} />}
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                      Choosing an existing account keeps that account's current opening balance.
                    </Text>
                  </View>
                </View>
              ) : (
                /* New Account Setup View */
                <View style={styles.subSection}>
                  <Text style={styles.subLabel}>Account name in Kaizen</Text>
                  <TextInput
                    maxLength={LIMITS.accountName}
                    onChangeText={(txt) =>
                      onUpdateAccountMatch(key, {
                        ...decision,
                        newAccount: {
                          ...newAcc!,
                          name: txt,
                        },
                      })
                    }
                    placeholder="Account Name"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    value={newAcc?.name || ""}
                  />

                  <Text style={[styles.subLabel, { marginTop: 10 }]}>Account type</Text>
                  <Pressable
                    onPress={() => setActiveTypePickerKey(key)}
                    style={styles.dropdownBtn}
                  >
                    <Text style={styles.dropdownBtnText}>
                      {selectedType?.name || "Choose Account Type"}
                    </Text>
                  </Pressable>

                  <Text style={[styles.subLabel, { marginTop: 10 }]}>Currency</Text>
                  <View style={styles.currencyRow}>
                    {activeCurrencies.map((c) => {
                      const isCurrSelected = (newAcc?.currencyCode || defaultCurrencyCode) === c.code;
                      return (
                        <Pressable
                          key={c.code}
                          onPress={() =>
                            onUpdateAccountMatch(key, {
                              ...decision,
                              newAccount: {
                                ...newAcc!,
                                currencyCode: c.code,
                              },
                            })
                          }
                          style={[styles.currencyPill, isCurrSelected && styles.currencyPillSelected]}
                        >
                          <Text style={[styles.currencyPillText, isCurrSelected && styles.currencyPillTextSelected]}>
                            {c.code}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.subLabel, { marginTop: 10 }]}>Opening balance</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(txt) => {
                      const val = parseFloat(txt.replace(/,/g, "")) || 0;
                      const exp = getCurrencyMinorUnitExponent(newAcc?.currencyCode || defaultCurrencyCode);
                      onUpdateAccountMatch(key, {
                        ...decision,
                        newAccount: {
                          ...newAcc!,
                          openingBalanceMinorUnits: Math.round(val * 10 ** exp),
                        },
                      });
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    value={
                      newAcc?.openingBalanceMinorUnits !== undefined
                        ? (newAcc.openingBalanceMinorUnits / 10 ** getCurrencyMinorUnitExponent(newAcc.currencyCode)).toString()
                        : "0"
                    }
                  />

                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                      {importType === "transactions"
                        ? "Opening balance is the money in the account immediately before the first imported transaction. Check it against your old records."
                        : "Opening balance is the balance on the date written in your file."}
                    </Text>
                  </View>
                </View>
              )}

              {/* Account Type Modal */}
              <AccountTypePickerModal
                existingTypeId={newAcc?.accountTypeId}
                onClose={() => setActiveTypePickerKey(null)}
                onSelect={(typeId) => {
                  onUpdateAccountMatch(key, {
                    ...decision,
                    newAccount: {
                      ...newAcc!,
                      accountTypeId: typeId,
                    },
                  });
                  setActiveTypePickerKey(null);
                }}
                types={availableAccountTypes.filter((t) => t.accountGroup === "asset")}
                value={newAcc?.accountTypeId || ""}
                visible={activeTypePickerKey === key}
              />
            </View>
          );
        })
      )}

      {/* Footer continue action */}
      <View style={styles.footerContainer}>
        {hasIncomplete ? (
          <View style={styles.errorNotice}>
            <AlertCircle color={theme.colors.danger} size={16} />
            <Text style={styles.errorNoticeText}>
              Please finish matching every account before continuing.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Continue to next step"
          accessibilityRole="button"
          disabled={hasIncomplete}
          onPress={onContinue}
          style={[styles.continueButton, hasIncomplete && styles.continueButtonDisabled]}
        >
          <Text style={styles.continueButtonText}>
            {importType === "accounts" ? "Next: Review" : "Next: Match categories"}
          </Text>
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
    emptyCard: {
      padding: theme.spacing.xl,
      alignItems: "center",
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    accountCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    accountHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sourceAccountName: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
    },
    toggleRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    toggleBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}18`,
    },
    toggleBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    toggleBtnTextActive: {
      color: theme.colors.primary,
    },
    subSection: {
      gap: 6,
    },
    subLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
    pickerOptionsList: {
      gap: 6,
      marginTop: 4,
    },
    accOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    accOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    accOptionCopy: {
      gap: 2,
    },
    accOptionName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    accOptionNameSelected: {
      color: theme.colors.primary,
    },
    accOptionDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    infoBanner: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: `${theme.colors.info}12`,
    },
    infoBannerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
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
    dropdownBtn: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    dropdownBtnText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    currencyRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
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
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.text,
    },
    currencyPillTextSelected: {
      color: theme.colors.primaryContrast,
    },
    footerContainer: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    errorNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${theme.colors.danger}15`,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    errorNoticeText: {
      fontSize: 13,
      color: theme.colors.danger,
      fontWeight: "600",
      flex: 1,
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

