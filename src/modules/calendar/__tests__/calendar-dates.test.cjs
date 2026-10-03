const test = require("node:test");
const assert = require("node:assert/strict");

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
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
    cells.push({
      dateKey: formatDateKey(prevMonthYear, prevMonthIndex, dayNumber),
      dayNumber,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      dateKey: formatDateKey(year, month, day),
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  const totalWeeks = Math.ceil(cells.length / 7);
  const totalTargetCells = totalWeeks * 7;
  const remainingCells = totalTargetCells - cells.length;

  for (let day = 1; day <= remainingCells; day++) {
    cells.push({
      dateKey: formatDateKey(nextMonthYear, nextMonthIndex, day),
      dayNumber: day,
      isCurrentMonth: false,
    });
  }

  return cells;
}

test("buildCalendarMonthGrid produces complete 7-day rows covering all days of October 2026", () => {
  // October 2026: 31 days. Starts on Thursday (day 4)
  const cells = buildCalendarMonthGrid(2026, 9);
  assert.equal(cells.length % 7, 0, "Grid cells must be a multiple of 7");
  
  const currentMonthCells = cells.filter((c) => c.isCurrentMonth);
  assert.equal(currentMonthCells.length, 31, "October must have 31 days");

  assert.equal(currentMonthCells[0].dateKey, "2026-10-01");
  assert.equal(currentMonthCells[30].dateKey, "2026-10-31");

  // Leading days from September: Thursday means Sun, Mon, Tue, Wed are from September
  const leadingCells = cells.slice(0, 4);
  assert.equal(leadingCells.length, 4);
  assert.equal(leadingCells[0].dateKey, "2026-09-27");
  assert.equal(leadingCells[3].dateKey, "2026-09-30");
});

test("formatDateKey correctly pads single-digit months and days", () => {
  assert.equal(formatDateKey(2026, 0, 5), "2026-01-05");
  assert.equal(formatDateKey(2026, 9, 14), "2026-10-14");
});
