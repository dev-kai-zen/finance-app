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
