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

const { ACCOUNT_FORM_WALKTHROUGH_STEPS } = require("../accounts/account-form-walkthrough-steps.ts");
const { ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS } = require("../accounts/account-group-setup-walkthrough-steps.ts");
const { ACCOUNT_TYPE_FORM_WALKTHROUGH_STEPS } = require("../accounts/account-type-form-walkthrough-steps.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("account form walkthrough: defines all 11 required steps in exact order", () => {
  const steps = ACCOUNT_FORM_WALKTHROUGH_STEPS;
  assert.equal(steps.length, 11);

  const expectedTargetIds = [
    "accountFormName",
    "accountFormNote",
    "accountFormType",
    "accountFormIcon",
    "accountFormStartingBalance",
    "accountFormCurrency",
    "accountFormMaintainingBalance",
    "accountFormEnablePockets",
    "accountFormHideSelection",
    "accountFormHideReports",
    "accountFormOpeningDate",
  ];

  steps.forEach((step, idx) => {
    assert.equal(step.targetId, expectedTargetIds[idx]);
  });
});

test("account form walkthrough: translations exist in en, es, and fil", () => {
  const steps = ACCOUNT_FORM_WALKTHROUGH_STEPS;
  [en, es, fil].forEach((dict) => {
    assert.ok(dict.accountFormWalkthrough, "accountFormWalkthrough dictionary should exist");
    steps.forEach((step) => {
      const titleKey = step.titleKey.replace("accountFormWalkthrough.", "");
      const descKey = step.descKey.replace("accountFormWalkthrough.", "");
      assert.ok(dict.accountFormWalkthrough[titleKey], `Missing translation key ${step.titleKey}`);
      assert.ok(dict.accountFormWalkthrough[descKey], `Missing translation key ${step.descKey}`);
    });
  });
});

test("account group setup walkthrough: defines all 3 required steps and translations exist", () => {
  const steps = ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS;
  assert.equal(steps.length, 3);
  assert.equal(steps[0].targetId, "accountGroupPicker");
  assert.equal(steps[1].targetId, "accountGroupReorder");
  assert.equal(steps[2].targetId, "accountGroupNew");

  [en, es, fil].forEach((dict) => {
    assert.ok(dict.accountGroupSetupWalkthrough, "accountGroupSetupWalkthrough dictionary should exist");
    steps.forEach((step) => {
      const titleKey = step.titleKey.replace("accountGroupSetupWalkthrough.", "");
      const descKey = step.descKey.replace("accountGroupSetupWalkthrough.", "");
      assert.ok(dict.accountGroupSetupWalkthrough[titleKey], `Missing translation key ${step.titleKey}`);
      assert.ok(dict.accountGroupSetupWalkthrough[descKey], `Missing translation key ${step.descKey}`);
    });
  });
});

test("account type form walkthrough: defines all 6 required steps and translations exist", () => {
  const steps = ACCOUNT_TYPE_FORM_WALKTHROUGH_STEPS;
  assert.equal(steps.length, 6);
  assert.equal(steps[0].targetId, "accountTypeFormName");
  assert.equal(steps[1].targetId, "accountTypeFormClassification");
  assert.equal(steps[2].targetId, "accountTypeFormIcon");
  assert.equal(steps[3].targetId, "accountTypeFormColor");
  assert.equal(steps[4].targetId, "accountTypeFormCustomColor");
  assert.equal(steps[5].targetId, "accountTypeFormSave");

  [en, es, fil].forEach((dict) => {
    assert.ok(dict.accountTypeFormWalkthrough, "accountTypeFormWalkthrough dictionary should exist");
    steps.forEach((step) => {
      const titleKey = step.titleKey.replace("accountTypeFormWalkthrough.", "");
      const descKey = step.descKey.replace("accountTypeFormWalkthrough.", "");
      assert.ok(dict.accountTypeFormWalkthrough[titleKey], `Missing translation key ${step.titleKey}`);
      assert.ok(dict.accountTypeFormWalkthrough[descKey], `Missing translation key ${step.descKey}`);
    });
  });
});
