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

test("settings walkthrough: defines all 29 steps in exact required sequence", () => {
  assert.equal(SETTINGS_WALKTHROUGH_STEPS.length, 29);

  const expectedSequence = [
    { targetId: "settingsLanguage", titleKey: "settingsWalkthrough.stepLanguageTitle" },
    { targetId: "settingsCurrency", titleKey: "settingsWalkthrough.stepCurrencyTitle" },
    { targetId: "settingsDataImport", titleKey: "settingsWalkthrough.stepDataImportTitle" },
    { targetId: "settingsLocalBackup", titleKey: "settingsWalkthrough.stepLocalBackupTitle" },
    { targetId: "settingsGoogleDrive", titleKey: "settingsWalkthrough.stepGoogleDriveTitle" },
    { targetId: "settingsResetData", titleKey: "settingsWalkthrough.stepResetDataTitle" },
    { targetId: "settingsNickname", titleKey: "settingsWalkthrough.stepNicknameTitle" },
    { targetId: "settingsTheme", titleKey: "settingsWalkthrough.stepThemeTitle" },
    { targetId: "settingsHexColors", titleKey: "settingsWalkthrough.stepHexColorsTitle" },
    { targetId: "settingsGestures", titleKey: "settingsWalkthrough.stepGesturesTitle" },
    { targetId: "settingsQuickSearch", titleKey: "settingsWalkthrough.stepQuickSearchTitle" },
    { targetId: "settingsGuideHelper", titleKey: "settingsWalkthrough.stepGuideHelperTitle" },
    { targetId: "settingsHaptics", titleKey: "settingsWalkthrough.stepHapticsTitle" },
    { targetId: "settingsSound", titleKey: "settingsWalkthrough.stepSoundTitle" },
    { targetId: "settingsKaiChatMode", titleKey: "settingsWalkthrough.stepKaiChatModeTitle" },
    { targetId: "settingsKaiKnowledge", titleKey: "settingsWalkthrough.stepKaiKnowledgeTitle" },
    { targetId: "settingsDefaultExpense", titleKey: "settingsWalkthrough.stepDefaultExpenseTitle" },
    { targetId: "settingsDefaultIncome", titleKey: "settingsWalkthrough.stepDefaultIncomeTitle" },
    { targetId: "settingsReminders", titleKey: "settingsWalkthrough.stepRemindersTitle" },
    { targetId: "settingsWidgets", titleKey: "settingsWalkthrough.stepWidgetsTitle" },
    { targetId: "settingsSecurity", titleKey: "settingsWalkthrough.stepSecurityTitle" },
    { targetId: "settingsPro", titleKey: "settingsWalkthrough.stepProTitle" },
    { targetId: "settingsRestorePurchases", titleKey: "settingsWalkthrough.stepRestorePurchasesTitle" },
    { targetId: "settingsVersionHistory", titleKey: "settingsWalkthrough.stepVersionHistoryTitle" },
    { targetId: "settingsDeveloperMessage", titleKey: "settingsWalkthrough.stepDeveloperMessageTitle" },
    { targetId: "settingsSupportDevelopment", titleKey: "settingsWalkthrough.stepSupportDevelopmentTitle" },
    { targetId: "settingsPrivacy", titleKey: "settingsWalkthrough.stepPrivacyTitle" },
    { targetId: "settingsTerms", titleKey: "settingsWalkthrough.stepTermsTitle" },
    { targetId: "settingsAppVersion", titleKey: "settingsWalkthrough.stepAppVersionTitle" },
  ];

  expectedSequence.forEach((expected, index) => {
    const step = SETTINGS_WALKTHROUGH_STEPS[index];
    assert.equal(step.targetId, expected.targetId, `Mismatch at step ${index + 1}: expected targetId ${expected.targetId}`);
    assert.equal(step.titleKey, expected.titleKey, `Mismatch at step ${index + 1}: expected titleKey ${expected.titleKey}`);
    assert.ok(step.descKey, `Missing descKey at step ${index + 1}`);
  });
});

test("settings walkthrough: translations exist for all 29 steps across en, es, and fil", () => {
  const stepSuffixes = [
    "Language",
    "Currency",
    "DataImport",
    "LocalBackup",
    "GoogleDrive",
    "ResetData",
    "Nickname",
    "Theme",
    "HexColors",
    "Gestures",
    "QuickSearch",
    "GuideHelper",
    "Haptics",
    "Sound",
    "KaiChatMode",
    "KaiKnowledge",
    "DefaultExpense",
    "DefaultIncome",
    "Reminders",
    "Widgets",
    "Security",
    "Pro",
    "RestorePurchases",
    "VersionHistory",
    "DeveloperMessage",
    "SupportDevelopment",
    "Privacy",
    "Terms",
    "AppVersion",
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
