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
  getCategoriesWalkthroughSteps,
} = require("../categories/categories-walkthrough-steps.ts");

test("categories screen walkthrough: full step order when all controls visible", () => {
  const steps = getCategoriesWalkthroughSteps({
    hasPresetsButton: true,
    canReorderGroups: true,
    canReorderSubcategories: true,
    hasCategoryGroups: true,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    [
      "catTypeToggle",
      "catReorderGroups",
      "catPresetsIcon",
      "catNewCategory",
      "catFirstGroupReorderSub",
      "catFirstGroupAddSub",
    ],
  );
});

test("categories screen walkthrough: omits unmounted controls", () => {
  const minimal = getCategoriesWalkthroughSteps({
    hasPresetsButton: false,
    canReorderGroups: false,
    canReorderSubcategories: false,
    hasCategoryGroups: false,
  });
  assert.deepEqual(
    minimal.map((step) => step.targetId),
    ["catTypeToggle", "catNewCategory"],
  );
});
