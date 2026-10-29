import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Crown,
  Moon,
  Palette,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  X,
} from "lucide-react-native";
import {
  Modal,
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
import {
  CURATED_ACCENT_SWATCHES,
  CURATED_PRIMARY_SWATCHES,
  CUSTOM_THEME_ID,
  buildCustomTheme,
  isFreeThemePreset,
  isValidHexColor,
  normalizeHexColor,
  type AppTheme,
  type CustomThemeBaseMode,
  type CustomThemeConfig,
  type CustomThemeTintIntensity,
} from "@/constants/theme";
import {
  useAppTheme,
  useThemeController,
  useThemeStyles,
} from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { writeSavedCustomThemeConfig } from "@/infrastructure/preferences/theme-preference.storage";
import { useHexColors } from "@/modules/hex-colors";
import { ProPaywallModal, useProStatus } from "@/modules/pro";
import {
  FinanceThemePreview,
  ThemePresetCard,
} from "@/modules/settings/components/theme-preset-card";

export interface ThemePickerModalProps {
  visible: boolean;
  selectedThemeId: string;
  isFollowingSystem: boolean;
  themes: AppTheme[];
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
  onFollowSystem: () => void;
}

type ThemeModalTab = "presets" | "custom";
type PresetModeFilter = "all" | "light" | "dark";

export function ThemePickerModal({
  visible,
  selectedThemeId,
  isFollowingSystem,
  themes,
  onClose,
  onSelectTheme,
  onFollowSystem,
}: ThemePickerModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const { customThemeConfig, setCustomTheme } = useThemeController();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const { colors: savedHexColors } = useHexColors();

  const [activeTab, setActiveTab] = useState<ThemeModalTab>("presets");
  const [modeFilter, setModeFilter] = useState<PresetModeFilter>("all");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paletteGridWidth, setPaletteGridWidth] = useState(0);

  const [draftConfig, setDraftConfig] =
    useState<CustomThemeConfig>(customThemeConfig);
  const [primaryInput, setPrimaryInput] = useState(
    customThemeConfig.primaryHex,
  );
  const [accentInput, setAccentInput] = useState(customThemeConfig.accentHex);

  useEffect(() => {
    if (visible) {
      setDraftConfig(customThemeConfig);
      setPrimaryInput(customThemeConfig.primaryHex);
      setAccentInput(customThemeConfig.accentHex);
    }
  }, [customThemeConfig, visible]);

  const previewCustomTheme = useMemo(
    () => buildCustomTheme(draftConfig),
    [draftConfig],
  );

  const userHexList = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of savedHexColors ?? []) {
      const normalized = normalizeHexColor(item?.hex, "");
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        list.push(normalized);
      }
    }
    return list.slice(0, 12);
  }, [savedHexColors]);

  const primarySwatches = useMemo(() => {
    const combined = [...CURATED_PRIMARY_SWATCHES, ...userHexList];
    return Array.from(new Set(combined.map((hex) => hex.toUpperCase())));
  }, [userHexList]);

  const accentSwatches = useMemo(() => {
    const combined = [...CURATED_ACCENT_SWATCHES, ...userHexList];
    return Array.from(new Set(combined.map((hex) => hex.toUpperCase())));
  }, [userHexList]);

  const filteredPresets = useMemo(() => {
    if (modeFilter === "all") return themes;
    return themes.filter((preset) => preset.mode === modeFilter);
  }, [modeFilter, themes]);

  const paletteGap = theme.spacing.md;
  const paletteCardWidth =
    paletteGridWidth > 0 ? (paletteGridWidth - paletteGap) / 2 : undefined;

  const handleSelectTheme = (themeId: string) => {
    if (!isPro && !isFreeThemePreset(themeId)) {
      setPaywallOpen(true);
      return;
    }
    onSelectTheme(themeId);
  };

  const handlePrimaryHexChange = (text: string) => {
    setPrimaryInput(text);
    if (isValidHexColor(text)) {
      const normalized = normalizeHexColor(text, draftConfig.primaryHex);
      setDraftConfig((prev) => ({ ...prev, primaryHex: normalized }));
    }
  };

  const handleAccentHexChange = (text: string) => {
    setAccentInput(text);
    if (isValidHexColor(text)) {
      const normalized = normalizeHexColor(text, draftConfig.accentHex);
      setDraftConfig((prev) => ({ ...prev, accentHex: normalized }));
    }
  };

  const handleSelectPrimarySwatch = (hex: string) => {
    setPrimaryInput(hex);
    setDraftConfig((prev) => ({ ...prev, primaryHex: hex }));
  };

  const handleSelectAccentSwatch = (hex: string) => {
    setAccentInput(hex);
    setDraftConfig((prev) => ({ ...prev, accentHex: hex }));
  };

  const handleApplyCustomTheme = () => {
    writeSavedCustomThemeConfig(draftConfig);
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    setCustomTheme(draftConfig);
  };

  const isCustomActive =
    !isFollowingSystem && selectedThemeId === CUSTOM_THEME_ID;

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("themePicker.closeAccessibility")}
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
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t("themePicker.title")}</Text>
              <Text style={styles.subtitle}>{t("themePicker.subtitle")}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("themePicker.closeAccessibility")}
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

          {/* Top Studio / Presets Switcher */}
          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "presets" }}
                onPress={() => setActiveTab("presets")}
                style={[
                  styles.tabButton,
                  activeTab === "presets" && styles.tabButtonActive,
                ]}
              >
                <Palette
                  color={
                    activeTab === "presets"
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  size={15}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "presets" && styles.tabButtonTextActive,
                  ]}
                >
                  {t("themePicker.tabPresets")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "custom" }}
                onPress={() => setActiveTab("custom")}
                style={[
                  styles.tabButton,
                  activeTab === "custom" && styles.tabButtonActive,
                ]}
              >
                <SlidersHorizontal
                  color={
                    activeTab === "custom"
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  size={15}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "custom" && styles.tabButtonTextActive,
                  ]}
                >
                  {t("themePicker.tabCustomStudio")}
                </Text>
                {!isPro ? (
                  <View style={styles.proBadgeMini}>
                    <Crown color="#D97706" size={9} />
                    <Text style={styles.proBadgeMiniText}>PRO</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          {activeTab === "presets" ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessibilityLabel={t("themePicker.followDevice")}
                accessibilityRole="button"
                accessibilityState={{ selected: isFollowingSystem }}
                onPress={onFollowSystem}
                style={({ pressed }) => [
                  styles.systemOption,
                  isFollowingSystem && styles.systemOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.systemIcon}>
                  <Smartphone color={theme.colors.primary} size={20} />
                </View>
                <View style={styles.systemCopy}>
                  <Text style={styles.systemTitle}>
                    {t("themePicker.followDevice")}
                  </Text>
                  <Text style={styles.systemDescription}>
                    {t("themePicker.followDeviceDescription")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.selection,
                    isFollowingSystem && styles.selectionSelected,
                  ]}
                >
                  {isFollowingSystem ? (
                    <Check
                      color={theme.colors.onPrimary}
                      size={14}
                      strokeWidth={3}
                    />
                  ) : null}
                </View>
              </Pressable>

              {/* Custom Studio Banner Card */}
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveTab("custom")}
                style={({ pressed }) => [
                  styles.customStudioBanner,
                  isCustomActive && styles.systemOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.customBannerSwatches}>
                  <View
                    style={[
                      styles.customBannerSwatchCircle,
                      { backgroundColor: previewCustomTheme.colors.background },
                    ]}
                  />
                  <View
                    style={[
                      styles.customBannerSwatchCircle,
                      styles.customBannerSwatchOverlap,
                      { backgroundColor: previewCustomTheme.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.customBannerSwatchCircle,
                      styles.customBannerSwatchOverlap,
                      { backgroundColor: previewCustomTheme.colors.accent },
                    ]}
                  />
                </View>
                <View style={styles.systemCopy}>
                  <View style={styles.customBannerTitleRow}>
                    <Text style={styles.systemTitle}>
                      {t("themePicker.customBannerTitle")}
                    </Text>
                    {!isPro ? (
                      <View style={styles.proBadgeMini}>
                        <Crown color="#D97706" size={9} />
                        <Text style={styles.proBadgeMiniText}>PRO</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.systemDescription}>
                    {isCustomActive
                      ? t("themePicker.customBannerActive")
                      : t("themePicker.customBannerSubtitle")}
                  </Text>
                </View>
                <View style={styles.customizePill}>
                  <Sparkles color={theme.colors.primary} size={13} />
                  <Text style={styles.customizePillText}>
                    {t("themePicker.customizeAction")}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {t("themePicker.palettes")}
                  </Text>
                  <Text style={styles.sectionHint}>
                    {t("themePicker.choices", {
                      count: filteredPresets.length,
                    })}
                  </Text>
                </View>

                <View style={styles.filterPills}>
                  {(["all", "light", "dark"] as PresetModeFilter[]).map(
                    (modeOption) => {
                      const selected = modeFilter === modeOption;
                      const label =
                        modeOption === "all"
                          ? t("themePicker.filterAll")
                          : modeOption === "light"
                            ? t("settings.light")
                            : t("settings.dark");
                      return (
                        <Pressable
                          key={modeOption}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setModeFilter(modeOption)}
                          style={[
                            styles.filterPill,
                            selected && styles.filterPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              selected && styles.filterPillTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>

              <View
                onLayout={(event) => {
                  setPaletteGridWidth(event.nativeEvent.layout.width);
                }}
                style={styles.cards}
              >
                {filteredPresets.map((preset) => (
                  <View
                    key={preset.id}
                    style={[
                      styles.cardCell,
                      paletteCardWidth != null
                        ? { width: paletteCardWidth }
                        : styles.cardCellFallback,
                    ]}
                  >
                    <ThemePresetCard
                      isProLocked={!isPro && !isFreeThemePreset(preset.id)}
                      onPress={() => handleSelectTheme(preset.id)}
                      preset={preset}
                      selected={
                        !isFollowingSystem && preset.id === selectedThemeId
                      }
                      style={styles.cardFill}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Live Preview Card */}
              <View style={styles.studioPreviewContainer}>
                <View style={styles.studioPreviewHeader}>
                  <Text style={styles.studioSectionLabel}>
                    {t("themePicker.livePreview")}
                  </Text>
                  {isCustomActive ? (
                    <View style={styles.activeBadge}>
                      <Check color={theme.colors.onPrimary} size={11} />
                      <Text style={styles.activeBadgeText}>
                        {t("themePicker.activeBadge")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <FinanceThemePreview preset={previewCustomTheme} />
              </View>

              {/* Base Mode Selector */}
              <View style={styles.studioSection}>
                <Text style={styles.studioSectionLabel}>
                  {t("themePicker.baseModeLabel")}
                </Text>
                <View style={styles.segmentedRow}>
                  {(
                    [
                      {
                        id: "light",
                        label: t("themePicker.modeLight"),
                        Icon: Sun,
                      },
                      {
                        id: "dark",
                        label: t("themePicker.modeDark"),
                        Icon: Moon,
                      },
                      {
                        id: "oled",
                        label: t("themePicker.modeOled"),
                        Icon: Sparkles,
                      },
                    ] as Array<{
                      id: CustomThemeBaseMode;
                      label: string;
                      Icon: typeof Sun;
                    }>
                  ).map(({ id, label, Icon }) => {
                    const selected = draftConfig.baseMode === id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          setDraftConfig((prev) => ({ ...prev, baseMode: id }))
                        }
                        style={[
                          styles.segmentCard,
                          selected && styles.segmentCardSelected,
                        ]}
                      >
                        <Icon
                          color={
                            selected
                              ? theme.colors.primary
                              : theme.colors.textSecondary
                          }
                          size={16}
                        />
                        <Text
                          style={[
                            styles.segmentCardText,
                            selected && styles.segmentCardTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Surface Tint Intensity */}
              <View style={styles.studioSection}>
                <Text style={styles.studioSectionLabel}>
                  {t("themePicker.surfaceTintLabel")}
                </Text>
                <Text style={styles.studioSectionHint}>
                  {t("themePicker.surfaceTintHint")}
                </Text>
                <View style={styles.segmentedRow}>
                  {(
                    [
                      {
                        id: "neutral",
                        label: t("themePicker.tintNeutral"),
                      },
                      {
                        id: "subtle",
                        label: t("themePicker.tintSubtle"),
                      },
                      {
                        id: "rich",
                        label: t("themePicker.tintRich"),
                      },
                    ] as Array<{
                      id: CustomThemeTintIntensity;
                      label: string;
                    }>
                  ).map(({ id, label }) => {
                    const selected = draftConfig.tintIntensity === id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            tintIntensity: id,
                          }))
                        }
                        style={[
                          styles.segmentCard,
                          selected && styles.segmentCardSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentCardText,
                            selected && styles.segmentCardTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Primary Brand Color */}
              <View style={styles.studioSection}>
                <View style={styles.colorHeaderRow}>
                  <View style={styles.colorTitleWrap}>
                    <Text style={styles.studioSectionLabel}>
                      {t("themePicker.primaryColorLabel")}
                    </Text>
                    <Text style={styles.studioSectionHint}>
                      {t("themePicker.primaryColorHint")}
                    </Text>
                  </View>
                  <View style={styles.hexInputContainer}>
                    <View
                      style={[
                        styles.hexPreviewDot,
                        { backgroundColor: draftConfig.primaryHex },
                      ]}
                    />
                    <TextInput
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={7}
                      onChangeText={handlePrimaryHexChange}
                      placeholder="#10B981"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.hexInput}
                      value={primaryInput}
                    />
                  </View>
                </View>
                <View style={styles.swatchGrid}>
                  {primarySwatches.map((hex) => {
                    const selected =
                      draftConfig.primaryHex.toUpperCase() ===
                      hex.toUpperCase();
                    return (
                      <Pressable
                        key={`primary-${hex}`}
                        accessibilityLabel={`Primary color ${hex}`}
                        accessibilityRole="button"
                        onPress={() => handleSelectPrimarySwatch(hex)}
                        style={[
                          styles.colorSwatchButton,
                          { backgroundColor: hex },
                          selected && styles.colorSwatchSelected,
                        ]}
                      >
                        {selected ? (
                          <Check color="#FFFFFF" size={14} strokeWidth={3} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Accent Highlight Color */}
              <View style={styles.studioSection}>
                <View style={styles.colorHeaderRow}>
                  <View style={styles.colorTitleWrap}>
                    <Text style={styles.studioSectionLabel}>
                      {t("themePicker.accentColorLabel")}
                    </Text>
                    <Text style={styles.studioSectionHint}>
                      {t("themePicker.accentColorHint")}
                    </Text>
                  </View>
                  <View style={styles.hexInputContainer}>
                    <View
                      style={[
                        styles.hexPreviewDot,
                        { backgroundColor: draftConfig.accentHex },
                      ]}
                    />
                    <TextInput
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={7}
                      onChangeText={handleAccentHexChange}
                      placeholder="#F59E0B"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.hexInput}
                      value={accentInput}
                    />
                  </View>
                </View>
                <View style={styles.swatchGrid}>
                  {accentSwatches.map((hex) => {
                    const selected =
                      draftConfig.accentHex.toUpperCase() === hex.toUpperCase();
                    return (
                      <Pressable
                        key={`accent-${hex}`}
                        accessibilityLabel={`Accent color ${hex}`}
                        accessibilityRole="button"
                        onPress={() => handleSelectAccentSwatch(hex)}
                        style={[
                          styles.colorSwatchButton,
                          { backgroundColor: hex },
                          selected && styles.colorSwatchSelected,
                        ]}
                      >
                        {selected ? (
                          <Check color="#111827" size={14} strokeWidth={3} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Apply CTA */}
              <Pressable
                accessibilityRole="button"
                onPress={handleApplyCustomTheme}
                style={({ pressed }) => [
                  styles.applyCustomButton,
                  !isPro && styles.applyCustomButtonPro,
                  pressed && styles.pressed,
                ]}
              >
                {!isPro ? (
                  <Crown color="#FFFFFF" size={18} />
                ) : (
                  <Check
                    color={theme.colors.onPrimary}
                    size={18}
                    strokeWidth={2.5}
                  />
                )}
                <Text
                  style={[
                    styles.applyCustomButtonText,
                    !isPro && styles.applyCustomButtonTextPro,
                  ]}
                >
                  {isPro
                    ? t("themePicker.applyCustomTheme")
                    : t("themePicker.unlockCustomThemePro")}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>

      <ProPaywallModal
        onClose={() => setPaywallOpen(false)}
        visible={paywallOpen}
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
      maxHeight: "92%",
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
      maxHeight: "88%",
      maxWidth: 920,
    },
    header: {
      alignItems: "flex-start",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    headerCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.round,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    tabBarWrapper: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      padding: 4,
    },
    tabButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: theme.spacing.sm,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    tabButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    proBadgeMini: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.16)",
      borderColor: "rgba(217, 119, 6, 0.45)",
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    proBadgeMiniText: {
      color: "#D97706",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    content: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    systemOption: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 72,
      padding: theme.spacing.md,
    },
    systemOptionSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    systemIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.medium,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    systemCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    systemTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    systemDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    customStudioBanner: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 72,
      padding: theme.spacing.md,
    },
    customBannerSwatches: {
      alignItems: "center",
      flexDirection: "row",
      paddingLeft: 4,
    },
    customBannerSwatchCircle: {
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
      borderWidth: 1.5,
      height: 24,
      width: 24,
    },
    customBannerSwatchOverlap: {
      marginLeft: -8,
    },
    customBannerTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    customizePill: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    customizePillText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    selection: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    selectionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sectionHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    sectionHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    filterPills: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      padding: 2,
    },
    filterPill: {
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    filterPillSelected: {
      backgroundColor: theme.colors.primary,
    },
    filterPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterPillTextSelected: {
      color: theme.colors.onPrimary,
    },
    cards: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      width: "100%",
    },
    cardCell: {
      flexGrow: 0,
      flexShrink: 0,
    },
    cardCellFallback: {
      flexBasis: "47%",
      flexGrow: 1,
      maxWidth: "47%",
    },
    cardFill: {
      width: "100%",
    },
    studioPreviewContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    studioPreviewHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    activeBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    activeBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: "700",
    },
    studioSection: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    studioSectionLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    studioSectionHint: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    segmentedRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    segmentCard: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: theme.spacing.xs,
    },
    segmentCardSelected: {
      backgroundColor: theme.colors.controlSecondary,
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    segmentCardText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    segmentCardTextSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    colorHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    colorTitleWrap: {
      flex: 1,
      gap: 2,
    },
    hexInputContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    hexPreviewDot: {
      borderColor: theme.colors.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      height: 16,
      width: 16,
    },
    hexInput: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      minWidth: 64,
      padding: 0,
    },
    swatchGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: 4,
    },
    colorSwatchButton: {
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
    applyCustomButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.large,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: theme.spacing.lg,
    },
    applyCustomButtonPro: {
      backgroundColor: "#D97706",
    },
    applyCustomButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    applyCustomButtonTextPro: {
      color: "#FFFFFF",
    },
    pressed: {
      opacity: 0.76,
    },
  });
}
