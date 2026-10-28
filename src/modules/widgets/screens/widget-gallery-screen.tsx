import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { HelpCircle, LayoutGrid } from "lucide-react-native";
import { InfoModal, ModalScreenHeader } from "@/components";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ProFeatureModal, useProGuard } from "@/modules/pro";
import { WidgetGalleryCard } from "../components/widget-gallery-card";
import type {
  WidgetCatalogCategory,
  WidgetCatalogItem,
} from "../constants/widget-catalog.constants";
import { useWidgetGallery } from "../hooks/use-widget-gallery";

const CATEGORY_ORDER: readonly WidgetCatalogCategory[] = ["quickActions", "insights"];

export function WidgetGalleryScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { catalog, isSupported, pinnedWidgetNames, pendingWidgetName, addWidget } =
    useWidgetGallery();
  const { isPro, openPaywall, paywallVisible, closePaywall, guardMeta } =
    useProGuard();
  const [isManualStepsOpen, setIsManualStepsOpen] = useState(false);

  const handleAdd = useCallback(
    async (item: WidgetCatalogItem) => {
      if (item.isPro && !isPro) {
        openPaywall({
          featureTitle: t(item.titleKey),
          featureDescription: t("widgetGallery.proFeatureDescription"),
        });
        return;
      }
      const prompted = await addWidget(item.widgetName);
      if (!prompted) {
        setIsManualStepsOpen(true);
      }
    },
    [addWidget, isPro, openPaywall, t],
  );

  return (
    <View style={styles.screenWrapper}>
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        title={t("widgetGallery.title")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <PageContainer>
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <LayoutGrid color={theme.colors.primary} size={22} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>{t("widgetGallery.introTitle")}</Text>
              <Text style={styles.introSubtitle}>
                {isSupported
                  ? t("widgetGallery.introSubtitle")
                  : t("widgetGallery.unsupportedPlatform")}
              </Text>
            </View>
          </View>

          {CATEGORY_ORDER.map((category) => {
            const items = catalog.filter((item) => item.category === category);
            return (
              <View key={category} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {category === "quickActions"
                    ? t("widgetGallery.quickActionsSection")
                    : t("widgetGallery.insightsSection")}
                </Text>
                <View style={styles.cardList}>
                  {items.map((item) => (
                    <WidgetGalleryCard
                      isAdded={pinnedWidgetNames.has(item.widgetName)}
                      isLocked={item.isPro && !isPro}
                      isPending={pendingWidgetName === item.widgetName}
                      item={item}
                      key={item.widgetName}
                      onAdd={(selected) => {
                        void handleAdd(selected);
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsManualStepsOpen(true)}
            style={({ pressed }) => [styles.helpLink, pressed && styles.helpLinkPressed]}
          >
            <HelpCircle color={theme.colors.textSecondary} size={16} />
            <Text style={styles.helpLinkText}>{t("widgetGallery.manualHelpLink")}</Text>
          </Pressable>
        </PageContainer>
      </ScrollView>

      <InfoModal
        buttonLabel={t("widgetGallery.manualStepsClose")}
        message={t("widgetGallery.manualStepsMessage")}
        onClose={() => setIsManualStepsOpen(false)}
        title={t("widgetGallery.manualStepsTitle")}
        visible={isManualStepsOpen}
      />

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenWrapper: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    introCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
      padding: 16,
    },
    introIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    introCopy: {
      flex: 1,
      gap: 4,
    },
    introTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    introSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingHorizontal: 4,
      textTransform: "uppercase",
    },
    cardList: {
      gap: 12,
    },
    helpLink: {
      alignItems: "center",
      alignSelf: "center",
      flexDirection: "row",
      gap: 6,
      marginTop: 24,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    helpLinkPressed: {
      opacity: 0.6,
    },
    helpLinkText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
  });
}
