import { useMemo } from "react";
import { useLocalization } from "@/infrastructure/localization";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import {
  SEARCH_CATALOG,
  SUGGESTED_SHORTCUT_IDS,
} from "../constants/search-catalog";
import type {
  SearchResultItem,
  SearchResultSection,
} from "../types/search.types";

export function useGeneralSearch(query: string) {
  const { t } = useLocalization();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const sections = useMemo<SearchResultSection[]>(() => {
    const trimmed = query.trim().toLowerCase();

    // 1. If query is empty, show curated suggestions
    if (!trimmed) {
      const suggestedItems: SearchResultItem[] = SUGGESTED_SHORTCUT_IDS.map(
        (id) => {
          const item = SEARCH_CATALOG.find((catItem) => catItem.id === id);
          if (!item) return null;
          return {
            id: item.id,
            category: item.category,
            title: t(item.titleKey),
            description: t(item.descriptionKey),
            iconName: item.iconName,
            iconColor: item.iconColor,
            route: item.route,
            targetId: item.targetId,
            openModal: item.openModal,
            badge:
              item.category === "setting"
                ? t("search.guidesToSetting")
                : item.category === "action"
                  ? t("search.itemActionBadge")
                  : undefined,
            isSuggested: true,
          };
        },
      ).filter(Boolean) as SearchResultItem[];

      if (suggestedItems.length === 0) return [];
      return [
        {
          category: "action",
          title: t("search.suggestedTitle"),
          data: suggestedItems,
        },
      ];
    }

    // 2. Filter catalog items
    const matchedActions: SearchResultItem[] = [];
    const matchedScreens: SearchResultItem[] = [];
    const matchedSettings: SearchResultItem[] = [];

    for (const item of SEARCH_CATALOG) {
      const title = t(item.titleKey);
      const description = t(item.descriptionKey);
      const titleMatch = title.toLowerCase().includes(trimmed);
      const descMatch = description.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some(
        (k) => k.includes(trimmed) || trimmed.includes(k),
      );

      if (titleMatch || descMatch || keywordMatch) {
        const resultItem: SearchResultItem = {
          id: item.id,
          category: item.category,
          title,
          description,
          iconName: item.iconName,
          iconColor: item.iconColor,
          route: item.route,
          targetId: item.targetId,
          openModal: item.openModal,
          badge:
            item.category === "setting"
              ? t("search.guidesToSetting")
              : item.category === "action"
                ? t("search.itemActionBadge")
                : t("search.itemScreenBadge"),
        };

        if (item.category === "action") matchedActions.push(resultItem);
        else if (item.category === "screen") matchedScreens.push(resultItem);
        else if (item.category === "setting") matchedSettings.push(resultItem);
      }
    }

    // 3. Filter user accounts
    const matchedAccounts: SearchResultItem[] = [];
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        const typeName = acc.accountType?.name ?? "";
        if (
          acc.name.toLowerCase().includes(trimmed) ||
          typeName.toLowerCase().includes(trimmed)
        ) {
          matchedAccounts.push({
            id: `user_account_${acc.id}`,
            category: "account",
            title: acc.name,
            description: typeName
              ? `${typeName} · ${acc.currencyCode}`
              : acc.currencyCode,
            iconName: "wallet",
            iconColor: "#10B981",
            route: "/accounts",
            badge: t("search.sectionAccounts"),
          });
        }
      }
    }

    // 4. Filter user categories
    const matchedCategories: SearchResultItem[] = [];
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (cat.name.toLowerCase().includes(trimmed)) {
          matchedCategories.push({
            id: `user_category_${cat.id}`,
            category: "category",
            title: cat.name,
            description:
              cat.type === "expense"
                ? t("search.screenCategoriesExpense")
                : t("search.screenCategoriesIncome"),
            iconName: "tags",
            iconColor: cat.type === "expense" ? "#EF4444" : "#10B981",
            route: `/categories?type=${cat.type}`,
            badge: t("search.sectionCategories"),
          });
        }
      }
    }

    const resultSections: SearchResultSection[] = [];
    if (matchedActions.length > 0) {
      resultSections.push({
        category: "action",
        title: t("search.sectionActions"),
        data: matchedActions,
      });
    }
    if (matchedScreens.length > 0) {
      resultSections.push({
        category: "screen",
        title: t("search.sectionScreens"),
        data: matchedScreens,
      });
    }
    if (matchedSettings.length > 0) {
      resultSections.push({
        category: "setting",
        title: t("search.sectionSettings"),
        data: matchedSettings,
      });
    }
    if (matchedAccounts.length > 0) {
      resultSections.push({
        category: "account",
        title: t("search.sectionAccounts"),
        data: matchedAccounts,
      });
    }
    if (matchedCategories.length > 0) {
      resultSections.push({
        category: "category",
        title: t("search.sectionCategories"),
        data: matchedCategories,
      });
    }

    return resultSections;
  }, [query, t, accounts, categories]);

  const totalResults = useMemo(() => {
    return sections.reduce((acc, sec) => acc + sec.data.length, 0);
  }, [sections]);

  return {
    sections,
    totalResults,
    hasQuery: query.trim().length > 0,
  };
}
