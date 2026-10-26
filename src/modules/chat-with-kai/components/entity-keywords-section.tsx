import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Sparkles, Plus, X, Tag } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import {
  checkAccountKeywordAvailable,
  checkCategoryKeywordAvailable,
} from "../repositories/chat-knowledge.repository";

export interface EntityKeywordsSectionProps {
  entityType: "category" | "account";
  entityId?: string | null;
  keywords: string[];
  onChangeKeywords: (keywords: string[]) => void;
  accentColor?: string;
  disabled?: boolean;
}

export function EntityKeywordsSection({
  entityType,
  entityId,
  keywords,
  onChangeKeywords,
  accentColor,
  disabled = false,
}: EntityKeywordsSectionProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [inputVal, setInputVal] = useState("");
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeColor = accentColor ?? theme.colors.primary;

  const handleAddKeyword = async () => {
    const clean = inputVal.trim();
    if (!clean || disabled || checking) return;

    const lowerClean = clean.toLowerCase();

    // 1. Check if already present in local list
    const isLocalDuplicate = keywords.some(
      (k) => k.trim().toLowerCase() === lowerClean,
    );
    if (isLocalDuplicate) {
      setErrorMessage(
        t("chatWithKai.keywordDuplicateInList", { keyword: clean }) ??
          `"${clean}" is already in the list.`,
      );
      return;
    }

    // 2. Validate availability in SQLite against other entities
    setChecking(true);
    setErrorMessage(null);

    try {
      if (entityType === "category") {
        const check = await checkCategoryKeywordAvailable(clean, entityId);
        if (!check.available) {
          setErrorMessage(
            t("chatWithKai.keywordAlreadyExists", {
              keyword: clean,
              entity: check.conflictEntityName ?? "another category",
            }) ??
              `"${clean}" is already assigned to "${check.conflictEntityName}".`,
          );
          return;
        }
      } else {
        const check = await checkAccountKeywordAvailable(clean, entityId);
        if (!check.available) {
          setErrorMessage(
            t("chatWithKai.keywordAlreadyExists", {
              keyword: clean,
              entity: check.conflictEntityName ?? "another account",
            }) ??
              `"${clean}" is already assigned to "${check.conflictEntityName}".`,
          );
          return;
        }
      }

      // Valid: Append to keywords list
      onChangeKeywords([...keywords, clean]);
      setInputVal("");
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Unable to validate keyword.");
    } finally {
      setChecking(false);
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    if (disabled) return;
    onChangeKeywords(keywords.filter((_, i) => i !== indexToRemove));
  };

  const placeholderText =
    entityType === "category"
      ? (t("chatWithKai.addKeywordPlaceholderCategory") ??
        "Add keyword (e.g. coffee, groceries, netflix)...")
      : (t("chatWithKai.addKeywordPlaceholderAccount") ??
        "Add keyword (e.g. payroll, wallet, bpi)...");

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>
          {t("chatWithKai.sectionTitle") ?? "KEYWORDS (KAI ASSISTANT KNOWLEDGE)"}
        </Text>
      </View>

      {/* Info Banner */}
      <View
        style={[
          styles.bannerCard,
          {
            backgroundColor: `${activeColor}12`,
            borderColor: `${activeColor}30`,
          },
        ]}
      >
        <View style={styles.bannerIconWrapper}>
          <Sparkles color={activeColor} size={18} />
        </View>
        <Text style={styles.bannerText}>
          {entityType === "category"
            ? (t("chatWithKai.bannerCategory") ??
              "Keywords entered here teach Kai to automatically recognize this category when you enter transactions via chat.")
            : (t("chatWithKai.bannerAccount") ??
              "Keywords entered here teach Kai to automatically recognize this account when you enter transactions via chat.")}
        </Text>
      </View>

      {/* Chips List */}
      <View style={styles.chipsContainer}>
        {keywords.length > 0 ? (
          keywords.map((kw, index) => (
            <View
              key={`${kw}-${index}`}
              style={[
                styles.chip,
                {
                  borderColor: `${activeColor}40`,
                  backgroundColor: theme.colors.surfaceMuted,
                },
              ]}
            >
              <Tag color={activeColor} size={12} style={styles.chipTagIcon} />
              <Text style={styles.chipText}>{kw}</Text>
              {!disabled && (
                <Pressable
                  accessibilityLabel={`Remove keyword ${kw}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => handleRemoveKeyword(index)}
                  style={styles.chipRemoveBtn}
                >
                  <X color={theme.colors.textMuted} size={13} />
                </Pressable>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {t("chatWithKai.noKeywordsYet") ?? "No keywords added yet."}
          </Text>
        )}
      </View>

      {/* Add Keyword Input Row */}
      {!disabled && (
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled && !checking}
              maxLength={40}
              onChangeText={(text) => {
                setInputVal(text);
                if (errorMessage) setErrorMessage(null);
              }}
              onSubmitEditing={handleAddKeyword}
              placeholder={placeholderText}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.textInput}
              value={inputVal}
            />
            <Pressable
              accessibilityLabel="Add keyword"
              accessibilityRole="button"
              disabled={!inputVal.trim() || disabled || checking}
              onPress={handleAddKeyword}
              style={[
                styles.addBtn,
                { backgroundColor: activeColor },
                (!inputVal.trim() || disabled || checking) && styles.addBtnDisabled,
              ]}
            >
              {checking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Plus color="#ffffff" size={16} strokeWidth={2.5} />
                  <Text style={styles.addBtnText}>
                    {t("chatWithKai.addKeywordButton") ?? "Add"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Validation Feedback */}
          {Boolean(errorMessage) && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      marginTop: 20,
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    bannerCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
      gap: 10,
    },
    bannerIconWrapper: {
      marginTop: 1,
    },
    bannerText: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "500",
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
      minHeight: 32,
      marginBottom: 10,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      borderWidth: 1,
      paddingVertical: 5,
      paddingLeft: 9,
      paddingRight: 7,
      gap: 5,
    },
    chipTagIcon: {
      marginRight: 2,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    chipRemoveBtn: {
      padding: 2,
      marginLeft: 2,
      borderRadius: 10,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 12.5,
      fontStyle: "italic",
      marginVertical: 4,
    },
    inputSection: {
      marginTop: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 13.5,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 4,
    },
    addBtnDisabled: {
      opacity: 0.45,
    },
    addBtnText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
      fontWeight: "500",
    },
  });
}
