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

const { SETTINGS_WALKTHROUGH_STEPS } = require("../settings/settings-walkthrough-steps.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("settings walkthrough: defines all 15 steps in exact required sequence", () => {
  assert.equal(SETTINGS_WALKTHROUGH_STEPS.length, 15);

  const expectedSequence = [
    { targetId: "settingsLanguage", titleKey: "settingsWalkthrough.stepLanguageTitle" },
    { targetId: "settingsCurrency", titleKey: "settingsWalkthrough.stepCurrencyTitle" },
    { targetId: "settingsNickname", titleKey: "settingsWalkthrough.stepNicknameTitle" },
    { targetId: "settingsTheme", titleKey: "settingsWalkthrough.stepThemeTitle" },
    { targetId: "settingsReminders", titleKey: "settingsWalkthrough.stepRemindersTitle" },
    { targetId: "settingsDefaultExpense", titleKey: "settingsWalkthrough.stepDefaultExpenseTitle" },
    { targetId: "settingsDefaultIncome", titleKey: "settingsWalkthrough.stepDefaultIncomeTitle" },
    { targetId: "settingsHexColors", titleKey: "settingsWalkthrough.stepHexColorsTitle" },
    { targetId: "settingsResetData", titleKey: "settingsWalkthrough.stepResetDataTitle" },
    { targetId: "settingsLocalBackup", titleKey: "settingsWalkthrough.stepLocalBackupTitle" },
    { targetId: "settingsGoogleDrive", titleKey: "settingsWalkthrough.stepGoogleDriveTitle" },
    { targetId: "settingsSecurity", titleKey: "settingsWalkthrough.stepSecurityTitle" },
    { targetId: "settingsPro", titleKey: "settingsWalkthrough.stepProTitle" },
    { targetId: "settingsRestorePurchases", titleKey: "settingsWalkthrough.stepRestorePurchasesTitle" },
    { targetId: "settingsWhatsNew", titleKey: "settingsWalkthrough.stepWhatsNewTitle" },
  ];

  expectedSequence.forEach((expected, index) => {
    const step = SETTINGS_WALKTHROUGH_STEPS[index];
    assert.equal(step.targetId, expected.targetId, `Mismatch at step ${index + 1}: expected targetId ${expected.targetId}`);
    assert.equal(step.titleKey, expected.titleKey, `Mismatch at step ${index + 1}: expected titleKey ${expected.titleKey}`);
    assert.ok(step.descKey, `Missing descKey at step ${index + 1}`);
  });
});

test("settings walkthrough: translations exist for all 15 steps across en, es, and fil", () => {
  const stepSuffixes = [
    "Language",
    "Currency",
    "Nickname",
    "Theme",
    "Reminders",
    "DefaultExpense",
    "DefaultIncome",
    "HexColors",
    "ResetData",
    "LocalBackup",
    "GoogleDrive",
    "Security",
    "Pro",
    "RestorePurchases",
    "WhatsNew",
  ];

  for (const suffix of stepSuffixes) {
    const titleKey = `step${suffix}Title`;
    const descKey = `step${suffix}Desc`;

    assert.ok(en.settingsWalkthrough?.[titleKey], `Missing en.settingsWalkthrough.${titleKey}`);
    assert.ok(en.settingsWalkthrough?.[descKey], `Missing en.settingsWalkthrough.${descKey}`);

    assert.ok(es.settingsWalkthrough?.[titleKey], `Missing es.settingsWalkthrough.${titleKey}`);
    assert.ok(es.settingsWalkthrough?.[descKey], `Missing es.settingsWalkthrough.${descKey}`);

    assert.ok(fil.settingsWalkthrough?.[titleKey], `Missing fil.settingsWalkthrough.${titleKey}`);
    assert.ok(fil.settingsWalkthrough?.[descKey], `Missing fil.settingsWalkthrough.${descKey}`);
  }
});
