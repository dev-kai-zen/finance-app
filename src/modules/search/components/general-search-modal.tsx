import React, { memo, useCallback, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  CreditCard,
  Crown,
  Database,
  Download,
  FileText,
  HardDrive,
  Heart,
  History,
  Languages,
  Palette,
  PieChart,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  SearchX,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Tags,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useSearch } from "../context/search-context";
import { useGeneralSearch } from "../hooks/use-general-search";
import type {
  SearchResultItem,
  SearchResultSection,
} from "../types/search.types";

function renderSearchIcon(name: string, color: string, size = 18) {
  switch (name) {
    case "arrow-down-left":
      return <ArrowDownLeft color={color} size={size} />;
    case "arrow-up-right":
      return <ArrowUpRight color={color} size={size} />;
    case "arrow-left-right":
      return <ArrowLeftRight color={color} size={size} />;
    case "wallet":
      return <Wallet color={color} size={size} />;
    case "receipt":
      return <Receipt color={color} size={size} />;
    case "calendar":
      return <Calendar color={color} size={size} />;
    case "credit-card":
      return <CreditCard color={color} size={size} />;
    case "tags":
      return <Tags color={color} size={size} />;
    case "pie-chart":
      return <PieChart color={color} size={size} />;
    case "target":
      return <Target color={color} size={size} />;
    case "bar-chart-3":
      return <BarChart3 color={color} size={size} />;
    case "file-text":
      return <FileText color={color} size={size} />;
    case "settings":
      return <Settings color={color} size={size} />;
    case "shield-check":
      return <ShieldCheck color={color} size={size} />;
    case "palette":
      return <Palette color={color} size={size} />;
    case "circle-dollar-sign":
      return <CircleDollarSign color={color} size={size} />;
    case "languages":
      return <Languages color={color} size={size} />;
    case "bell":
      return <Bell color={color} size={size} />;
    case "hard-drive":
      return <HardDrive color={color} size={size} />;
    case "cloud":
      return <Cloud color={color} size={size} />;
    case "sparkles":
      return <Sparkles color={color} size={size} />;
    case "history":
      return <History color={color} size={size} />;
    case "crown":
      return <Crown color={color} size={size} />;
    case "rotate-ccw":
      return <RotateCcw color={color} size={size} />;
    case "trash-2":
      return <Trash2 color={color} size={size} />;
    case "smile":
      return <Smile color={color} size={size} />;
    case "search":
      return <Search color={color} size={size} />;
    case "heart":
      return <Heart color={color} size={size} />;
    case "database":
      return <Database color={color} size={size} />;
    case "download":
      return <Download color={color} size={size} />;
    case "archive":
      return <Archive color={color} size={size} />;
    default:
      return <Plus color={color} size={size} />;
  }
}

export const GeneralSearchModal = memo(function GeneralSearchModal() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const { t } = useLocalization();
  const { isSearchOpen, closeSearch } = useSearch();

  const [searchQuery, setSearchQuery] = useState("");
  const { sections, totalResults, hasQuery } = useGeneralSearch(searchQuery);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery("");
    closeSearch();
  }, [closeSearch]);

  const handleSelectItem = useCallback(
    (item: SearchResultItem) => {
      Keyboard.dismiss();
      setSearchQuery("");
      closeSearch();
      // Allow modal dismiss animation before navigating
      setTimeout(() => {
        router.navigate(item.route as any);
      }, 50);
    },
    [closeSearch, router],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SearchResultSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [styles],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => {
      const iconColor = item.iconColor || theme.colors.primary;
      const isGuide = item.openModal && item.category === "setting";

      return (
        <Pressable
          accessibilityLabel={`${item.title}, ${item.description}`}
          accessibilityRole="button"
          onPress={() => handleSelectItem(item)}
          style={({ pressed }) => [
            styles.resultRow,
            pressed && styles.resultRowPressed,
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: iconColor + "1A" },
            ]}
          >
            {renderSearchIcon(item.iconName, iconColor, 18)}
          </View>

          <View style={styles.rowContent}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.itemTitle}>
                {item.title}
              </Text>
              {item.badge ? (
                <View
                  style={[
                    styles.badgeChip,
                    isGuide && styles.badgeChipGuide,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isGuide && styles.badgeTextGuide,
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.itemDescription}>
              {item.description}
            </Text>
          </View>

          <ChevronRight color={theme.colors.textMuted} size={16} />
        </Pressable>
      );
    },
    [handleSelectItem, styles, theme],
  );

  if (!isSearchOpen) {
    return null;
  }

  return (
    <Modal
      animationType={isDesktop ? "fade" : "slide"}
      hardwareAccelerated
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent
      visible={isSearchOpen}
    >
      <View style={styles.modalBackdrop}>
        {/* Background tap to dismiss */}
        <Pressable
          accessibilityLabel={t("common.close")}
          onPress={handleClose}
          style={styles.backdropTouchTarget}
        />

        {/* Modal Window Container */}
        <View
          style={[
            styles.modalCard,
            isDesktop ? styles.desktopCard : styles.mobileCard,
            !isDesktop && {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header Search Box */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchIconContainer}>
              <Search color={theme.colors.primary} size={20} />
            </View>
            <TextInput
              accessibilityLabel={t("search.searchPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              clearButtonMode="while-editing"
              multiline={false}
              numberOfLines={1}
              onChangeText={setSearchQuery}
              placeholder={t("search.searchPlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityLabel={t("search.clearSearch")}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setSearchQuery("")}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.clearButtonPressed,
                ]}
              >
                <X color={theme.colors.textMuted} size={16} />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityLabel={t("common.cancel")}
              accessibilityRole="button"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>

          {/* Results List */}
          <SectionList
            contentContainerStyle={styles.listContent}
            initialNumToRender={12}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              hasQuery ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <SearchX color={theme.colors.textMuted} size={32} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {t("search.noResultsTitle")}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t("search.noResultsSubtitle")}
                  </Text>
                </View>
              ) : null
            }
            maxToRenderPerBatch={10}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            style={styles.resultsList}
          />
        </View>
      </View>
    </Modal>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalBackdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "flex-start",
    },
    backdropTouchTarget: {
      ...StyleSheet.absoluteFill,
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      overflow: "hidden",
    },
    desktopCard: {
      alignSelf: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginTop: 80,
      maxHeight: 640,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      width: 580,
    },
    mobileCard: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      flex: 1,
      marginTop: Platform.OS === "android" ? 0 : 4,
    },
    searchBarContainer: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    searchIconContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: theme.spacing.xs,
      paddingRight: theme.spacing.xs,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 16,
      height: 44,
      paddingHorizontal: theme.spacing.xs,
    },
    clearButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    clearButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    cancelButton: {
      borderRadius: theme.borderRadius.small,
      marginLeft: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    cancelButtonPressed: {
      opacity: 0.7,
    },
    cancelButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    resultsList: {
      flex: 1,
    },
    listContent: {
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.xs,
    },
    sectionHeader: {
      paddingBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    sectionHeaderText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    resultRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
    },
    resultRowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconWrapper: {
      alignItems: "center",
      borderRadius: 10,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    rowContent: {
      flex: 1,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    itemTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.1,
    },
    itemDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    badgeChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeChipGuide: {
      backgroundColor: theme.colors.primary + "18",
    },
    badgeText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: "600",
    },
    badgeTextGuide: {
      color: theme.colors.primary,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: 60,
    },
    emptyIconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 64,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 64,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
    },
  });
}
