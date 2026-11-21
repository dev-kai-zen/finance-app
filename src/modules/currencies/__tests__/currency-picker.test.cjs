const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(file, dependencies) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = [];
  const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    memo: component => component,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useMemo(create, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: create() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i], deps)) {
        slots[i] = deps;
        effects.push(() => { cleanups[i]?.(); cleanups[i] = effect(); });
      }
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (!(name in dependencies)) throw Error("Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return {
    render(fn) { cursor = 0; const value = fn(exports); const pending = effects; effects = []; pending.forEach(run => run()); return value; },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}

function find(tree, type) {
  if (!tree || typeof tree !== "object") return undefined;
  if (tree.type === type) return tree;
  const children = tree.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = find(child, type);
    if (match) return match;
  }
}

function picker() {
  const queued = new Set();
  const selected = [];
  let closed = 0;
  let dismissed = 0;
  let hookCalls = 0;
  const currencies = [
    { code: "PHP", name: "Philippine Peso", symbol: "\u20b1 ", isActive: true },
    { code: "USD", name: "US Dollar", symbol: "$", isActive: true },
    { code: "TOK", name: "Custom Token", symbol: "\u2605", isActive: true },
    { code: "OLD", name: "Inactive", symbol: "!", isActive: false },
  ];
  const props = { visible: true, selectedCode: " php ", onClose: () => closed++, onSelect: code => selected.push(code) };
  const styles = new Proxy({}, { get: (_, key) => key });
  const native = Object.fromEntries(["FlatList", "Modal", "Pressable", "Text", "View"].map(key => [key, key]));
  native.Keyboard = { dismiss: () => dismissed++ };
  native.StyleSheet = { create: value => value };
  const h = harness("../components/currency-picker-modal.tsx", {
    "react-native": native,
    "react-native-keyboard-controller": { KeyboardAvoidingView: "KeyboardAvoidingView" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "lucide-react-native": { X: "X" },
    "@/hooks/use-app-theme": { useAppTheme: () => ({ spacing: { xl: 20 }, colors: {} }), useThemeStyles: () => styles },
    "@/modules/accounts": { AccountSearchBox: "Search" },
    "@/components/page-container": { PageLoadingState: "Skeleton" },
    "@/utils/schedule-after-paint": { scheduleAfterPaint: callback => { queued.add(callback); return () => queued.delete(callback); } },
    "../hooks/use-currency-options": { useCurrencyOptions: () => { hookCalls++; return { currencies, loading: false }; } },
  });
  const render = () => h.render(exports => {
    const outer = exports.CurrencyPickerModal(props);
    return outer ? outer.type(outer.props) : outer;
  });
  return { ...h, render, props, selected, queued, get closed() { return closed; }, get dismissed() { return dismissed; }, get hookCalls() { return hookCalls; } };
}

test("closed picker mounts no currency hook; open picker leaves rows to FlatList", () => {
  const h = picker();
  h.props.visible = false;
  assert.equal(h.render(), null);
  assert.equal(h.hookCalls, 0);
  h.props.visible = true;
  const list = find(h.render(), "FlatList");
  assert.equal(list.props.initialNumToRender, 15);
  assert.equal(list.props.maxToRenderPerBatch, 15);
  assert.equal(list.props.windowSize, 5);
  assert.equal(list.props.children, undefined, "Rows must not be eagerly mapped into children");
  assert.deepEqual(Array.from(list.props.data, item => item.code), ["PHP", "USD", "TOK"]);
  assert.equal(list.props.keyExtractor(list.props.data[0]), "PHP");
  const row = list.props.renderItem({ item: list.props.data[0] });
  assert.equal(row.type(row.props).props.accessibilityState.selected, true);
  h.unmount();
});

test("search matches code, name and custom symbol, clears instantly, and preserves row callback identity", () => {
  const h = picker();
  let tree = h.render();
  const initialList = find(tree, "FlatList");
  for (const [query, expected] of [[" usd ", "USD"], ["peso", "PHP"], ["\u2605", "TOK"], ["unknown", undefined]]) {
    find(tree, "Search").props.onChangeText(query);
    tree = h.render();
    const list = find(tree, "FlatList");
    assert.equal(list.props.data[0]?.code, expected);
    assert.equal(list.props.renderItem, initialList.props.renderItem);
  }
  find(tree, "Search").props.onChangeText("");
  assert.equal(find(h.render(), "FlatList").props.data.length, 3);
  h.unmount();
});

test("selection is deferred once, disables rows and dismisses the keyboard; close/unmount cancel stale selection", () => {
  const h = picker();
  let list = find(h.render(), "FlatList");
  const row = list.props.renderItem({ item: list.props.data[1] });
  const button = row.type(row.props);
  button.props.onPress(); button.props.onPress();
  assert.equal(h.queued.size, 1);
  assert.equal(h.selected.length, 0);
  list = find(h.render(), "FlatList");
  const pendingRow = list.props.renderItem({ item: list.props.data[1] });
  assert.equal(pendingRow.props.selected, true);
  assert.equal(pendingRow.props.disabled, true);
  [...h.queued][0](); h.queued.clear();
  assert.deepEqual(h.selected, ["USD"]);
  assert.equal(h.closed, 1);
  assert.ok(h.dismissed > 0);
  h.unmount();

  for (const cancel of ["close", "unmount"]) {
    const next = picker();
    const tree = next.render();
    const list = find(tree, "FlatList");
    const row = list.props.renderItem({ item: list.props.data[0] });
    row.type(row.props).props.onPress();
    if (cancel === "close") find(tree, "Modal").props.onRequestClose();
    else next.unmount();
    assert.equal(next.queued.size, 0);
    assert.deepEqual(next.selected, []);
    next.unmount();
  }
});

test("picker reads only a deferred currency snapshot and coalesces replacement events; unmount cancels pending reads", () => {
  let reads = 0;
  let listener;
  let unsubscribed = false;
  const pending = new Set();
  const rows = [{ code: "PHP" }];
  const h = harness("../hooks/use-currency-options.ts", {
    "@/infrastructure/database/database-replacement": { subscribeToDatabaseReplacement: callback => { listener = callback; return () => { unsubscribed = true; }; } },
    "@/utils/run-deferred-sync-query": { runDeferredSyncQuery: (options, query) => {
      options.setLoading(true);
      const callback = () => { query(); options.setLoading(false); };
      pending.add(callback);
      return () => pending.delete(callback);
    } },
    "../repositories/currencies.repository": { listCurrencies: () => { reads++; return rows; } },
  });
  const render = () => h.render(exports => exports.useCurrencyOptions());
  assert.equal(render().loading, true);
  assert.equal(reads, 0);
  [...pending][0](); pending.clear();
  assert.equal(render().currencies, rows);
  assert.equal(render().loading, false);
  listener(); listener();
  assert.equal(pending.size, 1);
  assert.equal(render().loading, true);
  h.unmount();
  assert.equal(pending.size, 0);
  assert.equal(reads, 1);
  assert.equal(unsubscribed, true);
});
