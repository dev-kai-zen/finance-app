import { useEffect, useMemo } from "react";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { useLocalization } from "@/infrastructure/localization";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useTransactions } from "@/modules/transactions";
import { useBudgets } from "@/modules/budgets";
import { useGoals } from "@/modules/goals";
import { useNotes } from "@/modules/notes";
import { useScheduledTransactions } from "@/modules/scheduled-transactions";
import { useLabels } from "@/modules/labels";
import { formatCurrency } from "@/utils/currency";
import {
  SEARCH_CATALOG,
  SUGGESTED_SHORTCUT_IDS,
} from "../constants/search-catalog";
import type {
  SearchResultItem,
  SearchResultSection,
} from "../types/search.types";

export function useGeneralSearch(query: string, isOpen: boolean = false) {
  const { t } = useLocalization();
  const accountsHook = useAccounts({ includeCreditCardMonitoring: false });
  const categoriesHook = useCategories();
  const transactionsHook = useTransactions();
  const budgetsHook = useBudgets();
  const goalsHook = useGoals();
  const notesHook = useNotes();
  const schedulesHook = useScheduledTransactions();
  const labelsHook = useLabels();

  const { accounts, pockets, refresh: refreshAccounts } = accountsHook;
  const { categories, refresh: refreshCategories } = categoriesHook;
  const { transactions, refresh: refreshTransactions } = transactionsHook;
  const { budgets, refresh: refreshBudgets } = budgetsHook;
  const { goals, refresh: refreshGoals } = goalsHook;
  const { notes, refresh: refreshNotes } = notesHook;
  const { schedules, refresh: refreshSchedules } = schedulesHook;
  const { labels, refresh: refreshLabels } = labelsHook;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    scheduleAfterPaint(() => {
      void refreshAccounts?.();
      void refreshCategories?.();
      void refreshTransactions?.();
      void refreshBudgets?.();
      void refreshGoals?.();
      void refreshNotes?.();
      void refreshSchedules?.();
      void refreshLabels?.();
    });
  }, [
    isOpen,
    refreshAccounts,
    refreshCategories,
    refreshTransactions,
    refreshBudgets,
    refreshGoals,
    refreshNotes,
    refreshSchedules,
    refreshLabels,
  ]);

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

    const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
    const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

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
            route: `/accounts?accountId=${acc.id}`,
            badge: t("search.sectionAccounts"),
          });
        }
      }
    }

    // 4. Filter user pockets
    const matchedPockets: SearchResultItem[] = [];
    if (pockets && pockets.length > 0) {
      for (const p of pockets) {
        if (p.name.toLowerCase().includes(trimmed)) {
          const parent = accountMap.get(p.accountId);
          matchedPockets.push({
            id: `user_pocket_${p.id}`,
            category: "pocket",
            title: p.name,
            description: parent
              ? `${parent.name} · ${t("search.sectionPockets")}`
              : t("search.sectionPockets"),
            iconName: "wallet",
            iconColor: "#06B6D4",
            route: `/accounts?accountId=${p.accountId}&pocketId=${p.id}`,
            badge: t("search.sectionPockets"),
          });
        }
      }
    }

    // 5. Filter user categories
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
            route: `/categories?type=${cat.type}&categoryId=${cat.id}`,
            badge: t("search.sectionCategories"),
          });
        }
      }
    }

    // 6. Filter transactions (top 8 matches)
    const matchedTransactions: SearchResultItem[] = [];
    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        const nameMatch = tx.name?.toLowerCase().includes(trimmed);
        const noteMatch = tx.note?.toLowerCase().includes(trimmed);
        const catMatch = tx.categoryName?.toLowerCase().includes(trimmed);

        if (nameMatch || noteMatch || catMatch) {
          const dateStr = new Date(tx.occurredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          const amountStr = formatCurrency(tx.amountMinorUnits, tx.currencyCode);
          const searchParam = encodeURIComponent(tx.name || tx.categoryName || tx.note || trimmed);
          matchedTransactions.push({
            id: `user_tx_${tx.id}`,
            category: "transaction",
            title: tx.name || tx.categoryName || tx.note || "Transaction",
            description: `${dateStr} · ${amountStr}${tx.note ? ` · ${tx.note}` : ""}`,
            iconName: "receipt",
            iconColor: tx.type === "expense" ? "#EF4444" : "#10B981",
            route: `/transactions?search=${searchParam}&inspectId=${tx.id}`,
            badge: t("search.sectionTransactions"),
          });
          if (matchedTransactions.length >= 8) break;
        }
      }
    }

    // 7. Filter budgets
    const matchedBudgets: SearchResultItem[] = [];
    if (budgets && budgets.length > 0) {
      for (const b of budgets) {
        const cat = categoryMap.get(b.categoryId);
        const catName = cat?.name ?? "";
        if (catName.toLowerCase().includes(trimmed)) {
          matchedBudgets.push({
            id: `user_budget_${b.id}`,
            category: "budget",
            title: catName,
            description: `${t("search.sectionBudgets")} · ${formatCurrency(b.amountMinorUnits, b.currencyCode)}`,
            iconName: "pie-chart",
            iconColor: "#EC4899",
            route: `/budgets?categoryId=${b.categoryId}`,
            badge: t("search.sectionBudgets"),
          });
        }
      }
    }

    // 8. Filter savings goals
    const matchedGoals: SearchResultItem[] = [];
    if (goals && goals.length > 0) {
      for (const g of goals) {
        if (g.name.toLowerCase().includes(trimmed)) {
          matchedGoals.push({
            id: `user_goal_${g.id}`,
            category: "goal",
            title: g.name,
            description: `${t("search.sectionGoals")} · ${formatCurrency(g.targetAmountMinorUnits, g.currencyCode)}`,
            iconName: "target",
            iconColor: "#8B5CF6",
            route: `/goals?goalId=${g.id}`,
            badge: t("search.sectionGoals"),
          });
        }
      }
    }

    // 9. Filter notes
    const matchedNotes: SearchResultItem[] = [];
    if (notes && notes.length > 0) {
      for (const n of notes) {
        const titleMatch = n.title?.toLowerCase().includes(trimmed);
        const contentMatch = n.content?.toLowerCase().includes(trimmed);
        if (titleMatch || contentMatch) {
          matchedNotes.push({
            id: `user_note_${n.id}`,
            category: "note",
            title: n.title || "Note",
            description: n.content ? n.content.slice(0, 40) : t("search.sectionNotes"),
            iconName: "file-text",
            iconColor: n.color || "#F59E0B",
            route: `/notes?noteId=${n.id}`,
            badge: t("search.sectionNotes"),
          });
        }
      }
    }

    // 10. Filter scheduled transactions
    const matchedSchedules: SearchResultItem[] = [];
    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        const nameMatch = s.name?.toLowerCase().includes(trimmed);
        const noteMatch = s.note?.toLowerCase().includes(trimmed);
        if (nameMatch || noteMatch) {
          const acc = accountMap.get(s.accountId);
          const curr = acc?.currencyCode ?? "PHP";
          matchedSchedules.push({
            id: `user_schedule_${s.id}`,
            category: "schedule",
            title: s.name || s.note || "Scheduled Transaction",
            description: `${s.frequency} · ${formatCurrency(s.amountMinorUnits, curr)}`,
            iconName: "calendar",
            iconColor: "#3B82F6",
            route: `/transactions/scheduled?scheduleId=${s.id}`,
            badge: t("search.sectionSchedules"),
          });
        }
      }
    }

    // 11. Filter labels
    const matchedLabels: SearchResultItem[] = [];
    if (labels && labels.length > 0) {
      for (const l of labels) {
        if (l.name.toLowerCase().includes(trimmed)) {
          matchedLabels.push({
            id: `user_label_${l.id}`,
            category: "label",
            title: l.name,
            description: t("search.sectionLabels"),
            iconName: "tags",
            iconColor: l.color || "#6366F1",
            route: `/transactions?labelId=${l.id}`,
            badge: t("search.sectionLabels"),
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
    if (matchedPockets.length > 0) {
      resultSections.push({
        category: "pocket",
        title: t("search.sectionPockets"),
        data: matchedPockets,
      });
    }
    if (matchedCategories.length > 0) {
      resultSections.push({
        category: "category",
        title: t("search.sectionCategories"),
        data: matchedCategories,
      });
    }
    if (matchedTransactions.length > 0) {
      resultSections.push({
        category: "transaction",
        title: t("search.sectionTransactions"),
        data: matchedTransactions,
      });
    }
    if (matchedBudgets.length > 0) {
      resultSections.push({
        category: "budget",
        title: t("search.sectionBudgets"),
        data: matchedBudgets,
      });
    }
    if (matchedGoals.length > 0) {
      resultSections.push({
        category: "goal",
        title: t("search.sectionGoals"),
        data: matchedGoals,
      });
    }
    if (matchedNotes.length > 0) {
      resultSections.push({
        category: "note",
        title: t("search.sectionNotes"),
        data: matchedNotes,
      });
    }
    if (matchedSchedules.length > 0) {
      resultSections.push({
        category: "schedule",
        title: t("search.sectionSchedules"),
        data: matchedSchedules,
      });
    }
    if (matchedLabels.length > 0) {
      resultSections.push({
        category: "label",
        title: t("search.sectionLabels"),
        data: matchedLabels,
      });
    }

    return resultSections;
  }, [
    query,
    t,
    accounts,
    pockets,
    categories,
    transactions,
    budgets,
    goals,
    notes,
    schedules,
    labels,
  ]);

  const totalResults = useMemo(() => {
    return sections.reduce((acc, sec) => acc + sec.data.length, 0);
  }, [sections]);

  return {
    sections,
    totalResults,
    hasQuery: query.trim().length > 0,
  };
}
