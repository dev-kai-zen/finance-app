import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRight, Check, ChevronDown, Plus, Tag, AlertCircle } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Category } from "@/modules/categories";
import { DEFAULT_OTHERS_CATEGORY_IDS } from "@/modules/categories";
import { LIMITS } from "../constants/data-import.constants";
import type { CategoryMatchDecision } from "../types/data-import.types";

interface StepMatchCategoriesProps {
  categoryMatches: Record<string, CategoryMatchDecision>;
  existingCategories: Category[];
  onUpdateCategoryMatch: (key: string, decision: CategoryMatchDecision) => void;
  onContinue: () => void;
}

export function StepMatchCategories({
  categoryMatches,
  existingCategories,
  onUpdateCategoryMatch,
  onContinue,
}: StepMatchCategoriesProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  const matchKeys = Object.keys(categoryMatches);

  return (
    <View style={styles.container}>
      <View style={styles.guidanceCard}>
        <Text style={styles.stepTitle}>Match categories</Text>
        <Text style={styles.guidanceText}>
          Match spending and income categories from your file to Kaizen categories, or create them. Transfers don’t have categories.
        </Text>
      </View>

      <View style={styles.labelsInfoCard}>
        <Tag color={theme.colors.textSecondary} size={16} />
        <Text style={styles.labelsInfoText}>
          Labels separated by semicolons in your file will be matched or created automatically.
        </Text>
      </View>

      {matchKeys.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No income or spending categories found in your file.
          </Text>
        </View>
      ) : (
        matchKeys.map((key) => {
          const decision = categoryMatches[key];
          const type = decision.type;
          const isExpense = type === "expense";

          const relevantExisting = existingCategories.filter((c) => c.type === type);
          const selectedCat = existingCategories.find((c) => c.id === decision.existingCategoryId);

          const isCreatingNew = decision.mode === "new";

          return (
            <View key={key} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    isExpense ? styles.expenseBadge : styles.incomeBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      isExpense ? styles.expenseText : styles.incomeText,
                    ]}
                  >
                    {isExpense ? "Expense" : "Income"}
                  </Text>
                </View>
                <Text style={styles.sourceCategoryName}>"{decision.sourceKey.split(":").slice(1).join(":")}"</Text>
              </View>

              <View style={styles.choiceRow}>
                <Pressable
                  accessibilityRole="radio"
                  onPress={() => {
                    const defaultId = DEFAULT_OTHERS_CATEGORY_IDS[type];
                    onUpdateCategoryMatch(key, {
                      sourceKey: decision.sourceKey,
                      type,
                      mode: "existing",
                      existingCategoryId: defaultId,
                    });
                  }}
                  style={[styles.choiceBtn, !isCreatingNew && styles.choiceBtnActive]}
                >
                  <Text style={[styles.choiceBtnText, !isCreatingNew && styles.choiceBtnTextActive]}>
                    Match existing
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="radio"
                  onPress={() => {
                    const rawName = decision.sourceKey.split(":").slice(1).join(":").split(">")[0].trim();
                    onUpdateCategoryMatch(key, {
                      sourceKey: decision.sourceKey,
                      type,
                      mode: "new",
                      newCategory: {
                        name: rawName.slice(0, LIMITS.categoryName),
                        type,
                      },
                    });
                  }}
                  style={[styles.choiceBtn, isCreatingNew && styles.choiceBtnActive]}
                >
                  <Text style={[styles.choiceBtnText, isCreatingNew && styles.choiceBtnTextActive]}>
                    Create new
                  </Text>
                </Pressable>
              </View>

              {!isCreatingNew ? (
                <View style={styles.selectionSection}>
                  <Text style={styles.fieldLabel}>Kaizen category</Text>
                  <Pressable
                    onPress={() => setPickerKey(key)}
                    style={styles.dropdownTrigger}
                  >
                    <Text numberOfLines={1} style={styles.dropdownTriggerText}>
                      {selectedCat?.name || "Select Category"}
                    </Text>
                    <ChevronDown color={theme.colors.textSecondary} size={18} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.selectionSection}>
                  <Text style={styles.fieldLabel}>New category name</Text>
                  <TextInput
                    maxLength={LIMITS.categoryName}
                    onChangeText={(txt) =>
                      onUpdateCategoryMatch(key, {
                        ...decision,
                        newCategory: {
                          ...decision.newCategory!,
                          name: txt,
                        },
                      })
                    }
                    placeholder="Category name"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    value={decision.newCategory?.name || ""}
                  />
                </View>
              )}

              {/* Category picker modal for this card */}
              <Modal
                animationType="fade"
                onRequestClose={() => setPickerKey(null)}
                transparent
                visible={pickerKey === key}
              >
                <View style={styles.modalOverlay}>
                  <Pressable onPress={() => setPickerKey(null)} style={styles.modalBackdrop} />
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Choose {type} category</Text>
                    <ScrollView style={{ maxHeight: 350 }}>
                      {relevantExisting.map((c) => {
                        const isSelected = decision.existingCategoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => {
                              onUpdateCategoryMatch(key, {
                                ...decision,
                                mode: "existing",
                                existingCategoryId: c.id,
                              });
                              setPickerKey(null);
                            }}
                            style={[styles.catOptionRow, isSelected && styles.catOptionRowSelected]}
                          >
                            <Text style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}>
                              {c.name}
                            </Text>
                            {isSelected && <Check color={theme.colors.primary} size={18} />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </View>
          );
        })
      )}

      <View style={styles.footerContainer}>
        <Pressable
          accessibilityLabel="Continue to review"
          accessibilityRole="button"
          onPress={onContinue}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>Next: Review</Text>
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
    labelsInfoCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    labelsInfoText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 18,
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
    categoryCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    expenseBadge: {
      backgroundColor: `${theme.colors.danger}18`,
    },
    incomeBadge: {
      backgroundColor: `${theme.colors.success}18`,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    expenseText: {
      color: theme.colors.danger,
    },
    incomeText: {
      color: theme.colors.success,
    },
    sourceCategoryName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      flex: 1,
    },
    choiceRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    choiceBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    choiceBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}18`,
    },
    choiceBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    choiceBtnTextActive: {
      color: theme.colors.primary,
    },
    selectionSection: {
      gap: 4,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
    dropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    dropdownTriggerText: {
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
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
    footerContainer: {
      marginTop: theme.spacing.md,
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
    continueButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.primaryContrast,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    catOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    catOptionRowSelected: {
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: theme.borderRadius.sm,
    },
    catOptionText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    catOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
  });
}

