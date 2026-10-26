import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components/icon-helper";
import {
  CategoryPickerModal,
  useCategories,
  type Category,
} from "@/modules/categories";
import {
  AccountPickerModal,
  useAccounts,
  type AccountListItem,
} from "@/modules/accounts";
import type { TransactionType } from "@/modules/transactions";
import {
  addActionKeyword,
  checkActionKeywordAvailable,
  deleteActionKeyword,
  listActionKeywords,
  resetToDefaultActionKeywords,
  updateActionKeyword,
} from "../repositories/action-keywords.repository";
import {
  addCategoryKeyword,
  checkCategoryKeywordAvailable,
  deleteCategoryKeyword,
  getCategoryKeywordsByCategoryId,
  listAccountKeywords,
  listCategoryKeywords,
  updateCategoryKeyword,
} from "../repositories/chat-knowledge.repository";
import {
  addAccountKeyword,
  checkAccountKeywordAvailable,
  deleteAccountKeyword,
  getAccountKeywordsByAccountId,
  updateAccountKeyword,
} from "../repositories/chat-knowledge.repository";
import type {
  AccountKeywordItem,
  ActionKeywordItem,
  CategoryKeywordItem,
} from "../types/chat-with-kai.types";

export type KnowledgeTab = "actions" | "categories" | "accounts";

export interface KaiKnowledgeModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: KnowledgeTab;
  initialSelectedId?: string | null;
  categories?: Category[];
  accounts?: AccountListItem[];
  onKeywordsUpdated?: () => void;
}

interface EditingKeywordState {
  id: string;
  keyword: string;
  language: string;
  entityType: "action" | "category" | "account";
}

export function KaiKnowledgeModal({
  visible,
  onClose,
  initialTab = "actions",
  initialSelectedId = null,
  categories: categoriesProp,
  accounts: accountsProp,
  onKeywordsUpdated,
}: KaiKnowledgeModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const { categories: fetchedCategories } = useCategories();
  const { accounts: fetchedAccounts, pockets } = useAccounts();

  const categories =
    categoriesProp && categoriesProp.length > 0
      ? categoriesProp
      : fetchedCategories;
  const accounts =
    accountsProp && accountsProp.length > 0 ? accountsProp : fetchedAccounts;

  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);
  const [selectedActionType, setSelectedActionType] =
    useState<TransactionType>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Pickers state
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Keywords data
  const [actionKeywords, setActionKeywords] = useState<ActionKeywordItem[]>([]);
  const [categoryKeywords, setCategoryKeywords] = useState<
    CategoryKeywordItem[]
  >([]);
  const [accountKeywords, setAccountKeywords] = useState<AccountKeywordItem[]>(
    [],
  );

  // Input states for adding
  const [inputVal, setInputVal] = useState("");
  const [inputLanguage, setInputLanguage] = useState("any");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing modal state
  const [editingItem, setEditingItem] = useState<EditingKeywordState | null>(
    null,
  );
  const [editInputVal, setEditInputVal] = useState("");
  const [editLanguageVal, setEditLanguageVal] = useState("any");
  const [editError, setEditError] = useState<string | null>(null);
  const [editProcessing, setEditProcessing] = useState(false);

  // Load knowledge
  const loadData = useCallback(async () => {
    try {
      const [actRows, catRows, accRows] = await Promise.all([
        listActionKeywords(),
        listCategoryKeywords(),
        listAccountKeywords(),
      ]);
      setActionKeywords(actRows);
      setCategoryKeywords(catRows);
      setAccountKeywords(accRows);
    } catch (err) {
      console.error("[KaiKnowledgeModal] Failed to load data:", err);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      loadData();
      setInputVal("");
      setInputLanguage("any");
      setErrorMessage(null);
      setSearchQuery("");
      setEditingItem(null);

      if (initialTab === "categories" && initialSelectedId) {
        setSelectedCategoryId(initialSelectedId);
      } else if (categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].id);
      }

      if (initialTab === "accounts" && initialSelectedId) {
        setSelectedAccountId(initialSelectedId);
      } else if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [
    visible,
    initialTab,
    initialSelectedId,
    categories,
    accounts,
    loadData,
    selectedCategoryId,
    selectedAccountId,
  ]);

  // Selected Category Entity
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [categories, selectedCategoryId]);

  const selectedCategoryDisplayName = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory.parentId) {
      const parent = categories.find((c) => c.id === selectedCategory.parentId);
      if (parent) {
        return `${parent.name} › ${selectedCategory.name}`;
      }
    }
    return selectedCategory.name;
  }, [selectedCategory, categories]);

  // Selected Account Entity
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  // Current entity keywords filtered by search query
  const displayedActionKeywords = useMemo(() => {
    const list = actionKeywords.filter(
      (k) => k.actionType === selectedActionType,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (k) =>
        k.keyword.toLowerCase().includes(q) ||
        (k.language ?? "").toLowerCase().includes(q),
    );
  }, [actionKeywords, selectedActionType, searchQuery]);

  const displayedCategoryKeywords = useMemo(() => {
    if (!selectedCategoryId) return [];
    const list = categoryKeywords.filter(
      (k) => k.categoryId === selectedCategoryId,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (k) =>
        k.keyword.toLowerCase().includes(q) ||
        (k.language ?? "").toLowerCase().includes(q),
    );
  }, [categoryKeywords, selectedCategoryId, searchQuery]);

  const displayedAccountKeywords = useMemo(() => {
    if (!selectedAccountId) return [];
    const list = accountKeywords.filter(
      (k) => k.accountId === selectedAccountId,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (k) =>
        k.keyword.toLowerCase().includes(q) ||
        (k.language ?? "").toLowerCase().includes(q),
    );
  }, [accountKeywords, selectedAccountId, searchQuery]);

  // Handlers for adding keywords
  const handleAddKeyword = async () => {
    const clean = inputVal.trim();
    if (!clean) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      if (activeTab === "actions") {
        const check = await checkActionKeywordAvailable(clean);
        if (!check.available) {
          setErrorMessage(
            `"${clean}" is already assigned to ${check.conflictActionType} action.`,
          );
          setProcessing(false);
          return;
        }
        const created = await addActionKeyword(
          selectedActionType,
          clean,
          inputLanguage,
        );
        setActionKeywords((prev) => [...prev, created]);
      } else if (activeTab === "categories") {
        if (!selectedCategoryId) {
          setErrorMessage("Please select a category first.");
          setProcessing(false);
          return;
        }
        const check = await checkCategoryKeywordAvailable(
          clean,
          selectedCategoryId,
        );
        if (!check.available) {
          setErrorMessage(
            `"${clean}" is already assigned to "${check.conflictEntityName}".`,
          );
          setProcessing(false);
          return;
        }
        const created = await addCategoryKeyword(
          selectedCategoryId,
          clean,
          inputLanguage,
        );
        setCategoryKeywords((prev) => [...prev, created]);
      } else if (activeTab === "accounts") {
        if (!selectedAccountId) {
          setErrorMessage("Please select an account first.");
          setProcessing(false);
          return;
        }
        const check = await checkAccountKeywordAvailable(
          clean,
          selectedAccountId,
        );
        if (!check.available) {
          setErrorMessage(
            `"${clean}" is already assigned to "${check.conflictEntityName}".`,
          );
          setProcessing(false);
          return;
        }
        const created = await addAccountKeyword(
          selectedAccountId,
          clean,
          inputLanguage,
        );
        setAccountKeywords((prev) => [...prev, created]);
      }

      setInputVal("");
      setErrorMessage(null);
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to add keyword.");
    } finally {
      setProcessing(false);
    }
  };

  // Handlers for deleting keywords
  const handleRemoveActionKeyword = async (id: string) => {
    try {
      await deleteActionKeyword(id);
      setActionKeywords((prev) => prev.filter((k) => k.id !== id));
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to delete keyword.");
    }
  };

  const handleRemoveCategoryKeyword = async (id: string) => {
    try {
      await deleteCategoryKeyword(id);
      setCategoryKeywords((prev) => prev.filter((k) => k.id !== id));
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to delete keyword.");
    }
  };

  const handleRemoveAccountKeyword = async (id: string) => {
    try {
      await deleteAccountKeyword(id);
      setAccountKeywords((prev) => prev.filter((k) => k.id !== id));
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to delete keyword.");
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (
    item: { id: string; keyword: string; language?: string | null },
    entityType: "action" | "category" | "account",
  ) => {
    setEditingItem({
      id: item.id,
      keyword: item.keyword,
      language: item.language ?? "any",
      entityType,
    });
    setEditInputVal(item.keyword);
    setEditLanguageVal(item.language ?? "any");
    setEditError(null);
  };

  // Save Edit Dialog
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const clean = editInputVal.trim();
    if (!clean) {
      setEditError("Keyword cannot be empty.");
      return;
    }

    setEditProcessing(true);
    setEditError(null);

    try {
      if (editingItem.entityType === "action") {
        const updated = await updateActionKeyword(
          editingItem.id,
          clean,
          editLanguageVal,
        );
        setActionKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      } else if (editingItem.entityType === "category") {
        const updated = await updateCategoryKeyword(
          editingItem.id,
          clean,
          editLanguageVal,
        );
        setCategoryKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      } else if (editingItem.entityType === "account") {
        const updated = await updateAccountKeyword(
          editingItem.id,
          clean,
          editLanguageVal,
        );
        setAccountKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      }

      setEditingItem(null);
      onKeywordsUpdated?.();
    } catch (err: any) {
      setEditError(err?.message ?? "Failed to update keyword.");
    } finally {
      setEditProcessing(false);
    }
  };

  // Reset actions to default
  const handleResetActionKeywords = async () => {
    Alert.alert(
      t("chatWithKai.resetDefaults"),
      t("chatWithKai.resetDefaultsConfirm"),
      [
        { text: t("chatWithKai.cancel"), style: "cancel" },
        {
          text: t("chatWithKai.resetDefaults"),
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              await resetToDefaultActionKeywords();
              const actRows = await listActionKeywords();
              setActionKeywords(actRows);
              onKeywordsUpdated?.();
            } catch (err: any) {
              setErrorMessage(err?.message ?? "Failed to reset action keywords.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Language options
  const languageOptions = [
    { code: "any", label: t("chatWithKai.langAny") },
    { code: "en", label: t("chatWithKai.langEn") },
    { code: "fil", label: t("chatWithKai.langFil") },
    { code: "es", label: t("chatWithKai.langEs") },
  ];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={visible}
    >
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={[
          styles.fullScreenContainer,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Full-Screen Header */}
        <View style={styles.topHeader}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={styles.backBtn}
          >
            <ArrowLeft color={theme.colors.textPrimary} size={22} />
          </Pressable>

          <View style={styles.topTitleBox}>
            <Text style={styles.topTitle}>
              {t("chatWithKai.knowledgeHubTitle")}
            </Text>
            <Text numberOfLines={1} style={styles.topSubtitle}>
              {t("chatWithKai.knowledgeHubSubtitle")}
            </Text>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Top 3-Tab Segmented Control */}
        <View style={styles.tabBar}>
          <Pressable
            accessibilityLabel="Actions Tab"
            accessibilityRole="button"
            onPress={() => {
              setActiveTab("actions");
              setErrorMessage(null);
            }}
            style={[
              styles.tabBtn,
              activeTab === "actions" && styles.tabBtnActive,
            ]}
          >
            <Sparkles
              color={
                activeTab === "actions"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={16}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "actions" && styles.tabBtnTextActive,
              ]}
            >
              {t("chatWithKai.tabActions")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Categories Tab"
            accessibilityRole="button"
            onPress={() => {
              setActiveTab("categories");
              setErrorMessage(null);
            }}
            style={[
              styles.tabBtn,
              activeTab === "categories" && styles.tabBtnActive,
            ]}
          >
            <Tag
              color={
                activeTab === "categories"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={16}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "categories" && styles.tabBtnTextActive,
              ]}
            >
              {t("chatWithKai.tabCategories")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Accounts Tab"
            accessibilityRole="button"
            onPress={() => {
              setActiveTab("accounts");
              setErrorMessage(null);
            }}
            style={[
              styles.tabBtn,
              activeTab === "accounts" && styles.tabBtnActive,
            ]}
          >
            <Wallet
              color={
                activeTab === "accounts"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={16}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "accounts" && styles.tabBtnTextActive,
              ]}
            >
              {t("chatWithKai.tabAccounts")}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: ACTIONS */}
          {activeTab === "actions" && (
            <View>
              {/* Action Type Segmented Bar */}
              <View style={styles.actionSegmentRow}>
                <Pressable
                  onPress={() => setSelectedActionType("expense")}
                  style={[
                    styles.actionSegmentBtn,
                    selectedActionType === "expense" &&
                      styles.actionSegmentBtnActiveExpense,
                  ]}
                >
                  <ArrowUpRight
                    color={
                      selectedActionType === "expense"
                        ? "#EF4444"
                        : theme.colors.textMuted
                    }
                    size={15}
                  />
                  <Text
                    style={[
                      styles.actionSegmentBtnText,
                      selectedActionType === "expense" && {
                        color: "#EF4444",
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t("chatWithKai.actionExpense")} (
                    {
                      actionKeywords.filter((k) => k.actionType === "expense")
                        .length
                    }
                    )
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedActionType("income")}
                  style={[
                    styles.actionSegmentBtn,
                    selectedActionType === "income" &&
                      styles.actionSegmentBtnActiveIncome,
                  ]}
                >
                  <ArrowDownLeft
                    color={
                      selectedActionType === "income"
                        ? "#10B981"
                        : theme.colors.textMuted
                    }
                    size={15}
                  />
                  <Text
                    style={[
                      styles.actionSegmentBtnText,
                      selectedActionType === "income" && {
                        color: "#10B981",
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t("chatWithKai.actionIncome")} (
                    {
                      actionKeywords.filter((k) => k.actionType === "income")
                        .length
                    }
                    )
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedActionType("transfer")}
                  style={[
                    styles.actionSegmentBtn,
                    selectedActionType === "transfer" &&
                      styles.actionSegmentBtnActiveTransfer,
                  ]}
                >
                  <ArrowLeftRight
                    color={
                      selectedActionType === "transfer"
                        ? "#3B82F6"
                        : theme.colors.textMuted
                    }
                    size={15}
                  />
                  <Text
                    style={[
                      styles.actionSegmentBtnText,
                      selectedActionType === "transfer" && {
                        color: "#3B82F6",
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t("chatWithKai.actionTransfer")} (
                    {
                      actionKeywords.filter((k) => k.actionType === "transfer")
                        .length
                    }
                    )
                  </Text>
                </Pressable>
              </View>

              {/* Action Banner */}
              <View style={styles.infoBanner}>
                <Sparkles color={theme.colors.primary} size={16} />
                <Text style={styles.infoBannerText}>
                  {selectedActionType === "expense"
                    ? t("chatWithKai.actionExpenseDescription")
                    : selectedActionType === "income"
                      ? t("chatWithKai.actionIncomeDescription")
                      : t("chatWithKai.actionTransferDescription")}
                </Text>
              </View>
            </View>
          )}

          {/* TAB 2: CATEGORIES (Category Picker Card) */}
          {activeTab === "categories" && (
            <View>
              <Pressable
                accessibilityLabel={t("chatWithKai.changeCategory")}
                accessibilityRole="button"
                onPress={() => setCategoryPickerVisible(true)}
                style={({ pressed }) => [
                  styles.entitySelectorCard,
                  pressed && styles.entitySelectorCardPressed,
                ]}
              >
                <View style={styles.entitySelectorLeft}>
                  <View
                    style={[
                      styles.entityIconBadge,
                      {
                        backgroundColor: `${theme.colors.primary}18`,
                        borderColor: `${theme.colors.primary}40`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={theme.colors.primary}
                      name={selectedCategory?.icon ?? "tag"}
                      size={20}
                    />
                  </View>
                  <View style={styles.entityTextBox}>
                    <Text style={styles.entitySelectorLabel}>
                      {t("chatWithKai.tabCategories").toUpperCase()}
                    </Text>
                    <Text numberOfLines={1} style={styles.entitySelectorTitle}>
                      {selectedCategoryDisplayName ??
                        t("chatWithKai.selectCategoryPrompt")}
                    </Text>
                  </View>
                </View>

                <View style={styles.changeActionBadge}>
                  <Text style={styles.changeActionText}>
                    {t("chatWithKai.changeCategory")}
                  </Text>
                  <ChevronRight color={theme.colors.primary} size={16} />
                </View>
              </Pressable>

              <View style={styles.infoBanner}>
                <Sparkles color={theme.colors.primary} size={16} />
                <Text style={styles.infoBannerText}>
                  {t("chatWithKai.bannerCategory")}
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: ACCOUNTS (Account Picker Card) */}
          {activeTab === "accounts" && (
            <View>
              <Pressable
                accessibilityLabel={t("chatWithKai.changeAccount")}
                accessibilityRole="button"
                onPress={() => setAccountPickerVisible(true)}
                style={({ pressed }) => [
                  styles.entitySelectorCard,
                  pressed && styles.entitySelectorCardPressed,
                ]}
              >
                <View style={styles.entitySelectorLeft}>
                  <View
                    style={[
                      styles.entityIconBadge,
                      {
                        backgroundColor: `${theme.colors.primary}18`,
                        borderColor: `${theme.colors.primary}40`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={theme.colors.primary}
                      name={
                        selectedAccount?.iconKey ??
                        selectedAccount?.accountType?.iconKey ??
                        "wallet"
                      }
                      size={20}
                    />
                  </View>
                  <View style={styles.entityTextBox}>
                    <Text style={styles.entitySelectorLabel}>
                      {t("chatWithKai.tabAccounts").toUpperCase()}
                    </Text>
                    <Text numberOfLines={1} style={styles.entitySelectorTitle}>
                      {selectedAccount?.name ??
                        t("chatWithKai.selectAccountPrompt")}
                    </Text>
                  </View>
                </View>

                <View style={styles.changeActionBadge}>
                  <Text style={styles.changeActionText}>
                    {t("chatWithKai.changeAccount")}
                  </Text>
                  <ChevronRight color={theme.colors.primary} size={16} />
                </View>
              </Pressable>

              <View style={styles.infoBanner}>
                <Sparkles color={theme.colors.primary} size={16} />
                <Text style={styles.infoBannerText}>
                  {t("chatWithKai.bannerAccount")}
                </Text>
              </View>
            </View>
          )}

          {/* ADD KEYWORD SECTION */}
          <View style={styles.addSectionCard}>
            <Text style={styles.sectionHeading}>
              {activeTab === "actions"
                ? `ADD ACTION KEYWORD (${selectedActionType.toUpperCase()})`
                : activeTab === "categories"
                  ? `ADD KEYWORD FOR ${selectedCategory?.name?.toUpperCase() ?? "CATEGORY"}`
                  : `ADD KEYWORD FOR ${selectedAccount?.name?.toUpperCase() ?? "ACCOUNT"}`}
            </Text>

            <View style={styles.addInputRow}>
              <TextInput
                autoCapitalize="none"
                editable={!processing}
                onChangeText={(text) => {
                  setInputVal(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onSubmitEditing={handleAddKeyword}
                placeholder={
                  activeTab === "actions"
                    ? t("chatWithKai.addActionPlaceholder")
                    : activeTab === "categories"
                      ? t("chatWithKai.addKeywordPlaceholderCategory")
                      : t("chatWithKai.addKeywordPlaceholderAccount")
                }
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                style={styles.addTextInput}
                value={inputVal}
              />

              <Pressable
                accessibilityLabel="Add Keyword"
                accessibilityRole="button"
                disabled={processing || !inputVal.trim()}
                onPress={handleAddKeyword}
                style={[
                  styles.addSubmitBtn,
                  (!inputVal.trim() || processing) &&
                    styles.addSubmitBtnDisabled,
                ]}
              >
                {processing ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <Plus color={theme.colors.onPrimary} size={18} />
                )}
              </Pressable>
            </View>

            {/* Language Selector for Added Keyword */}
            <View style={styles.languageSegmentRow}>
              <Text style={styles.languageLabel}>
                {t("chatWithKai.selectLanguage")}:
              </Text>
              <View style={styles.languagePillsWrap}>
                {languageOptions.map((opt) => {
                  const isSelected = inputLanguage === opt.code;
                  return (
                    <Pressable
                      key={opt.code}
                      onPress={() => setInputLanguage(opt.code)}
                      style={[
                        styles.langPill,
                        isSelected && styles.langPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.langPillText,
                          isSelected && styles.langPillTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {errorMessage && (
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            )}
          </View>

          {/* KEYWORDS TABLE CONTAINER */}
          <View style={styles.tableCard}>
            {/* Table Header Controls: Search Box & Optional Reset */}
            <View style={styles.tableTopControls}>
              <View style={styles.searchBox}>
                <Search color={theme.colors.textMuted} size={16} />
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setSearchQuery}
                  placeholder={t("chatWithKai.searchKeywordsPlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.searchInput}
                  value={searchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable hitSlop={6} onPress={() => setSearchQuery("")}>
                    <X color={theme.colors.textMuted} size={16} />
                  </Pressable>
                )}
              </View>

              {activeTab === "actions" && (
                <Pressable
                  accessibilityLabel="Restore Defaults"
                  accessibilityRole="button"
                  disabled={processing}
                  onPress={handleResetActionKeywords}
                  style={styles.resetBtn}
                >
                  <RotateCcw color={theme.colors.textMuted} size={14} />
                  <Text style={styles.resetBtnText}>
                    {t("chatWithKai.resetDefaults")}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Table Column Headers */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.cellKeyword]}>
                {t("chatWithKai.tableHeaderKeyword").toUpperCase()}
              </Text>
              <Text style={[styles.tableHeaderCell, styles.cellLanguage]}>
                {t("chatWithKai.tableHeaderLanguage").toUpperCase()}
              </Text>
              <Text style={[styles.tableHeaderCell, styles.cellActions]}>
                {t("chatWithKai.tableHeaderActions").toUpperCase()}
              </Text>
            </View>

            {/* Table Body */}
            {activeTab === "actions" &&
              displayedActionKeywords.length === 0 && (
                <View style={styles.emptyTableState}>
                  <Text style={styles.emptyTableText}>
                    {searchQuery.trim()
                      ? t("chatWithKai.noKeywordsMatching", {
                          query: searchQuery,
                        })
                      : t("chatWithKai.noKeywordsYet")}
                  </Text>
                </View>
              )}

            {activeTab === "actions" &&
              displayedActionKeywords.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && styles.tableRowEven,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.rowKeywordText}>
                    {item.keyword}
                  </Text>

                  <View style={styles.rowLanguageBadge}>
                    <Text style={styles.rowLanguageBadgeText}>
                      {(item.language ?? "any").toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.rowActionsCell}>
                    <Pressable
                      accessibilityLabel="Edit keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleOpenEdit(item, "action")}
                      style={styles.iconActionBtn}
                    >
                      <Pencil color={theme.colors.primary} size={16} />
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Delete keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleRemoveActionKeyword(item.id)}
                      style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                    >
                      <Trash2 color={theme.colors.danger} size={16} />
                    </Pressable>
                  </View>
                </View>
              ))}

            {activeTab === "categories" &&
              displayedCategoryKeywords.length === 0 && (
                <View style={styles.emptyTableState}>
                  <Text style={styles.emptyTableText}>
                    {searchQuery.trim()
                      ? t("chatWithKai.noKeywordsMatching", {
                          query: searchQuery,
                        })
                      : t("chatWithKai.noKeywordsYet")}
                  </Text>
                </View>
              )}

            {activeTab === "categories" &&
              displayedCategoryKeywords.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && styles.tableRowEven,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.rowKeywordText}>
                    {item.keyword}
                  </Text>

                  <View style={styles.rowLanguageBadge}>
                    <Text style={styles.rowLanguageBadgeText}>
                      {(item.language ?? "any").toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.rowActionsCell}>
                    <Pressable
                      accessibilityLabel="Edit keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleOpenEdit(item, "category")}
                      style={styles.iconActionBtn}
                    >
                      <Pencil color={theme.colors.primary} size={16} />
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Delete keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleRemoveCategoryKeyword(item.id)}
                      style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                    >
                      <Trash2 color={theme.colors.danger} size={16} />
                    </Pressable>
                  </View>
                </View>
              ))}

            {activeTab === "accounts" &&
              displayedAccountKeywords.length === 0 && (
                <View style={styles.emptyTableState}>
                  <Text style={styles.emptyTableText}>
                    {searchQuery.trim()
                      ? t("chatWithKai.noKeywordsMatching", {
                          query: searchQuery,
                        })
                      : t("chatWithKai.noKeywordsYet")}
                  </Text>
                </View>
              )}

            {activeTab === "accounts" &&
              displayedAccountKeywords.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && styles.tableRowEven,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.rowKeywordText}>
                    {item.keyword}
                  </Text>

                  <View style={styles.rowLanguageBadge}>
                    <Text style={styles.rowLanguageBadgeText}>
                      {(item.language ?? "any").toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.rowActionsCell}>
                    <Pressable
                      accessibilityLabel="Edit keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleOpenEdit(item, "account")}
                      style={styles.iconActionBtn}
                    >
                      <Pencil color={theme.colors.primary} size={16} />
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Delete keyword"
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => handleRemoveAccountKeyword(item.id)}
                      style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                    >
                      <Trash2 color={theme.colors.danger} size={16} />
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>

        {/* CATEGORY PICKER MODAL */}
        <CategoryPickerModal
          categories={categories}
          onClose={() => setCategoryPickerVisible(false)}
          onSelectCategory={(cat) => {
            setSelectedCategoryId(cat.id);
            setCategoryPickerVisible(false);
          }}
          selectedCategoryId={selectedCategoryId}
          title={t("chatWithKai.filterCategory")}
          visible={categoryPickerVisible}
        />

        {/* ACCOUNT PICKER MODAL */}
        <AccountPickerModal
          accounts={accounts}
          hidePockets={true}
          onClose={() => setAccountPickerVisible(false)}
          onSelectLocation={(acc) => {
            setSelectedAccountId(acc.id);
            setAccountPickerVisible(false);
          }}
          pockets={pockets}
          selectedAccountId={selectedAccountId}
          visible={accountPickerVisible}
        />

        {/* EDIT KEYWORD DIALOG MODAL */}
        <Modal
          animationType="fade"
          onRequestClose={() => setEditingItem(null)}
          transparent
          visible={editingItem !== null}
        >
          <View style={styles.dialogBackdrop}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>
                  {t("chatWithKai.editKeywordTitle")}
                </Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => setEditingItem(null)}
                >
                  <X color={theme.colors.textMuted} size={20} />
                </Pressable>
              </View>

              <View style={styles.dialogBody}>
                <Text style={styles.dialogFieldLabel}>
                  {t("chatWithKai.tableHeaderKeyword").toUpperCase()}
                </Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!editProcessing}
                  onChangeText={(text) => {
                    setEditInputVal(text);
                    if (editError) setEditError(null);
                  }}
                  style={styles.dialogInput}
                  value={editInputVal}
                />

                <Text style={[styles.dialogFieldLabel, { marginTop: 14 }]}>
                  {t("chatWithKai.tableHeaderLanguage").toUpperCase()}
                </Text>
                <View style={styles.languagePillsWrap}>
                  {languageOptions.map((opt) => {
                    const isSelected = editLanguageVal === opt.code;
                    return (
                      <Pressable
                        key={opt.code}
                        onPress={() => setEditLanguageVal(opt.code)}
                        style={[
                          styles.langPill,
                          isSelected && styles.langPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.langPillText,
                            isSelected && styles.langPillTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {editError && (
                  <Text style={styles.errorBannerText}>{editError}</Text>
                )}
              </View>

              <View style={styles.dialogFooter}>
                <Pressable
                  disabled={editProcessing}
                  onPress={() => setEditingItem(null)}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>
                    {t("chatWithKai.cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={editProcessing || !editInputVal.trim()}
                  onPress={handleSaveEdit}
                  style={[
                    styles.dialogSaveBtn,
                    (!editInputVal.trim() || editProcessing) &&
                      styles.dialogSaveBtnDisabled,
                  ]}
                >
                  {editProcessing ? (
                    <ActivityIndicator
                      color={theme.colors.onPrimary}
                      size="small"
                    />
                  ) : (
                    <Text style={styles.dialogSaveText}>
                      {t("chatWithKai.saveChanges")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
    },
    topTitleBox: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 12,
    },
    topTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    topSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerRightPlaceholder: {
      width: 40,
    },
    tabBar: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: `${theme.colors.primary}18`,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    tabBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    tabBtnTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    actionSegmentRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    actionSegmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 5,
    },
    actionSegmentBtnActiveExpense: {
      borderColor: "#EF4444",
      backgroundColor: "#EF444415",
    },
    actionSegmentBtnActiveIncome: {
      borderColor: "#10B981",
      backgroundColor: "#10B98115",
    },
    actionSegmentBtnActiveTransfer: {
      borderColor: "#3B82F6",
      backgroundColor: "#3B82F615",
    },
    actionSegmentBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}12`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}25`,
      marginBottom: 16,
      gap: 10,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textPrimary,
    },
    entitySelectorCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    entitySelectorCardPressed: {
      opacity: 0.85,
      backgroundColor: theme.colors.surfaceElevated,
    },
    entitySelectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    entityIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    entityTextBox: {
      flex: 1,
    },
    entitySelectorLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    entitySelectorTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    changeActionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: `${theme.colors.primary}15`,
    },
    changeActionText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    addSectionCard: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      marginBottom: 10,
    },
    addInputRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    addTextInput: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    addSubmitBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    addSubmitBtnDisabled: {
      opacity: 0.4,
    },
    languageSegmentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    languageLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    languagePillsWrap: {
      flexDirection: "row",
      gap: 6,
    },
    langPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    langPillSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    langPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    langPillTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: "700",
    },
    errorBannerText: {
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 8,
    },
    tableCard: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    tableTopControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 10,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 38,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    resetBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
    },
    resetBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    tableHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tableHeaderCell: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
    },
    cellKeyword: {
      flex: 1,
    },
    cellLanguage: {
      width: 75,
      textAlign: "center",
    },
    cellActions: {
      width: 80,
      textAlign: "center",
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tableRowEven: {
      backgroundColor: `${theme.colors.surfaceElevated}40`,
    },
    rowKeywordText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginRight: 8,
    },
    rowLanguageBadge: {
      width: 75,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLanguageBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: theme.colors.surfaceElevated,
      color: theme.colors.textSecondary,
    },
    rowActionsCell: {
      width: 80,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    iconActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}12`,
    },
    iconDeleteBtn: {
      backgroundColor: `${theme.colors.danger}12`,
    },
    emptyTableState: {
      padding: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTableText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    dialogBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    dialogCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    dialogHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    dialogBody: {
      padding: 18,
    },
    dialogFieldLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    dialogInput: {
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    dialogFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 10,
    },
    dialogCancelBtn: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
    },
    dialogCancelText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    dialogSaveBtn: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    dialogSaveBtnDisabled: {
      opacity: 0.4,
    },
    dialogSaveText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
  });
