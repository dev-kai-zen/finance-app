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
  getSubscriptionsWalkthroughSteps,
} = require("../subscriptions/subscriptions-walkthrough-steps.ts");

test("subscriptions screen walkthrough: empty button and fab when no subscriptions", () => {
  const steps = getSubscriptionsWalkthroughSteps({ hasSubscriptions: false });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["subEmptyAddButton", "subFab"],
  );
});

test("subscriptions screen walkthrough: burn rate summary, filters, and fab when list is empty", () => {
  const steps = getSubscriptionsWalkthroughSteps({
    hasSubscriptions: true,
    hasSubInList: false,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["subBurnRateSummary", "subFilterTabs", "subFab"],
  );
});

test("subscriptions screen walkthrough: includes first item card when list has items", () => {
  const steps = getSubscriptionsWalkthroughSteps({
    hasSubscriptions: true,
    hasSubInList: true,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["subBurnRateSummary", "subFilterTabs", "subFirstItemCard", "subFab"],
  );
});
