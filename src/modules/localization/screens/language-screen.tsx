import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Check, Languages, Search, Smartphone } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getResponsiveGutter, LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  LanguagePreference,
  SupportedLanguage,
} from "@/infrastructure/localization";
import {
  filterLanguages,
  SUPPORTED_LANGUAGES,
  useLocalization,
} from "@/infrastructure/localization";

type LanguageListItem =
  | { kind: "system"; key: "system" }
  | { kind: "language"; key: string; language: SupportedLanguage };

export function LanguageScreen() {
  const [query, setQuery] = useState("");
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const {
    activeLanguage,
    preference,
    setLanguagePreference,
    t,
  } = useLocalization();
  const horizontalPadding = getResponsiveGutter(width, theme.spacing);

  const data = useMemo<LanguageListItem[]>(() => {
    const languages = filterLanguages(SUPPORTED_LANGUAGES, query).map(
      (language) => ({
        kind: "language" as const,
        key: language.code,
        language,
      }),
    );
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const systemMatches =
      !normalizedQuery ||
      t("language.systemDefault").toLocaleLowerCase().includes(normalizedQuery) ||
      "system".includes(normalizedQuery);

    return systemMatches
      ? [{ kind: "system", key: "system" }, ...languages]
      : languages;
  }, [query, t]);

  const selectLanguage = (next: LanguagePreference) => {
    if (next !== preference) setLanguagePreference(next);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Languages color={theme.colors.textMuted} size={30} />
            <Text style={styles.emptyTitle}>{t("language.noResultsTitle")}</Text>
            <Text style={styles.emptyDescription}>
              {t("language.noResultsDescription")}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>
              {t("language.heading")}
            </Text>
            <Text style={styles.description}>{t("language.description")}</Text>
            <View style={styles.searchContainer}>
              <Search color={theme.colors.textMuted} size={20} />
              <TextInput
                accessibilityLabel={t("language.searchAccessibility")}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                onChangeText={setQuery}
                placeholder={t("language.searchPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
            </View>
          </View>
        }
        ListFooterComponent={
          data.length > 0 ? (
            <Text style={styles.footerText}>
              {t("language.moreComingSoon")}
            </Text>
          ) : null
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
            paddingHorizontal: horizontalPadding,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        data={data}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSystem = item.kind === "system";
          const selected = isSystem
            ? preference === "system"
            : preference === item.language.code;
          const label = isSystem
            ? t("language.systemDefault")
            : item.language.englishName;
          const description = isSystem
            ? t("language.systemDefaultDescription", {
                language: activeLanguage.nativeName,
              })
            : item.language.nativeName === item.language.englishName
              ? item.language.code
              : item.language.nativeName;

          return (
            <Pressable
              accessibilityLabel={
                selected
                  ? t("language.selectedAccessibility", { language: label })
                  : t("language.optionAccessibility", { language: label })
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() =>
                selectLanguage(isSystem ? "system" : item.language.code)
              }
              style={({ pressed }) => [
                styles.languageRow,
                selected && styles.languageRowSelected,
                pressed && styles.languageRowPressed,
              ]}
            >
              <View style={styles.languageIcon}>
                {isSystem ? (
                  <Smartphone color={theme.colors.primary} size={20} />
                ) : (
                  <Text style={styles.languageCode}>
                    {item.language.code.toLocaleUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.languageCopy}>
                <Text style={styles.languageName}>{label}</Text>
                <Text style={styles.nativeName}>{description}</Text>
              </View>
              <View
                style={[
                  styles.selectionIndicator,
                  selected && styles.selectionIndicatorSelected,
                ]}
              >
                {selected ? (
                  <Check
                    color={theme.colors.onPrimary}
                    size={15}
                    strokeWidth={3}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    content: {
      alignSelf: "center",
      flexGrow: 1,
      maxWidth: LAYOUT_DIMENSIONS.maxContentWidth,
      paddingTop: theme.spacing.lg,
      width: "100%",
    },
    header: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
    },
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    searchContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      minHeight: 50,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingVertical: theme.spacing.sm,
    },
    languageRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 76,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    languageRowSelected: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    languageRowPressed: {
      opacity: 0.76,
    },
    languageIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: theme.borderRadius.medium,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    languageCode: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    languageCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    languageName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    nativeName: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    selectionIndicator: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      height: 26,
      justifyContent: "center",
      width: 26,
    },
    selectionIndicatorSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    separator: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: theme.spacing.lg + 42 + theme.spacing.md,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      paddingTop: theme.spacing.xl,
      textAlign: "center",
    },
    emptyState: {
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxxl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
    },
  });
}
