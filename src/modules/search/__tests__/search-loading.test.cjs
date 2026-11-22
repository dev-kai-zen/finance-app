const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function createHarness(file, imports) {
  const slots = [], effects = [], cleanups = [], pending = new Set(), timers = new Map();
  let cursor = 0, dirty = false, now = 0, timerId = 0, unmounted = false, output, renderFn;
  const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => {
        assert.equal(unmounted, false, "State must not update after unmount");
        const next = typeof value === "function" ? value(slots[i]) : value;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useMemo(create, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: create() }; return slots[i].value; },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i], deps)) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = effect(); }); }
    },
  };
  const scheduleAfterPaint = callback => { pending.add(callback); return () => pending.delete(callback); };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, console,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    require(name) {
      if (name === "react") return react;
      if (name === "expo-router") return { useFocusEffect: callback => react.useEffect(callback, [callback]) };
      if (name === "@/utils/schedule-after-paint") return { scheduleAfterPaint };
      if (name === "@/utils/run-deferred-sync-query") return { runDeferredSyncQuery(options, query) {
        if (!options.hasCachedResult) options.setLoading(true);
        return scheduleAfterPaint(() => { try { query(); } finally { options.onMarkLoaded?.(); options.setLoading(false); } });
      } };
      if (name in imports) return imports[name];
      throw Error("Unexpected dependency: " + name);
    },
  });
  const settle = () => {
    let iterations = 0;
    do {
      assert.ok(++iterations < 30, "Render loop must settle");
      cursor = 0; dirty = false; output = renderFn(exports);
      effects.splice(0).forEach(run => run());
    } while (dirty);
    return output;
  };
  return {
    render(fn) { renderFn = fn; return settle(); },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
      return settle();
    },
    async paint() { const callbacks = [...pending]; pending.clear(); callbacks.forEach(run => run()); await new Promise(resolve => setImmediate(resolve)); return settle(); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); unmounted = true; },
    get pending() { return pending.size; }, get timers() { return timers.size; },
  };
}

function searchHarness() {
  const calls = [], gates = [];
  const t = key => key;
  const data = {
    accounts: [{ id: "account", name: "Match account", currencyCode: "PHP" }],
    pockets: [{ id: "pocket", name: "Match pocket", accountId: "account" }],
    categories: [{ id: "category", name: "Match category", type: "expense" }],
    budgets: [{ id: "budget", categoryId: "category", amountMinorUnits: 100, currencyCode: "PHP" }],
    goals: [{ id: "goal", name: "Match goal", targetAmountMinorUnits: 500, currencyCode: "PHP" }],
    notes: [{ id: "note", title: "Match note", content: "Text" }],
    schedules: [{ id: "schedule", name: "Match schedule", frequency: "monthly", amountMinorUnits: 10, accountId: "account" }],
    labels: [{ id: "label", name: "Match label" }],
    subscriptions: [{ id: "sub", name: "Match subscription", status: "active", billingCycle: "monthly", amountMinorUnits: 10, currencyCode: "PHP" }],
  };
  const state = { ...data, loading: false };
  const domain = (name, options) => { gates.push({ name, ...options }); return state; };
  const imports = {
    "@/infrastructure/localization": { useLocalization: () => ({ t }) },
    "@/utils/currency": { formatCurrency: amount => String(amount) },
    "../constants/search-catalog": { SEARCH_CATALOG: [{ id: "suggested", category: "action", titleKey: "Match action", descriptionKey: "Description", keywords: ["match"], route: "/", iconName: "plus" }], SUGGESTED_SHORTCUT_IDS: ["suggested"] },
    "@/modules/transactions": { searchTransactions(query, limit) {
      calls.push({ query, limit });
      return [{ id: query, name: "Match transaction", occurredAt: new Date(2026, 1, 1), amountMinorUnits: 100, currencyCode: "PHP", type: "income" }];
    } },
  };
  for (const [module, hook] of [["accounts", "useAccounts"], ["categories", "useCategories"], ["goals", "useGoals"], ["notes", "useNotes"], ["scheduled-transactions", "useScheduledTransactions"], ["labels", "useLabels"], ["subscriptions", "useSubscriptions"]]) {
    imports["@/modules/" + module] = { [hook]: options => domain(module, options) };
  }
  imports["@/modules/budgets"] = { useBudgets: (_date, options) => domain("budgets", options) };
  const h = createHarness("../hooks/use-general-search.ts", imports);
  let query = "", open = true;
  return { ...h, calls, gates, state,
    render(value = query, isOpen = open) { query = value; open = isOpen; gates.length = 0; return h.render(exports => exports.useGeneralSearch(query, open)); },
    advance: ms => h.advance(ms), paint: () => h.paint(),
    get pending() { return h.pending; }, get timers() { return h.timers; },
  };
}

test("P3-04: empty/closed search gates every domain and never schedules SQL or schedule processing", () => {
  const h = searchHarness();
  assert.equal(h.render().sections[0].data[0].isSuggested, true);
  assert.equal(new Set(h.gates.map(gate => gate.name)).size, 8);
  assert.ok(h.gates.every(gate => gate.skipQuery));
  assert.equal(h.gates.find(gate => gate.name === "scheduled-transactions").readOnly, true);
  assert.equal(h.render("match", false).hasQuery, false);
  assert.equal(h.pending, 0); assert.equal(h.timers, 0); assert.equal(h.calls.length, 0);
  h.unmount();
});

test("P3-04: rapid typing debounces for 150ms, SQL waits for paint, and domain updates do not repeat transaction SQL", async () => {
  const h = searchHarness();
  assert.equal(h.render("m").loading, true);
  h.advance(100); h.render("ma"); h.advance(100); h.render("match");
  h.advance(149);
  assert.equal(h.calls.length, 0); assert.ok(h.gates.every(gate => gate.skipQuery));
  assert.equal(h.advance(1).loading, true);
  assert.equal(h.calls.length, 0); assert.equal(h.pending, 1);
  const resolved = await h.paint();
  assert.equal(resolved.loading, false);
  assert.equal(h.calls.length, 1); assert.deepEqual(h.calls[0], { query: "match", limit: 8 });
  assert.deepEqual(Array.from(resolved.sections, section => section.category), ["action", "account", "pocket", "category", "transaction", "subscription", "budget", "goal", "note", "schedule", "label"]);
  assert.ok(resolved.sections.find(section => section.category === "transaction").data[0].route.includes("inspectId=match"));
  h.state.loading = true;
  assert.equal(h.render().loading, true); assert.equal(h.render().sections.length, 0);
  h.state.loading = false; h.render();
  assert.equal(h.calls.length, 1);
  h.unmount();
});

test("P3-04: clearing is immediate; editing/closing/unmount cancel timers and deferred SQL", async () => {
  for (const cancel of ["clear", "edit", "close", "unmount"]) {
    const h = searchHarness();
    h.render("match"); h.advance(150);
    assert.equal(h.pending, 1);
    if (cancel === "clear") {
      const result = h.render("   ");
      assert.equal(result.hasQuery, false); assert.equal(result.loading, false);
      assert.equal(result.sections[0].data[0].isSuggested, true);
    } else if (cancel === "edit") h.render("new");
    else if (cancel === "close") h.render("match", false);
    else h.unmount();
    assert.equal(h.pending, 0);
    assert.equal(h.calls.length, 0);
    if (cancel !== "unmount") h.unmount();
    assert.equal(h.timers, 0);
  }
});

// Exercise the real management hooks, rather than trusting search's skip flags.
for (const [module, hook] of [["accounts", "useAccounts"], ["budgets", "useBudgets"], ["goals", "useGoals"], ["labels", "useLabels"], ["subscriptions", "useSubscriptions"], ["scheduled-transactions", "useScheduledTransactions"]]) {
  test("P3-04: " + hook + " gates/cancels reads and defers its enabled load", async () => {
    const calls = [];
    const source = fs.readFileSync(path.resolve(__dirname, "../../" + module + "/hooks/" + (module === "scheduled-transactions" ? "use-scheduled-transactions" : "use-" + module) + ".ts"), "utf8");
    const imports = {};
    const functionMock = name => (...args) => {
      calls.push(name);
      if (name === "processDueSchedulesAsync") return Promise.resolve();
      if (name === "getGoalsWithProgress") return { goals: [], summary: {} };
      return [];
    };
    for (const match of source.matchAll(/from +"([^"]+)"/g)) {
      const name = match[1];
      if (name === "react" || name === "expo-router" || name === "@/utils/run-deferred-sync-query") continue;
      imports[name] = new Proxy({}, { get: (_, key) => functionMock(String(key)) });
    }
    imports["@/infrastructure/localization"] = { useLocalization: () => ({ t: key => key }) };
    imports["@/modules/currencies"] = { useCurrencyPreferences: () => ({ preferences: { defaultCurrency: "PHP" } }) };
    const categories = { categories: [], loading: false };
    imports["@/modules/categories"] = { useCategories: options => { assert.equal(options.skipQuery, skipQuery); return categories; } };
    imports["react-native"] = { DeviceEventEmitter: { addListener: () => ({ remove() {} }) } };
    let skipQuery = true;
    const h = createHarness("../../" + module + "/hooks/" + (module === "scheduled-transactions" ? "use-scheduled-transactions" : "use-" + module) + ".ts", imports);
    const render = () => h.render(exports => hook === "useBudgets" ? exports[hook](undefined, { skipQuery }) : exports[hook]({ skipQuery, readOnly: true }));
    render(); assert.equal(h.pending, 0); assert.equal(calls.filter(name => name !== "calculateBurnRateSummary").length, 0);
    skipQuery = false; render();
    assert.equal(h.pending, 1);
    assert.equal(calls.filter(name => name !== "calculateBurnRateSummary").length, 0);
    await h.paint();
    assert.ok(calls.some(name => /^(list|get)/.test(name)));
    assert.equal(calls.includes("processDueSchedulesAsync"), false);
    assert.equal(calls.includes("reconcileOrphanedSubscriptionSchedules"), false);
    render().refresh();
    skipQuery = true; render();
    assert.equal(h.pending, 0);
    if (module === "scheduled-transactions") {
      h.render(exports => exports[hook]());
      await h.paint();
      assert.ok(calls.includes("processDueSchedulesAsync"), "The management hook retains its default posting behavior");
      assert.equal(calls.includes("reconcileOrphanedSubscriptionSchedules"), false, "Maintenance belongs to the startup processor");
    }
    skipQuery = false;
    render().refresh();
    assert.equal(h.pending, 1);
    h.unmount();
    assert.equal(h.pending, 0);
  });
}


test("P3-04: returning to a previously debounced query still waits 150ms before SQL", async () => {
  const h = searchHarness();
  h.render("match"); h.advance(150);
  h.render("match edited");
  assert.equal(h.pending, 0);
  assert.equal(h.render("match").loading, true);
  assert.equal(h.pending, 0);
  h.advance(149); assert.equal(h.pending, 0);
  h.advance(1); assert.equal(h.pending, 1);
  await h.paint(); assert.equal(h.calls.length, 1);
  h.unmount();
});
