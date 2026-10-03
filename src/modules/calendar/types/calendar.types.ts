export type CalendarTab = "transactions" | "schedules" | "net";

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed: 0 = Jan, 11 = Dec
}

export interface CalendarDayCellData {
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  date: Date;
  // Transactions metadata
  transactionCount: number;
  hasIncome: boolean;
  hasExpense: boolean;
  totalIncomeMinorUnits: number;
  totalExpenseMinorUnits: number;
  netMinorUnits: number;
  // Schedules metadata
  scheduleCount: number;
  hasDueSchedule: boolean;
  hasUpcomingSchedule: boolean;
}

export interface CalendarSummaryMetrics {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashflowMinorUnits: number;
  transactionCount: number;
  // Schedules metrics
  schedulesTotalDueMinorUnits: number;
  schedulesPendingCount: number;
  schedulesPostedCount: number;
  // Net analytics
  savingsRatePercent: number;
  projectedMonthEndNetMinorUnits: number;
}
