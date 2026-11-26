const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function load(relative, dependencies) {
  const filename = path.resolve(__dirname, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), "Unexpected dependency: " + id);
      return dependencies[id];
    },
    console,
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout,
    clearTimeout,
  }, { filename });
  return exports;
}

function fixture(skipQuery = false, shouldThrow = false) {
  const pending = [];
  const state = [];
  const listeners = new Map();
  let focus;
  let reads = 0;
  let throwError = shouldThrow;
  const deferred = load("../../../utils/run-deferred-sync-query.ts", {
    "@/utils/schedule-after-paint": { scheduleAfterPaint(callback) {
      const task = { callback, cancelled: false };
      pending.push(task);
      return () => { task.cancelled = true; };
    } },
  });
  const hooks = load("../hooks/use-subscriptions.ts", {
    react: {
      useCallback: callback => callback,
      useMemo: callback => callback(),
      useRef: current => ({ current }),
      useState: initial => {
        const slot = { value: initial };
        state.push(slot);
        return [initial, value => { slot.value = value; }];
      },
    },
    "react-native": {
      DeviceEventEmitter: {
        addListener(event, cb) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(cb);
          return {
            remove() {
              listeners.get(event)?.delete(cb);
            },
          };
        },
        emit(event, payload) {
          listeners.get(event)?.forEach(cb => cb(payload));
        },
      },
    },
    "@/utils/run-deferred-sync-query": deferred,
    "expo-router": { useFocusEffect: effect => { focus = effect; } },
    "@/infrastructure/localization": {},
    "@/modules/currencies": { useCurrencyPreferences: () => ({ preferences: { defaultCurrency: "PHP" } }) },
    "../repositories/subscriptions.repository": {
      listSubscriptions: () => {
        if (throwError) throw new Error("SQLite disk I/O error");
        reads++;
        return [{ id: "fresh" }];
      },
    },
    "../services/calculate-burn-rate.service": { calculateBurnRateSummary: () => ({}) },
    "../services/delete-subscription.service": {},
    "../services/record-subscription-payment.service": {},
    "../services/save-subscription.service": { saveSubscription: () => "mock_id" },
    "../services/toggle-subscription-status.service": {},
  });
  const hook = hooks.useSubscriptions({ skipQuery });
  return {
    hook,
    pending,
    state,
    focus: () => focus(),
    get reads() { return reads; },
    setThrow(val) { throwError = val; },
    emit(event, payload) {
      listeners.get(event)?.forEach(cb => cb(payload));
    },
    get listenerCount() {
      let count = 0;
      for (const set of listeners.values()) count += set.size;
      return count;
    },
    flush() {
      for (const task of pending.splice(0)) if (!task.cancelled) task.callback();
    },
  };
}

test("P3-05: focus defers reads until after paint and coalesces refreshes", () => {
  const f = fixture();
  const blur = f.focus();
  assert.equal(f.reads, 0);
  assert.equal(f.state[3].value, true);
  f.hook.refresh();
  assert.equal(f.pending[0].cancelled, true);
  f.flush();
  assert.equal(f.reads, 1);
  assert.equal(f.state[0].value[0].id, "fresh");
  assert.equal(f.state[3].value, false);
  f.hook.refresh();
  assert.equal(f.state[3].value, true, "Refresh shows a skeleton even with cached data");
  blur();
  f.flush();
  assert.equal(f.reads, 1, "Blur cancels pending refresh");
  const unmount = f.focus();
  unmount();
  f.flush();
  assert.equal(f.reads, 1, "Unmount cancels pending focus read");
});

test("P3-05: mutation-only subscription hosts do not schedule data reads", () => {
  const f = fixture(true);
  f.focus();
  f.hook.refresh();
  assert.equal(f.pending.length, 0);
  f.flush();
  assert.equal(f.reads, 0);
  assert.equal(f.listenerCount, 0, "skipQuery hosts attach 0 listeners");
});

test("SUB-F05: read failure populates error state and exposes it for recovery rather than pretending list is empty", () => {
  const f = fixture(false, true); // shouldThrow = true
  f.focus();
  f.flush();
  assert.equal(f.reads, 0);
  assert.equal(f.state[3].value, false, "Loading finishes even on error");
  assert.equal(f.state[4].value, "SQLite disk I/O error", "Error state must be populated on read failure");
  assert.equal(f.state[0].value.length, 0, "Items array remains empty");

  // Retry after resolving error
  f.setThrow(false);
  f.hook.refresh();
  f.flush();
  assert.equal(f.reads, 1, "Successful read executes on retry");
  assert.equal(f.state[4].value, null, "Error state is cleared on successful retry");
  assert.equal(f.state[0].value[0].id, "fresh", "Items populated on recovery");
});

test("SUB-F05: focused screen attaches listeners and refreshes on external transaction or schedule changes", async () => {
  const f = fixture();
  const blur = f.focus();
  assert.equal(f.listenerCount, 2, "Focused screen must attach exactly 2 listeners (transaction mutated + schedules changed)");

  f.flush();
  assert.equal(f.reads, 1, "Initial read executed");

  // Trigger transaction mutation event while focused
  f.emit("FINANCE_APP_TRANSACTION_MUTATED");
  await new Promise(r => setTimeout(r, 10));
  f.flush();
  assert.equal(f.reads, 2, "Transaction mutation while focused triggers refresh");

  // Trigger schedules changed event while focused
  f.emit("FINANCE_APP_SCHEDULES_CHANGED");
  await new Promise(r => setTimeout(r, 10));
  f.flush();
  assert.equal(f.reads, 3, "Schedule change while focused triggers refresh");

  // Blur screen
  blur();
  assert.equal(f.listenerCount, 0, "Blur must detach all listeners");

  // Emit mutations while offscreen/blurred
  f.emit("FINANCE_APP_TRANSACTION_MUTATED");
  f.emit("FINANCE_APP_SCHEDULES_CHANGED");
  await new Promise(r => setTimeout(r, 10));
  f.flush();
  assert.equal(f.reads, 3, "Offscreen mutations must NOT trigger any reads (60-120fps standard)");
});
