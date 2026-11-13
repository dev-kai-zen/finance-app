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
  getReportsWalkthroughSteps,
  REPORTS_WALKTHROUGH_STEPS,
} = require("../reports/reports-walkthrough-steps.ts");

test("reports screen walkthrough: defines 4 structured interactive steps", () => {
  const steps = getReportsWalkthroughSteps();
  assert.equal(steps.length, 4);
  assert.deepEqual(
    steps.map((step) => step.targetId),
    [
      "reportsTabBar",
      "reportsFilterBar",
      "reportsChart",
      "reportsBreakdownTable",
    ],
  );
});

test("reports screen walkthrough: all steps have valid localization title and desc keys", () => {
  for (const step of REPORTS_WALKTHROUGH_STEPS) {
    assert.ok(step.titleKey.startsWith("reportsWalkthrough."));
    assert.ok(step.descKey.startsWith("reportsWalkthrough."));
  }
});

