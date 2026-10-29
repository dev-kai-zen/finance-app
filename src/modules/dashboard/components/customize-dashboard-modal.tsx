import { useMemo, useState } from "react";
import {
  CircleHelp,
  LayoutGrid,
  Quote,
  RotateCcw,
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
  IconHelper,
  InfoModal,
  SortableListModal,
  ThemedSwitch,
  type SortableItem,
} from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
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
  onSelectPreset: (presetId: DashboardLayoutPresetId) => void;
  onReset: () => void;
}

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

export function CustomizeDashboardModal({
  visible,
  layout,
  onClose,
  onToggleWidget,
  onReorderWidgets,
  onToggleQuote,
  onSelectPreset,
  onReset,
}: CustomizeDashboardModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);

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
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* 1-Tap Quick Layout Presets (Minimalist) */}
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

            {/* Dashboard Cards & Order (Minimalist + Categories-style Reorder) */}
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
                  const isVisible = !hiddenSet.has(widgetId);

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

                      <Text numberOfLines={1} style={styles.widgetTitle}>
                        {t(meta.titleKey as never)}
                      </Text>

                      <ThemedSwitch
                        accessibilityLabel={t(meta.titleKey as never)}
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
                onValueChange={onToggleQuote}
                value={layout.showGreetingQuote}
              />
            </View>
          </ScrollView>
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
    widgetTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
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
    pressed: {
      opacity: 0.75,
    },
  });
}
