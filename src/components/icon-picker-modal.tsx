import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  ICON_CATEGORIES,
  ICON_LIBRARY,
  type IconItem,
} from "@/constants/icon-library";
import { IconHelper } from "./icon-helper";

export interface IconPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  themeColor?: string;
  title?: string;
}

export function IconPickerModal({
  visible,
  onClose,
  selectedIcon,
  onSelectIcon,
  themeColor,
  title = "Select Icon",
}: IconPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const activeColor = themeColor ?? theme.colors.primary;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredIcons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ICON_LIBRARY.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (!q) return true;
      if (item.name.toLowerCase().includes(q)) return true;
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.keywords.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelect = (iconName: string) => {
    onSelectIcon(iconName);
    onClose();
  };

  const renderIconItem = ({ item }: { item: IconItem }) => {
    const isSelected = selectedIcon === item.name;

    return (
      <Pressable
        accessibilityLabel={item.label}
        accessibilityRole="button"
        onPress={() => handleSelect(item.name)}
        style={({ pressed }) => [
          styles.iconGridItem,
          isSelected && {
            backgroundColor: `${activeColor}20`,
            borderColor: activeColor,
          },
          pressed && styles.iconGridItemPressed,
        ]}
      >
        <View style={styles.iconWrapper}>
          <IconHelper
            color={isSelected ? activeColor : theme.colors.textPrimary}
            name={item.name}
            size={22}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.iconName,
            isSelected && { color: activeColor, fontWeight: "600" },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss icon picker"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.contentContainer,
            isDesktop && styles.contentContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>
                {filteredIcons.length} icons available
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchGlyph}>🔍</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchQuery}
              placeholder="Search icons (e.g. food, car, card, rent)..."
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery("")}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryScrollContainer}>
            <ScrollView
              contentContainerStyle={styles.categoryScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {ICON_CATEGORIES.map((cat) => {
                const isCatSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityLabel={cat.label}
                    accessibilityRole="button"
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.categoryPill,
                      isCatSelected && {
                        backgroundColor: `${activeColor}22`,
                        borderColor: activeColor,
                      },
                    ]}
                  >
                    <IconHelper
                      color={isCatSelected ? activeColor : theme.colors.textSecondary}
                      name={cat.icon}
                      size={14}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryPillText,
                        isCatSelected && {
                          color: activeColor,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Icon Grid */}
          {filteredIcons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No icons matching "{searchQuery}"
              </Text>
              <Pressable
                accessibilityLabel="Reset search and filters"
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                style={[styles.resetSearchBtn, { borderColor: activeColor }]}
              >
                <Text style={[styles.resetSearchText, { color: activeColor }]}>
                  Reset Filters
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.gridContent}
              data={filteredIcons}
              initialNumToRender={24}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={24}
              numColumns={isDesktop ? 6 : 4}
              renderItem={renderIconItem}
              showsVerticalScrollIndicator={false}
              windowSize={7}
            />
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    contentContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      height: "85%",
      width: "100%",
      ...theme.shadows.modal,
    },
    contentContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      height: "80%",
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 600,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    modalSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "bold",
    },
    searchBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      height: 42,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    searchGlyph: {
      fontSize: 14,
      marginRight: 6,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
    },
    clearBtn: {
      padding: 4,
    },
    clearBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    categoryScrollContainer: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      paddingBottom: theme.spacing.sm,
    },
    categoryScroll: {
      gap: 6,
      paddingHorizontal: theme.spacing.lg,
    },
    categoryPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    categoryPillText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    gridContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    iconGridItem: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      margin: 4,
      minHeight: 70,
      padding: 6,
    },
    iconGridItemPressed: {
      opacity: 0.8,
    },
    iconWrapper: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    iconName: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      textAlign: "center",
    },
    emptyContainer: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    resetSearchBtn: {
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    resetSearchText: {
      fontSize: 13,
      fontWeight: "600",
    },
    footer: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      paddingVertical: 10,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
