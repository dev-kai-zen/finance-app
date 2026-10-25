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

const { RELEASE_NOTES } = require("../constants/release-notes.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

function resolvePath(obj, dotPath) {
  return dotPath.split(".").reduce((acc, part) => acc && acc[part], obj);
}

test("whats new: defines release notes with categorized sections", () => {
  assert.ok(RELEASE_NOTES.length > 0, "RELEASE_NOTES must not be empty");

  const v100 = RELEASE_NOTES.find((block) => block.version === "1.0.0");
  assert.ok(v100, "Release notes for version 1.0.0 must exist");
  assert.ok(Array.isArray(v100.sections), "v1.0.0 must have sections array");
  assert.ok(v100.sections.length >= 10, "v1.0.0 on first deployment must list all core features");

  // Verify all categories and items exist in all translations (en, es, fil)
  for (const block of RELEASE_NOTES) {
    if (block.titleKey) {
      assert.ok(resolvePath(en, block.titleKey), `Missing EN title: ${block.titleKey}`);
      assert.ok(resolvePath(es, block.titleKey), `Missing ES title: ${block.titleKey}`);
      assert.ok(resolvePath(fil, block.titleKey), `Missing FIL title: ${block.titleKey}`);
    }

    for (const section of block.sections) {
      assert.ok(section.categoryKey, "Section must have categoryKey");
      assert.ok(resolvePath(en, section.categoryKey), `Missing EN category: ${section.categoryKey}`);
      assert.ok(resolvePath(es, section.categoryKey), `Missing ES category: ${section.categoryKey}`);
      assert.ok(resolvePath(fil, section.categoryKey), `Missing FIL category: ${section.categoryKey}`);

      assert.ok(section.itemKeys.length > 0, `Section ${section.categoryKey} has no items`);
      for (const itemKey of section.itemKeys) {
        assert.ok(resolvePath(en, itemKey), `Missing EN item: ${itemKey}`);
        assert.ok(resolvePath(es, itemKey), `Missing ES item: ${itemKey}`);
        assert.ok(resolvePath(fil, itemKey), `Missing FIL item: ${itemKey}`);
      }
    }
  }
});

test("whats new: includes Calendar category with date selection fix", () => {
  const v100 = RELEASE_NOTES.find((block) => block.version === "1.0.0");
  const calendarSection = v100.sections.find(
    (s) => s.categoryKey === "versionHistory.categories.calendar"
  );
  assert.ok(calendarSection, "Calendar section must exist");
  assert.ok(calendarSection.itemKeys.includes("versionHistory.v100.calendarItem2"));

  const calendarFixTextEn = resolvePath(en, "versionHistory.v100.calendarItem2");
  assert.match(calendarFixTextEn, /date/i);
});
