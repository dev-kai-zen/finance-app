const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTs(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    console: { error() {} },
    require(name) {
      assert.ok(name in imports, "Unexpected dependency: " + name);
      return imports[name];
    },
  });
  return exports;
}

function createHarness({ categoriesLoading = false } = {}) {
  let cursor = 0;
  const slots = [];
  const scheduled = new Set();
  const events = new Set();
  let focusCallback, activeFocus, cleanup;
  let focused = true, unmounted = false;
  let spent = 100000, reads = 0, calculations = 0, failRead = false, failDelete = false;
  let categoryRefreshes = 0;
  const categoryState = {
    categories: [{ id: "food" }],
    loading: categoriesLoading,
    error: null,
    refresh() { categoryRefreshes++; return Promise.resolve(); },
    clearError() { categoryState.error = null; },
  };
  const rows = [{ id: "budget", categoryId: "food", isEnabled: true, currencyCode: "PHP" }];
  const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => {
        assert.equal(unmounted, false, "No state writes after unmount");
        slots[i] = typeof value === "function" ? value(slots[i]) : value;
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
  };
  const deferred = loadTs("../../../utils/run-deferred-sync-query.ts", {
    "@/utils/schedule-after-paint": {
      scheduleAfterPaint(callback) {
        scheduled.add(callback);
        return () => scheduled.delete(callback);
      },
    },
  });
  const { useBudgets } = loadTs("../hooks/use-budgets.ts", {
    react,
    "react-native": { DeviceEventEmitter: { addListener(name, callback) {
      assert.equal(name, "FINANCE_APP_TRANSACTION_MUTATED");
      events.add(callback);
      return { remove: () => events.delete(callback) };
    } } },
    "expo-router": { useFocusEffect: callback => { focusCallback = callback; } },
    "@/infrastructure/localization": { useLocalization: () => ({ locale: "en", t: (k) => k }) },
    "@/utils/run-deferred-sync-query": deferred,
    "@/infrastructure/database/client": { db: {} },
    "@/modules/categories": { useCategories: () => categoryState },
    "@/modules/currencies": {
      getCurrencyPreferences: () => ({ defaultCurrency: "PHP" }),
      getExchangeRateMap: () => new Map(),
    },
    "@/utils/currency": { DEFAULT_BASE_CURRENCY: "PHP", convertCurrencyMinorUnits: amount => amount },
    "../repositories/category-budgets.repository": { listCategoryBudgetsSync() {
      reads++;
      if (failRead) throw new Error("Read failed");
      return rows;
    } },
    "../services/get-budget-transaction-scope.service": { getBudgetTransactionScope() {} },
    "../services/calculate-category-budget.service": { calculateBudgetStatusesBatch(list) {
      calculations++;
      return list.map(budget => ({ budget, spentCents: spent, effectiveTargetCents: 500000,
        remainingCents: 500000 - spent, percentage: spent / 5000, isExceeded: spent > 500000, isNearLimit: false }));
    } },
    "../services/save-category-budget.service": { saveCategoryBudget() {} },
    "../services/toggle-category-budget.service": { toggleCategoryBudget() {} },
    "../services/delete-category-budget.service": { deleteCategoryBudget() {
      if (failDelete) throw new Error("Failed to delete budget from database.");
    } },
  });
  return {
    render(date) {
      cursor = 0;
      const state = useBudgets(date);
      if (focused && activeFocus !== focusCallback) {
        cleanup?.();
        activeFocus = focusCallback;
        cleanup = focusCallback();
      }
      return state;
    },
    flush() { const jobs = [...scheduled]; scheduled.clear(); jobs.forEach(callback => callback()); },
    emit() { events.forEach(callback => callback({ sourceId: "global-quick-entry" })); },
    blur() { cleanup?.(); cleanup = null; activeFocus = null; focused = false; },
    focus() { focused = true; },
    unmount() { this.blur(); unmounted = true; },
    set spent(value) { spent = value; },
    set failRead(value) { failRead = value; },
    set failDelete(value) { failDelete = value; },
    get reads() { return reads; },
    get calculations() { return calculations; },
    get pending() { return scheduled.size; },
    get listeners() { return events.size; },
    get categoryRefreshes() { return categoryRefreshes; },
    categoryState,
    rows,
  };
}

test("budgets (P2-03): refocus refreshes spending after paint with a synchronized loading state", () => {
  const h = createHarness();
  try {
    h.render();
    assert.equal(h.reads, 0);
    assert.equal(h.pending, 1);
    h.flush();
    let state = h.render();
    assert.equal(h.reads, 1);
    assert.equal(h.calculations, 1, "One read/calculation pipeline on initial focus");
    assert.equal(state.loading, false);
    assert.equal(state.summary.totalSpentCents, 100000);
    h.blur();
    h.spent = 150000;
    h.emit();
    assert.equal(h.pending, 0);
    h.focus(); h.render();
    assert.equal(h.render().loading, true, "Cached results still show skeleton during refresh");
    assert.equal(h.reads, 1, "No synchronous work during refocus");
    h.flush(); state = h.render();
    assert.equal(state.loading, false);
    assert.equal(state.budgetStatuses[0].spentCents, 150000);
    assert.equal(state.summary.totalSpentCents, 150000);
    assert.equal(h.reads, 2);
  } finally { h.unmount(); }
});

test("budgets (P2-03): focused mutation bursts coalesce and blur cancels pending work", async () => {
  const h = createHarness();
  h.render(); h.flush();
  h.spent = 200000;
  h.emit(); h.emit(); h.emit();
  assert.equal(h.pending, 1);
  assert.equal(h.render().loading, true);
  h.flush();
  assert.equal(h.reads, 2);
  assert.equal(h.render().summary.totalSpentCents, 200000);
  const pendingRefresh = h.render().refresh();
  h.blur();
  await pendingRefresh;
  assert.equal(h.pending, 0);
  assert.equal(h.listeners, 0);
  h.flush(); assert.equal(h.reads, 2);
  await h.render().refresh();
  assert.equal(h.pending, 0, "Manual refresh while blurred performs no queries");
  h.focus(); h.render();
  h.unmount(); h.flush();
  assert.equal(h.reads, 2);
});

test("budgets (P2-03): read errors can be cleared and empty results finish loading", () => {
  const h = createHarness();
  try {
    h.failRead = true;
    h.render(); h.flush();
    const state = h.render();
    assert.equal(state.error, "Read failed");
    assert.equal(state.loading, false);
    state.clearError();
    assert.equal(h.render().error, null);
    h.failRead = false;
    h.rows.length = 0;
    h.emit(); h.flush();
    assert.equal(h.render().summary.activeCount, 0);
    assert.equal(h.render().budgetStatuses.length, 0);
    assert.equal(h.render().loading, false);
  } finally { h.unmount(); }
});

test("budgets (P2-03): category readiness and stable date values avoid duplicate queries", async () => {
  const h = createHarness({ categoriesLoading: true });
  try {
    const date = new Date(2026, 10, 21);
    h.render(date);
    assert.equal(h.pending, 0);
    h.categoryState.loading = false;
    h.render(new Date(date));
    assert.equal(h.pending, 1);
    h.flush();
    h.render(new Date(date));
    assert.equal(h.pending, 0, "Equal date values do not reschedule reads");
    const save = h.render(new Date(date)).saveBudget({});
    assert.equal(h.pending, 1);
    h.flush(); await save;
    assert.equal(h.reads, 2, "Saving uses the same refresh pipeline");
  } finally { h.unmount(); }
});

test("BUD-F08: category load errors propagate and coordinated refresh retries categories", async () => {
  const h = createHarness();
  try {
    h.categoryState.categories = [];
    h.categoryState.error = "Categories failed to load";
    let state = h.render();
    assert.equal(state.error, "Categories failed to load");
    const initialRefreshes = h.categoryRefreshes;

    // Call refresh() on useBudgets: it should retry categories
    await state.refresh();
    assert.equal(h.categoryRefreshes, initialRefreshes + 1);

    // After retry succeeds:
    h.categoryState.categories = [{ id: "food" }];
    h.categoryState.error = null;
    h.render();
    h.flush();
    state = h.render();
    assert.equal(state.error, null);
    assert.equal(state.summary.activeCount, 1);
  } finally { h.unmount(); }
});

test("BUD-F08: delete failures preserve recovery state and return false", async () => {
  const h = createHarness();
  try {
    h.render();
    h.flush();
    h.failDelete = true;
    const state = h.render();
    const success = await state.deleteBudget("b-1");
    assert.equal(success, false, "Delete returns false on failure");
    const afterState = h.render();
    assert.equal(afterState.error, "Failed to delete budget from database.");
  } finally { h.unmount(); }
});
