const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require(name) {
      assert.ok(name in dependencies, "Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return exports;
}

const currency = load("../../../utils/currency.ts");
const catalogs = Object.fromEntries(["en", "fil", "es"].map(language => [language,
  load(`../../../infrastructure/localization/translations/${language}.ts`)[language],
]));

function harness() {
  let hookReads = 0, dismissed = 0, cancelled = 0, proceeded = 0;
  const t = (key, values = {}) => {
    const template = key.split(".").reduce((value, part) => value?.[part], catalogs.en);
    assert.equal(typeof template, "string", "Missing translation " + key);
    return template.replace(/%\{(\w+)\}/g, (_, name) => values[name]);
  };
  const theme = { colors: { danger: "red" }, spacing: {}, borderRadius: {} };
  const native = Object.fromEntries(["Modal", "Pressable", "ScrollView", "Text", "View"].map(name => [name, name]));
  native.Keyboard = { dismiss: () => dismissed++ };
  native.StyleSheet = { create: styles => styles };
  native.useWindowDimensions = () => ({ width: 390, height: 800 });
  const { OverBudgetWarningModal } = load("../components/over-budget-warning-modal.tsx", {
    react: { memo: component => component, useCallback: callback => callback },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-native": native,
    "lucide-react-native": { AlertTriangle: "AlertTriangle" },
    "@/components": { AppButton: "AppButton" },
    "@/constants/layout": { isTabletOrDesktop: () => false },
    "@/hooks/use-app-theme": {
      useAppTheme: () => { hookReads++; return theme; },
      useThemeStyles: create => create(theme),
    },
    "@/infrastructure/localization": { useLocalization: () => ({ t }) },
    "@/utils/currency": currency,
  });
  function expand(node) {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props.children) } };
  }
  return {
    render: props => expand(OverBudgetWarningModal({ visible: true, onCancel: () => cancelled++, onProceed: () => proceeded++, ...props })),
    get hookReads() { return hookReads; }, get dismissed() { return dismissed; },
    get cancelled() { return cancelled; }, get proceeded() { return proceeded; },
  };
}
function find(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) { const found = find(child, predicate); if (found) return found; }
  } else if (node && typeof node === "object") {
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
}
const result = {
  budgetId: "food", categoryName: "Food", periodLabel: "November 2026", budgetCurrencyCode: "PHP",
  effectiveBudgetCents: 500000, currentSpentCents: 450000, additionalExpenseCents: 60000,
  newSpentCents: 510000, exceededByCents: 10000, exceeds: true,
};

test("BUD-F03: combined confirmation renders every budget and amount inside a bounded scroll area", () => {
  const h = harness();
  assert.equal(h.render({ visible: false, results: [result] }), null);
  assert.equal(h.hookReads, 0, "Closed warnings mount no theme or domain subtree");
  const tree = h.render({ results: [result, { ...result, budgetId: "travel", categoryName: "Travel", budgetCurrencyCode: "KWD" }] });
  const text = JSON.stringify(tree);
  assert.ok(text.includes("Food")); assert.ok(text.includes("Travel"));
  assert.ok(text.includes("2 budgets")); assert.ok(text.includes("5,100.00"));
  assert.ok(text.includes(currency.formatCurrency(510000, "KWD", false)));
  assert.equal(find(tree, node => node.type === "ScrollView").props.keyboardShouldPersistTaps, "handled");
  assert.ok(find(tree, node => node.props?.style?.[0]?.maxHeight === "90%"));
  find(tree, node => node.props?.label === "Cancel & Edit").props.onPress();
  assert.equal(h.cancelled, 1); assert.equal(h.dismissed, 1); assert.equal(h.proceeded, 0);
  find(tree, node => node.props?.label === "Proceed Anyway").props.onPress();
  assert.equal(h.proceeded, 1); assert.equal(h.dismissed, 2);
});

test("BUD-F03: pending confirmation blocks Proceed, Cancel, backdrop and Android back", () => {
  const h = harness();
  const tree = h.render({ results: [result], pending: true });
  find(tree, node => node.props?.label === "Proceed Anyway").props.onPress();
  find(tree, node => node.props?.label === "Cancel & Edit").props.onPress();
  find(tree, node => node.type === "Pressable").props.onPress();
  find(tree, node => node.type === "Modal").props.onRequestClose();
  assert.equal(h.cancelled, 0); assert.equal(h.proceeded, 0);
});

test("BUD-F03: warning text and interpolation keys exist in English, Filipino and Spanish", () => {
  const keys = Object.keys(catalogs.en.transactions).filter(key => key.startsWith("budgetWarning"));
  assert.ok(keys.length >= 12);
  for (const language of ["fil", "es"]) for (const key of keys) {
    const value = catalogs[language].transactions[key];
    assert.equal(typeof value, "string", `${language}.${key}`);
    assert.deepEqual(value.match(/%\{\w+\}/g)?.sort(), catalogs.en.transactions[key].match(/%\{\w+\}/g)?.sort());
  }
});
