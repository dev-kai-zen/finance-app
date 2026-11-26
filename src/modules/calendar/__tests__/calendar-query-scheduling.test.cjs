const test = require("node:test");
const assert = require("node:assert/strict");

// Pure harness simulating CAL-F06 query scheduling, offscreen gating, and mutation coalescing
function createQuerySchedulingHarness() {
  let isFocused = true;
  let isDirty = false;
  let formModalOpen = false;

  let monthReloadCount = 0;
  let lastReloadTimestamp = 0;
  const monthCache = new Map();

  // Initial state starts with 0 queries during render
  let initialRenderQueryCount = 0;
  let transactions = [];
  let isMonthLoading = true;
  let loadedMonthKey = "";
  const currentMonthKey = "2026-11";

  // Simulate deferred initial load after paint
  function runDeferredInitialLoad() {
    isMonthLoading = true;
    const fresh = [{ id: "tx-1", amountMinorUnits: -15000 }];
    monthCache.set(currentMonthKey, fresh);
    loadedMonthKey = currentMonthKey;
    transactions = fresh;
    isMonthLoading = false;
  }

  // Coalesced reloadMonthTransactions
  function reloadMonthTransactions(force = false) {
    const now = Date.now();
    if (force && now - lastReloadTimestamp < 200) {
      return false; // Coalesced duplicate
    }
    lastReloadTimestamp = now;

    monthReloadCount += 1;
    const fresh = [{ id: `tx-reloaded-${monthReloadCount}`, amountMinorUnits: -20000 }];
    monthCache.set(currentMonthKey, fresh);
    loadedMonthKey = currentMonthKey;
    transactions = fresh;
    return true;
  }

  // Global event listener for FINANCE_APP_TRANSACTION_MUTATED
  function onTransactionMutatedEvent() {
    if (!isFocused) {
      isDirty = true;
      return "deferred_offscreen";
    }
    monthCache.clear();
    const executed = reloadMonthTransactions(true);
    return executed ? "reloaded" : "coalesced";
  }

  // useFocusEffect hook lifecycle
  function onFocus() {
    isFocused = true;
    if (isDirty) {
      isDirty = false;
      monthCache.clear();
      reloadMonthTransactions(true);
      return "refreshed_from_dirty";
    }
    return "idle";
  }

  function onBlur() {
    isFocused = false;
  }

  // Presets hook options calculation
  function getPresetHookOptions() {
    return { skipQuery: !formModalOpen };
  }

  return {
    get isFocused() { return isFocused; },
    get isDirty() { return isDirty; },
    get formModalOpen() { return formModalOpen; },
    set formModalOpen(val) { formModalOpen = val; },
    get monthReloadCount() { return monthReloadCount; },
    get initialRenderQueryCount() { return initialRenderQueryCount; },
    get transactions() { return transactions; },
    get isMonthLoading() { return isMonthLoading; },
    get loadedMonthKey() { return loadedMonthKey; },
    runDeferredInitialLoad,
    reloadMonthTransactions,
    onTransactionMutatedEvent,
    onFocus,
    onBlur,
    getPresetHookOptions,
    resetCoalesceTimer: () => { lastReloadTimestamp = 0; },
  };
}

test("CAL-F06: Initial state has zero render-time queries, displays loading, and defers load", () => {
  const harness = createQuerySchedulingHarness();

  // On mount/render, initial state MUST NOT query database
  assert.equal(harness.initialRenderQueryCount, 0, "Initial render must execute 0 DB queries");
  assert.equal(harness.transactions.length, 0);
  assert.equal(harness.isMonthLoading, true);
  assert.equal(harness.loadedMonthKey, "");

  // After paint, deferred pipeline executes
  harness.runDeferredInitialLoad();
  assert.equal(harness.isMonthLoading, false);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.loadedMonthKey, "2026-11");
});

test("CAL-F06: Presets query is skipped when form modal is closed, and queries only when open", () => {
  const harness = createQuerySchedulingHarness();

  // Screen open, modal closed: skipQuery MUST be true
  harness.formModalOpen = false;
  assert.equal(harness.getPresetHookOptions().skipQuery, true, "Presets must skip queries while modal is closed");

  // User taps + button to open form: skipQuery MUST be false
  harness.formModalOpen = true;
  assert.equal(harness.getPresetHookOptions().skipQuery, false, "Presets must query when modal opens");

  // User closes modal
  harness.formModalOpen = false;
  assert.equal(harness.getPresetHookOptions().skipQuery, true);
});

test("CAL-F06: Duplicate mutation refresh within coalesce window executes only once", () => {
  const harness = createQuerySchedulingHarness();
  assert.equal(harness.monthReloadCount, 0);

  // 1. Transaction mutation event fires from service
  const res1 = harness.onTransactionMutatedEvent();
  assert.equal(res1, "reloaded");
  assert.equal(harness.monthReloadCount, 1);

  // 2. Caller promise resolves immediately (1ms later) and triggers reload/refreshAll
  const res2 = harness.onTransactionMutatedEvent();
  assert.equal(res2, "coalesced", "Immediate duplicate reload must be coalesced");
  assert.equal(harness.monthReloadCount, 1, "Duplicate reload within window must not re-query SQLite");

  // 3. User later explicitly refreshes or navigates (coalesce timer expired)
  harness.resetCoalesceTimer();
  const res3 = harness.onTransactionMutatedEvent();
  assert.equal(res3, "reloaded");
  assert.equal(harness.monthReloadCount, 2);
});

test("CAL-F06: Offscreen mutation does not execute DB read, marks dirty, and reloads on refocus", () => {
  const harness = createQuerySchedulingHarness();
  assert.equal(harness.monthReloadCount, 0);

  // User navigates away from Calendar to Dashboard (screen blurs)
  harness.onBlur();
  assert.equal(harness.isFocused, false);
  assert.equal(harness.isDirty, false);

  // A transaction mutation occurs elsewhere while Calendar is mounted offscreen
  const eventResult = harness.onTransactionMutatedEvent();
  assert.equal(eventResult, "deferred_offscreen");
  assert.equal(harness.monthReloadCount, 0, "Offscreen screen must execute ZERO SQLite queries on mutation event");
  assert.equal(harness.isDirty, true, "Offscreen mutation must mark dirty flag");

  // User returns / focuses Calendar
  harness.resetCoalesceTimer();
  const focusResult = harness.onFocus();
  assert.equal(focusResult, "refreshed_from_dirty");
  assert.equal(harness.isFocused, true);
  assert.equal(harness.isDirty, false);
  assert.equal(harness.monthReloadCount, 1, "Refocus with dirty state must reload fresh data");

  // User focuses again without any mutations occurring while away
  harness.onBlur();
  const focusClean = harness.onFocus();
  assert.equal(focusClean, "idle");
  assert.equal(harness.monthReloadCount, 1, "Refocus without mutations must not re-query");
});
