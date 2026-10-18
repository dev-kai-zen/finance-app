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
  QUICK_INCOME_WIDGET_NAME,
  QUICK_TRANSFER_WIDGET_NAME,
  DUAL_ACTION_WIDGET_NAME,
  TRIPLE_ACTION_WIDGET_NAME,
  QUICK_EXPENSE_DEEP_LINK,
  QUICK_INCOME_DEEP_LINK,
  QUICK_TRANSFER_DEEP_LINK,
  WIDGET_THEME,
} = require("../constants/widget.constants.ts");

test("widgets: constants define expected provider names and deep link URIs", () => {
  assert.equal(QUICK_EXPENSE_WIDGET_NAME, "QuickExpenseWidget");
  assert.equal(QUICK_INCOME_WIDGET_NAME, "QuickIncomeWidget");
  assert.equal(QUICK_TRANSFER_WIDGET_NAME, "QuickTransferWidget");
  assert.equal(DUAL_ACTION_WIDGET_NAME, "DualActionWidget");
  assert.equal(TRIPLE_ACTION_WIDGET_NAME, "TripleActionWidget");

  assert.equal(
    QUICK_EXPENSE_DEEP_LINK,
    "finance-app://transactions?action=new&type=expense&source=widget",
  );
  assert.equal(
    QUICK_INCOME_DEEP_LINK,
    "finance-app://transactions?action=new&type=income&source=widget",
  );
  assert.equal(
    QUICK_TRANSFER_DEEP_LINK,
    "finance-app://transactions?action=new&type=transfer&source=widget",
  );

  assert.equal(WIDGET_THEME.background, "#11231E");
  assert.equal(WIDGET_THEME.surface, "#1A352E");
  assert.equal(WIDGET_THEME.border, "#244A40");
  assert.equal(WIDGET_THEME.expenseAccent, "#EF4444");
  assert.equal(WIDGET_THEME.incomeAccent, "#10B981");
  assert.equal(WIDGET_THEME.transferAccent, "#38BDF8");
});

test("widgets: deep links parse properly into transaction form actions", () => {
  const links = [
    { uri: QUICK_EXPENSE_DEEP_LINK, expectedType: "expense" },
    { uri: QUICK_INCOME_DEEP_LINK, expectedType: "income" },
    { uri: QUICK_TRANSFER_DEEP_LINK, expectedType: "transfer" },
  ];

  for (const { uri, expectedType } of links) {
    const url = new URL(uri.replace("finance-app://", "http://app/"));
    assert.equal(url.pathname, "/transactions");
    assert.equal(url.searchParams.get("action"), "new");
    assert.equal(url.searchParams.get("type"), expectedType);
    assert.equal(url.searchParams.get("source"), "widget");
  }
});

test("widgets: app.json configures all Phase 1 widgets properly", () => {
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

  const quickIncome = widgets.find((w) => w.name === QUICK_INCOME_WIDGET_NAME);
  assert.ok(quickIncome, "QuickIncomeWidget must be registered");
  assert.equal(quickIncome.targetCellWidth, 1);
  assert.equal(quickIncome.targetCellHeight, 1);

  const quickTransfer = widgets.find((w) => w.name === QUICK_TRANSFER_WIDGET_NAME);
  assert.ok(quickTransfer, "QuickTransferWidget must be registered");
  assert.equal(quickTransfer.targetCellWidth, 1);
  assert.equal(quickTransfer.targetCellHeight, 1);

  const dualAction = widgets.find((w) => w.name === DUAL_ACTION_WIDGET_NAME);
  assert.ok(dualAction, "DualActionWidget must be registered");
  assert.equal(dualAction.targetCellWidth, 2);
  assert.equal(dualAction.targetCellHeight, 1);
  assert.equal(dualAction.resizeMode, "horizontal");

  const tripleAction = widgets.find((w) => w.name === TRIPLE_ACTION_WIDGET_NAME);
  assert.ok(tripleAction, "TripleActionWidget must be registered");
  assert.equal(tripleAction.targetCellWidth, 3);
  assert.equal(tripleAction.targetCellHeight, 1);
  assert.equal(tripleAction.resizeMode, "horizontal");
});

test("widgets: android widgetprovider xml files exist and match configuration", () => {
  const resXmlDir = path.resolve(__dirname, "../../../../android/app/src/main/res/xml");

  const files = [
    { file: "widgetprovider_quickexpensewidget.xml", width: "1", height: "1" },
    { file: "widgetprovider_quickincomewidget.xml", width: "1", height: "1" },
    { file: "widgetprovider_quicktransferwidget.xml", width: "1", height: "1" },
    { file: "widgetprovider_dualactionwidget.xml", width: "2", height: "1" },
    { file: "widgetprovider_tripleactionwidget.xml", width: "3", height: "1" },
  ];

  for (const { file, width, height } of files) {
    const xml = fs.readFileSync(path.join(resXmlDir, file), "utf8");
    assert.match(xml, new RegExp(`android:targetCellWidth="${width}"`));
    assert.match(xml, new RegExp(`android:targetCellHeight="${height}"`));
  }
});

test("widgets: Java provider classes exist for all Phase 1 widgets", () => {
  const javaDir = path.resolve(
    __dirname,
    "../../../../android/app/src/main/java/com/kaizen/finance/app/widget",
  );

  const classes = [
    "QuickExpenseWidget.java",
    "QuickIncomeWidget.java",
    "QuickTransferWidget.java",
    "DualActionWidget.java",
    "TripleActionWidget.java",
  ];

  for (const cls of classes) {
    const javaCode = fs.readFileSync(path.join(javaDir, cls), "utf8");
    assert.match(javaCode, /extends RNWidgetProvider/);
  }
});

test("widgets: components contain expected action labels", () => {
  const compDir = path.resolve(__dirname, "../components");

  const expenseCode = fs.readFileSync(path.join(compDir, "quick-expense-widget.tsx"), "utf8");
  assert.match(expenseCode, /text="Expense"/);

  const incomeCode = fs.readFileSync(path.join(compDir, "quick-income-widget.tsx"), "utf8");
  assert.match(incomeCode, /text="Income"/);

  const transferCode = fs.readFileSync(path.join(compDir, "quick-transfer-widget.tsx"), "utf8");
  assert.match(transferCode, /text="Transfer"/);

  const dualCode = fs.readFileSync(path.join(compDir, "dual-action-widget.tsx"), "utf8");
  assert.match(dualCode, /text="Expense"/);
  assert.match(dualCode, /text="Income"/);

  const tripleCode = fs.readFileSync(path.join(compDir, "triple-action-widget.tsx"), "utf8");
  assert.match(tripleCode, /text="Expense"/);
  assert.match(tripleCode, /text="Income"/);
  assert.match(tripleCode, /text="Transfer"/);
});
