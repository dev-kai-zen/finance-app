const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

require.extensions[".tsx"] = require.extensions[".ts"];

const {
  QUICK_EXPENSE_WIDGET_NAME,
  QUICK_EXPENSE_DEEP_LINK,
  WIDGET_THEME,
} = require("../constants/widget.constants.ts");

test("widgets: constants define expected provider name and deep link URI", () => {
  assert.equal(QUICK_EXPENSE_WIDGET_NAME, "QuickExpenseWidget");
  assert.equal(
    QUICK_EXPENSE_DEEP_LINK,
    "finance-app://transactions?action=new&type=expense&source=widget",
  );
  assert.ok(WIDGET_THEME.background.startsWith("#"));
  assert.ok(WIDGET_THEME.expenseAccent.startsWith("#"));
});

test("widgets: deep link parses properly into transaction form actions", () => {
  const url = new URL(QUICK_EXPENSE_DEEP_LINK.replace("finance-app://", "http://app/"));
  assert.equal(url.pathname, "/transactions");
  assert.equal(url.searchParams.get("action"), "new");
  assert.equal(url.searchParams.get("type"), "expense");
  assert.equal(url.searchParams.get("source"), "widget");
});

test("widgets: app.json configures QuickExpenseWidget as a 1x1 widget tile", () => {
  const appJsonPath = path.resolve(__dirname, "../../../../app.json");
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  const widgetPlugin = appConfig.expo.plugins.find(
    (p) => Array.isArray(p) && p[0] === "react-native-android-widget",
  );
  assert.ok(widgetPlugin, "react-native-android-widget plugin must be configured");
  const widgets = widgetPlugin[1].widgets;
  const quickExpense = widgets.find((w) => w.name === QUICK_EXPENSE_WIDGET_NAME);
  assert.ok(quickExpense, "QuickExpenseWidget must be registered");
  assert.equal(quickExpense.targetCellWidth, 1);
  assert.equal(quickExpense.targetCellHeight, 1);
  assert.equal(quickExpense.resizeMode, "none");
});

test("widgets: android widgetprovider xml has 1x1 cell size and resizeMode none", () => {
  const xmlPath = path.resolve(
    __dirname,
    "../../../../android/app/src/main/res/xml/widgetprovider_quickexpensewidget.xml",
  );
  const xml = fs.readFileSync(xmlPath, "utf8");
  assert.match(xml, /android:targetCellWidth="1"/);
  assert.match(xml, /android:targetCellHeight="1"/);
  assert.match(xml, /android:resizeMode="none"/);
});

test("widgets: QuickExpenseWidget component displays 'Expense' text without 'Quick'", () => {
  const widgetCode = fs.readFileSync(
    path.resolve(__dirname, "../components/quick-expense-widget.tsx"),
    "utf8",
  );
  assert.match(widgetCode, /text="Expense"/);
  assert.doesNotMatch(widgetCode, /text="Quick "/);
});

