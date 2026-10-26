import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Crown, Plus } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { WidgetCatalogItem } from "../constants/widget-catalog.constants";

interface WidgetGalleryCardProps {
  item: WidgetCatalogItem;
  isAdded: boolean;
  isPending: boolean;
  isLocked: boolean;
  onAdd: (item: WidgetCatalogItem) => void;
}

export function WidgetGalleryCard({
  item,
  isAdded,
  isPending,
  isLocked,
  onAdd,
}: WidgetGalleryCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const title = t(item.titleKey);

  const buttonLabel = isLocked
    ? t("widgetGallery.unlockButton")
    : isAdded
      ? t("widgetGallery.addAgainButton")
      : t("widgetGallery.addButton");

  return (
    <View style={styles.card}>
      <View style={styles.previewFrame}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={item.previewImage}
          style={styles.previewImage}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <View style={styles.sizeChip}>
            <Text style={styles.sizeChipText}>{item.sizeLabel}</Text>
          </View>
          {item.isPro ? (
            <View style={styles.proChip}>
              <Crown color={theme.colors.warning} size={11} />
              <Text style={styles.proChipText}>PRO</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.description}>{t(item.descriptionKey)}</Text>

        <View style={styles.footer}>
          {isAdded ? (
            <View style={styles.addedBadge}>
              <Check color={theme.colors.success} size={14} />
              <Text style={styles.addedBadgeText}>
                {t("widgetGallery.addedBadge")}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <Pressable
            accessibilityLabel={t("widgetGallery.addAccessibility", { widget: title })}
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => onAdd(item)}
            style={({ pressed }) => [
              styles.addButton,
              isAdded && !isLocked && styles.addButtonSecondary,
              isLocked && styles.addButtonLocked,
              pressed && styles.addButtonPressed,
            ]}
          >
            {isPending ? (
              <ActivityIndicator color={theme.colors.onControlSecondary} size="small" />
            ) : (
              <>
                {isLocked ? (
                  <Crown color={theme.colors.warning} size={16} />
                ) : (
                  <Plus
                    color={isAdded ? theme.colors.primary : theme.colors.background}
                    size={16}
                  />
                )}
                <Text
                  style={[
                    styles.addButtonText,
                    isAdded && !isLocked && styles.addButtonTextSecondary,
                    isLocked && styles.addButtonTextLocked,
                  ]}
                >
                  {buttonLabel}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    previewFrame: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      height: 132,
      justifyContent: "center",
      padding: 12,
    },
    previewImage: {
      height: "100%",
      width: "100%",
    },
    body: {
      gap: 6,
      padding: 14,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "700",
    },
    sizeChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    sizeChipText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },
    proChip: {
      alignItems: "center",
      borderColor: theme.colors.warning,
      borderRadius: 6,
      borderWidth: 1,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    proChipText: {
      color: theme.colors.warning,
      fontSize: 10,
      fontWeight: "700",
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    footer: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    addedBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    addedBadgeText: {
      color: theme.colors.success,
      fontSize: 13,
      fontWeight: "600",
    },
    addButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      minHeight: 36,
      minWidth: 96,
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    addButtonSecondary: {
      backgroundColor: "transparent",
    },
    addButtonLocked: {
      backgroundColor: "transparent",
      borderColor: theme.colors.warning,
    },
    addButtonPressed: {
      opacity: 0.75,
    },
    addButtonText: {
      color: theme.colors.background,
      fontSize: 13,
      fontWeight: "700",
    },
    addButtonTextSecondary: {
      color: theme.colors.primary,
    },
    addButtonTextLocked: {
      color: theme.colors.warning,
    },
  });
}
