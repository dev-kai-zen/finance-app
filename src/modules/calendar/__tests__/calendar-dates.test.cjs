const test = require("node:test");
const assert = require("node:assert/strict");

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseDateKey(key) {
  const parts = key.split("-").map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    month: (parts[1] ?? 1) - 1,
    day: parts[2] ?? 1,
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function buildCalendarMonthGrid(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;

  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;

  const cells = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const dateKey = formatDateKey(prevMonthYear, prevMonthIndex, dayNumber);
    const date = new Date(prevMonthYear, prevMonthIndex, dayNumber, 12, 0, 0);
    cells.push({
      dateKey,
      dayNumber,
      monthIndex: prevMonthIndex,
      year: prevMonthYear,
      isCurrentMonth: false,
      date,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const date = new Date(year, month, day, 12, 0, 0);
    cells.push({
      dateKey,
      dayNumber: day,
      monthIndex: month,
      year,
      isCurrentMonth: true,
      date,
    });
  }

  const totalWeeks = Math.ceil(cells.length / 7);
  const totalTargetCells = totalWeeks * 7;
  const remainingCells = totalTargetCells - cells.length;

  for (let day = 1; day <= remainingCells; day++) {
    const dateKey = formatDateKey(nextMonthYear, nextMonthIndex, day);
    const date = new Date(nextMonthYear, nextMonthIndex, day, 12, 0, 0);
    cells.push({
      dateKey,
      dayNumber: day,
      monthIndex: nextMonthIndex,
      year: nextMonthYear,
      isCurrentMonth: false,
      date,
    });
  }

  return cells;
}

function getCalendarGridDateRange(year, month) {
  const rawCells = buildCalendarMonthGrid(year, month);
  const first = rawCells[0];
  const last = rawCells[rawCells.length - 1];
  return {
    startDate: new Date(first.year, first.monthIndex, first.dayNumber, 0, 0, 0, 0),
    endDate: new Date(last.year, last.monthIndex, last.dayNumber, 23, 59, 59, 999),
  };
}

test("calendar-dates: formatDateKey and parseDateKey round-trip cleanly", () => {
  const key = formatDateKey(2026, 10, 19);
  assert.equal(key, "2026-11-19");
  const parsed = parseDateKey(key);
  assert.deepEqual(parsed, { year: 2026, month: 10, day: 19 });
});

test("calendar-dates: getDaysInMonth accurately handles leap years and standard months", () => {
  assert.equal(getDaysInMonth(2024, 1), 29, "2024 is leap year");
  assert.equal(getDaysInMonth(2026, 1), 28, "2026 is non-leap year");
  assert.equal(getDaysInMonth(2026, 10), 30, "November has 30 days");
  assert.equal(getDaysInMonth(2026, 11), 31, "December has 31 days");
});

test("calendar-dates: getCalendarGridDateRange covers entire visible calendar grid", () => {
  // November 2026: Nov 1 is Sunday (day 0)
  const rangeNov = getCalendarGridDateRange(2026, 10);
  assert.equal(rangeNov.startDate.getFullYear(), 2026);
  assert.equal(rangeNov.startDate.getMonth(), 10);
  assert.equal(rangeNov.startDate.getDate(), 1);
  assert.equal(rangeNov.startDate.getHours(), 0);

  // November 30 is Monday, trailing days extend to Saturday Dec 5
  assert.equal(rangeNov.endDate.getFullYear(), 2026);
  assert.equal(rangeNov.endDate.getMonth(), 11);
  assert.equal(rangeNov.endDate.getDate(), 5);
  assert.equal(rangeNov.endDate.getHours(), 23);
  assert.equal(rangeNov.endDate.getMinutes(), 59);

  // October 2026: Oct 1 is Thursday. Leading days start Sunday Sep 27.
  const rangeOct = getCalendarGridDateRange(2026, 9);
  assert.equal(rangeOct.startDate.getMonth(), 8, "Leading days in September");
  assert.equal(rangeOct.startDate.getDate(), 27);
  assert.equal(rangeOct.endDate.getMonth(), 9, "October 31 is Saturday, ends on Oct 31");
  assert.equal(rangeOct.endDate.getDate(), 31);
});
