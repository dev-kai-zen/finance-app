import { useMemo, useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  LayoutGrid,
  Plus,
  Quote,
  RotateCcw,
  Shuffle,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  HorizontalScrollView,
  IconHelper,
  InfoModal,
  ScrollDownIndicator,
  SortableListModal,
  ThemedSwitch,
  type SortableItem,
} from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import { isLightColor } from "@/utils/color-contrast";
import type { AppTheme } from "@/constants/theme";
import { useScrollDownIndicator } from "@/hooks/use-scroll-down-indicator";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import {
  HexColorFormModal,
  useHexColors,
  type HexColorInput,
} from "@/modules/hex-colors";
import {
  CustomizeDashboardWalkthroughOverlay,
  DraggableTourChip,
  useCustomizeDashboardWalkthrough,
  WalkthroughRegistryProvider,
  WalkthroughTarget,
} from "@/modules/walkthrough";
import type {
  DashboardLayoutPreferences,
  DashboardLayoutPresetId,
  DashboardWidgetId,
} from "@/modules/settings";

export interface CustomizeDashboardModalProps {
  visible: boolean;
  layout: DashboardLayoutPreferences;
  onClose: () => void;
  onToggleWidget: (widgetId: DashboardWidgetId, visible: boolean) => void;
  onMoveWidget?: (widgetId: DashboardWidgetId, direction: "up" | "down") => void;
  onReorderWidgets?: (orderedIds: DashboardWidgetId[]) => void;
  onToggleQuote: (showQuote: boolean) => void;
  onChangeQuoteColors?: (
    quoteBackgroundColor: string | null,
    quoteTextColor: string | null,
  ) => void;
  onSelectPreset: (presetId: DashboardLayoutPresetId) => void;
  onReset: () => void;
}

const QUICK_NEUTRAL_SWATCHES = [
  { id: "quick_white", name: "White", hex: "#FFFFFF" },
  { id: "quick_dark", name: "Dark Slate", hex: "#0F172A" },
];

// isLightColor imported from @/utils/color-contrast

const WIDGET_METADATA: Record<
  DashboardWidgetId,
  {
    icon: string;
    titleKey: string;
  }
> = {
  greeting: {
    icon: "sun",
    titleKey: "dashboard.widgetGreetingTitle",
  },
  netWorth: {
    icon: "trending-up",
    titleKey: "dashboard.widgetNetWorthTitle",
  },
  quickActions: {
    icon: "zap",
    titleKey: "dashboard.widgetQuickActionsTitle",
  },
  cashflow: {
    icon: "arrow-left-right",
    titleKey: "dashboard.widgetCashflowTitle",
  },
  accountsStrip: {
    icon: "landmark",
    titleKey: "dashboard.widgetAccountsTitle",
  },
  topCategories: {
    icon: "pie-chart",
    titleKey: "dashboard.widgetTopCategoriesTitle",
  },
  recentTransactions: {
    icon: "clock",
    titleKey: "dashboard.widgetRecentTxTitle",
  },
};

export function CustomizeDashboardModal(props: CustomizeDashboardModalProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <CustomizeDashboardModalContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function CustomizeDashboardModalContent({
  visible,
  layout,
  onClose,
  onToggleWidget,
  onReorderWidgets,
  onToggleQuote,
  onChangeQuoteColors,
  onSelectPreset,
  onReset,
}: CustomizeDashboardModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const walkthrough = useCustomizeDashboardWalkthrough();

  const { colors: savedColors, addColor } = useHexColors();
  const {
    scrollRef: scrollViewRef,
    canScrollDown,
    scrollToNext,
    scrollProps,
  } = useScrollDownIndicator<ScrollView>();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [isColorFormOpen, setIsColorFormOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<
    "background" | "text"
  >("background");

  const handleToggleQuote = (val: boolean) => {
    onToggleQuote(val);
    if (val) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const availableColors = useMemo(() => {
    const existingHexes = new Set(
      savedColors.map((c) => c.hex.trim().toLowerCase()),
    );
    const extras = QUICK_NEUTRAL_SWATCHES.filter(
      (n) => !existingHexes.has(n.hex.toLowerCase()),
    );
    return [...extras, ...savedColors];
  }, [savedColors]);

  const handleSaveCustomColor = (input: HexColorInput) => {
    const created = addColor(input);
    if (colorPickerTarget === "background") {
      onChangeQuoteColors?.(created.hex, layout.quoteTextColor ?? null);
    } else {
      onChangeQuoteColors?.(layout.quoteBackgroundColor ?? null, created.hex);
    }
    setIsColorFormOpen(false);
    return true;
  };

  const sortableItems = useMemo<SortableItem[]>(
    () =>
      layout.order.map((widgetId) => {
        const meta = WIDGET_METADATA[widgetId];
        return {
          id: widgetId,
          name: t(meta.titleKey as never),
          icon: meta.icon,
          color: theme.colors.primary,
        };
      }),
    [layout.order, t, theme.colors.primary],
  );

  if (!visible) return null;

  const hiddenSet = new Set(layout.hidden);

  const presets: Array<{
    id: DashboardLayoutPresetId;
    title: string;
    Icon: typeof Sparkles;
  }> = [
    {
      id: "cashflowFocus",
      title: t("dashboard.presetCashflowFocus"),
      Icon: Wallet,
    },
    {
      id: "wealthOverview",
      title: t("dashboard.presetWealthOverview"),
      Icon: TrendingUp,
    },
    {
      id: "completeView",
      title: t("dashboard.presetCompleteView"),
      Icon: LayoutGrid,
    },
    {
      id: "minimalist",
      title: t("dashboard.presetMinimalist"),
      Icon: Sparkles,
    },
  ];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheet,
            isWide && styles.sheetWide,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title}>
                {t("dashboard.customizeModalTitle")}
              </Text>
              <Pressable
                accessibilityLabel={t("dashboard.customizeHelpTitle")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setIsHelpOpen(true)}
                style={({ pressed }) => [
                  styles.helpIconButton,
                  pressed && styles.pressed,
                ]}
              >
                <CircleHelp color={theme.colors.textSecondary} size={18} />
              </Pressable>
            </View>
            <WalkthroughTarget id="customizeDashDone">
              <Pressable
                accessibilityLabel={t("common.close")}
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <X color={theme.colors.textSecondary} size={20} />
              </Pressable>
            </WalkthroughTarget>
          </View>

          <View style={styles.scrollWrapper}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollProps}
            >
            {/* 1-Tap Quick Layout Presets (Minimalist) */}
            <WalkthroughTarget id="customizeDashPreview">
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {t("dashboard.quickPresetsLabel")}
                </Text>
                <View style={styles.presetsGrid}>
                  {presets.map(({ id, title, Icon }) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => onSelectPreset(id)}
                      style={({ pressed }) => [
                        styles.presetCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.presetIconWrap}>
                        <Icon color={theme.colors.primary} size={15} />
                      </View>
                      <Text numberOfLines={1} style={styles.presetTitle}>
                        {title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </WalkthroughTarget>

            {/* Dashboard Cards & Order (Minimalist + Categories-style Reorder) */}
            <WalkthroughTarget id="customizeDashCards">
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionLabel}>
                  {t("dashboard.sectionsOrderLabel")}
                </Text>
                <View style={styles.sectionActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsReorderOpen(true)}
                    style={({ pressed }) => [
                      styles.reorderBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <IconHelper
                      color={theme.colors.textSecondary}
                      name="arrow-up-down"
                      size={13}
                    />
                    <Text style={styles.reorderBtnText}>
                      {t("dashboard.reorderCards")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onReset}
                    style={({ pressed }) => [
                      styles.resetBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <RotateCcw color={theme.colors.textSecondary} size={13} />
                    <Text style={styles.resetBtnText}>
                      {t("dashboard.resetLayout")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.widgetList}>
                {layout.order.map((widgetId) => {
                  const meta = WIDGET_METADATA[widgetId];
                  const isGreeting = widgetId === "greeting";
                  const isVisible = isGreeting || !hiddenSet.has(widgetId);

                  return (
                    <View
                      key={widgetId}
                      style={[
                        styles.widgetRow,
                        !isVisible && styles.widgetRowHidden,
                      ]}
                    >
                      <View style={styles.widgetIconBox}>
                        <IconHelper
                          color={
                            isVisible
                              ? theme.colors.primary
                              : theme.colors.textMuted
                          }
                          name={meta.icon}
                          size={18}
                        />
                      </View>

                      <View style={styles.widgetTitleContainer}>
                        <Text numberOfLines={1} style={styles.widgetTitle}>
                          {t(meta.titleKey as never)}
                        </Text>
                        {isGreeting ? (
                          <Text style={styles.alwaysActiveBadge}>
                            {t("dashboard.alwaysActive" as never)}
                          </Text>
                        ) : null}
                      </View>

                      <ThemedSwitch
                        accessibilityLabel={t(meta.titleKey as never)}
                        disabled={isGreeting}
                        onValueChange={(val) => onToggleWidget(widgetId, val)}
                        value={isVisible}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Extra Card Option: Show Daily Quote in Greeting */}
            <View style={styles.optionCard}>
              <View style={styles.widgetIconBox}>
                <Quote color={theme.colors.primary} size={18} />
              </View>
              <Text numberOfLines={1} style={styles.widgetTitle}>
                {t("dashboard.showDailyQuoteTitle")}
              </Text>
              <ThemedSwitch
                accessibilityLabel={t("dashboard.showDailyQuoteTitle")}
                onValueChange={handleToggleQuote}
                value={layout.showGreetingQuote}
              />
            </View>
            </WalkthroughTarget>

            {/* Quote Appearance & Custom Colors */}
            {layout.showGreetingQuote ? (
              <View style={styles.quoteConfigCard}>
                <View style={styles.quoteConfigHeader}>
                  <View style={styles.quoteConfigHeaderLeft}>
                    <Sparkles color={theme.colors.primary} size={15} />
                    <Text style={styles.quoteConfigTitle}>
                      {t("dashboard.quoteColorsTitle")}
                    </Text>
                  </View>
                  {(layout.quoteBackgroundColor !== null &&
                    layout.quoteBackgroundColor !== undefined) ||
                  (layout.quoteTextColor !== null &&
                    layout.quoteTextColor !== undefined) ? (
                    <Pressable
                      accessibilityLabel={t("dashboard.resetToDefault")}
                      accessibilityRole="button"
                      onPress={() => onChangeQuoteColors?.(null, null)}
                      style={({ pressed }) => [
                        styles.resetColorsButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <RotateCcw color={theme.colors.textMuted} size={12} />
                      <Text style={styles.resetColorsText}>
                        {t("dashboard.resetToDefault")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Live Preview Box */}
                <View
                  style={[
                    styles.previewQuoteBox,
                    layout.quoteBackgroundColor
                      ? {
                          backgroundColor: layout.quoteBackgroundColor,
                          borderColor: `${layout.quoteBackgroundColor}40`,
                        }
                      : {
                          backgroundColor: `${theme.colors.primary}08`,
                          borderColor: `${theme.colors.primary}20`,
                        },
                  ]}
                >
                  <Quote
                    color={layout.quoteTextColor ?? theme.colors.primary}
                    size={14}
                    style={{ opacity: layout.quoteTextColor ? 0.9 : 0.75 }}
                  />
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.previewQuoteText,
                      layout.quoteTextColor
                        ? { color: layout.quoteTextColor }
                        : { color: theme.colors.textPrimary },
                    ]}
                  >
                    “Do not save what is left after spending, but spend what is left after saving.”{" "}
                    <Text
                      style={[
                        styles.previewAuthorText,
                        layout.quoteTextColor
                          ? { color: layout.quoteTextColor, opacity: 0.85 }
                          : { color: theme.colors.textSecondary },
                      ]}
                    >
                      — Warren Buffett
                    </Text>
                  </Text>
                  <Shuffle
                    color={layout.quoteTextColor ?? theme.colors.textMuted}
                    size={13}
                    style={{ opacity: layout.quoteTextColor ? 0.8 : 0.6 }}
                  />
                </View>

                {/* Background Color Swatches */}
                <View style={styles.colorPickerSection}>
                  <Text style={styles.colorPickerLabel}>
                    {t("dashboard.quoteBgColor")}
                  </Text>
                  <HorizontalScrollView
                    contentContainerStyle={styles.swatchesScroll}
                  >
                    {/* Default (Theme) chip */}
                    <Pressable
                      accessibilityLabel={t("dashboard.themeDefault")}
                      accessibilityRole="button"
                      onPress={() =>
                        onChangeQuoteColors?.(
                          null,
                          layout.quoteTextColor ?? null,
                        )
                      }
                      style={[
                        styles.defaultChip,
                        !layout.quoteBackgroundColor &&
                          styles.defaultChipSelected,
                      ]}
                    >
                      <Sparkles
                        color={
                          !layout.quoteBackgroundColor
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                        size={12}
                      />
                      <Text
                        style={[
                          styles.defaultChipText,
                          !layout.quoteBackgroundColor &&
                            styles.defaultChipTextSelected,
                        ]}
                      >
                        {t("dashboard.themeDefault")}
                      </Text>
                    </Pressable>

                    {availableColors.map((color) => {
                      const isSelected =
                        layout.quoteBackgroundColor?.toLowerCase() ===
                        color.hex.toLowerCase();
                      const light = isLightColor(color.hex);
                      return (
                        <Pressable
                          key={`bg-${color.id}`}
                          accessibilityLabel={color.name}
                          accessibilityRole="button"
                          onPress={() =>
                            onChangeQuoteColors?.(
                              color.hex,
                              layout.quoteTextColor ?? null,
                            )
                          }
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color.hex },
                            isSelected && styles.colorSwatchSelected,
                          ]}
                        >
                          {isSelected ? (
                            <Check
                              color={light ? "#0F172A" : "#FFFFFF"}
                              size={14}
                              strokeWidth={3}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}

                    <Pressable
                      accessibilityLabel="Add custom color"
                      accessibilityRole="button"
                      onPress={() => {
                        setColorPickerTarget("background");
                        setIsColorFormOpen(true);
                      }}
                      style={({ pressed }) => [
                        styles.addColorSwatch,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Plus
                        color={theme.colors.primary}
                        size={16}
                        strokeWidth={2.5}
                      />
                    </Pressable>
                  </HorizontalScrollView>
                </View>

                {/* Text Color Swatches */}
                <View style={styles.colorPickerSection}>
                  <Text style={styles.colorPickerLabel}>
                    {t("dashboard.quoteTextColor")}
                  </Text>
                  <HorizontalScrollView
                    contentContainerStyle={styles.swatchesScroll}
                  >
                    {/* Default (Theme) chip */}
                    <Pressable
                      accessibilityLabel={t("dashboard.themeDefault")}
                      accessibilityRole="button"
                      onPress={() =>
                        onChangeQuoteColors?.(
                          layout.quoteBackgroundColor ?? null,
                          null,
                        )
                      }
                      style={[
                        styles.defaultChip,
                        !layout.quoteTextColor && styles.defaultChipSelected,
                      ]}
                    >
                      <Sparkles
                        color={
                          !layout.quoteTextColor
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                        size={12}
                      />
                      <Text
                        style={[
                          styles.defaultChipText,
                          !layout.quoteTextColor &&
                            styles.defaultChipTextSelected,
                        ]}
                      >
                        {t("dashboard.themeDefault")}
                      </Text>
                    </Pressable>

                    {availableColors.map((color) => {
                      const isSelected =
                        layout.quoteTextColor?.toLowerCase() ===
                        color.hex.toLowerCase();
                      const light = isLightColor(color.hex);
                      return (
                        <Pressable
                          key={`txt-${color.id}`}
                          accessibilityLabel={color.name}
                          accessibilityRole="button"
                          onPress={() =>
                            onChangeQuoteColors?.(
                              layout.quoteBackgroundColor ?? null,
                              color.hex,
                            )
                          }
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color.hex },
                            isSelected && styles.colorSwatchSelected,
                          ]}
                        >
                          {isSelected ? (
                            <Check
                              color={light ? "#0F172A" : "#FFFFFF"}
                              size={14}
                              strokeWidth={3}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}

                    <Pressable
                      accessibilityLabel="Add custom color"
                      accessibilityRole="button"
                      onPress={() => {
                        setColorPickerTarget("text");
                        setIsColorFormOpen(true);
                      }}
                      style={({ pressed }) => [
                        styles.addColorSwatch,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Plus
                        color={theme.colors.primary}
                        size={16}
                        strokeWidth={2.5}
                      />
                    </Pressable>
                  </HorizontalScrollView>
                </View>
              </View>
            ) : null}
            </ScrollView>
            <ScrollDownIndicator
              visible={canScrollDown}
              onPress={scrollToNext}
              bottomOffset={4}
            />
          </View>

          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />

          <CustomizeDashboardWalkthroughOverlay
            onNext={walkthrough.nextStep}
            onPrev={walkthrough.prevStep}
            onSkip={walkthrough.skipWalkthrough}
            step={walkthrough.currentStep}
            stepIndex={walkthrough.activeStepIndex}
            targetLayout={walkthrough.activeTargetLayout}
            totalSteps={walkthrough.totalSteps}
            visible={walkthrough.isWalkthroughActive}
          />
        </View>
      </View>

      <SortableListModal
        items={sortableItems}
        onClose={() => setIsReorderOpen(false)}
        onSave={(orderedIds) => {
          onReorderWidgets?.(orderedIds as DashboardWidgetId[]);
        }}
        showAlphabetizeAction={false}
        title={t("dashboard.reorderCardsTitle")}
        titleAlign="left"
        visible={isReorderOpen}
      />

      <InfoModal
        message={t("dashboard.customizeHelpMessage")}
        onClose={() => setIsHelpOpen(false)}
        title={t("dashboard.customizeHelpTitle")}
        visible={isHelpOpen}
      />

      <HexColorFormModal
        onClose={() => setIsColorFormOpen(false)}
        onSave={handleSaveCustomColor}
        visible={isColorFormOpen}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "90%",
      overflow: "hidden",
      paddingTop: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    scrollWrapper: {
      flexShrink: 1,
      position: "relative",
    },
    sheetWide: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxHeight: "86%",
      maxWidth: 680,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    headerTitleGroup: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    helpIconButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.round,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    content: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitleRow: {
      alignItems: "flex-start",
      flexDirection: "column",
      gap: theme.spacing.xs,
    },
    sectionActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.7,
      textTransform: "uppercase",
    },
    reorderBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    reorderBtnText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    resetBtn: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    resetBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    presetsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    presetCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexBasis: "47%",
      flexDirection: "row",
      flexGrow: 1,
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    presetIconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: 6,
      height: 26,
      justifyContent: "center",
      width: 26,
    },
    presetTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    widgetList: {
      gap: theme.spacing.xs,
    },
    widgetRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    widgetRowHidden: {
      opacity: 0.65,
    },
    widgetIconBox: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.medium,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    widgetTitleContainer: {
      flex: 1,
      justifyContent: "center",
      gap: 2,
    },
    widgetTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    alwaysActiveBadge: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    optionCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    quoteConfigCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    quoteConfigHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    quoteConfigHeaderLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    quoteConfigTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    resetColorsButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    resetColorsText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    previewQuoteBox: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    previewQuoteText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      lineHeight: theme.typography.lineHeight.xs * 1.35,
    },
    previewAuthorText: {
      fontStyle: "normal",
      fontWeight: theme.typography.fontWeight.semibold,
    },
    colorPickerSection: {
      gap: 6,
    },
    colorPickerLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    swatchesScroll: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      paddingVertical: 4,
    },
    defaultChip: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      height: 32,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    defaultChipSelected: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    defaultChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    defaultChipTextSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    colorSwatch: {
      alignItems: "center",
      borderColor: "rgba(255,255,255,0.25)",
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    colorSwatchSelected: {
      borderColor: theme.colors.textPrimary,
      borderWidth: 2.5,
      transform: [{ scale: 1.06 }],
    },
    colorCheckDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    addColorSwatch: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderStyle: "dashed",
      borderWidth: 1.5,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
