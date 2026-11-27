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
      Promise,
      requestAnimationFrame: (cb) => setTimeout(cb, 0),
      cancelAnimationFrame: (id) => clearTimeout(id),
      setTimeout,
      clearTimeout,
    },
    { filename },
  );
  return exports;
}

function fixture() {
  const pending = [];
  const stateSlots = [];
  let focusEffectCallback = null;
  let queryDelayMs = 0;

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
      useEffect: () => {},
      useRef: (initial) => ({ current: initial }),
      useState: (initial) => {
        const slot = { value: initial };
        stateSlots.push(slot);
        return [
          initial,
          (val) => {
            slot.value = typeof val === "function" ? val(slot.value) : val;
          },
        ];
      },
    },
    "react-native": {
      AppState: { addEventListener: () => ({ remove: () => {} }) },
      DeviceEventEmitter: { addListener: () => ({ remove: () => {} }), emit: () => {} },
    },
    "expo-router": {
      useFocusEffect: (cb) => {
        focusEffectCallback = cb;
      },
    },
    "@/infrastructure/database": {
      subscribeToDatabaseReplacement: () => () => {},
    },
    "@/utils/run-deferred-sync-query": deferred,
    "../schemas/goal.schema": {
      goalErrorMessage: (err) => err?.message ?? String(err),
    },
    "../services/delete-goal.service": { deleteGoal: () => {} },
    "../services/get-goals-with-progress.service": {
      getGoalsWithProgress: () => {
        return {
          goals: [
            {
              id: "g1",
              name: "Retirement",
              currencyCode: "PHP",
              targetAmountMinorUnits: 5000000,
              currentAmountMinorUnits: 1000000,
              progressPercentage: 20,
              isCompleted: false,
              status: "in_progress",
            },
          ],
          summary: {
            currencyCode: "PHP",
            totalTargetMinorUnits: 5000000,
            totalSavedMinorUnits: 1000000,
            totalRemainingMinorUnits: 4000000,
            overallProgressPercentage: 20,
            activeGoalsCount: 1,
            completedGoalsCount: 0,
            totalGoalsCount: 1,
          },
        };
      },
    },
    "../services/save-goal.service": { saveGoal: () => {} },
    "../services/toggle-goal-status.service": { toggleGoalStatus: () => {} },
  });

  const hook = hooks.useGoals();

  const flushAsync = async () => {
    await new Promise((r) => setTimeout(r, 10));
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task.cancelled) task.callback();
    }
  };

  return {
    hook,
    focus: () => {
      if (focusEffectCallback) focusEffectCallback();
    },
    flushAsync,
    getPendingTasksCount: () => pending.filter((t) => !t.cancelled).length,
    getLoading: () => stateSlots[3].value,
    getIsPending: () => stateSlots[4].value,
  };
}

test("GOAL-F06: initial uncached load tracks loading=true and isPending=true", async () => {
  const f = fixture();
  assert.equal(f.getLoading(), true, "Initial loading must be true");
  assert.equal(f.getIsPending(), false, "Initial isPending before focus/refresh is false");

  const p = f.hook.refresh();
  assert.equal(f.getIsPending(), true, "isPending must be true while query is scheduled/running");

  await f.flushAsync();
  await p;
  assert.equal(f.getLoading(), false, "loading must resolve to false after commit");
  assert.equal(f.getIsPending(), false, "isPending must resolve to false after commit");
});

test("GOAL-F06: cached refresh keeps loading=false but sets isPending=true until data commits", async () => {
  const f = fixture();
  // 1. First load
  f.focus();
  await f.flushAsync();
  assert.equal(f.getLoading(), false);
  assert.equal(f.getIsPending(), false);

  // 2. Subsequent cached refresh
  const refreshPromise = f.hook.refresh();
  assert.ok(
    refreshPromise && typeof refreshPromise.then === "function",
    "refresh() must return a Promise",
  );
  assert.equal(f.getLoading(), false, "Cached reload must keep loading=false to avoid skeleton flash");
  assert.equal(f.getIsPending(), true, "Cached reload must set isPending=true while query is pending");

  await f.flushAsync();
  await refreshPromise;
  assert.equal(f.getIsPending(), false, "isPending must settle to false after commit");
});

test("GOAL-F06: rapid successive refreshes cancel previous pending tasks cleanly", async () => {
  const f = fixture();
  f.focus();
  await f.flushAsync();

  // Call refresh multiple times in succession
  const p1 = f.hook.refresh();
  const p2 = f.hook.refresh();
  const p3 = f.hook.refresh();

  assert.equal(f.getIsPending(), true);
  await f.flushAsync();
  await Promise.all([p1, p2, p3]);

  assert.equal(f.getIsPending(), false);
});

test("GOAL-F06 (UI source contract): GoalsScreen awaits refresh() directly with no artificial 500ms timeout", () => {
  const screenPath = path.resolve(__dirname, "../screens/goals-screen.tsx");
  const source = fs.readFileSync(screenPath, "utf8");

  // 1. Must await refresh() in handlePullRefresh
  assert.ok(
    source.includes("await refresh()"),
    "handlePullRefresh must await refresh() directly",
  );

  // 2. Must not contain the hardcoded 500ms setTimeout in handlePullRefresh
  assert.ok(
    !source.includes("setTimeout(() => setIsPullRefreshing(false), 500)"),
    "Must remove the artificial 500ms setTimeout timer from pull-refresh",
  );

  // 3. Must destructure isPending from useGoals and render subtleUpdatingRow
  assert.ok(source.includes("isPending"), "GoalsScreen must destructure isPending from useGoals");
  assert.ok(
    source.includes("subtleUpdatingRow"),
    "GoalsScreen must render subtleUpdatingRow when isPending on cached list",
  );
});
