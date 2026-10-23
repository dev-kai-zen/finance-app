const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// TypeScript loader hook
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
  BUDGET_FORM_WALKTHROUGH_STEPS,
} = require("../budgets/budget-form-walkthrough-steps.ts");
const {
  GOAL_FORM_WALKTHROUGH_STEPS,
} = require("../goals/goal-form-walkthrough-steps.ts");

const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

function resolveKey(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

test("Budget Form Walkthrough: includes 7 steps in exact requested order", () => {
  const expectedTargetIds = [
    "budgetFormCategory",
    "budgetFormEnable",
    "budgetFormAmount",
    "budgetFormFrequency",
    "budgetFormRollover",
    "budgetFormAlert",
    "budgetFormSave",
  ];

  assert.equal(
    BUDGET_FORM_WALKTHROUGH_STEPS.length,
    7,
    "Should have 7 steps for Budget Form",
  );
  assert.deepEqual(
    BUDGET_FORM_WALKTHROUGH_STEPS.map((s) => s.targetId),
    expectedTargetIds,
  );

  for (const step of BUDGET_FORM_WALKTHROUGH_STEPS) {
    for (const [lang, translations] of [
      ["en", en],
      ["es", es],
      ["fil", fil],
    ]) {
      const title = resolveKey(translations, step.titleKey);
      const desc = resolveKey(translations, step.descKey);
      assert.ok(
        title && typeof title === "string",
        `Missing ${lang} title for ${step.titleKey}`,
      );
      assert.ok(
        desc && typeof desc === "string",
        `Missing ${lang} desc for ${step.descKey}`,
      );
    }
  }
});

test("Goal Form Walkthrough: includes 8 steps in exact requested order", () => {
  const expectedTargetIds = [
    "goalFormTitle",
    "goalFormAmount",
    "goalFormLinked",
    "goalFormDate",
    "goalFormIcon",
    "goalFormColor",
    "goalFormNotes",
    "goalFormSave",
  ];

  assert.equal(
    GOAL_FORM_WALKTHROUGH_STEPS.length,
    8,
    "Should have 8 steps for Goal Form",
  );
  assert.deepEqual(
    GOAL_FORM_WALKTHROUGH_STEPS.map((s) => s.targetId),
    expectedTargetIds,
  );

  for (const step of GOAL_FORM_WALKTHROUGH_STEPS) {
    for (const [lang, translations] of [
      ["en", en],
      ["es", es],
      ["fil", fil],
    ]) {
      const title = resolveKey(translations, step.titleKey);
      const desc = resolveKey(translations, step.descKey);
      assert.ok(
        title && typeof title === "string",
        `Missing ${lang} title for ${step.titleKey}`,
      );
      assert.ok(
        desc && typeof desc === "string",
        `Missing ${lang} desc for ${step.descKey}`,
      );
    }
  }
});
