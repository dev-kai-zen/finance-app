const test = require("node:test");
const assert = require("node:assert/strict");

function createReportLifecycleHarness({ queryService }) {
  let isFocused = true;
  let isDirty = false;
  let loading = false;
  let error = null;
  let data = null;
  let queryCount = 0;

  const eventListeners = new Set();
  const DeviceEventEmitter = {
    addListener(event, cb) {
      if (event === "FINANCE_APP_TRANSACTION_MUTATED") {
        eventListeners.add(cb);
      }
      return {
        remove() {
          eventListeners.delete(cb);
        },
      };
    },
    emit(event) {
      if (event === "FINANCE_APP_TRANSACTION_MUTATED") {
        for (const cb of eventListeners) {
          cb();
        }
      }
    },
  };

  const refresh = () => {
    loading = true;
    queryCount++;
    try {
      data = queryService();
      error = null;
    } catch (err) {
      error = err.message || "Failed to load report data.";
    } finally {
      loading = false;
    }
  };

  // Setup mutation listener
  const sub = DeviceEventEmitter.addListener(
    "FINANCE_APP_TRANSACTION_MUTATED",
    () => {
      if (!isFocused) {
        isDirty = true;
        return;
      }
      refresh();
    },
  );

  // Setup focus effect
  const onFocus = () => {
    isFocused = true;
    if (isDirty) {
      isDirty = false;
      refresh();
    }
  };

  const onBlur = () => {
    isFocused = false;
  };

  // Initial mount query
  refresh();

  return {
    getState: () => ({ isFocused, isDirty, loading, error, data, queryCount }),
    onFocus,
    onBlur,
    emitMutation: () => DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED"),
    refresh,
    cleanup: () => sub.remove(),
  };
}

test("REP-F06: Initial mount loads data and sets queryCount to 1 without duplicate queries", () => {
  let count = 0;
  const harness = createReportLifecycleHarness({
    queryService: () => {
      count++;
      return { total: 5000 };
    },
  });

  const state = harness.getState();
  assert.equal(state.queryCount, 1);
  assert.equal(state.data.total, 5000);
  assert.equal(state.error, null);
  assert.equal(state.isDirty, false);

  // Re-focusing while clean does not trigger duplicate query
  harness.onFocus();
  assert.equal(harness.getState().queryCount, 1);

  harness.cleanup();
});

test("REP-F06: Mutation while focused triggers immediate reload", () => {
  let value = 5000;
  const harness = createReportLifecycleHarness({
    queryService: () => ({ total: value }),
  });

  assert.equal(harness.getState().data.total, 5000);
  assert.equal(harness.getState().queryCount, 1);

  // Mutate data externally
  value = 7500;
  harness.emitMutation();

  const state = harness.getState();
  assert.equal(state.queryCount, 2);
  assert.equal(state.data.total, 7500);
  assert.equal(state.isDirty, false);

  harness.cleanup();
});

test("REP-F06: Mutation while blurred defers query until refocused (offscreen gating)", () => {
  let value = 10000;
  const harness = createReportLifecycleHarness({
    queryService: () => ({ total: value }),
  });

  assert.equal(harness.getState().queryCount, 1);

  // Navigate away (blur)
  harness.onBlur();
  assert.equal(harness.getState().isFocused, false);

  // Mutate data while offscreen
  value = 15000;
  harness.emitMutation();

  // MUST NOT query while offscreen
  assert.equal(harness.getState().queryCount, 1);
  assert.equal(harness.getState().isDirty, true);
  assert.equal(harness.getState().data.total, 10000); // Stale while offscreen

  // Navigate back (refocus)
  harness.onFocus();
  assert.equal(harness.getState().isFocused, true);
  assert.equal(harness.getState().isDirty, false);
  assert.equal(harness.getState().queryCount, 2);
  assert.equal(harness.getState().data.total, 15000); // Updated on focus!

  harness.cleanup();
});

test("REP-F06: Read failure captures error state and allows successful recovery via retry", () => {
  let shouldFail = true;
  const harness = createReportLifecycleHarness({
    queryService: () => {
      if (shouldFail) {
        throw new Error("SQLite connection timeout");
      }
      return { total: 20000 };
    },
  });

  // Query threw error on initial load
  assert.equal(harness.getState().error, "SQLite connection timeout");
  assert.equal(harness.getState().data, null);
  assert.equal(harness.getState().loading, false);

  // Fix error condition and trigger retry
  shouldFail = false;
  harness.refresh();

  // Successfully recovered
  assert.equal(harness.getState().error, null);
  assert.equal(harness.getState().data.total, 20000);

  harness.cleanup();
});
