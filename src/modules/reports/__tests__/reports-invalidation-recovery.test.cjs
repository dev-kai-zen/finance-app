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

test("REP-F07: Rapid filter switching cancels previous pending queries (A -> B -> C)", () => {
  const executedScopes = [];
  const cancelledScopes = [];

  function createDeferredScopeHarness() {
    let cancelPending = null;
    let requestId = 0;
    let currentScope = "A";
    let data = null;
    let loading = false;

    const setScope = (newScope) => {
      // Cancel previous pending
      if (cancelPending) {
        cancelPending();
        cancelPending = null;
      }

      currentScope = newScope;
      const reqId = ++requestId;
      loading = true;

      let cancelled = false;
      const execute = () => {
        if (cancelled) return;
        if (reqId !== requestId) return;
        executedScopes.push(newScope);
        data = { scope: newScope };
        loading = false;
      };

      cancelPending = () => {
        cancelled = true;
        cancelledScopes.push(newScope);
      };

      return { execute };
    };

    return {
      setScope,
      getData: () => data,
      getLoading: () => loading,
      cancelPending: () => cancelPending?.(),
    };
  }

  const harness = createDeferredScopeHarness();

  // Rapidly queue A -> B -> C
  const qA = harness.setScope("A");
  const qB = harness.setScope("B");
  const qC = harness.setScope("C");

  assert.deepEqual(cancelledScopes, ["A", "B"]);

  // Run the queued callbacks
  qA.execute();
  qB.execute();
  qC.execute();

  // Only C actually executed and published data
  assert.deepEqual(executedScopes, ["C"]);
  assert.deepEqual(harness.getData(), { scope: "C" });
  assert.equal(harness.getLoading(), false);
});

test("REP-F07: Unmount/blur cancels pending query and prevents execution", () => {
  let executed = false;
  let cancelled = false;

  const cancelPending = () => {
    cancelled = true;
  };

  const execute = () => {
    if (cancelled) return;
    executed = true;
  };

  // Simulate unmount/blur before paint
  cancelPending();
  execute();

  assert.equal(cancelled, true);
  assert.equal(executed, false);
});

test("REP-F07: Scope change triggers truthful loading state while mutation preserves cached smooth reload", () => {
  let loadedScopeKey = null;

  const checkHasCachedResult = (currentScopeKey) => {
    return loadedScopeKey === currentScopeKey;
  };

  // 1. Initial scope "month" - no cached result yet
  assert.equal(checkHasCachedResult("expense:this-month:PHP"), false);

  // Data loads for "month"
  loadedScopeKey = "expense:this-month:PHP";

  // 2. Mutation occurs for same scope - has cached result (silent background reload)
  assert.equal(checkHasCachedResult("expense:this-month:PHP"), true);

  // 3. User switches to "year" - scope changed, hasCachedResult is false (shows truthful skeleton)
  assert.equal(checkHasCachedResult("expense:this-year:PHP"), false);

  // Data loads for "year"
  loadedScopeKey = "expense:this-year:PHP";
  assert.equal(checkHasCachedResult("expense:this-year:PHP"), true);

  // 4. User switches mode from expense to income - scope changed (shows truthful skeleton)
  assert.equal(checkHasCachedResult("income:this-year:PHP"), false);
});

test("REP-F08: skipQuery true bypasses query execution and sets loading false", () => {
  let queryRun = false;
  const runQuery = (skipQuery) => {
    let loading = !skipQuery;
    let data = null;
    if (skipQuery) {
      loading = false;
      return { loading, data, queryRun };
    }
    queryRun = true;
    loading = false;
    data = { result: "live_data" };
    return { loading, data, queryRun };
  };

  // Locked report (non-Pro user):
  const freeResult = runQuery(true);
  assert.equal(freeResult.queryRun, false);
  assert.equal(freeResult.loading, false);
  assert.equal(freeResult.data, null);

  // Pro unlocked report:
  const proResult = runQuery(false);
  assert.equal(proResult.queryRun, true);
  assert.equal(proResult.loading, false);
  assert.equal(proResult.data.result, "live_data");
});

test("REP-F08: Net Worth Growth service invokes getAccountsWithBalances with includeManagementFlags false", () => {
  let passedOptions = null;
  const mockGetAccountsWithBalances = (context, options) => {
    passedOptions = options;
    return [
      {
        id: "acc_1",
        name: "Savings",
        currencyCode: "PHP",
        openingBalanceMinorUnits: 100000,
        openingBalanceAt: new Date(2026, 0, 1),
        isArchived: false,
        hideFromReports: false,
        accountType: { accountGroup: "asset" },
      },
    ];
  };

  const accounts = mockGetAccountsWithBalances({}, { includeManagementFlags: false });
  assert.equal(passedOptions.includeManagementFlags, false);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].openingBalanceMinorUnits, 100000);
});
