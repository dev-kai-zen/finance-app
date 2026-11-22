const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../hooks/use-data-import.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup() {
  const hooks = [], effects = [], timers = new Map(), paints = new Set(), jobs = [];
  let cursor = 0, reads = 0, api, nextTimer = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
  const effect = (fn, deps) => {
    const index = cursor++, old = hooks[index];
    if (!old || !same(old.deps, deps)) {
      hooks[index] = { deps, cleanup: old?.cleanup };
      effects.push(() => { old?.cleanup?.(); hooks[index].cleanup = fn(); });
    }
  };
  const catalog = { accounts: [], categories: [], accountTypes: [], currencies: ["PHP"], sourceKeys: [], fingerprints: [] };
  const file = { document: { headers: ["Date"], rows: [{ number: 2, cells: ["2026-01-02"] }] }, hash: "file", name: "file.csv" };
  class ImportValidationError extends Error {}
  class ImportWorkCancelled extends Error {}
  const imports = {
    react: {
      useState(initial) {
        const index = cursor++;
        hooks[index] ??= { value: typeof initial === "function" ? initial() : initial };
        return [hooks[index].value, (next) => { hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next; }];
      },
      useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
      useCallback(fn, deps) { const index = cursor++; if (!hooks[index] || !same(hooks[index].deps, deps)) hooks[index] = { deps, fn }; return hooks[index].fn; },
      useEffect: effect,
    },
    "expo-router": { useFocusEffect: (fn) => effect(fn, [fn]) },
    "react-native": { DeviceEventEmitter: { emit: () => {} } },
    "@/infrastructure/database": { subscribeToDatabaseReplacement: () => () => {} },
    "@/utils/schedule-after-paint": { scheduleAfterPaint: (fn) => { paints.add(fn); return () => paints.delete(fn); } },
    "@/modules/currencies": { useCurrencyPreferences: () => ({ preferences: { defaultCurrency: "PHP" } }) },
    "@/modules/pro": { PRO_LIMITS: { FREE_MAX_ACCOUNTS: 5 }, useProStatus: () => ({ isPro: false }) },
    "../services/import-catalog.service": { getImportCatalog: () => { reads++; return catalog; } },
    "../services/prepare-import-preview.service": { prepareImportPreviewAsync: (...args) => new Promise((resolve, reject) => jobs.push({ args, resolve, reject })) },
    "../services/import-files.service": { pickImportFile: async () => file },
    "../services/commit-import.service": {},
    "../repositories/imports.repository": { listImportHistory: () => [] },
    "../utils/csv": { ImportValidationError, suggestColumns: () => ({ date: 0 }) },
    "../utils/import-preview": { sourceAccountNames: () => ["Cash"], sourceCategories: () => [] },
    "../utils/import-work": { ImportWorkCancelled },
    "../utils/import-analysis": { analyzeImportAsync: async () => ({ accountNames: ["Cash"], categoryNames: [], types: [], dates: null, transfer: {} }) },
    "../utils/prepare-import-mappings": {},
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: (name) => { assert.ok(name in imports, name); return imports[name]; },
    setTimeout: (fn) => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
  });
  const render = () => { cursor = 0; api = module.exports.useDataImport(); while (effects.length) effects.shift()(); return api; };
  const flushTimers = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); };
  const flushPaints = () => { const pending = [...paints]; paints.clear(); pending.forEach((fn) => fn()); };
  return { render, flushTimers, flushPaints, jobs, get reads() { return reads; },
    unmount() { hooks.forEach((hook) => hook?.cleanup?.()); },
    async pick() { const picking = api.pick(); flushTimers(); await picking; return render(); },
  };
}

test("V2-08: pending previews clear immediately, coalesce typing, and reject stale results", async () => {
  const env = setup(); env.render(); assert.equal(env.reads, 0);
  env.flushPaints(); env.render(); assert.equal(env.reads, 1);
  let state = await env.pick();
  assert.equal(state.preview, null); assert.equal(state.previewPending, true);
  env.flushTimers(); env.flushPaints(); assert.equal(env.jobs.length, 1);
  const old = env.jobs[0];
  state.patch({ source: "A" }); state = env.render();
  state.patch({ source: "AB" }); state = env.render();
  state.patch({ source: "ABC" }); state = env.render();
  assert.equal(env.reads, 2); assert.equal(env.jobs.length, 1);
  assert.equal(old.args[5].isCancelled(), true);
  env.flushTimers(); env.flushPaints(); assert.equal(env.jobs.length, 2);
  old.resolve({ ready: true, signature: "stale", rows: [] }); await new Promise(setImmediate);
  state = env.render(); assert.equal(state.preview, null); assert.equal(state.previewPending, true);
  env.jobs[1].resolve({ ready: true, signature: "current", rows: [] }); await new Promise(setImmediate);
  state = env.render(); assert.equal(state.preview.signature, "current"); assert.equal(state.previewPending, false);
  state.patch({ source: "next" }); state = env.render();
  assert.equal(state.preview, null); assert.equal(state.previewPending, true);
  env.flushTimers(); env.flushPaints();
  const last = env.jobs.at(-1); env.unmount(); assert.equal(last.args[5].isCancelled(), true);
});

test("V2-08: unmount cancels the initial database read and a queued preview", async () => {
  const env = setup(); env.render(); env.unmount(); env.flushPaints(); assert.equal(env.reads, 0);
  const other = setup(); other.render(); other.flushPaints(); other.render(); await other.pick();
  other.unmount(); other.flushTimers(); other.flushPaints(); assert.equal(other.jobs.length, 0);
});
