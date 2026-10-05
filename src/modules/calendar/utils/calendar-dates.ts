import type { CalendarMonth } from "../types/calendar.types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getTodayParts(): { year: number; month: number; day: number; dateKey: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const dateKey = formatDateKey(year, month, day);
  return { year, month, day, dateKey };
}

export function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function getDateKeyFromDate(date: Date | string | number): string {
  const d = new Date(date);
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const parts = key.split("-").map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    month: (parts[1] ?? 1) - 1,
    day: parts[2] ?? 1,
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getStartOfMonthDateKey(year: number, month: number): string {
  return formatDateKey(year, month, 1);
}

export function getEndOfMonthDateKey(year: number, month: number): string {
  const lastDay = getDaysInMonth(year, month);
  return formatDateKey(year, month, lastDay);
}


export interface GridCellMeta {
  dateKey: string;
  dayNumber: number;
  monthIndex: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  date: Date;
}

export function buildCalendarMonthGrid(year: number, month: number): GridCellMeta[] {
  const todayParts = getTodayParts();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;

  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;

  const cells: GridCellMeta[] = [];

  // 1. Previous month leading days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const dateKey = formatDateKey(prevMonthYear, prevMonthIndex, dayNumber);
    const date = new Date(prevMonthYear, prevMonthIndex, dayNumber, 12, 0, 0);
    const isToday =
      todayParts.year === prevMonthYear &&
      todayParts.month === prevMonthIndex &&
      todayParts.day === dayNumber;

    cells.push({
      dateKey,
      dayNumber,
      monthIndex: prevMonthIndex,
      year: prevMonthYear,
      isCurrentMonth: false,
      isToday,
      date,
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const date = new Date(year, month, day, 12, 0, 0);
    const isToday =
      todayParts.year === year &&
      todayParts.month === month &&
      todayParts.day === day;

    cells.push({
      dateKey,
      dayNumber: day,
      monthIndex: month,
      year,
      isCurrentMonth: true,
      isToday,
      date,
    });
  }

  // 3. Next month trailing days to complete the weeks (standard 35 or 42 cells)
  const totalWeeks = Math.ceil(cells.length / 7);
  const totalTargetCells = totalWeeks * 7;
  const remainingCells = totalTargetCells - cells.length;

  for (let day = 1; day <= remainingCells; day++) {
    const dateKey = formatDateKey(nextMonthYear, nextMonthIndex, day);
    const date = new Date(nextMonthYear, nextMonthIndex, day, 12, 0, 0);
    const isToday =
      todayParts.year === nextMonthYear &&
      todayParts.month === nextMonthIndex &&
      todayParts.day === day;

    cells.push({
      dateKey,
      dayNumber: day,
      monthIndex: nextMonthIndex,
      year: nextMonthYear,
      isCurrentMonth: false,
      isToday,
      date,
    });
  }

  return cells;
}

export function formatFriendlyDate(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(year, month, day);
  const now = new Date();
  
  const isSameDay =
    year === now.getFullYear() &&
    month === now.getMonth() &&
    day === now.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    year === yesterday.getFullYear() &&
    month === yesterday.getMonth() &&
    day === yesterday.getDate();

  if (isSameDay) return "Today";
  if (isYesterday) return "Yesterday";

  const monthName = MONTH_NAMES[month];
  const dayName = WEEKDAY_SHORT_NAMES[date.getDay()];
  return `${dayName}, ${monthName} ${day}, ${year}`;
}
