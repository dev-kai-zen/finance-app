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
  vm.runInNewContext(code, { exports, require(id) {
    assert.ok(Object.hasOwn(dependencies, id), "Unexpected dependency: " + id);
    return dependencies[id];
  }, console }, { filename });
  return exports;
}

function fixture(skipQuery = false) {
  const pending = [];
  const state = [];
  let focus;
  let reads = 0;
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
    "@/utils/run-deferred-sync-query": deferred,
    "expo-router": { useFocusEffect: effect => { focus = effect; } },
    "@/infrastructure/localization": {},
    "@/modules/currencies": { useCurrencyPreferences: () => ({ preferences: { defaultCurrency: "PHP" } }) },
    "../repositories/subscriptions.repository": { listSubscriptions: () => { reads++; return [{ id: "fresh" }]; } },
    "../services/calculate-burn-rate.service": { calculateBurnRateSummary: () => ({}) },
    "../services/delete-subscription.service": {},
    "../services/record-subscription-payment.service": {},
    "../services/toggle-subscription-status.service": {},
  });
  const hook = hooks.useSubscriptions({ skipQuery });
  return { hook, pending, state, focus: () => focus(), get reads() { return reads; }, flush() {
    for (const task of pending.splice(0)) if (!task.cancelled) task.callback();
  } };
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
});
