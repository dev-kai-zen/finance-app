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
  CREDIT_CARDS_WALKTHROUGH_STEPS,
  CREDIT_CARDS_EMPTY_WALKTHROUGH_STEP,
  getCreditCardsWalkthroughSteps,
} = require("../credit-cards/credit-cards-walkthrough-steps.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("credit cards walkthrough: defines all 7 card steps in exact required sequence", () => {
  assert.equal(CREDIT_CARDS_WALKTHROUGH_STEPS.length, 7);

  const expectedSequence = [
    {
      targetId: "creditCardDueSummary",
      titleKey: "creditCardsWalkthrough.stepDueSummaryTitle",
    },
    {
      targetId: "creditCardAccountChips",
      titleKey: "creditCardsWalkthrough.stepAccountChipsTitle",
    },
    {
      targetId: "creditCardLimitUtilization",
      titleKey: "creditCardsWalkthrough.stepLimitUtilizationTitle",
    },
    {
      targetId: "creditCardMetrics",
      titleKey: "creditCardsWalkthrough.stepMetricsTitle",
    },
    {
      targetId: "creditCardDueInstallments",
      titleKey: "creditCardsWalkthrough.stepDueInstallmentsTitle",
    },
    {
      targetId: "creditCardStatements",
      titleKey: "creditCardsWalkthrough.stepStatementsTitle",
    },
    {
      targetId: "creditCardUnbilled",
      titleKey: "creditCardsWalkthrough.stepUnbilledTitle",
    },
  ];

  expectedSequence.forEach((expected, index) => {
    const step = CREDIT_CARDS_WALKTHROUGH_STEPS[index];
    assert.equal(
      step.targetId,
      expected.targetId,
      `Mismatch at step ${index + 1}: expected targetId ${expected.targetId}`,
    );
    assert.equal(
      step.titleKey,
      expected.titleKey,
      `Mismatch at step ${index + 1}: expected titleKey ${expected.titleKey}`,
    );
    assert.ok(step.descKey, `Missing descKey at step ${index + 1}`);
  });
});

test("credit cards walkthrough: returns empty add step when no cards exist", () => {
  const steps = getCreditCardsWalkthroughSteps({ hasCards: false });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].targetId, "creditCardEmptyAddButton");
  assert.equal(
    steps[0].titleKey,
    "creditCardsWalkthrough.stepEmptyAddTitle",
  );
  assert.equal(
    steps[0].descKey,
    "creditCardsWalkthrough.stepEmptyAddDesc",
  );
});

test("credit cards walkthrough: adapts step list according to unbilled activity", () => {
  const stepsWithoutUnbilled = getCreditCardsWalkthroughSteps({
    hasCards: true,
    hasUnbilledActivity: false,
  });
  assert.equal(stepsWithoutUnbilled.length, 6);
  assert.equal(
    stepsWithoutUnbilled.some((s) => s.targetId === "creditCardUnbilled"),
    false,
  );

  const stepsWithUnbilled = getCreditCardsWalkthroughSteps({
    hasCards: true,
    hasUnbilledActivity: true,
  });
  assert.equal(stepsWithUnbilled.length, 7);
  assert.equal(
    stepsWithUnbilled[stepsWithUnbilled.length - 1].targetId,
    "creditCardUnbilled",
  );
});

test("credit cards walkthrough: translations exist for all steps across en, es, and fil", () => {
  const stepKeys = [
    "stepEmptyAdd",
    "stepDueSummary",
    "stepAccountChips",
    "stepLimitUtilization",
    "stepMetrics",
    "stepDueInstallments",
    "stepStatements",
    "stepUnbilled",
  ];

  for (const prefix of stepKeys) {
    const titleKey = `${prefix}Title`;
    const descKey = `${prefix}Desc`;

    assert.ok(
      en.creditCardsWalkthrough?.[titleKey],
      `Missing en.creditCardsWalkthrough.${titleKey}`,
    );
    assert.ok(
      en.creditCardsWalkthrough?.[descKey],
      `Missing en.creditCardsWalkthrough.${descKey}`,
    );

    assert.ok(
      es.creditCardsWalkthrough?.[titleKey],
      `Missing es.creditCardsWalkthrough.${titleKey}`,
    );
    assert.ok(
      es.creditCardsWalkthrough?.[descKey],
      `Missing es.creditCardsWalkthrough.${descKey}`,
    );

    assert.ok(
      fil.creditCardsWalkthrough?.[titleKey],
      `Missing fil.creditCardsWalkthrough.${titleKey}`,
    );
    assert.ok(
      fil.creditCardsWalkthrough?.[descKey],
      `Missing fil.creditCardsWalkthrough.${descKey}`,
    );
  }

  // Intro strings
  const introKeys = ["introTitle", "introSubtitle", "introMessage"];
  for (const key of introKeys) {
    assert.ok(
      en.creditCardsWalkthrough?.[key],
      `Missing en.creditCardsWalkthrough.${key}`,
    );
    assert.ok(
      es.creditCardsWalkthrough?.[key],
      `Missing es.creditCardsWalkthrough.${key}`,
    );
    assert.ok(
      fil.creditCardsWalkthrough?.[key],
      `Missing fil.creditCardsWalkthrough.${key}`,
    );
  }
});

