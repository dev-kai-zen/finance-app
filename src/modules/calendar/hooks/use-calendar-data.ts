import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import {
  getBalanceSheet,
  useAccounts,
  type BalanceSheetData,
} from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import {
  getExchangeRateMap,
  useCurrencyPreferences,
} from "@/modules/currencies";
import {
  getCalendarScheduleOccurrences,
  useScheduledTransactions,
  type CalendarScheduleOccurrence,
} from "@/modules/scheduled-transactions";
import {
  getCalendarMonthTransactions,
  type TransactionListItem,
} from "@/modules/transactions";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import type {
  CalendarDayCellData,
  CalendarMonth,
  CalendarSummaryMetrics,
  CalendarTab,
} from "../types/calendar.types";
import {
  buildCalendarMonthGrid,
  formatDateKey,
  getCalendarGridDateRange,
  getDateKeyFromDate,
  getTodayParts,
  parseDateKey,
} from "../utils/calendar-dates";

export interface CategoryExpenseBreakdown {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  totalMinorUnits: number;
  percentage: number;
}

export function useCalendarData() {
  const todayParts = useMemo(() => getTodayParts(), []);
  const { preferences } = useCurrencyPreferences();

  const [activeMonth, setActiveMonth] = useState<CalendarMonth>({
    year: todayParts.year,
    month: todayParts.month,
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalendarTab>("transactions");
  const [isTabLoading, setIsTabLoading] = useState(false);

  const currentMonthKey = `${activeMonth.year}-${String(activeMonth.month + 1).padStart(2, "0")}`;
  const monthCacheRef = useRef<Map<string, TransactionListItem[]>>(new Map());

  // Initialize with initial month data synchronously
  const [transactions, setTransactions] = useState<TransactionListItem[]>(() => {
    try {
      const range = getCalendarGridDateRange(todayParts.year, todayParts.month);
      const initial = getCalendarMonthTransactions(range.startDate, range.endDate);
      const key = `${todayParts.year}-${String(todayParts.month + 1).padStart(2, "0")}`;
      monthCacheRef.current.set(key, initial);
      return initial;
    } catch {
      return [];
    }
  });

  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const loadedMonthKeyRef = useRef(currentMonthKey);

  // Whenever the active month key does not match the loaded month key in state,
  // indicate loading immediately on render to eliminate any stale data / padding transaction flicker
  const isMonthPending = loadedMonthKeyRef.current !== currentMonthKey;

  useEffect(() => {
    const key = `${activeMonth.year}-${String(activeMonth.month + 1).padStart(2, "0")}`;

    if (loadedMonthKeyRef.current === key) {
      return;
    }

    setIsMonthLoading(true);
    let cancelled = false;

    scheduleAfterPaint(() => {
      if (cancelled) return;

      if (monthCacheRef.current.has(key)) {
        const cached = monthCacheRef.current.get(key)!;
        loadedMonthKeyRef.current = key;
        setTransactions(cached);
        setIsMonthLoading(false);
        return;
      }

      try {
        const range = getCalendarGridDateRange(activeMonth.year, activeMonth.month);
        const fresh = getCalendarMonthTransactions(range.startDate, range.endDate);
        if (cancelled) return;
        monthCacheRef.current.set(key, fresh);
        loadedMonthKeyRef.current = key;
        setTransactions(fresh);
      } catch (err) {
        console.error("[useCalendarData] Failed to load month transactions:", err);
      } finally {
        setIsMonthLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeMonth.year, activeMonth.month]);

  // Reload month helper for mutations and manual refresh
  const reloadMonthTransactions = useCallback((force = false) => {
    const key = `${activeMonth.year}-${String(activeMonth.month + 1).padStart(2, "0")}`;
    if (!force && monthCacheRef.current.has(key)) {
      loadedMonthKeyRef.current = key;
      setTransactions(monthCacheRef.current.get(key)!);
      return;
    }
    try {
      const range = getCalendarGridDateRange(activeMonth.year, activeMonth.month);
      const fresh = getCalendarMonthTransactions(range.startDate, range.endDate);
      monthCacheRef.current.set(key, fresh);
      loadedMonthKeyRef.current = key;
      setTransactions(fresh);
    } catch (err) {
      console.error("[useCalendarData] Failed to reload month transactions:", err);
    }
  }, [activeMonth.year, activeMonth.month]);

  // Subscribe to transaction mutations across the app
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "FINANCE_APP_TRANSACTION_MUTATED",
      () => {
        monthCacheRef.current.clear();
        reloadMonthTransactions(true);
      },
    );
    return () => sub.remove();
  }, [reloadMonthTransactions]);

  const { categories, loading: categoriesLoading } = useCategories();
  const {
    accounts,
    pockets,
    loading: accountsLoading,
    refresh: refreshAccounts,
  } = useAccounts();
  const {
    schedules,
    occurrences,
    loading: schedulesLoading,
    refresh: refreshSchedules,
    postOccurrence: rawPostOccurrence,
    skipOccurrence: rawSkipOccurrence,
  } = useScheduledTransactions();

  const postOccurrence = useCallback(
    (id: string): boolean => {
      const ok = rawPostOccurrence(id);
      if (ok) {
        refreshAccounts();
      }
      return ok;
    },
    [rawPostOccurrence, refreshAccounts],
  );

  const skipOccurrence = useCallback(
    (id: string): boolean => rawSkipOccurrence(id),
    [rawSkipOccurrence],
  );

  const loading =
    categoriesLoading ||
    accountsLoading ||
    schedulesLoading ||
    isMonthPending ||
    isMonthLoading;

  const exchangeRates = useMemo(() => {
    if (loading && accounts.length === 0) {
      return new Map<string, number>();
    }
    try {
      return getExchangeRateMap(DEFAULT_BASE_CURRENCY);
    } catch {
      return new Map<string, number>();
    }
  }, [accounts, loading]);
  const accountCurrencyMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.currencyCode])),
    [accounts],
  );
  const convertToDefaultCurrency = useCallback(
    (minorUnits: number, currencyCode: string) =>
      convertCurrencyMinorUnits(
        minorUnits,
        currencyCode,
        preferences.defaultCurrency,
        exchangeRates,
        DEFAULT_BASE_CURRENCY,
      ),
    [exchangeRates, preferences.defaultCurrency],
  );

  const refreshAll = useCallback(() => {
    monthCacheRef.current.clear();
    reloadMonthTransactions(true);
    refreshSchedules();
    refreshAccounts();
  }, [reloadMonthTransactions, refreshSchedules, refreshAccounts]);

  // Compute month start and end dates
  const monthDateRange = useMemo(() => {
    const startDate = new Date(activeMonth.year, activeMonth.month, 1, 0, 0, 0, 0);
    const endDate = new Date(
      activeMonth.year,
      activeMonth.month + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { startDate, endDate };
  }, [activeMonth]);

  // Compute schedule occurrences for this month
  const monthScheduleOccurrences = useMemo(() => {
    if (loading && transactions.length === 0) {
      return [];
    }
    try {
      return getCalendarScheduleOccurrences({
        startDate: monthDateRange.startDate,
        endDate: monthDateRange.endDate,
      });
    } catch {
      return [];
    }
  }, [loading, monthDateRange, transactions, schedules, occurrences]);

  // Group transactions by dateKey (YYYY-MM-DD)
  const transactionsByDateKey = useMemo(() => {
    const map = new Map<string, TransactionListItem[]>();
    for (const tx of transactions) {
      if (!tx.occurredAt) continue;
      const key = getDateKeyFromDate(tx.occurredAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return map;
  }, [transactions]);

  // Group schedules by dateKey (YYYY-MM-DD)
  const schedulesByDateKey = useMemo(() => {
    const map = new Map<string, CalendarScheduleOccurrence[]>();
    for (const occ of monthScheduleOccurrences) {
      const key = getDateKeyFromDate(occ.effectiveDueAt);
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return map;
  }, [monthScheduleOccurrences]);

  // Transactions belonging to the active month
  const activeMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.occurredAt) return false;
      const d = new Date(tx.occurredAt);
      return (
        d.getFullYear() === activeMonth.year &&
        d.getMonth() === activeMonth.month
      );
    });
  }, [transactions, activeMonth]);

  // Scoped transactions (selectedDay OR whole activeMonth)
  const scopedTransactions = useMemo(() => {
    if (selectedDay) {
      return transactionsByDateKey.get(selectedDay) ?? [];
    }
    return activeMonthTransactions;
  }, [selectedDay, transactionsByDateKey, activeMonthTransactions]);

  // Scoped schedule occurrences (selectedDay OR whole activeMonth)
  const scopedSchedules = useMemo(() => {
    if (selectedDay) {
      return schedulesByDateKey.get(selectedDay) ?? [];
    }
    return monthScheduleOccurrences;
  }, [selectedDay, schedulesByDateKey, monthScheduleOccurrences]);

  // Calendar Grid Cells with complete activity data
  const gridCells = useMemo<CalendarDayCellData[]>(() => {
    const rawCells = buildCalendarMonthGrid(activeMonth.year, activeMonth.month);

    return rawCells.map((cell) => {
      const dayTxs = transactionsByDateKey.get(cell.dateKey) ?? [];
      const daySchedules = schedulesByDateKey.get(cell.dateKey) ?? [];

      let totalIncomeMinorUnits = 0;
      let totalExpenseMinorUnits = 0;
      let incomeCount = 0;
      let expenseCount = 0;

      for (const tx of dayTxs) {
        if (tx.type === "transfer") continue;
        const convertedAmount = convertToDefaultCurrency(
          tx.amountMinorUnits,
          tx.accountCurrency,
        );
        if (tx.amountMinorUnits > 0 || tx.type === "income") {
          totalIncomeMinorUnits += convertedAmount;
          incomeCount++;
        } else if (tx.amountMinorUnits < 0 || tx.type === "expense") {
          totalExpenseMinorUnits += convertedAmount;
          expenseCount++;
        }
      }

      const netMinorUnits = totalIncomeMinorUnits + totalExpenseMinorUnits;
      const hasDueSchedule = daySchedules.some((s) => s.status === "due");
      const hasUpcomingSchedule = daySchedules.some(
        (s) => s.status === "upcoming",
      );

      return {
        dateKey: cell.dateKey,
        dayNumber: cell.dayNumber,
        isCurrentMonth: cell.isCurrentMonth,
        isToday: cell.isToday,
        isSelected: false,
        date: cell.date,
        transactionCount: dayTxs.length,
        hasIncome: incomeCount > 0,
        hasExpense: expenseCount > 0,
        totalIncomeMinorUnits,
        totalExpenseMinorUnits,
        netMinorUnits,
        scheduleCount: daySchedules.length,
        hasDueSchedule,
        hasUpcomingSchedule,
      };
    });
  }, [
    activeMonth,
    transactionsByDateKey,
    schedulesByDateKey,
    convertToDefaultCurrency,
  ]);

  // Compute live Balance Sheet data once for both summaryMetrics and the balance sheet tab
  const balanceSheetCutoffDate = useMemo(() => {
    if (selectedDay) {
      const parts = parseDateKey(selectedDay);
      return new Date(parts.year, parts.month, parts.day, 23, 59, 59, 999);
    }
    return new Date(
      activeMonth.year,
      activeMonth.month + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }, [selectedDay, activeMonth]);

  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData>(() => ({
    cutoffDate: new Date(),
    assets: { totalMinorUnits: 0, accountTypes: [] },
    liabilities: { totalMinorUnits: 0, accountTypes: [] },
    netWorthMinorUnits: 0,
  }));

  useEffect(() => {
    if (activeTab !== "balance_sheet") {
      return;
    }

    let cancelled = false;
    scheduleAfterPaint(() => {
      if (cancelled) return;
      try {
        const fresh = getBalanceSheet(balanceSheetCutoffDate);
        if (!cancelled) {
          setBalanceSheetData(fresh);
        }
      } catch (err) {
        console.error("[useCalendarData] Failed to compute balance sheet:", err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    balanceSheetCutoffDate,
    transactions,
    accounts,
    pockets,
    preferences.defaultCurrency,
  ]);

  // Projected Month-End Net (only recomputes when month transactions or schedules change, NOT on daily date taps)
  const projectedMonthEndNet = useMemo(() => {
    let monthPendingInflows = 0;
    let monthPendingOutflows = 0;

    for (const occ of monthScheduleOccurrences) {
      if (occ.status === "due" || occ.status === "upcoming") {
        const convertedAmount = convertToDefaultCurrency(
          occ.amountMinorUnits,
          accountCurrencyMap.get(occ.accountId) ?? DEFAULT_BASE_CURRENCY,
        );
        if (occ.transactionType === "income") {
          monthPendingInflows += convertedAmount;
        } else if (occ.transactionType === "expense") {
          monthPendingOutflows += convertedAmount;
        }
      }
    }

    let monthActualInflow = 0;
    let monthActualOutflow = 0;
    for (const tx of activeMonthTransactions) {
      if (tx.type === "transfer") continue;
      const convertedAmount = convertToDefaultCurrency(
        tx.amountMinorUnits,
        tx.accountCurrency,
      );
      if (tx.amountMinorUnits > 0 || tx.type === "income") monthActualInflow += convertedAmount;
      if (tx.amountMinorUnits < 0 || tx.type === "expense") monthActualOutflow += convertedAmount;
    }
    const monthActualNet = monthActualInflow + monthActualOutflow;
    return monthActualNet + monthPendingInflows - monthPendingOutflows;
  }, [
    monthScheduleOccurrences,
    activeMonthTransactions,
    accountCurrencyMap,
    convertToDefaultCurrency,
  ]);

  // Summary Metrics for the current scope (selectedDay OR activeMonth)
  const summaryMetrics = useMemo<CalendarSummaryMetrics>(() => {
    let inflow = 0;
    let outflow = 0;

    for (const tx of scopedTransactions) {
      if (tx.type === "transfer") continue;
      const convertedAmount = convertToDefaultCurrency(
        tx.amountMinorUnits,
        tx.accountCurrency,
      );
      if (tx.amountMinorUnits > 0 || tx.type === "income") {
        inflow += convertedAmount;
      } else if (tx.amountMinorUnits < 0 || tx.type === "expense") {
        outflow += convertedAmount;
      }
    }

    const net = inflow + outflow;
    const txCount = scopedTransactions.length;

    let schedulesTotalDue = 0;
    let pendingCount = 0;
    let postedCount = 0;

    for (const occ of scopedSchedules) {
      if (occ.status === "due" || occ.status === "upcoming") {
        schedulesTotalDue += convertToDefaultCurrency(
          occ.amountMinorUnits,
          accountCurrencyMap.get(occ.accountId) ?? DEFAULT_BASE_CURRENCY,
        );
        pendingCount++;
      } else if (occ.status === "posted") {
        postedCount++;
      }
    }

    const savingsRate =
      inflow > 0 ? Math.max(0, Math.round(((inflow + outflow) / inflow) * 100)) : 0;

    return {
      totalInflowMinorUnits: inflow,
      totalOutflowMinorUnits: outflow,
      netCashflowMinorUnits: net,
      transactionCount: txCount,
      schedulesTotalDueMinorUnits: schedulesTotalDue,
      schedulesPendingCount: pendingCount,
      schedulesPostedCount: postedCount,
      savingsRatePercent: savingsRate,
      projectedMonthEndNetMinorUnits: projectedMonthEndNet,
      balanceSheetAssetsMinorUnits: balanceSheetData.assets.totalMinorUnits,
      balanceSheetLiabilitiesMinorUnits:
        balanceSheetData.liabilities.totalMinorUnits,
      balanceSheetNetWorthMinorUnits: balanceSheetData.netWorthMinorUnits,
    };
  }, [
    scopedTransactions,
    scopedSchedules,
    projectedMonthEndNet,
    balanceSheetData,
    accountCurrencyMap,
    convertToDefaultCurrency,
  ]);

  // Top spending categories breakdown for current scope
  const categoryBreakdown = useMemo<CategoryExpenseBreakdown[]>(() => {
    if (activeTab !== "net") {
      return [];
    }

    const categoryTotals = new Map<string, number>();
    let totalExpenseInScope = 0;

    for (const tx of scopedTransactions) {
      if (tx.type === "expense" && tx.categoryId) {
        const amt = Math.abs(
          convertToDefaultCurrency(tx.amountMinorUnits, tx.accountCurrency),
        );
        const current = categoryTotals.get(tx.categoryId) ?? 0;
        categoryTotals.set(tx.categoryId, current + amt);
        totalExpenseInScope += amt;
      }
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const result: CategoryExpenseBreakdown[] = [];

    for (const [catId, total] of categoryTotals.entries()) {
      const cat = categoryMap.get(catId);
      const percentage =
        totalExpenseInScope > 0
          ? Math.round((total / totalExpenseInScope) * 100)
          : 0;

      result.push({
        id: catId,
        name: cat?.name ?? "Other",
        icon: cat?.icon ?? null,
        color: cat?.color ?? null,
        totalMinorUnits: total,
        percentage,
      });
    }

    result.sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);
    return result;
  }, [activeTab, scopedTransactions, categories, convertToDefaultCurrency]);

  // Navigation handlers
  const goToPrevMonth = useCallback(() => {
    setSelectedDay(null);
    setActiveMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDay(null);
    setActiveMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  const goToToday = useCallback(() => {
    const parts = getTodayParts();
    setActiveMonth({ year: parts.year, month: parts.month });
    setSelectedDay(null);
  }, []);

  const toggleSelectDay = useCallback((dateKey: string) => {
    const cellParts = parseDateKey(dateKey);
    // If the selected cell belongs to another month, switch to that month
    setActiveMonth((prev) => {
      if (prev.year !== cellParts.year || prev.month !== cellParts.month) {
        return { year: cellParts.year, month: cellParts.month };
      }
      return prev;
    });

    setSelectedDay((prev) => (prev === dateKey ? null : dateKey));
    setIsTabLoading(true);
    scheduleAfterPaint(() => {
      setIsTabLoading(false);
    });
  }, []);

  const clearDaySelection = useCallback(() => {
    setSelectedDay(null);
    setIsTabLoading(true);
    scheduleAfterPaint(() => {
      setIsTabLoading(false);
    });
  }, []);

  const selectTab = useCallback((tab: CalendarTab) => {
    setActiveTab(tab);
    setIsTabLoading(true);
    scheduleAfterPaint(() => {
      setIsTabLoading(false);
    });
  }, []);

  return {
    activeMonth,
    selectedDay,
    activeTab,
    loading,
    isTabLoading,
    gridCells,
    scopedTransactions,
    scopedSchedules,
    summaryMetrics,
    categoryBreakdown,
    balanceSheetData,
    accounts,
    categories,
    pockets,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    toggleSelectDay,
    clearDaySelection,
    setActiveTab: selectTab,
    refreshAll,
    postOccurrence,
    skipOccurrence,
  };
}
