const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(overrides = {}) {
  const scheduled = [], checks = [];
  const state = { enabled: true, permission: true, os: "android", result: {
    hasBudget: true, isEnabled: true, notifyOnExceeded: true,
    effectiveBudgetCents: 0, newSpentCents: 10000, exceededByCents: 10000,
    exceeds: true, categoryName: "Food", periodLabel: "November 2026", budgetCurrencyCode: "PHP",
  }, ...overrides };
  const exports = {};
  const dependencies = {
    "react-native": { Platform: { get OS() { return state.os; } } },
    "expo-notifications": { scheduleNotificationAsync: async value => scheduled.push(value) },
    "@/modules/budgets": { checkBudgetExceeded: input => { checks.push(input); return state.result; } },
    "@/modules/credit-cards": {}, "@/modules/goals": {},
    "@/utils/currency": { formatCurrency: (amount, code) => `${code} ${(amount / 100).toFixed(2)}` },
    "../constants/reminder-settings.constants": { NOTIFICATION_IDENTIFIERS: { BUDGET_ALERT_PREFIX: "budget-" } },
    "../repositories/reminder-settings.repository": { getReminderSettings: () => ({ budgetThresholdAlertsEnabled: state.enabled }) },
    "./notification-permissions.service": { checkNotificationPermissions: async () => state.permission },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../services/check-instant-alerts.service.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, require: name => {
    assert.ok(name in dependencies, name); return dependencies[name];
  } });
  return { state, scheduled, checks, run: () => exports.checkAndNotifyBudgetThreshold({ categoryId: "food", occurredAt: new Date(2026, 10, 15, 12) }) };
}

test("BUD-F04: zero-limit alert uses monetary excess and keeps existing deduplication", async () => {
  const h = harness(); await h.run(); await h.run();
  assert.equal(h.scheduled.length, 1);
  const alert = h.scheduled[0];
  assert.equal(alert.identifier, "budget-100-food-2026-11");
  assert.equal(alert.content.title, "Budget Exceeded");
  assert.match(alert.content.body, /Food/); assert.match(alert.content.body, /PHP 100.00/);
  assert.match(alert.content.body, /November 2026/);
  assert.doesNotMatch(alert.content.body, /%|NaN|Infinity/);
  assert.equal(alert.content.data.url, "/budgets"); assert.equal(alert.trigger, null);
  assert.equal(h.checks[0].amountMinorUnits, 0, "Post-commit check adds no second expense");
});

test("BUD-F04: zero/no-spending, net credits, disabled budgets and alert opt-outs stay silent", async () => {
  for (const patch of [
    { newSpentCents: 0, exceeds: false }, { newSpentCents: -100, exceeds: false },
    { hasBudget: false }, { isEnabled: false }, { notifyOnExceeded: false },
  ]) {
    const h = harness(); Object.assign(h.state.result, patch); await h.run();
    assert.equal(h.scheduled.length, 0, JSON.stringify(patch));
  }
  for (const options of [{ enabled: false }, { permission: false }, { os: "web" }]) {
    const h = harness(options); await h.run();
    assert.equal(h.checks.length, 0); assert.equal(h.scheduled.length, 0);
  }
});

test("BUD-F04: positive limits retain 80% warning and inclusive 100% notification thresholds", async () => {
  for (const [spent, count, title] of [[799, 0], [800, 1, "Budget Warning (80% Limit)"], [1000, 1, "Budget Exceeded (100% Limit)"], [1001, 1, "Budget Exceeded (100% Limit)"]]) {
    const h = harness(); Object.assign(h.state.result, { effectiveBudgetCents: 1000, newSpentCents: spent, exceeds: spent > 1000 });
    await h.run(); assert.equal(h.scheduled.length, count);
    if (count) assert.equal(h.scheduled[0].content.title, title);
  }
});
