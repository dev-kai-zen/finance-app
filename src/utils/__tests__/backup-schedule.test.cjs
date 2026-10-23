const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const {
  getLatestPassedScheduleSlot,
  isScheduledBackupDue,
  normalizeBackupScheduleTime,
} = require(path.join(root, "utils/backup-schedule.ts"));

test("normalizeBackupScheduleTime clamps invalid values", () => {
  assert.equal(normalizeBackupScheduleTime("9:05"), "09:05");
  assert.equal(normalizeBackupScheduleTime("invalid"), "02:00");
});

test("daily schedule slot rolls to previous day before scheduled time", () => {
  const config = {
    frequency: "daily",
    timeOfDay: "02:00",
    weekday: 0,
    dayOfMonth: 1,
  };
  const now = new Date(2026, 9, 7, 1, 0, 0, 0);
  const slot = getLatestPassedScheduleSlot(config, now);
  assert.equal(slot.getDate(), 6);
  assert.equal(slot.getHours(), 2);
});

test("isScheduledBackupDue respects daily time and last backup", () => {
  const config = {
    frequency: "daily",
    timeOfDay: "02:00",
    weekday: 0,
    dayOfMonth: 1,
  };
  const now = new Date(2026, 9, 7, 15, 0, 0, 0);
  const lastRun = new Date(2026, 9, 7, 3, 0, 0, 0);

  assert.equal(isScheduledBackupDue(null, config, now), true);
  assert.equal(isScheduledBackupDue(lastRun, config, now), false);

  const stale = new Date(2026, 9, 6, 20, 0, 0, 0);
  assert.equal(isScheduledBackupDue(stale, config, now), true);
});

test("weekly schedule waits for configured weekday", () => {
  const config = {
    frequency: "weekly",
    timeOfDay: "09:00",
    weekday: 1,
    dayOfMonth: 1,
  };
  const now = new Date(2026, 9, 8, 12, 0, 0, 0);
  assert.equal(now.getDay(), 4);

  const afterMondaySlot = new Date(2026, 9, 6, 10, 0, 0, 0);
  assert.equal(isScheduledBackupDue(afterMondaySlot, config, now), false);

  const beforeMondaySlot = new Date(2026, 9, 1, 12, 0, 0, 0);
  assert.equal(isScheduledBackupDue(beforeMondaySlot, config, now), true);
});
