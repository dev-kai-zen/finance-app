const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// TypeScript loader hook
require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const {
  getTransactionFormWalkthroughSteps,
} = require("../transactions/transaction-form-walkthrough-steps.ts");
const {
  getScheduledTransactionsWalkthroughSteps,
} = require("../scheduled/scheduled-transactions-walkthrough-steps.ts");
const {
  getScheduleFormWalkthroughSteps,
} = require("../scheduled/schedule-form-walkthrough-steps.ts");

const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("transaction form walkthrough: includes all visible fields in exact order", () => {
  const steps = getTransactionFormWalkthroughSteps({
    isTransfer: false,
    showPresets: true,
    showCustomize: true,
    showName: true,
    showAttachment: true,
    showTime: true,
    showSplit: true,
    showLabels: true,
    showNote: true,
  });

  const expectedTargetIds = [
    "txFormPresets",
    "txFormCustomize",
    "txFormTypePicker",
    "txFormName",
    "txFormAttachment",
    "txFormDate",
    "txFormTime",
    "txFormAmount",
    "txFormCurrency",
    "txFormAccount",
    "txFormCategory",
    "txFormSplit",
    "txFormLabels",
    "txFormNote",
    "txFormCancel",
    "txFormSave",
    "txFormClose",
  ];

  assert.equal(steps.length, expectedTargetIds.length);
  steps.forEach((step, idx) => {
    assert.equal(step.targetId, expectedTargetIds[idx]);
  });
});

test("transaction form walkthrough: omits hidden fields when disabled", () => {
  const steps = getTransactionFormWalkthroughSteps({
    isTransfer: true,
    showPresets: false,
    showCustomize: false,
    showName: false,
    showAttachment: false,
    showTime: false,
    showSplit: false,
    showLabels: false,
    showNote: false,
  });

  const targetIds = steps.map((s) => s.targetId);
  assert.ok(!targetIds.includes("txFormPresets"));
  assert.ok(!targetIds.includes("txFormCustomize"));
  assert.ok(!targetIds.includes("txFormName"));
  assert.ok(!targetIds.includes("txFormAttachment"));
  assert.ok(!targetIds.includes("txFormTime"));
  assert.ok(!targetIds.includes("txFormCurrency"));
  assert.ok(!targetIds.includes("txFormCategory"));
  assert.ok(!targetIds.includes("txFormSplit"));
  assert.ok(!targetIds.includes("txFormLabels"));
  assert.ok(!targetIds.includes("txFormNote"));

  // Essential fields remain
  assert.ok(targetIds.includes("txFormTypePicker"));
  assert.ok(targetIds.includes("txFormDate"));
  assert.ok(targetIds.includes("txFormAmount"));
  assert.ok(targetIds.includes("txFormAccount"));
  assert.ok(targetIds.includes("txFormCancel"));
  assert.ok(targetIds.includes("txFormSave"));
  assert.ok(targetIds.includes("txFormClose"));
});

test("scheduled transactions screen walkthrough: branches correctly across 3 states", () => {
  // Case A: No schedules
  const emptySteps = getScheduledTransactionsWalkthroughSteps({
    hasSchedules: false,
    hasDueSchedule: false,
  });
  assert.deepEqual(
    emptySteps.map((s) => s.targetId),
    ["scheduledSearch", "scheduledFilter", "scheduledFab"],
  );

  // Case B: Due schedule exists
  const dueSteps = getScheduledTransactionsWalkthroughSteps({
    hasSchedules: true,
    hasDueSchedule: true,
  });
  assert.deepEqual(
    dueSteps.map((s) => s.targetId),
    [
      "scheduledSearch",
      "scheduledDueCard",
      "scheduledDueSkip",
      "scheduledDuePost",
      "scheduledFilter",
      "scheduledFirstItem",
      "scheduledFab",
    ],
  );

  // Case C: Standard list / 1st schedule item
  const standardSteps = getScheduledTransactionsWalkthroughSteps({
    hasSchedules: true,
    hasDueSchedule: false,
  });
  assert.deepEqual(
    standardSteps.map((s) => s.targetId),
    [
      "scheduledSearch",
      "scheduledFilter",
      "scheduledFirstItem",
      "scheduledFab",
    ],
  );
});

test("scheduled transactions screen walkthrough: omits controls that are not on screen", () => {
  const hiddenDue = getScheduledTransactionsWalkthroughSteps({
    hasSchedules: true,
    showDueSection: false,
    showFirstItem: true,
  });
  assert.deepEqual(
    hiddenDue.map((step) => step.targetId),
    ["scheduledSearch", "scheduledFilter", "scheduledFirstItem", "scheduledFab"],
  );

  const hiddenList = getScheduledTransactionsWalkthroughSteps({
    hasSchedules: true,
    showDueSection: true,
    showFirstItem: false,
  });
  assert.deepEqual(
    hiddenList.map((step) => step.targetId),
    [
      "scheduledSearch",
      "scheduledDueCard",
      "scheduledDueSkip",
      "scheduledDuePost",
      "scheduledFilter",
      "scheduledFab",
    ],
  );
});

test("schedule form walkthrough: handles once vs recurring frequencies", () => {
  const onceSteps = getScheduleFormWalkthroughSteps({ frequency: "once" });
  const onceTargetIds = onceSteps.map((s) => s.targetId);
  assert.ok(!onceTargetIds.includes("scheduleFormRepeat"));
  assert.ok(!onceTargetIds.includes("scheduleFormEnds"));
  assert.ok(!onceTargetIds.includes("scheduleFormWeekend"));

  const recurringSteps = getScheduleFormWalkthroughSteps({ frequency: "monthly" });
  const recurringTargetIds = recurringSteps.map((s) => s.targetId);
  assert.ok(recurringTargetIds.includes("scheduleFormRepeat"));
  assert.ok(recurringTargetIds.includes("scheduleFormEnds"));
  assert.ok(recurringTargetIds.includes("scheduleFormWeekend"));
  assert.ok(recurringTargetIds.includes("scheduleFormAutoEnter"));
  assert.ok(recurringTargetIds.includes("scheduleFormSave"));
});

test("phase 2 translations exist in en, es, and fil", () => {
  [en, es, fil].forEach((dict) => {
    assert.ok(dict.transactionFormWalkthrough, "transactionFormWalkthrough should exist");
    assert.ok(dict.scheduledTransactionsWalkthrough, "scheduledTransactionsWalkthrough should exist");
    assert.ok(dict.scheduleFormWalkthrough, "scheduleFormWalkthrough should exist");
    assert.ok(dict.scheduleCongratulations, "scheduleCongratulations should exist");
  });
});
