const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTs(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    console: { error() {} },
    Date: global.Date,
    require(name) {
      assert.ok(name in imports, "Unexpected dependency: " + name);
      return imports[name];
    },
    requestAnimationFrame: (cb) => global.requestAnimationFrame(cb),
    cancelAnimationFrame: (id) => global.cancelAnimationFrame(id),
  });
  return exports;
}

function createHarness({ initialDate = new Date(2026, 10, 24, 12) } = {}) {
  let cursor = 0;
  const slots = [];
  const scheduledFrames = new Map();
  let nextFrameId = 1;
  const mutationListeners = new Set();
  const appStateListeners = new Set();
  const dbReplacementListeners = new Set();
  let focusCallback, activeFocus, cleanupFocus;
  let effectCallback, cleanupEffect;
  let focused = true, unmounted = false;
  let reads = 0;
  let simulatedDebt = 100000;
  let currentDate = initialDate;

  const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          assert.equal(unmounted, false, "No state writes after unmount");
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: value });
    },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
      return slots[i].value;
    },
    useCallback(callback, deps) {
      return react.useMemo(() => callback, deps);
    },
    useEffect(callback) {
      effectCallback = callback;
    },
  };

  const { toCalendarDate } = loadTs("../utils/billing-dates.ts", {});

  const { useCreditCardMonitoring } = loadTs("../hooks/use-credit-card-monitoring.ts", {
    react,
    "react-native": {
      AppState: {
        addEventListener(event, callback) {
          appStateListeners.add(callback);
          return { remove: () => appStateListeners.delete(callback) };
        },
      },
      DeviceEventEmitter: {
        addListener(event, callback) {
          mutationListeners.add(callback);
          return { remove: () => mutationListeners.delete(callback) };
        },
      },
    },
    "expo-router": {
      useFocusEffect: (callback) => {
        focusCallback = callback;
      },
    },
    "@/infrastructure/database": {
      subscribeToDatabaseReplacement: (callback) => {
        dbReplacementListeners.add(callback);
        return () => dbReplacementListeners.delete(callback);
      },
    },
    "@/modules/currencies": {
      useCurrencyPreferences: () => ({
        preferences: { defaultCurrency: "PHP" },
      }),
    },
    "../services/get-credit-card-monitoring.service": {
      getCreditCardMonitoring: () => {
        reads++;
        return {
          cards: [
            {
              accountId: "card",
              accountName: "Test Card",
              currencyCode: "PHP",
              creditLimitMinorUnits: 5000000,
              billedMinorUnits: 0,
              unbilledMinorUnits: simulatedDebt,
              outstandingMinorUnits: simulatedDebt,
              availableCreditMinorUnits: 5000000 - simulatedDebt,
              utilizationPercent: (simulatedDebt / 5000000) * 100,
              dueThisMonthMinorUnits: 0,
              overdueMinorUnits: 0,
              nextDueOn: "2026-11-25",
              activeInstallmentCount: 0,
              billedItems: [],
              unbilledItems: [],
              statements: [],
            },
          ],
          dueThisMonthMinorUnits: 0,
          overdueMinorUnits: 0,
        };
      },
    },
    "../utils/billing-dates": {
      toCalendarDate: (d) => toCalendarDate(d),
    },
  });

  // Mock global animation frame
  global.requestAnimationFrame = (callback) => {
    const id = nextFrameId++;
    scheduledFrames.set(id, callback);
    return id;
  };
  global.cancelAnimationFrame = (id) => {
    scheduledFrames.delete(id);
  };

  return {
    render() {
      cursor = 0;
      const state = useCreditCardMonitoring();
      if (!cleanupEffect && effectCallback) {
        cleanupEffect = effectCallback();
      }
      if (focused && activeFocus !== focusCallback) {
        cleanupFocus?.();
        activeFocus = focusCallback;
        cleanupFocus = focusCallback();
      }
      return state;
    },
    flushFrame() {
      const frames = [...scheduledFrames.values()];
      scheduledFrames.clear();
      frames.forEach((fn) => fn());
    },
    emitMutation(sourceId = "global-quick-entry") {
      mutationListeners.forEach((fn) => fn({ sourceId }));
    },
    setAppState(state) {
      appStateListeners.forEach((fn) => fn(state));
    },
    replaceDatabase() {
      dbReplacementListeners.forEach((fn) => fn());
    },
    blur() {
      cleanupFocus?.();
      cleanupFocus = null;
      activeFocus = null;
      focused = false;
    },
    focus() {
      focused = true;
    },
    unmount() {
      this.blur();
      cleanupEffect?.();
      cleanupEffect = null;
      unmounted = true;
    },
    set debt(val) {
      simulatedDebt = val;
    },
    get reads() {
      return reads;
    },
    get pendingFrames() {
      return scheduledFrames.size;
    },
    get mutationListeners() {
      return mutationListeners.size;
    },
    get appStateListeners() {
      return appStateListeners.size;
    },
    get dbReplacementListeners() {
      return dbReplacementListeners.size;
    },
  };
}

test("CC-F06: initial focus schedules refresh via animation frame and loads data", () => {
  const h = createHarness();
  try {
    const initial = h.render();
    assert.equal(initial.loading, true);
    assert.equal(h.reads, 0, "Initial render must defer SQLite read to animation frame");
    assert.equal(h.pendingFrames, 1);

    h.flushFrame();
    const loaded = h.render();
    assert.equal(h.reads, 1);
    assert.equal(loaded.loading, false);
    assert.equal(loaded.cards[0].outstandingMinorUnits, 100000);
  } finally {
    h.unmount();
  }
});

test("CC-F06: FINANCE_APP_TRANSACTION_MUTATED while focused refreshes data without skeleton flicker", () => {
  const h = createHarness();
  try {
    h.render();
    h.flushFrame();
    assert.equal(h.reads, 1);

    // External write via Quick Entry (debt increases to 150,000)
    h.debt = 150000;
    h.emitMutation("quick-entry");
    assert.equal(h.pendingFrames, 1);

    // Frame flushes
    h.flushFrame();
    const updated = h.render();
    assert.equal(h.reads, 2);
    assert.equal(updated.loading, false, "Background mutation refresh must NOT reset loading to true");
    assert.equal(updated.cards[0].outstandingMinorUnits, 150000);
  } finally {
    h.unmount();
  }
});

test("CC-F06: burst mutation events coalesce into a single animation frame refresh", () => {
  const h = createHarness();
  try {
    h.render();
    h.flushFrame();
    assert.equal(h.reads, 1);

    // 5 rapid burst mutations from a batch import or multi-leg transfer
    h.debt = 250000;
    h.emitMutation();
    h.emitMutation();
    h.emitMutation();
    h.emitMutation();
    h.emitMutation();

    assert.equal(h.pendingFrames, 1, "Burst events must coalesce into exactly one pending frame");
    h.flushFrame();
    assert.equal(h.reads, 2, "Only one database refresh query should execute for the coalesced burst");
    assert.equal(h.render().cards[0].outstandingMinorUnits, 250000);
  } finally {
    h.unmount();
  }
});

test("CC-F06: blur and unmount detach listeners and cancel pending frames (no offscreen reads)", () => {
  const h = createHarness();
  try {
    h.render();
    h.flushFrame();
    assert.equal(h.reads, 1);

    // Mutation triggers frame, then user quickly navigates away (blur)
    h.emitMutation();
    assert.equal(h.pendingFrames, 1);
    h.blur();

    assert.equal(h.pendingFrames, 0, "Blur must cancel pending animation frame");
    assert.equal(h.mutationListeners, 0, "Blur must detach DeviceEventEmitter mutation listener");
    assert.equal(h.appStateListeners, 0, "Blur must detach AppState listener");

    // Mutation happens while screen is offscreen in another tab
    h.debt = 300000;
    h.emitMutation();
    assert.equal(h.pendingFrames, 0, "Offscreen mutation must NOT schedule any refresh");
    assert.equal(h.reads, 1, "Offscreen mutation must NOT trigger any database reads");

    // User navigates back into focus
    h.focus();
    h.render();
    assert.equal(h.pendingFrames, 1, "Refocusing must schedule fresh load");
    h.flushFrame();
    assert.equal(h.reads, 2);
    assert.equal(h.render().cards[0].outstandingMinorUnits, 300000);
  } finally {
    h.unmount();
  }
});

test("CC-F06: database replacement triggers refresh when focused", () => {
  const h = createHarness();
  try {
    h.render();
    h.flushFrame();
    assert.equal(h.reads, 1);

    // Backup restore replaces database while screen is focused
    h.debt = 50000;
    h.replaceDatabase();
    assert.equal(h.pendingFrames, 1);
    h.flushFrame();
    assert.equal(h.reads, 2);
    assert.equal(h.render().cards[0].outstandingMinorUnits, 50000);
  } finally {
    h.unmount();
  }
});

test("CC-F06: AppState resume across midnight / day change triggers refresh", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 24, 12).getTime() });
  const h = createHarness();
  try {
    h.render();
    h.flushFrame();
    assert.equal(h.reads, 1);

    // App resumes on the same day: no unnecessary refresh
    h.setAppState("active");
    assert.equal(h.pendingFrames, 0, "Same-day resume should not re-query database");

    // Time rolls over across midnight to next day (Nov 25)
    t.mock.timers.setTime(new Date(2026, 10, 25, 9).getTime());
    h.setAppState("active");
    assert.equal(h.pendingFrames, 1, "Resume on a new calendar date must schedule refresh");
    h.flushFrame();
    assert.equal(h.reads, 2);
  } finally {
    h.unmount();
  }
});

