import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Search, Store, Tag, Wallet, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components/icon-helper";
import type { Category } from "@/modules/categories";
import type { AccountListItem } from "@/modules/accounts";
import type { MerchantItem } from "../repositories/merchants.repository";

export interface KaiMerchantPickerModalProps {
  visible: boolean;
  onClose: () => void;
  merchants: MerchantItem[];
  selectedMerchantId?: string | null;
  onSelectMerchant: (merchant: MerchantItem) => void;
  categories?: Category[];
  accounts?: AccountListItem[];
  keywordCounts?: Record<string, number>;
}

export function KaiMerchantPickerModal({
  visible,
  onClose,
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  categories = [],
  accounts = [],
  keywordCounts = {},
}: KaiMerchantPickerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [searchQuery, setSearchQuery] = useState("");

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    const walk = (cats: Category[]) => {
      for (const cat of cats) {
        map.set(cat.id, cat);
        if (cat.subcategories && cat.subcategories.length > 0) {
          walk(cat.subcategories);
        }
      }
    };
    walk(categories);
    return map;
  }, [categories]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountListItem>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const filteredMerchants = useMemo(() => {
    if (!searchQuery.trim()) return merchants;
    const q = searchQuery.toLowerCase().trim();
    return merchants.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true;
      const cat = m.defaultCategoryId ? categoriesMap.get(m.defaultCategoryId) : null;
      if (cat && cat.name.toLowerCase().includes(q)) return true;
      const acc = m.defaultAccountId ? accountsMap.get(m.defaultAccountId) : null;
      if (acc && acc.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [merchants, searchQuery, categoriesMap, accountsMap]);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const handleSelect = (merchant: MerchantItem) => {
    onSelectMerchant(merchant);
    handleClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel={t("chatWithKai.cancel")}
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.backdropTouch}
        />

        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>
                {t("chatWithKai.pickerSelectMerchant")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("chatWithKai.cancel")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBoxWrap}>
            <View style={styles.searchBox}>
              <Search color={theme.colors.textMuted} size={18} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setSearchQuery}
                placeholder={t("chatWithKai.pickerSearchMerchant")}
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
          </View>

          {/* Merchants List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredMerchants.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Store color={theme.colors.textMuted} size={36} />
                <Text style={styles.emptyText}>
                  {t("chatWithKai.noMerchantsFound")}
                </Text>
              </View>
            ) : (
              <View style={styles.cardsWrap}>
                {filteredMerchants.map((merchant, index) => {
                  const isSelected = selectedMerchantId === merchant.id;
                  const cat = merchant.defaultCategoryId
                    ? categoriesMap.get(merchant.defaultCategoryId)
                    : null;
                  const acc = merchant.defaultAccountId
                    ? accountsMap.get(merchant.defaultAccountId)
                    : null;
                  const count = keywordCounts[merchant.id] ?? 0;

                  return (
                    <View key={merchant.id}>
                      {index > 0 && <View style={styles.cardDivider} />}
                      <TouchableOpacity
                        accessibilityLabel={merchant.name}
                        accessibilityRole="button"
                        activeOpacity={0.7}
                        onPress={() => handleSelect(merchant)}
                        style={[
                          styles.merchantItem,
                          isSelected && styles.selectedMerchantItem,
                        ]}
                      >
                        <View style={styles.merchantLeft}>
                          <View
                            style={[
                              styles.iconBadge,
                              {
                                backgroundColor: isSelected
                                  ? `${theme.colors.primary}25`
                                  : `${theme.colors.primary}15`,
                                borderColor: isSelected
                                  ? theme.colors.primary
                                  : `${theme.colors.primary}30`,
                              },
                            ]}
                          >
                            <Store color={theme.colors.primary} size={18} />
                          </View>
                          <View style={styles.merchantTextBox}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.merchantName,
                                isSelected && {
                                  color: theme.colors.primary,
                                  fontWeight: "700",
                                },
                              ]}
                            >
                              {merchant.name}
                            </Text>
                            <View style={styles.metaRow}>
                              {cat ? (
                                <View style={styles.badgePill}>
                                  <Tag
                                    color={theme.colors.textMuted}
                                    size={10}
                                  />
                                  <Text
                                    numberOfLines={1}
                                    style={styles.badgeText}
                                  >
                                    {cat.name}
                                  </Text>
                                </View>
                              ) : null}
                              {acc ? (
                                <View style={styles.badgePill}>
                                  <Wallet
                                    color={theme.colors.textMuted}
                                    size={10}
                                  />
                                  <Text
                                    numberOfLines={1}
                                    style={styles.badgeText}
                                  >
                                    {acc.name}
                                  </Text>
                                </View>
                              ) : null}
                              <Text style={styles.countText}>
                                {count === 1
                                  ? t("chatWithKai.aliasesCountSingle")
                                  : t("chatWithKai.aliasesCount", {
                                      count,
                                    })}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {isSelected && (
                          <View style={styles.checkCircle}>
                            <Check
                              color={theme.colors.onPrimary}
                              size={14}
                              strokeWidth={3}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    backdropTouch: {
      flex: 1,
    },
    container: {
      maxHeight: "85%",
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    headerTitleBox: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeBtn: {
      padding: 4,
    },
    searchBoxWrap: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    cardsWrap: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 54,
    },
    merchantItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    selectedMerchantItem: {
      backgroundColor: `${theme.colors.primary}0D`,
    },
    merchantLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
      gap: 12,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    merchantTextBox: {
      flex: 1,
    },
    merchantName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 3,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    badgePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceElevated,
    },
    badgeText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      maxWidth: 120,
    },
    countText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
