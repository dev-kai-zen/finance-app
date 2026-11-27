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
  vm.runInNewContext(
    code,
    {
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
    },
    { filename },
  );
  return exports;
}

function fixture(options = {}) {
  const skipQuery = options.skipQuery ?? false;
  const pending = [];
  const stateSlots = [];
  const effectCleanups = [];
  const listeners = new Map();
  const appStateListeners = new Set();
  let dbReplacementListener = null;
  let focusEffectCallback = null;
  let focusCleanup = null;
  let readCount = 0;

  const deferred = load("../../../utils/run-deferred-sync-query.ts", {
    "@/utils/schedule-after-paint": {
      scheduleAfterPaint(callback) {
        const task = { callback, cancelled: false };
        pending.push(task);
        return () => {
          task.cancelled = true;
        };
      },
    },
  });

  const hooks = load("../hooks/use-goals.ts", {
    react: {
      useCallback: (cb) => cb,
      useEffect: (cb) => {
        const cleanup = cb();
        if (typeof cleanup === "function") effectCleanups.push(cleanup);
      },
      useRef: (initial) => ({ current: initial }),
      useState: (initial) => {
        const slot = { value: initial };
        stateSlots.push(slot);
        return [initial, (val) => { slot.value = typeof val === "function" ? val(slot.value) : val; }];
      },
    },
    "react-native": {
      AppState: {
        addEventListener(event, cb) {
          if (event === "change") {
            appStateListeners.add(cb);
            return {
              remove: () => appStateListeners.delete(cb),
            };
          }
          return { remove: () => {} };
        },
      },
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
          listeners.get(event)?.forEach((cb) => cb(payload));
        },
      },
    },
    "expo-router": {
      useFocusEffect: (cb) => {
        focusEffectCallback = cb;
      },
    },
    "@/infrastructure/database": {
      subscribeToDatabaseReplacement: (cb) => {
        dbReplacementListener = cb;
        return () => {
          dbReplacementListener = null;
        };
      },
    },
    "@/utils/run-deferred-sync-query": deferred,
    "../schemas/goal.schema": {
      goalErrorMessage: (err) => err?.message ?? String(err),
    },
    "../services/delete-goal.service": {
      deleteGoal: () => {},
    },
    "../services/get-goals-with-progress.service": {
      getGoalsWithProgress: () => {
        readCount++;
        return {
          goals: [
            {
              id: "g1",
              name: "Emergency Fund",
              currencyCode: "PHP",
              targetAmountMinorUnits: 100000,
              currentAmountMinorUnits: 50000,
              progressPercentage: 50,
              isCompleted: false,
              status: "in_progress",
            },
          ],
          summary: {
            currencyCode: "PHP",
            totalTargetMinorUnits: 100000,
            totalSavedMinorUnits: 50000,
            totalRemainingMinorUnits: 50000,
            overallProgressPercentage: 50,
            activeGoalsCount: 1,
            completedGoalsCount: 0,
            totalGoalsCount: 1,
          },
        };
      },
    },
    "../services/save-goal.service": {
      saveGoal: () => {},
    },
    "../services/toggle-goal-status.service": {
      toggleGoalStatus: () => {},
    },
  });

  const hook = hooks.useGoals({ skipQuery });

  const flushAsync = async () => {
    // Wait for microtasks and animation frame / timers
    await new Promise((r) => setTimeout(r, 10));
    // Flush paint tasks
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task.cancelled) {
        task.callback();
      }
    }
  };

  return {
    hook,
    focus: () => {
      if (focusCleanup) focusCleanup();
      if (focusEffectCallback) {
        focusCleanup = focusEffectCallback();
      }
    },
    blur: () => {
      if (focusCleanup) {
        focusCleanup();
        focusCleanup = null;
      }
    },
    unmount: () => {
      if (focusCleanup) {
        focusCleanup();
        focusCleanup = null;
      }
      effectCleanups.forEach((cleanup) => cleanup());
    },
    emitTransactionMutation: () => {
      listeners.get("FINANCE_APP_TRANSACTION_MUTATED")?.forEach((cb) => cb());
    },
    emitScheduleMutation: () => {
      listeners.get("FINANCE_APP_SCHEDULES_CHANGED")?.forEach((cb) => cb());
    },
    setAppState: (nextState) => {
      appStateListeners.forEach((cb) => cb(nextState));
    },
    triggerDbReplacement: () => {
      dbReplacementListener?.();
    },
    get readCount() {
      return readCount;
    },
    get activeListenerCount() {
      let count = 0;
      listeners.forEach((set) => {
        count += set.size;
      });
      return count;
    },
    get appStateListenerCount() {
      return appStateListeners.size;
    },
    flushAsync,
  };
}

test("GOAL-F04: useGoals does not read data when unfocused", async () => {
  const f = fixture();
  await f.flushAsync();
  assert.equal(f.readCount, 0, "No queries must be made while unfocused");
});

test("GOAL-F04: useGoals reads on initial focus", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1, "Must read data once on focus");
});

test("GOAL-F04: FINANCE_APP_TRANSACTION_MUTATED while focused triggers a refresh", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1);

  // External transaction occurs while viewing Goals
  f.emitTransactionMutation();
  await f.flushAsync();
  assert.equal(f.readCount, 2, "Must refresh live progress when transactions mutate");
});

test("GOAL-F04: FINANCE_APP_TRANSACTION_MUTATED while blurred does not trigger a read", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1);

  // Screen loses focus
  f.blur();
  assert.equal(f.activeListenerCount, 0, "Listeners must be detached on blur");
  assert.equal(f.appStateListenerCount, 0, "AppState listeners must be detached on blur");

  // External transaction occurs while blurred
  f.emitTransactionMutation();
  await f.flushAsync();
  assert.equal(f.readCount, 1, "Must NOT read data when blurred");

  // Re-focusing re-reads fresh data
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 2, "Must read fresh data upon re-focusing");
});

test("GOAL-F04: multiple rapid transaction mutations coalesce into a single refresh", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1);

  // 10 rapid transactions emitted in the same frame/burst
  for (let i = 0; i < 10; i++) {
    f.emitTransactionMutation();
  }
  await f.flushAsync();
  assert.equal(f.readCount, 2, "Rapid external transactions must coalesce into 1 query run");
});

test("GOAL-F04: AppState resume to active triggers refresh if date changed (midnight rollover)", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1);

  // AppState active without date change does not do an unneeded read
  f.setAppState("active");
  await f.flushAsync();
  assert.equal(f.readCount, 1);
});

test("GOAL-F04: database replacement while focused triggers refresh", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();
  assert.equal(f.readCount, 1);

  f.triggerDbReplacement();
  await f.flushAsync();
  assert.equal(f.readCount, 2, "Database replacement while focused must refresh live goals");
});
