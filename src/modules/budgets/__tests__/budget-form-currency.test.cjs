const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the actual TSX and event handlers; native children remain inspectable elements.
function harness(file, dependencies = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = [];
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
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
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      assert.ok(name in dependencies, "Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return {
    exports,
    render(render) {
      cursor = 0;
      const tree = render(exports);
      const pending = effects;
      effects = [];
      pending.forEach(run => run());
      return tree;
    },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}

function find(tree, predicate) {
  if (Array.isArray(tree)) {
    for (const child of tree) { const result = find(child, predicate); if (result) return result; }
  } else if (tree && typeof tree === "object") {
    if (predicate(tree)) return tree;
    return find(tree.props?.children, predicate);
  }
}

const currency = harness("../../../utils/currency.ts").exports;
const native = Object.fromEntries(["Modal", "Pressable", "ScrollView", "Text", "View"].map(name => [name, name]));
native.StyleSheet = { create: styles => styles };
native.Keyboard = { dismiss() {} };
native.useWindowDimensions = () => ({ width: 390 });
const theme = {
  useAppTheme: () => ({ colors: { primary: "blue", textSecondary: "gray" } }),
  useThemeStyles: () => ({}),
};
const components = Object.fromEntries([
  "AmountCalculatorField", "AmountCalculatorModal", "FullScreenFormModal", "HelpIconButton",
  "HorizontalScrollView", "IconHelper", "InfoModal", "NotificationModal", "ThemedSwitch",
].map(name => [name, name]));

function form(defaultCurrency, initialBudget = null) {
  const preferences = { defaultCurrency };
  const saved = [];
  let preferenceReads = 0;
  const props = {
    visible: true, initialBudget,
    categories: [{ id: "food", name: "Food", type: "expense" }],
    existingBudgets: initialBudget ? [initialBudget] : [],
    onSave: async input => { saved.push(input); return true; },
    onClose() {},
  };
  const h = harness("../components/budget-form-modal.tsx", {
    "react-native": native,
    "lucide-react-native": {},
    "@/infrastructure/localization": { useLocalization: () => ({ t: key => key }) },
    "@/components": components,
    "@/hooks/use-app-theme": theme,
    "@/modules/categories": { CategoryPickerModal: "CategoryPickerModal" },
    "@/modules/currencies": { useCurrencyPreferences: () => { preferenceReads++; return { preferences }; } },
    "@/modules/hex-colors": { useResolveEntityColor: () => () => "blue" },
    "@/modules/pro": { useProGuard: () => ({ isPro: true }) },
    "@/modules/settings": { useExperiencePreferences: () => ({ isPromptDismissed: () => true }) },
    "@/modules/walkthrough": {
      useBudgetFormWalkthrough: () => ({}),
      useWalkthroughIntro: () => ({ canTrigger: false, scrollEnabled: true }),
      useWalkthroughRegistry: () => ({}),
      useWalkthroughTarget: () => null,
      WalkthroughRegistryProvider: "WalkthroughRegistryProvider",
      WalkthroughTarget: "WalkthroughTarget",
    },
    "./custom-monthly-editor": { CustomMonthlyEditor: "CustomMonthlyEditor" },
  });
  const render = () => h.render(exports => {
    const outer = exports.BudgetFormModal(props);
    const content = outer?.props.children;
    return content ? content.type(content.props) : null;
  });
  const save = tree => find(tree, node => node.type === "FullScreenFormModal").props.onSave();
  render();
  return { ...h, render, save, props, preferences, saved, get preferenceReads() { return preferenceReads; } };
}

function enterAmount(props, amount) {
  let confirmed;
  const h = harness("../../../components/amount-calculator-modal.tsx", {
    "react-native": native,
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "@/constants/layout": { isTabletOrDesktop: () => false },
    "@/hooks/use-app-theme": theme,
    "@/modules/settings": { triggerHaptic() {}, triggerSound() {} },
    "@/utils/currency": currency,
  });
  const calculatorProps = {
    ...props, visible: true,
    onConfirm(value) { confirmed = value; props.onConfirm(value); },
  };
  const render = () => h.render(exports => {
    const outer = exports.AmountCalculatorModal(calculatorProps);
    return outer.type(outer.props);
  });
  const press = label => find(render(), node => node.props?.label === label).props.onPress();
  render();
  press("C");
  for (const digit of amount) press(digit);
  press("Done");
  h.unmount();
  return confirmed;
}

function editor(props) {
  const h = harness("../components/custom-monthly-editor.tsx", {
    "react-native": native,
    "lucide-react-native": {},
    "@/components": components,
    "@/hooks/use-app-theme": theme,
    "@/utils/currency": currency,
  });
  return { ...h, render: () => h.render(exports => exports.CustomMonthlyEditor(props)) };
}

for (const [code, entered, expected] of [["PHP", "1000", 100000], ["USD", "1000", 100000], ["JPY", "1000", 1000], ["KWD", "10.125", 10125]]) {
  test(`BUD-F01: ${code} amount entry and reopened edits preserve denomination and precision`, () => {
    const h = form(code);
    let tree = h.render();
    assert.equal(find(tree, node => node.type === "AmountCalculatorField").props.currencyCode, code);
    const calculator = find(tree, node => node.type === "AmountCalculatorModal");
    assert.equal(enterAmount(calculator.props, entered), expected);
    tree = h.render();
    assert.equal(find(tree, node => node.type === "AmountCalculatorField").props.amountMinorUnits, expected);
    h.save(tree);
    assert.equal(h.saved[0].currencyCode, code);
    assert.equal(h.saved[0].amountMinorUnits, expected);
    h.unmount();

    // Reopen the saved input with a different home currency; confirming it must not rescale it.
    const edit = form(code === "PHP" ? "USD" : "PHP", { ...h.saved[0], id: "budget" });
    tree = edit.render();
    assert.equal(find(tree, node => node.type === "AmountCalculatorField").props.currencyCode, code);
    assert.equal(find(tree, node => node.type === "AmountCalculatorField").props.amountMinorUnits, expected);
    const reopened = find(tree, node => node.type === "AmountCalculatorModal");
    assert.equal(enterAmount(reopened.props, entered), expected);
    edit.save(edit.render());
    assert.equal(edit.saved[0].currencyCode, code);
    assert.equal(edit.saved[0].amountMinorUnits, expected);
    edit.unmount();
  });

  test(`BUD-F01: ${code} custom targets use the same currency for entry, month amounts, annual totals and save`, () => {
    const h = form("PHP", {
      id: "budget", categoryId: "food", currencyCode: code, frequency: "custom_monthly",
      amountMinorUnits: expected, isEnabled: true, monthlyTargets: [],
    });
    let editorNode = find(h.render(), node => node.type === "CustomMonthlyEditor");
    assert.equal(editorNode.props.currencyCode, code);
    const editorProps = editorNode.props;
    const e = editor(editorProps);
    let tree = e.render();
    const month = find(tree, node => node.props?.accessibilityLabel === "Edit budget for January");
    assert.ok(find(month, node => node.type === "Text" && node.props.children === currency.formatCurrency(expected, code, false)));
    assert.ok(find(tree, node => node.type === "Text" && node.props.children === currency.formatCurrency(12 * expected, code, false)));
    month.props.onPress();
    tree = e.render();
    const calculator = find(tree, node => node.type === "AmountCalculatorModal");
    assert.equal(enterAmount(calculator.props, code === "KWD" ? "20.250" : "2000"), 2 * expected);
    editorNode = find(h.render(), node => node.type === "CustomMonthlyEditor");
    // Feed the updated parent snapshot back into the same mounted editor.
    editorProps.monthlyTargets = editorNode.props.monthlyTargets;
    assert.ok(find(e.render(), node => node.type === "Text" && node.props.children === currency.formatCurrency(13 * expected, code, false)));
    h.save(h.render());
    assert.equal(h.saved[0].currencyCode, code);
    assert.equal(h.saved[0].monthlyTargets[0].amountMinorUnits, 2 * expected);
    assert.equal(h.saved[0].monthlyTargets[0].month, 1);
    e.unmount(); h.unmount();
    const reopened = form("USD", { ...h.saved[0], id: "budget" });
    editorNode = find(reopened.render(), node => node.type === "CustomMonthlyEditor");
    assert.equal(editorNode.props.currencyCode, code);
    assert.equal(editorNode.props.monthlyTargets[0].amountMinorUnits, 2 * expected);
    reopened.unmount();
  });
}

test("BUD-F01: a new draft keeps its opening currency through preference updates; a new session uses the new default", () => {
  const h = form("JPY");
  const calculator = find(h.render(), node => node.type === "AmountCalculatorModal");
  enterAmount(calculator.props, "1000");
  h.preferences.defaultCurrency = "KWD";
  const tree = h.render();
  assert.equal(find(tree, node => node.type === "AmountCalculatorField").props.currencyCode, "JPY");
  h.save(tree);
  assert.equal(h.saved[0].currencyCode, "JPY");
  assert.equal(h.saved[0].amountMinorUnits, 1000);
  h.unmount();
  const reopened = form("KWD");
  assert.equal(find(reopened.render(), node => node.type === "AmountCalculatorField").props.currencyCode, "KWD");
  reopened.unmount();
});

test("BUD-F01: closed budget forms do not read currency preferences", () => {
  const h = form("JPY");
  const reads = h.preferenceReads;
  h.props.visible = false;
  assert.equal(h.render(), null);
  assert.equal(h.preferenceReads, reads);
  h.unmount();
});
