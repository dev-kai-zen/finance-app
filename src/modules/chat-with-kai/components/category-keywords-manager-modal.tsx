import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components/icon-helper";
import type { Category } from "@/modules/categories";
import type { CategoryKeywordItem } from "../types/chat-with-kai.types";
import {
  addCategoryKeyword,
  deleteCategoryKeyword,
  DuplicateKeywordError,
  getCategoryKeywordsByCategoryId,
  resetToDefaultCategoryKeywords,
} from "../repositories/chat-knowledge.repository";

export interface CategoryKeywordsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  initialCategoryId?: string | null;
  onKeywordsChanged?: () => void;
}

export function CategoryKeywordsManagerModal({
  visible,
  onClose,
  categories,
  initialCategoryId,
  onKeywordsChanged,
}: CategoryKeywordsManagerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => initialCategoryId ?? categories[0]?.id ?? null,
  );
  const [keywords, setKeywords] = useState<CategoryKeywordItem[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategoryId(initialCategoryId);
    } else if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [initialCategoryId, categories, selectedCategoryId]);

  const loadKeywords = useCallback(async () => {
    if (!selectedCategoryId) {
      setKeywords([]);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const items = await getCategoryKeywordsByCategoryId(selectedCategoryId);
      setKeywords(items);
    } catch {
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (visible && selectedCategoryId) {
      loadKeywords();
    }
  }, [visible, selectedCategoryId, loadKeywords]);

  const handleAddKeyword = async () => {
    const trimmed = newKeywordInput.trim();
    if (!trimmed || !selectedCategoryId || saving) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      await addCategoryKeyword(selectedCategoryId, trimmed);
      setNewKeywordInput("");
      await loadKeywords();
      onKeywordsChanged?.();
    } catch (err) {
      if (err instanceof DuplicateKeywordError) {
        setErrorMessage(
          t("chatWithKai.keywordAlreadyExists", {
            keyword: trimmed,
            category: err.existingEntityName,
          }),
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await deleteCategoryKeyword(id);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
      onKeywordsChanged?.();
    } catch {
      // ignore
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      t("chatWithKai.resetDefaults"),
      t("chatWithKai.resetDefaultsConfirm"),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: t("chatWithKai.resetDefaults"),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await resetToDefaultCategoryKeywords();
              await loadKeywords();
              onKeywordsChanged?.();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Tag color={theme.colors.onPrimary} size={18} />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {t("chatWithKai.manageKeywords")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t("chatWithKai.manageKeywordsSubtitle")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Reset to default keywords"
              accessibilityRole="button"
              onPress={handleResetDefaults}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <RotateCcw color={theme.colors.textMuted} size={18} />
            </Pressable>

            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <X color={theme.colors.textPrimary} size={20} />
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.keyboardContainer}
        >
          {/* Categories Selector Carousel */}
          <View style={styles.categoryPillsContainer}>
            <ScrollView
              contentContainerStyle={styles.categoryPillsContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setErrorMessage(null);
                    }}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                    ]}
                  >
                    <IconHelper
                      color={
                        isSelected
                          ? theme.colors.onPrimary
                          : theme.colors.textMuted
                      }
                      name={cat.icon ?? "tag"}
                      size={14}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Active Category Header */}
          {selectedCategory && (
            <View style={styles.activeCategoryBar}>
              <View style={styles.activeCategoryBadge}>
                <IconHelper
                  color={selectedCategory.color ?? theme.colors.primary}
                  name={selectedCategory.icon ?? "tag"}
                  size={16}
                />
                <Text style={styles.activeCategoryName}>
                  {selectedCategory.name}
                </Text>
              </View>
              <Text style={styles.keywordCountText}>
                {keywords.length} keywords
              </Text>
            </View>
          )}

          {/* Add Keyword Input Field */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                maxLength={40}
                onChangeText={(text) => {
                  setNewKeywordInput(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={handleAddKeyword}
                placeholder={t("chatWithKai.addKeywordPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                style={styles.input}
                value={newKeywordInput}
              />
              <Pressable
                accessibilityLabel="Add keyword"
                accessibilityRole="button"
                disabled={!newKeywordInput.trim() || saving}
                onPress={handleAddKeyword}
                style={[
                  styles.addButton,
                  (!newKeywordInput.trim() || saving) && styles.addButtonDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <Plus color={theme.colors.onPrimary} size={16} />
                )}
                <Text style={styles.addButtonText}>
                  {t("chatWithKai.addKeywordButton")}
                </Text>
              </Pressable>
            </View>

            {/* Error Message if duplicate */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertCircle color={theme.colors.danger} size={14} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Keywords Display Area */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : keywords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Sparkles color={theme.colors.textMuted} size={28} />
                <Text style={styles.emptyText}>
                  {t("chatWithKai.noKeywordsYet")}
                </Text>
              </View>
            ) : (
              <View style={styles.chipsWrap}>
                {keywords.map((kw) => (
                  <View key={kw.id} style={styles.keywordChip}>
                    <Text style={styles.keywordChipText}>{kw.keyword}</Text>
                    <Pressable
                      accessibilityLabel={`Delete keyword ${kw.keyword}`}
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleDeleteKeyword(kw.id)}
                      style={styles.chipDeleteButton}
                    >
                      <X color={theme.colors.textMuted} size={12} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      flex: 1,
    },
    headerIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    headerSubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    iconButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    buttonPressed: {
      opacity: 0.6,
    },
    keyboardContainer: {
      flex: 1,
    },
    categoryPillsContainer: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      paddingVertical: theme.spacing.sm,
    },
    categoryPillsContent: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    categoryPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    categoryPillSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryPillText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    categoryPillTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activeCategoryBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    activeCategoryBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    activeCategoryName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    keywordCountText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    inputContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
    },
    inputWrapper: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    input: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: Platform.OS === "ios" ? 8 : 4,
    },
    addButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    errorBanner: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}15`,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 6,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    errorBannerText: {
      color: theme.colors.danger,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.xl,
    },
    emptyContainer: {
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xl,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    keywordChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingLeft: theme.spacing.sm,
      paddingRight: 6,
      paddingVertical: 4,
    },
    keywordChipText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    chipDeleteButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 18,
      justifyContent: "center",
      width: 18,
    },
  });
}
