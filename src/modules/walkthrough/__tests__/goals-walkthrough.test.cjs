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
  getGoalsWalkthroughSteps,
} = require("../goals/goals-walkthrough-steps.ts");

test("goals screen walkthrough: summary, filters, and fab when list empty", () => {
  const steps = getGoalsWalkthroughSteps({ hasGoalInList: false });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["goalTotalTargetCard", "goalStatusFilters", "goalFab"],
  );
});

test("goals screen walkthrough: includes mark complete when first row visible", () => {
  const steps = getGoalsWalkthroughSteps({ hasGoalInList: true });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    [
      "goalTotalTargetCard",
      "goalStatusFilters",
      "goalFirstItemMarkComplete",
      "goalFab",
    ],
  );
});
