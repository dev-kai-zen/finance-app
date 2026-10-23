const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const {
  getBudgetsWalkthroughSteps,
} = require("../budgets/budgets-walkthrough-steps.ts");

test("budgets screen walkthrough: empty state single step", () => {
  const steps = getBudgetsWalkthroughSteps({ hasBudgets: false });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["budgetEmptyCreateButton"],
  );
});

test("budgets screen walkthrough: full list with visible first row", () => {
  const steps = getBudgetsWalkthroughSteps({
    hasBudgets: true,
    hasBudgetInList: true,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    [
      "budgetTotalActiveCard",
      "budgetFrequencyTabs",
      "budgetFirstItemToggle",
      "budgetFab",
    ],
  );
});

test("budgets screen walkthrough: omits toggle when filter list is empty", () => {
  const steps = getBudgetsWalkthroughSteps({
    hasBudgets: true,
    hasBudgetInList: false,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["budgetTotalActiveCard", "budgetFrequencyTabs", "budgetFab"],
  );
});
