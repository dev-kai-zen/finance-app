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
  let shouldFailRead = options.shouldFailRead ?? false;
  let shouldFailDelete = options.shouldFailDelete ?? false;
  let shouldFailToggle = options.shouldFailToggle ?? false;
  const pending = [];
  const stateSlots = [];
  let focusEffectCallback = null;

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
    "../services/delete-goal.service": {
      deleteGoal: () => {
        if (shouldFailDelete) throw new Error("Disk I/O failure on delete");
      },
    },
    "../services/get-goals-with-progress.service": {
      getGoalsWithProgress: () => {
        if (shouldFailRead) throw new Error("Corrupted SQLite index");
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
    "../services/save-goal.service": { saveGoal: () => {} },
    "../services/toggle-goal-status.service": {
      toggleGoalStatus: () => {
        if (shouldFailToggle) throw new Error("Status transition constraint failed");
      },
    },
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
    setFailRead: (v) => {
      shouldFailRead = v;
    },
    setFailDelete: (v) => {
      shouldFailDelete = v;
    },
    setFailToggle: (v) => {
      shouldFailToggle = v;
    },
    flushAsync,
    stateSlots,
    getError: () => stateSlots[4].value,
  };
}

test("GOAL-F05: useGoals sets error state on failed read and exposes clearError", async () => {
  const f = fixture({ shouldFailRead: true });
  f.focus();
  await f.flushAsync();

  assert.equal(f.getError(), "Corrupted SQLite index", "Must store query error message");

  // Verify clearError resets error to null
  f.hook.clearError();
  assert.equal(f.getError(), null, "clearError must reset error to null");
});

test("GOAL-F05: useGoals delete failure sets error and throws for caller catch", () => {
  const f = fixture({ shouldFailDelete: true });
  assert.throws(
    () => f.hook.deleteGoal("g1"),
    /Disk I\/O failure on delete/,
    "Must throw to allow UI boundary handling",
  );
  assert.equal(f.getError(), "Disk I/O failure on delete");
});

test("GOAL-F05: useGoals toggleStatus failure sets error and throws for caller catch", () => {
  const f = fixture({ shouldFailToggle: true });
  assert.throws(
    () => f.hook.toggleStatus("g1", "completed"),
    /Status transition constraint failed/,
    "Must throw to allow UI boundary handling",
  );
  assert.equal(f.getError(), "Status transition constraint failed");
});

test("GOAL-F05 (UI source contract): GoalsScreen connects error handling, PageErrorState, and guarded delete", () => {
  const screenPath = path.resolve(__dirname, "../screens/goals-screen.tsx");
  const source = fs.readFileSync(screenPath, "utf8");

  // 1. Must import and use PageErrorState
  assert.ok(source.includes("PageErrorState"), "Must import and render PageErrorState");
  assert.ok(
    source.includes("error && goals.length === 0"),
    "Must gate first-read errors before empty state",
  );

  // 2. Must connect deleteError and isDeleting to ConfirmModal
  assert.ok(source.includes("error={deleteError}"), "ConfirmModal must receive error prop");
  assert.ok(source.includes("pending={isDeleting}"), "ConfirmModal must receive pending prop");

  // 3. handleConfirmDelete must have try/catch so exceptions do not escape unhandled
  assert.ok(
    source.includes("setDeleteError(err?.message"),
    "handleConfirmDelete must catch errors and set deleteError",
  );

  // 4. handleToggleGoalStatus must have try/catch
  assert.ok(
    source.includes("handleToggleGoalStatus"),
    "onToggleStatus must use guarded handleToggleGoalStatus",
  );
  assert.ok(
    source.includes("setActionError(err?.message"),
    "handleToggleGoalStatus must catch errors and set actionError",
  );

  // 5. Must render cached error retry banner
  assert.ok(
    source.includes("error && goals.length > 0"),
    "Must render cached error banner when goals are present but refresh failed",
  );
});
