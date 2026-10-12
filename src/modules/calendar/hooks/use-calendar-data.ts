import { useCallback, useMemo, useState } from "react";
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
import { useTransactions, type TransactionListItem } from "@/modules/transactions";
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

  const { transactions, refresh: refreshTransactions } = useTransactions();
  const { categories } = useCategories();
  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const {
    refresh: refreshSchedules,
    postOccurrence,
    skipOccurrence,
  } = useScheduledTransactions();

  const exchangeRates = useMemo(() => {
    try {
      return getExchangeRateMap(DEFAULT_BASE_CURRENCY);
    } catch {
      return new Map<string, number>();
    }
  }, [accounts]);
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
    refreshTransactions();
    refreshSchedules();
    refreshAccounts();
  }, [refreshTransactions, refreshSchedules, refreshAccounts]);

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
    try {
      return getCalendarScheduleOccurrences({
        startDate: monthDateRange.startDate,
        endDate: monthDateRange.endDate,
      });
    } catch {
      return [];
    }
  }, [monthDateRange, transactions]);

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
        isSelected: cell.dateKey === selectedDay,
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
    selectedDay,
    transactionsByDateKey,
    schedulesByDateKey,
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

    // Projected Month-End Net:
    // Takes the month's total actual net, and adds pending scheduled inflows and subtracts pending scheduled outflows
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
    const projectedMonthEndNet =
      monthActualNet + monthPendingInflows - monthPendingOutflows;

    // Compute cutoff date for Balance Sheet
    // If selectedDay: end of that selected day (23:59:59.999)
    // If no selectedDay: end of activeMonth (last day of month 23:59:59.999)
    const cutoffDate = selectedDay
      ? (() => {
          const parts = parseDateKey(selectedDay);
          return new Date(parts.year, parts.month, parts.day, 23, 59, 59, 999);
        })()
      : new Date(
          activeMonth.year,
          activeMonth.month + 1,
          0,
          23,
          59,
          59,
          999,
        );

    let bsAssets = 0;
    let bsLiabilities = 0;
    let bsNetWorth = 0;

    try {
      const bs = getBalanceSheet(cutoffDate);
      bsAssets = bs.assets.totalMinorUnits;
      bsLiabilities = bs.liabilities.totalMinorUnits;
      bsNetWorth = bs.netWorthMinorUnits;
    } catch {
      // Graceful fallback
    }

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
      balanceSheetAssetsMinorUnits: bsAssets,
      balanceSheetLiabilitiesMinorUnits: bsLiabilities,
      balanceSheetNetWorthMinorUnits: bsNetWorth,
    };
  }, [
    scopedTransactions,
    scopedSchedules,
    monthScheduleOccurrences,
    activeMonthTransactions,
    selectedDay,
    activeMonth,
    accounts,
    pockets,
    accountCurrencyMap,
    convertToDefaultCurrency,
  ]);

  // Compute live Balance Sheet data for the balance sheet tab
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

  const balanceSheetData = useMemo<BalanceSheetData>(() => {
    try {
      return getBalanceSheet(balanceSheetCutoffDate);
    } catch {
      return {
        cutoffDate: balanceSheetCutoffDate,
        assets: { totalMinorUnits: 0, accountTypes: [] },
        liabilities: { totalMinorUnits: 0, accountTypes: [] },
        netWorthMinorUnits: 0,
      };
    }
  }, [
    balanceSheetCutoffDate,
    transactions,
    accounts,
    pockets,
    preferences.defaultCurrency,
  ]);

  // Top spending categories breakdown for current scope
  const categoryBreakdown = useMemo<CategoryExpenseBreakdown[]>(() => {
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
  }, [scopedTransactions, categories, convertToDefaultCurrency]);

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
  }, []);

  const clearDaySelection = useCallback(() => {
    setSelectedDay(null);
  }, []);

  return {
    activeMonth,
    selectedDay,
    activeTab,
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
    setActiveTab,
    refreshAll,
    postOccurrence,
    skipOccurrence,
  };
}
