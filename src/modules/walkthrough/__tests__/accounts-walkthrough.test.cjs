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

const { ACCOUNTS_WALKTHROUGH_STEPS } = require("../accounts/accounts-walkthrough-steps.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("accounts walkthrough: defines all 9 required steps in exact order", () => {
  const steps = ACCOUNTS_WALKTHROUGH_STEPS;
  assert.equal(steps.length, 9);

  const expectedSteps = [
    { id: "archivedChip", targetId: "archivedChip" },
    { id: "fundGroupsChip", targetId: "fundGroupsChip" },
    { id: "searchBox", targetId: "searchBox" },
    { id: "accountsExport", targetId: "accountsExport" },
    { id: "accountsCollapseExpand", targetId: "accountsCollapseExpand" },
    { id: "assetsSection", targetId: "assetsSection" },
    { id: "liabilitiesSection", targetId: "liabilitiesSection" },
    { id: "accountsFab", targetId: "accountsFab" },
    { id: "accountsSheetDemonstration", targetId: "accountsSheetDemonstration", isSimulatedModal: true },
  ];

  expectedSteps.forEach((expected, idx) => {
    assert.equal(steps[idx].id, expected.id, `Step index ${idx} id mismatch`);
    assert.equal(steps[idx].targetId, expected.targetId, `Step index ${idx} targetId mismatch`);
    if (expected.isSimulatedModal) {
      assert.equal(steps[idx].isSimulatedModal, true);
    }
  });
});

test("accounts walkthrough: has valid localization keys for all steps in en, es, and fil", () => {
  const steps = ACCOUNTS_WALKTHROUGH_STEPS;

  steps.forEach((step) => {
    const titleKey = step.titleKey.replace("accountsWalkthrough.", "");
    const descKey = step.descKey.replace("accountsWalkthrough.", "");

    // English
    assert.ok(
      en.accountsWalkthrough[titleKey],
      `Missing English translation for titleKey: ${step.titleKey}`
    );
    assert.ok(
      en.accountsWalkthrough[descKey],
      `Missing English translation for descKey: ${step.descKey}`
    );

    // Spanish
    assert.ok(
      es.accountsWalkthrough[titleKey],
      `Missing Spanish translation for titleKey: ${step.titleKey}`
    );
    assert.ok(
      es.accountsWalkthrough[descKey],
      `Missing Spanish translation for descKey: ${step.descKey}`
    );

    // Filipino
    assert.ok(
      fil.accountsWalkthrough[titleKey],
      `Missing Filipino translation for titleKey: ${step.titleKey}`
    );
    assert.ok(
      fil.accountsWalkthrough[descKey],
      `Missing Filipino translation for descKey: ${step.descKey}`
    );
  });
});

test("accounts walkthrough: export and collapse/expand steps are properly documented in release notes", () => {
  assert.ok(en.versionHistory.v180.improveItem3, "en.versionHistory.v180.improveItem3 is missing");
  assert.ok(fil.versionHistory.v180.improveItem3, "fil.versionHistory.v180.improveItem3 is missing");
  assert.ok(es.versionHistory.v180.improveItem3, "es.versionHistory.v180.improveItem3 is missing");
});
