const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
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

const { getNotesWalkthroughSteps } = require("../notes/notes-walkthrough-steps.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

test("notes walkthrough: returns only empty create step when hasAnyNotes is false", () => {
  const steps = getNotesWalkthroughSteps({ hasAnyNotes: false });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].id, "notesEmptyCreateButton");
  assert.equal(steps[0].targetId, "notesEmptyCreateButton");
  assert.equal(steps[0].titleKey, "notesWalkthrough.stepEmptyCreateTitle");
  assert.equal(steps[0].descKey, "notesWalkthrough.stepEmptyCreateDesc");
});

test("notes walkthrough: returns 5 guided steps when library has notes and list is visible", () => {
  const steps = getNotesWalkthroughSteps({
    hasAnyNotes: true,
    hasNoteInList: true,
  });
  assert.equal(steps.length, 5);

  // 1. Search Notes
  assert.equal(steps[0].id, "notesSearch");
  assert.equal(steps[0].targetId, "notesSearch");
  assert.equal(steps[0].titleKey, "notesWalkthrough.stepSearchTitle");

  // 2. Display mode
  assert.equal(steps[1].id, "notesViewMode");
  assert.equal(steps[1].targetId, "notesViewMode");
  assert.equal(steps[1].titleKey, "notesWalkthrough.stepViewModeTitle");

  // 3. Modified filter
  assert.equal(steps[2].id, "notesSortFilter");
  assert.equal(steps[2].targetId, "notesSortFilter");
  assert.equal(steps[2].titleKey, "notesWalkthrough.stepSortFilterTitle");

  // 4. Highlight the first note, mention swipe to delete in list mode
  assert.equal(steps[3].id, "notesFirstItem");
  assert.equal(steps[3].targetId, "notesFirstItem");
  assert.equal(steps[3].titleKey, "notesWalkthrough.stepFirstItemTitle");
  assert.equal(steps[3].descKey, "notesWalkthrough.stepFirstItemDesc");

  // 5. Fab + Button to add note
  assert.equal(steps[4].id, "notesFab");
  assert.equal(steps[4].targetId, "notesFab");
  assert.equal(steps[4].titleKey, "notesWalkthrough.stepFabTitle");
  assert.equal(steps[4].descKey, "notesWalkthrough.stepFabDesc");
});

test("notes walkthrough: omits first note step when filtered list is empty", () => {
  const steps = getNotesWalkthroughSteps({
    hasAnyNotes: true,
    hasNoteInList: false,
  });
  assert.deepEqual(
    steps.map((step) => step.targetId),
    ["notesSearch", "notesViewMode", "notesSortFilter"],
  );
});

test("notes walkthrough: translations exist for all keys across en, es, and fil", () => {
  const expectedKeys = [
    "stepEmptyCreateTitle",
    "stepEmptyCreateDesc",
    "stepSearchTitle",
    "stepSearchDesc",
    "stepViewModeTitle",
    "stepViewModeDesc",
    "stepSortFilterTitle",
    "stepSortFilterDesc",
    "stepFirstItemTitle",
    "stepFirstItemDesc",
    "stepFabTitle",
    "stepFabDesc",
  ];

  for (const langKey of expectedKeys) {
    assert.ok(en.notesWalkthrough?.[langKey], `Missing en.notesWalkthrough.${langKey}`);
    assert.ok(es.notesWalkthrough?.[langKey], `Missing es.notesWalkthrough.${langKey}`);
    assert.ok(fil.notesWalkthrough?.[langKey], `Missing fil.notesWalkthrough.${langKey}`);
  }

  // Verify swipe gesture mention in description
  assert.match(en.notesWalkthrough.stepFirstItemDesc, /swipe/i);
  assert.match(en.notesWalkthrough.stepFirstItemDesc, /delete/i);
});
