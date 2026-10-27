import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ConfirmModal, IconHelper } from "@/components";
import { useCategories, type Category } from "@/modules/categories";
import { useAccounts, type AccountListItem } from "@/modules/accounts";
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
  listAccountKeywords,
  listCategoryKeywords,
  updateCategoryKeyword,
} from "../repositories/chat-knowledge.repository";
import {
  addAccountKeyword,
  checkAccountKeywordAvailable,
  deleteAccountKeyword,
  updateAccountKeyword,
} from "../repositories/chat-knowledge.repository";
import {
  addMerchantKeyword,
  checkMerchantKeywordAvailable,
  checkMerchantNameAvailable,
  deleteMerchant,
  deleteMerchantKeyword,
  listMerchantKeywords,
  listMerchants,
  updateMerchant,
  updateMerchantKeyword,
  upsertMerchant,
  type MerchantItem,
  type MerchantKeywordItem,
} from "../repositories/merchants.repository";
import type {
  AccountKeywordItem,
  ActionKeywordItem,
  CategoryKeywordItem,
} from "../types/chat-with-kai.types";
import { KaiKnowledgeHelpModal } from "./kai-knowledge-help-modal";
import { KaiCategoryPickerModal } from "./kai-category-picker-modal";
import { KaiAccountPickerModal } from "./kai-account-picker-modal";
import { KaiMerchantPickerModal } from "./kai-merchant-picker-modal";

export type KnowledgeTab = "actions" | "categories" | "accounts" | "merchants";
export type MerchantSubTab = "merchants" | "keywords";

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
  entityType: "action" | "category" | "account" | "merchant";
}

interface DeleteTarget {
  type:
    | "actionKeyword"
    | "categoryKeyword"
    | "accountKeyword"
    | "merchantKeyword"
    | "merchant";
  id: string;
  name: string;
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
  const { accounts: fetchedAccounts } = useAccounts();

  const categories =
    categoriesProp && categoriesProp.length > 0
      ? categoriesProp
      : fetchedCategories;
  const accounts =
    accountsProp && accountsProp.length > 0 ? accountsProp : fetchedAccounts;

  // Flatten categories so both parents and subcategories are searchable/findable
  const flatCategories = useMemo(() => {
    const flat: Category[] = [];
    for (const cat of categories) {
      flat.push(cat);
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          flat.push(sub);
        }
      }
    }
    return flat;
  }, [categories]);

  const [activeTab, setActiveTab] = useState<KnowledgeTab>(initialTab);
  const [selectedActionType, setSelectedActionType] =
    useState<TransactionType>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Merchants state
  const [merchantSubTab, setMerchantSubTab] =
    useState<MerchantSubTab>("merchants");
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [merchantKeywords, setMerchantKeywords] = useState<
    MerchantKeywordItem[]
  >([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    null,
  );
  const [merchantPickerVisible, setMerchantPickerVisible] = useState(false);

  // New merchant inline inputs (in "merchants" sub-tab)
  const [newMerchantName, setNewMerchantName] = useState("");
  const [newMerchantCategoryId, setNewMerchantCategoryId] = useState<
    string | null
  >(null);
  const [newMerchantAccountId, setNewMerchantAccountId] = useState<
    string | null
  >(null);
  const [merchantCategoryPickerVisible, setMerchantCategoryPickerVisible] =
    useState(false);
  const [merchantAccountPickerVisible, setMerchantAccountPickerVisible] =
    useState(false);

  // Editing merchant state
  const [editingMerchant, setEditingMerchant] = useState<MerchantItem | null>(
    null,
  );
  const [editMerchantName, setEditMerchantName] = useState("");
  const [editMerchantCategoryId, setEditMerchantCategoryId] = useState<
    string | null
  >(null);
  const [editMerchantAccountId, setEditMerchantAccountId] = useState<
    string | null
  >(null);
  const [
    editMerchantCategoryPickerVisible,
    setEditMerchantCategoryPickerVisible,
  ] = useState(false);
  const [
    editMerchantAccountPickerVisible,
    setEditMerchantAccountPickerVisible,
  ] = useState(false);
  const [editMerchantProcessing, setEditMerchantProcessing] = useState(false);
  const [editMerchantError, setEditMerchantError] = useState<string | null>(
    null,
  );

  // Pickers state
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

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
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing modal state
  const [editingItem, setEditingItem] = useState<EditingKeywordState | null>(
    null,
  );
  const [editInputVal, setEditInputVal] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editProcessing, setEditProcessing] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Ref to track if modal just opened to prevent unwanted resets
  const prevVisibleRef = useRef(false);

  // Load knowledge
  const loadData = useCallback(async () => {
    try {
      const [actRows, catRows, accRows, merchRows, mkwRows] =
        await Promise.all([
          listActionKeywords(),
          listCategoryKeywords(),
          listAccountKeywords(),
          listMerchants(),
          listMerchantKeywords(),
        ]);
      setActionKeywords(actRows);
      setCategoryKeywords(catRows);
      setAccountKeywords(accRows);
      setMerchants(merchRows);
      setMerchantKeywords(mkwRows);
    } catch (err) {
      console.error("[KaiKnowledgeModal] Failed to load data:", err);
    }
  }, []);

  // Initialize ONLY on modal visibility transition (false -> true)
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setActiveTab(initialTab);
      loadData();
      setInputVal("");
      setErrorMessage(null);
      setSearchQuery("");
      setEditingItem(null);
      setEditingMerchant(null);
      setMerchantSubTab("merchants");

      if (initialTab === "categories" && initialSelectedId) {
        setSelectedCategoryId(initialSelectedId);
      } else if (flatCategories.length > 0) {
        setSelectedCategoryId(flatCategories[0].id);
      }

      if (initialTab === "accounts" && initialSelectedId) {
        setSelectedAccountId(initialSelectedId);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }

      if (initialTab === "merchants" && initialSelectedId) {
        setSelectedMerchantId(initialSelectedId);
      }
    }
    prevVisibleRef.current = visible;
  }, [
    visible,
    initialTab,
    initialSelectedId,
    flatCategories,
    accounts,
    loadData,
  ]);

  // If categories, accounts, or merchants loaded after initial mount, ensure selection is set
  useEffect(() => {
    if (visible) {
      if (!selectedCategoryId && flatCategories.length > 0) {
        setSelectedCategoryId(
          initialTab === "categories" && initialSelectedId
            ? initialSelectedId
            : flatCategories[0].id,
        );
      }
      if (!selectedAccountId && accounts.length > 0) {
        setSelectedAccountId(
          initialTab === "accounts" && initialSelectedId
            ? initialSelectedId
            : accounts[0].id,
        );
      }
      if (!selectedMerchantId && merchants.length > 0) {
        setSelectedMerchantId(
          initialTab === "merchants" && initialSelectedId
            ? initialSelectedId
            : merchants[0].id,
        );
      }
    }
  }, [
    visible,
    flatCategories,
    accounts,
    merchants,
    selectedCategoryId,
    selectedAccountId,
    selectedMerchantId,
    initialTab,
    initialSelectedId,
  ]);

  // Selected Category Entity
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return flatCategories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [flatCategories, selectedCategoryId]);

  const selectedCategoryDisplayName = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory.parentId) {
      const parent = flatCategories.find(
        (c) => c.id === selectedCategory.parentId,
      );
      if (parent) {
        return `${parent.name} › ${selectedCategory.name}`;
      }
    }
    return selectedCategory.name;
  }, [selectedCategory, flatCategories]);

  // Selected Account Entity
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  // Selected Merchant Entity
  const selectedMerchant = useMemo(() => {
    if (!selectedMerchantId) return null;
    return merchants.find((m) => m.id === selectedMerchantId) ?? null;
  }, [merchants, selectedMerchantId]);

  // Keyword counts per merchant
  const merchantKeywordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const kw of merchantKeywords) {
      counts[kw.merchantId] = (counts[kw.merchantId] ?? 0) + 1;
    }
    return counts;
  }, [merchantKeywords]);

  // Current entity keywords filtered by search query
  const displayedActionKeywords = useMemo(() => {
    const list = actionKeywords.filter(
      (k) => k.actionType === selectedActionType,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((k) => k.keyword.toLowerCase().includes(q));
  }, [actionKeywords, selectedActionType, searchQuery]);

  const displayedCategoryKeywords = useMemo(() => {
    if (!selectedCategoryId) return [];
    const list = categoryKeywords.filter(
      (k) => k.categoryId === selectedCategoryId,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((k) => k.keyword.toLowerCase().includes(q));
  }, [categoryKeywords, selectedCategoryId, searchQuery]);

  const displayedAccountKeywords = useMemo(() => {
    if (!selectedAccountId) return [];
    const list = accountKeywords.filter(
      (k) => k.accountId === selectedAccountId,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((k) => k.keyword.toLowerCase().includes(q));
  }, [accountKeywords, selectedAccountId, searchQuery]);

  const displayedMerchants = useMemo(() => {
    if (!searchQuery.trim()) return merchants;
    const q = searchQuery.toLowerCase().trim();
    return merchants.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true;
      const cat = m.defaultCategoryId
        ? flatCategories.find((c) => c.id === m.defaultCategoryId)
        : null;
      if (cat && cat.name.toLowerCase().includes(q)) return true;
      const acc = m.defaultAccountId
        ? accounts.find((a) => a.id === m.defaultAccountId)
        : null;
      if (acc && acc.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [merchants, searchQuery, flatCategories, accounts]);

  const displayedMerchantKeywords = useMemo(() => {
    if (!selectedMerchantId) return [];
    const list = merchantKeywords.filter(
      (k) => k.merchantId === selectedMerchantId,
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((k) => k.keyword.toLowerCase().includes(q));
  }, [merchantKeywords, selectedMerchantId, searchQuery]);

  // Handlers for adding merchants
  const handleAddMerchant = async () => {
    const cleanName = newMerchantName.trim();
    if (!cleanName) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      const isAvailable = await checkMerchantNameAvailable(cleanName);
      if (!isAvailable) {
        setErrorMessage(`"${cleanName}" already exists.`);
        setProcessing(false);
        return;
      }

      const created = await upsertMerchant(
        cleanName,
        newMerchantCategoryId,
        newMerchantAccountId,
      );

      setMerchants((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      const mkwRows = await listMerchantKeywords();
      setMerchantKeywords(mkwRows);

      setNewMerchantName("");
      setNewMerchantCategoryId(null);
      setNewMerchantAccountId(null);
      setErrorMessage(null);
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to add merchant.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePromptDeleteMerchant = (merchant: MerchantItem) => {
    setDeleteTarget({
      type: "merchant",
      id: merchant.id,
      name: merchant.name,
    });
  };

  const handleOpenEditMerchant = (merchant: MerchantItem) => {
    setEditingMerchant(merchant);
    setEditMerchantName(merchant.name);
    setEditMerchantCategoryId(merchant.defaultCategoryId);
    setEditMerchantAccountId(merchant.defaultAccountId);
    setEditMerchantError(null);
  };

  const handleSaveEditMerchant = async () => {
    if (!editingMerchant) return;
    const cleanName = editMerchantName.trim();
    if (!cleanName) {
      setEditMerchantError("Merchant name cannot be empty.");
      return;
    }

    setEditMerchantProcessing(true);
    setEditMerchantError(null);

    try {
      const isAvailable = await checkMerchantNameAvailable(
        cleanName,
        editingMerchant.id,
      );
      if (!isAvailable) {
        setEditMerchantError(`"${cleanName}" already exists.`);
        setEditMerchantProcessing(false);
        return;
      }

      const updated = await updateMerchant(editingMerchant.id, {
        name: cleanName,
        defaultCategoryId: editMerchantCategoryId,
        defaultAccountId: editMerchantAccountId,
      });

      setMerchants((prev) =>
        prev
          .map((m) => (m.id === updated.id ? updated : m))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingMerchant(null);
      onKeywordsUpdated?.();
    } catch (err: any) {
      setEditMerchantError(err?.message ?? "Failed to update merchant.");
    } finally {
      setEditMerchantProcessing(false);
    }
  };

  // Handlers for adding keywords
  const handleAddKeyword = async () => {
    const clean = inputVal.trim().toLowerCase();
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
          "any",
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
          "any",
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
          "any",
        );
        setAccountKeywords((prev) => [...prev, created]);
      } else if (activeTab === "merchants") {
        if (!selectedMerchantId) {
          setErrorMessage("Please select a merchant first.");
          setProcessing(false);
          return;
        }
        const check = await checkMerchantKeywordAvailable(clean);
        if (!check.available) {
          setErrorMessage(
            `"${clean}" is already assigned to merchant "${check.conflictMerchantName}".`,
          );
          setProcessing(false);
          return;
        }
        const created = await addMerchantKeyword(selectedMerchantId, clean);
        setMerchantKeywords((prev) => [...prev, created]);
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

  // Handlers for deleting keywords & merchants with confirmation modal
  const handlePromptDeleteKeyword = (
    type:
      | "actionKeyword"
      | "categoryKeyword"
      | "accountKeyword"
      | "merchantKeyword",
    id: string,
    keyword: string,
  ) => {
    setDeleteTarget({
      type,
      id,
      name: keyword,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);

    try {
      if (deleteTarget.type === "actionKeyword") {
        await deleteActionKeyword(deleteTarget.id);
        setActionKeywords((prev) =>
          prev.filter((k) => k.id !== deleteTarget.id),
        );
      } else if (deleteTarget.type === "categoryKeyword") {
        await deleteCategoryKeyword(deleteTarget.id);
        setCategoryKeywords((prev) =>
          prev.filter((k) => k.id !== deleteTarget.id),
        );
      } else if (deleteTarget.type === "accountKeyword") {
        await deleteAccountKeyword(deleteTarget.id);
        setAccountKeywords((prev) =>
          prev.filter((k) => k.id !== deleteTarget.id),
        );
      } else if (deleteTarget.type === "merchantKeyword") {
        await deleteMerchantKeyword(deleteTarget.id);
        setMerchantKeywords((prev) =>
          prev.filter((k) => k.id !== deleteTarget.id),
        );
      } else if (deleteTarget.type === "merchant") {
        await deleteMerchant(deleteTarget.id);
        setMerchants((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setMerchantKeywords((prev) =>
          prev.filter((k) => k.merchantId !== deleteTarget.id),
        );
        if (selectedMerchantId === deleteTarget.id) {
          const remaining = merchants.filter((m) => m.id !== deleteTarget.id);
          setSelectedMerchantId(remaining[0]?.id ?? null);
        }
      }

      setDeleteTarget(null);
      onKeywordsUpdated?.();
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to delete item.");
    } finally {
      setDeletePending(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (
    item: { id: string; keyword: string; language?: string | null },
    entityType: "action" | "category" | "account" | "merchant",
  ) => {
    setEditingItem({
      id: item.id,
      keyword: item.keyword,
      language: "any",
      entityType,
    });
    setEditInputVal(item.keyword);
    setEditError(null);
  };

  // Save Edit Dialog
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const clean = editInputVal.trim().toLowerCase();
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
          "any",
        );
        setActionKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      } else if (editingItem.entityType === "category") {
        const updated = await updateCategoryKeyword(
          editingItem.id,
          clean,
          "any",
        );
        setCategoryKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      } else if (editingItem.entityType === "account") {
        const updated = await updateAccountKeyword(
          editingItem.id,
          clean,
          "any",
        );
        setAccountKeywords((prev) =>
          prev.map((k) => (k.id === updated.id ? updated : k)),
        );
      } else if (editingItem.entityType === "merchant") {
        const check = await checkMerchantKeywordAvailable(
          clean,
          editingItem.id,
        );
        if (!check.available) {
          setEditError(
            `"${clean}" is already assigned to merchant "${check.conflictMerchantName}".`,
          );
          setEditProcessing(false);
          return;
        }
        const updated = await updateMerchantKeyword(editingItem.id, clean);
        setMerchantKeywords((prev) =>
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
              setErrorMessage(
                err?.message ?? "Failed to reset action keywords.",
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

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
        {/* Top Header: ChevronLeft + Left-aligned Title + Right Help Button */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeftGroup}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.backBtn}
            >
              <ChevronLeft color={theme.colors.textPrimary} size={24} />
            </Pressable>
            <Text numberOfLines={1} style={styles.topTitle}>
              {t("chatWithKai.knowledgeHubTitle")}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={t("chatWithKai.helpModalTitle")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setHelpModalVisible(true)}
            style={styles.helpBtn}
          >
            <HelpCircle color={theme.colors.primary} size={22} />
          </Pressable>
        </View>

        {/* Top 4-Tab Segmented Control */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarScroll}
          contentContainerStyle={styles.tabBarScrollContent}
        >
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

          <Pressable
            accessibilityLabel="Merchants Tab"
            accessibilityRole="button"
            onPress={() => {
              setActiveTab("merchants");
              setErrorMessage(null);
              setSearchQuery("");
            }}
            style={[
              styles.tabBtn,
              activeTab === "merchants" && styles.tabBtnActive,
            ]}
          >
            <Store
              color={
                activeTab === "merchants"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={16}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "merchants" && styles.tabBtnTextActive,
              ]}
            >
              {t("chatWithKai.tabMerchants")}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Fixed Non-Scrolling Screen Body */}
        <View style={styles.mainBodyContainer}>
          {/* TAB 1: ACTIONS CONTROLS (Toggle only - banner removed) */}
          {activeTab === "actions" && (
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
          )}

          {/* TAB 2: CATEGORIES SELECTOR (Banner removed) */}
          {activeTab === "categories" && (
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
          )}

          {/* TAB 3: ACCOUNTS SELECTOR (Banner removed) */}
          {activeTab === "accounts" && (
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
          )}

          {/* TAB 4: MERCHANTS CONTROLS (Two-tier segmented toggle) */}
          {activeTab === "merchants" && (
            <View style={styles.actionSegmentRow}>
              <Pressable
                onPress={() => {
                  setMerchantSubTab("merchants");
                  setErrorMessage(null);
                  setSearchQuery("");
                }}
                style={[
                  styles.actionSegmentBtn,
                  merchantSubTab === "merchants" &&
                    styles.actionSegmentBtnActiveTransfer,
                ]}
              >
                <Store
                  color={
                    merchantSubTab === "merchants"
                      ? "#3B82F6"
                      : theme.colors.textMuted
                  }
                  size={15}
                />
                <Text
                  style={[
                    styles.actionSegmentBtnText,
                    merchantSubTab === "merchants" && {
                      color: "#3B82F6",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t("chatWithKai.subTabMerchants")} ({merchants.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMerchantSubTab("keywords");
                  setErrorMessage(null);
                  setSearchQuery("");
                }}
                style={[
                  styles.actionSegmentBtn,
                  merchantSubTab === "keywords" &&
                    styles.actionSegmentBtnActiveTransfer,
                ]}
              >
                <Tag
                  color={
                    merchantSubTab === "keywords"
                      ? "#3B82F6"
                      : theme.colors.textMuted
                  }
                  size={15}
                />
                <Text
                  style={[
                    styles.actionSegmentBtnText,
                    merchantSubTab === "keywords" && {
                      color: "#3B82F6",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t("chatWithKai.subTabMerchantKeywords")} (
                  {selectedMerchant
                    ? (merchantKeywordCounts[selectedMerchant.id] ?? 0)
                    : merchantKeywords.length}
                  )
                </Text>
              </Pressable>
            </View>
          )}

          {/* TAB 4 SUB-TAB 2: MERCHANT SELECTOR CARD */}
          {activeTab === "merchants" && merchantSubTab === "keywords" && (
            <Pressable
              accessibilityLabel={t("chatWithKai.changeMerchant")}
              accessibilityRole="button"
              onPress={() => setMerchantPickerVisible(true)}
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
                  <Store color={theme.colors.primary} size={20} />
                </View>
                <View style={styles.entityTextBox}>
                  <Text style={styles.entitySelectorLabel}>
                    {t("chatWithKai.tableHeaderMerchant").toUpperCase()}
                  </Text>
                  <Text numberOfLines={1} style={styles.entitySelectorTitle}>
                    {selectedMerchant?.name ??
                      t("chatWithKai.selectMerchantPrompt")}
                  </Text>
                  {selectedMerchant && (
                    <View style={styles.selectorMetaRow}>
                      {selectedMerchant.defaultCategoryId ? (
                        <View style={styles.badgePillSmall}>
                          <Tag color={theme.colors.textMuted} size={9} />
                          <Text
                            numberOfLines={1}
                            style={styles.badgeTextSmall}
                          >
                            {flatCategories.find(
                              (c) =>
                                c.id === selectedMerchant.defaultCategoryId,
                            )?.name ?? "Category"}
                          </Text>
                        </View>
                      ) : null}
                      {selectedMerchant.defaultAccountId ? (
                        <View style={styles.badgePillSmall}>
                          <Wallet color={theme.colors.textMuted} size={9} />
                          <Text
                            numberOfLines={1}
                            style={styles.badgeTextSmall}
                          >
                            {accounts.find(
                              (a) =>
                                a.id === selectedMerchant.defaultAccountId,
                            )?.name ?? "Account"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.changeActionBadge}>
                <Text style={styles.changeActionText}>
                  {t("chatWithKai.changeMerchant")}
                </Text>
                <ChevronRight color={theme.colors.primary} size={16} />
              </View>
            </Pressable>
          )}

          {/* ADD SECTION (Merchants Entity Add vs Keywords Add) */}
          {activeTab === "merchants" && merchantSubTab === "merchants" ? (
            <View style={styles.addSectionCard}>
              <View style={styles.addInputRow}>
                <TextInput
                  autoCapitalize="words"
                  editable={!processing}
                  onChangeText={(text) => {
                    setNewMerchantName(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onSubmitEditing={handleAddMerchant}
                  placeholder={t("chatWithKai.addMerchantPlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  returnKeyType="done"
                  style={styles.addTextInput}
                  value={newMerchantName}
                />

                <Pressable
                  accessibilityLabel="Add Merchant"
                  accessibilityRole="button"
                  disabled={processing || !newMerchantName.trim()}
                  onPress={handleAddMerchant}
                  style={[
                    styles.addSubmitBtn,
                    (!newMerchantName.trim() || processing) &&
                      styles.addSubmitBtnDisabled,
                  ]}
                >
                  {processing ? (
                    <ActivityIndicator
                      color={theme.colors.onPrimary}
                      size="small"
                    />
                  ) : (
                    <Plus color={theme.colors.onPrimary} size={18} />
                  )}
                </Pressable>
              </View>

              {/* Optional Default Category & Account Pickers */}
              <View style={styles.merchantDefaultsRow}>
                <Pressable
                  onPress={() => setMerchantCategoryPickerVisible(true)}
                  style={[
                    styles.merchantDefaultChip,
                    newMerchantCategoryId && styles.merchantDefaultChipActive,
                  ]}
                >
                  <Tag
                    color={
                      newMerchantCategoryId
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                    size={12}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.merchantDefaultChipText,
                      newMerchantCategoryId &&
                        styles.merchantDefaultChipTextActive,
                    ]}
                  >
                    {newMerchantCategoryId
                      ? (flatCategories.find(
                          (c) => c.id === newMerchantCategoryId,
                        )?.name ?? t("chatWithKai.defaultCategory"))
                      : `${t("chatWithKai.defaultCategory")} (${t("chatWithKai.optionalBadge")})`}
                  </Text>
                  {newMerchantCategoryId && (
                    <Pressable
                      hitSlop={6}
                      onPress={(e) => {
                        e.stopPropagation();
                        setNewMerchantCategoryId(null);
                      }}
                    >
                      <X color={theme.colors.primary} size={12} />
                    </Pressable>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setMerchantAccountPickerVisible(true)}
                  style={[
                    styles.merchantDefaultChip,
                    newMerchantAccountId && styles.merchantDefaultChipActive,
                  ]}
                >
                  <Wallet
                    color={
                      newMerchantAccountId
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                    size={12}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.merchantDefaultChipText,
                      newMerchantAccountId &&
                        styles.merchantDefaultChipTextActive,
                    ]}
                  >
                    {newMerchantAccountId
                      ? (accounts.find((a) => a.id === newMerchantAccountId)
                          ?.name ?? t("chatWithKai.defaultAccount"))
                      : `${t("chatWithKai.defaultAccount")} (${t("chatWithKai.optionalBadge")})`}
                  </Text>
                  {newMerchantAccountId && (
                    <Pressable
                      hitSlop={6}
                      onPress={(e) => {
                        e.stopPropagation();
                        setNewMerchantAccountId(null);
                      }}
                    >
                      <X color={theme.colors.primary} size={12} />
                    </Pressable>
                  )}
                </Pressable>
              </View>

              {errorMessage && (
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              )}
            </View>
          ) : (
            <View style={styles.addSectionCard}>
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
                        : activeTab === "accounts"
                          ? t("chatWithKai.addKeywordPlaceholderAccount")
                          : t("chatWithKai.addKeywordPlaceholderMerchant")
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
                    <ActivityIndicator
                      color={theme.colors.onPrimary}
                      size="small"
                    />
                  ) : (
                    <Plus color={theme.colors.onPrimary} size={18} />
                  )}
                </Pressable>
              </View>

              {errorMessage && (
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              )}
            </View>
          )}

          {/* TABLE CONTAINER (Fills remaining height: flex 1) */}
          <View style={styles.tableCard}>
            {/* Table Header Controls: Search Box & Optional Reset Defaults */}
            <View style={styles.tableTopControls}>
              <View style={styles.searchBox}>
                <Search color={theme.colors.textMuted} size={16} />
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setSearchQuery}
                  placeholder={
                    activeTab === "merchants" && merchantSubTab === "merchants"
                      ? t("chatWithKai.pickerSearchMerchant")
                      : t("chatWithKai.searchKeywordsPlaceholder")
                  }
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

            {/* Fixed Table Column Headers */}
            {activeTab === "merchants" && merchantSubTab === "merchants" ? (
              <View style={styles.tableHeaderRow}>
                <Text
                  style={[styles.tableHeaderCell, styles.cellMerchantCol]}
                >
                  {t("chatWithKai.tableHeaderMerchant").toUpperCase()}
                </Text>
                <Text
                  style={[styles.tableHeaderCell, styles.cellDefaultsCol]}
                >
                  {t("chatWithKai.tableHeaderCategory").toUpperCase()}
                </Text>
                <Text
                  style={[styles.tableHeaderCell, styles.cellAliasesCol]}
                >
                  {t("chatWithKai.tableHeaderAliases").toUpperCase()}
                </Text>
                <Text style={[styles.tableHeaderCell, styles.cellActions]}>
                  {t("chatWithKai.tableHeaderActions").toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.cellKeyword]}>
                  {t("chatWithKai.tableHeaderKeyword").toUpperCase()}
                </Text>
                <Text style={[styles.tableHeaderCell, styles.cellActions]}>
                  {t("chatWithKai.tableHeaderActions").toUpperCase()}
                </Text>
              </View>
            )}

            {/* Scrollable Table Data Rows ONLY */}
            <ScrollView
              contentContainerStyle={styles.tableScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              style={styles.tableScroll}
            >
              {/* TAB 1: ACTIONS ROWS */}
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
                        onPress={() =>
                          handlePromptDeleteKeyword(
                            "actionKeyword",
                            item.id,
                            item.keyword,
                          )
                        }
                        style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                      >
                        <Trash2 color={theme.colors.danger} size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}

              {/* TAB 2: CATEGORIES ROWS */}
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
                        onPress={() =>
                          handlePromptDeleteKeyword(
                            "categoryKeyword",
                            item.id,
                            item.keyword,
                          )
                        }
                        style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                      >
                        <Trash2 color={theme.colors.danger} size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}

              {/* TAB 3: ACCOUNTS ROWS */}
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
                        onPress={() =>
                          handlePromptDeleteKeyword(
                            "accountKeyword",
                            item.id,
                            item.keyword,
                          )
                        }
                        style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                      >
                        <Trash2 color={theme.colors.danger} size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}

              {/* TAB 4: MERCHANTS ENTITY ROWS (Sub-tab: "merchants") */}
              {activeTab === "merchants" &&
                merchantSubTab === "merchants" &&
                displayedMerchants.length === 0 && (
                  <View style={styles.emptyTableState}>
                    <Text style={styles.emptyTableText}>
                      {searchQuery.trim()
                        ? t("chatWithKai.noKeywordsMatching", {
                            query: searchQuery,
                          })
                        : t("chatWithKai.noMerchantsFound")}
                    </Text>
                  </View>
                )}

              {activeTab === "merchants" &&
                merchantSubTab === "merchants" &&
                displayedMerchants.map((item, idx) => {
                  const cat = item.defaultCategoryId
                    ? flatCategories.find(
                        (c) => c.id === item.defaultCategoryId,
                      )
                    : null;
                  const acc = item.defaultAccountId
                    ? accounts.find((a) => a.id === item.defaultAccountId)
                    : null;
                  const kwCount = merchantKeywordCounts[item.id] ?? 0;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.tableRow,
                        idx % 2 === 1 && styles.tableRowEven,
                      ]}
                    >
                      <View style={styles.cellMerchantCol}>
                        <View style={styles.merchantRowTitleWrap}>
                          <Store
                            color={theme.colors.primary}
                            size={14}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            numberOfLines={1}
                            style={styles.rowMerchantName}
                          >
                            {item.name}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cellDefaultsCol}>
                        {cat ? (
                          <View style={styles.tableChipBadge}>
                            <Tag color={theme.colors.textMuted} size={9} />
                            <Text
                              numberOfLines={1}
                              style={styles.tableChipText}
                            >
                              {cat.name}
                            </Text>
                          </View>
                        ) : null}
                        {acc ? (
                          <View style={styles.tableChipBadge}>
                            <Wallet color={theme.colors.textMuted} size={9} />
                            <Text
                              numberOfLines={1}
                              style={styles.tableChipText}
                            >
                              {acc.name}
                            </Text>
                          </View>
                        ) : null}
                        {!cat && !acc && (
                          <Text style={styles.emptyDashText}>—</Text>
                        )}
                      </View>

                      <View style={styles.cellAliasesCol}>
                        <Pressable
                          accessibilityLabel={`${kwCount} aliases, view keywords`}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedMerchantId(item.id);
                            setMerchantSubTab("keywords");
                            setSearchQuery("");
                          }}
                          style={styles.aliasesCountBtn}
                        >
                          <Tag color={theme.colors.primary} size={11} />
                          <Text style={styles.aliasesCountBtnText}>
                            {kwCount}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.rowActionsCell}>
                        <Pressable
                          accessibilityLabel="Edit merchant"
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => handleOpenEditMerchant(item)}
                          style={styles.iconActionBtn}
                        >
                          <Pencil color={theme.colors.primary} size={16} />
                        </Pressable>

                        <Pressable
                          accessibilityLabel="Delete merchant"
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => handlePromptDeleteMerchant(item)}
                          style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                        >
                          <Trash2 color={theme.colors.danger} size={16} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

              {/* TAB 4: MERCHANT KEYWORDS ROWS (Sub-tab: "keywords") */}
              {activeTab === "merchants" &&
                merchantSubTab === "keywords" &&
                displayedMerchantKeywords.length === 0 && (
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

              {activeTab === "merchants" &&
                merchantSubTab === "keywords" &&
                displayedMerchantKeywords.map((item, idx) => (
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

                    <View style={styles.rowActionsCell}>
                      <Pressable
                        accessibilityLabel="Edit keyword"
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() => handleOpenEdit(item, "merchant")}
                        style={styles.iconActionBtn}
                      >
                        <Pencil color={theme.colors.primary} size={16} />
                      </Pressable>

                      <Pressable
                        accessibilityLabel="Delete keyword"
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() =>
                          handlePromptDeleteKeyword(
                            "merchantKeyword",
                            item.id,
                            item.keyword,
                          )
                        }
                        style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                      >
                        <Trash2 color={theme.colors.danger} size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>

        {/* DEDICATED CATEGORY PICKER MODAL */}
        <KaiCategoryPickerModal
          categories={categories}
          onClose={() => setCategoryPickerVisible(false)}
          onSelectCategory={(cat) => {
            setSelectedCategoryId(cat.id);
          }}
          selectedCategoryId={selectedCategoryId}
          visible={categoryPickerVisible}
        />

        {/* DEDICATED ACCOUNT PICKER MODAL */}
        <KaiAccountPickerModal
          accounts={accounts}
          onClose={() => setAccountPickerVisible(false)}
          onSelectAccount={(acc) => {
            setSelectedAccountId(acc.id);
          }}
          selectedAccountId={selectedAccountId}
          visible={accountPickerVisible}
        />

        {/* DEDICATED MERCHANT PICKER MODAL */}
        <KaiMerchantPickerModal
          accounts={accounts}
          categories={categories}
          keywordCounts={merchantKeywordCounts}
          merchants={merchants}
          onClose={() => setMerchantPickerVisible(false)}
          onSelectMerchant={(merch) => {
            setSelectedMerchantId(merch.id);
          }}
          selectedMerchantId={selectedMerchantId}
          visible={merchantPickerVisible}
        />

        {/* MERCHANT DEFAULTS: CATEGORY PICKER (FOR ADD MERCHANT) */}
        <KaiCategoryPickerModal
          categories={categories}
          onClose={() => setMerchantCategoryPickerVisible(false)}
          onSelectCategory={(cat) => {
            setNewMerchantCategoryId(cat.id);
          }}
          selectedCategoryId={newMerchantCategoryId}
          visible={merchantCategoryPickerVisible}
        />

        {/* MERCHANT DEFAULTS: ACCOUNT PICKER (FOR ADD MERCHANT) */}
        <KaiAccountPickerModal
          accounts={accounts}
          onClose={() => setMerchantAccountPickerVisible(false)}
          onSelectAccount={(acc) => {
            setNewMerchantAccountId(acc.id);
          }}
          selectedAccountId={newMerchantAccountId}
          visible={merchantAccountPickerVisible}
        />

        {/* MERCHANT DEFAULTS: CATEGORY PICKER (FOR EDIT MERCHANT) */}
        <KaiCategoryPickerModal
          categories={categories}
          onClose={() => setEditMerchantCategoryPickerVisible(false)}
          onSelectCategory={(cat) => {
            setEditMerchantCategoryId(cat.id);
          }}
          selectedCategoryId={editMerchantCategoryId}
          visible={editMerchantCategoryPickerVisible}
        />

        {/* MERCHANT DEFAULTS: ACCOUNT PICKER (FOR EDIT MERCHANT) */}
        <KaiAccountPickerModal
          accounts={accounts}
          onClose={() => setEditMerchantAccountPickerVisible(false)}
          onSelectAccount={(acc) => {
            setEditMerchantAccountId(acc.id);
          }}
          selectedAccountId={editMerchantAccountId}
          visible={editMerchantAccountPickerVisible}
        />

        {/* HELP / INFORMATION MODAL */}
        <KaiKnowledgeHelpModal
          onClose={() => setHelpModalVisible(false)}
          visible={helpModalVisible}
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

        {/* EDIT MERCHANT DIALOG MODAL */}
        <Modal
          animationType="fade"
          onRequestClose={() => setEditingMerchant(null)}
          transparent
          visible={editingMerchant !== null}
        >
          <View style={styles.dialogBackdrop}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>
                  {t("chatWithKai.editMerchantTitle")}
                </Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => setEditingMerchant(null)}
                >
                  <X color={theme.colors.textMuted} size={20} />
                </Pressable>
              </View>

              <View style={styles.dialogBody}>
                <Text style={styles.dialogFieldLabel}>
                  {t("chatWithKai.tableHeaderMerchant").toUpperCase()}
                </Text>
                <TextInput
                  autoCapitalize="words"
                  editable={!editMerchantProcessing}
                  onChangeText={(text) => {
                    setEditMerchantName(text);
                    if (editMerchantError) setEditMerchantError(null);
                  }}
                  style={styles.dialogInput}
                  value={editMerchantName}
                />

                <Text style={[styles.dialogFieldLabel, { marginTop: 12 }]}>
                  {t("chatWithKai.defaultCategory").toUpperCase()}
                </Text>
                <Pressable
                  onPress={() => setEditMerchantCategoryPickerVisible(true)}
                  style={styles.dialogPickerBtn}
                >
                  <View style={styles.dialogPickerBtnLeft}>
                    <Tag color={theme.colors.primary} size={16} />
                    <Text
                      numberOfLines={1}
                      style={styles.dialogPickerBtnText}
                    >
                      {editMerchantCategoryId
                        ? (flatCategories.find(
                            (c) => c.id === editMerchantCategoryId,
                          )?.name ?? t("chatWithKai.defaultCategory"))
                        : t("chatWithKai.noDefaultCategory")}
                    </Text>
                  </View>
                  {editMerchantCategoryId ? (
                    <Pressable
                      hitSlop={6}
                      onPress={(e) => {
                        e.stopPropagation();
                        setEditMerchantCategoryId(null);
                      }}
                    >
                      <X color={theme.colors.textMuted} size={16} />
                    </Pressable>
                  ) : (
                    <ChevronRight color={theme.colors.textMuted} size={16} />
                  )}
                </Pressable>

                <Text style={[styles.dialogFieldLabel, { marginTop: 12 }]}>
                  {t("chatWithKai.defaultAccount").toUpperCase()}
                </Text>
                <Pressable
                  onPress={() => setEditMerchantAccountPickerVisible(true)}
                  style={styles.dialogPickerBtn}
                >
                  <View style={styles.dialogPickerBtnLeft}>
                    <Wallet color={theme.colors.primary} size={16} />
                    <Text
                      numberOfLines={1}
                      style={styles.dialogPickerBtnText}
                    >
                      {editMerchantAccountId
                        ? (accounts.find(
                            (a) => a.id === editMerchantAccountId,
                          )?.name ?? t("chatWithKai.defaultAccount"))
                        : t("chatWithKai.noDefaultAccount")}
                    </Text>
                  </View>
                  {editMerchantAccountId ? (
                    <Pressable
                      hitSlop={6}
                      onPress={(e) => {
                        e.stopPropagation();
                        setEditMerchantAccountId(null);
                      }}
                    >
                      <X color={theme.colors.textMuted} size={16} />
                    </Pressable>
                  ) : (
                    <ChevronRight color={theme.colors.textMuted} size={16} />
                  )}
                </Pressable>

                {editMerchantError && (
                  <Text style={styles.errorBannerText}>
                    {editMerchantError}
                  </Text>
                )}
              </View>

              <View style={styles.dialogFooter}>
                <Pressable
                  disabled={editMerchantProcessing}
                  onPress={() => setEditingMerchant(null)}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>
                    {t("chatWithKai.cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    editMerchantProcessing || !editMerchantName.trim()
                  }
                  onPress={handleSaveEditMerchant}
                  style={[
                    styles.dialogSaveBtn,
                    (!editMerchantName.trim() || editMerchantProcessing) &&
                      styles.dialogSaveBtnDisabled,
                  ]}
                >
                  {editMerchantProcessing ? (
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

        {/* DELETE CONFIRMATION MODAL */}
        <ConfirmModal
          cancelLabel={t("chatWithKai.cancel")}
          confirmLabel={t("chatWithKai.deleteBtn")}
          message={
            deleteTarget?.type === "merchant"
              ? t("chatWithKai.deleteMerchantConfirm", {
                  name: deleteTarget.name,
                })
              : t("chatWithKai.deleteKeywordConfirm", {
                  keyword: deleteTarget?.name ?? "",
                })
          }
          onCancel={() => {
            if (!deletePending) setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
          pending={deletePending}
          title={
            deleteTarget?.type === "merchant"
              ? t("chatWithKai.deleteMerchantTitle")
              : t("chatWithKai.deleteKeywordTitle")
          }
          variant="destructive"
          visible={deleteTarget !== null}
        />
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
    headerLeftGroup: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
      gap: 8,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
    },
    topTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flex: 1,
    },
    helpBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}15`,
    },
    tabBarScroll: {
      flexGrow: 0,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabBarScrollContent: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    tabBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
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
    mainBodyContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    actionSegmentRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
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
    entitySelectorCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 10,
    },
    entitySelectorCardPressed: {
      opacity: 0.85,
      backgroundColor: theme.colors.surfaceElevated,
    },
    entitySelectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    entityIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    entityTextBox: {
      flex: 1,
    },
    entitySelectorLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    entitySelectorTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    changeActionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: `${theme.colors.primary}15`,
    },
    changeActionText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    addSectionCard: {
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 10,
    },
    addInputRow: {
      flexDirection: "row",
      gap: 8,
    },
    addTextInput: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      fontSize: 13,
      color: theme.colors.textPrimary,
    },
    addSubmitBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    addSubmitBtnDisabled: {
      opacity: 0.4,
    },
    errorBannerText: {
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 6,
    },
    tableCard: {
      flex: 1,
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
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 12.5,
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
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    tableHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tableHeaderCell: {
      fontSize: 10.5,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
    },
    cellKeyword: {
      flex: 1,
    },
    cellActions: {
      width: 72,
      textAlign: "right",
      paddingRight: 6,
    },
    tableScroll: {
      flex: 1,
    },
    tableScrollContent: {
      flexGrow: 1,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tableRowEven: {
      backgroundColor: `${theme.colors.surfaceElevated}40`,
    },
    rowKeywordText: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginRight: 8,
    },
    rowActionsCell: {
      width: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    },
    iconActionBtn: {
      width: 30,
      height: 30,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}12`,
    },
    iconDeleteBtn: {
      backgroundColor: `${theme.colors.danger}12`,
    },
    emptyTableState: {
      flex: 1,
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
    cellMerchantCol: {
      flex: 1.3,
    },
    cellDefaultsCol: {
      flex: 1.2,
      flexDirection: "column",
      gap: 3,
    },
    cellAliasesCol: {
      width: 58,
      alignItems: "center",
      justifyContent: "center",
    },
    merchantRowTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowMerchantName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flex: 1,
    },
    tableChipBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 5,
      backgroundColor: theme.colors.surfaceElevated,
      alignSelf: "flex-start",
      maxWidth: "100%",
    },
    tableChipText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      maxWidth: 90,
    },
    emptyDashText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      paddingLeft: 4,
    },
    aliasesCountBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}15`,
    },
    aliasesCountBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    selectorMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    badgePillSmall: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceElevated,
    },
    badgeTextSmall: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      maxWidth: 100,
    },
    merchantDefaultsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    merchantDefaultChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flex: 1,
    },
    merchantDefaultChipActive: {
      borderColor: `${theme.colors.primary}60`,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    merchantDefaultChipText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      flex: 1,
    },
    merchantDefaultChipTextActive: {
      color: theme.colors.primary,
      fontWeight: "600",
    },
    dialogPickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 42,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
    },
    dialogPickerBtnLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    dialogPickerBtnText: {
      fontSize: 13,
      color: theme.colors.textPrimary,
      flex: 1,
    },
  });
