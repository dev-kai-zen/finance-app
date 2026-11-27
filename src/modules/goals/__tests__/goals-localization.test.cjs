const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function loadTsModule(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require(id) {
        throw new Error("Unexpected require: " + id);
      },
      console,
    },
    { filename },
  );
  return exports;
}

const en = loadTsModule("../../../infrastructure/localization/translations/en.ts").en;
const fil = loadTsModule("../../../infrastructure/localization/translations/fil.ts").fil;
const es = loadTsModule("../../../infrastructure/localization/translations/es.ts").es;

function getAllLeafKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getAllLeafKeys(v, fullKey));
    } else {
      keys.push({ key: fullKey, value: v });
    }
  }
  return keys;
}

function extractPlaceholders(str) {
  if (typeof str !== "string") return [];
  const matches = str.match(/%\{[a-zA-Z0-9_]+\}/g);
  return matches ? matches.sort() : [];
}

test("GOAL-F09: Full 3-language key parity and non-empty values for goals namespace", () => {
  assert.ok(en.goals, "en.goals must exist");
  assert.ok(fil.goals, "fil.goals must exist");
  assert.ok(es.goals, "es.goals must exist");

  const enLeaves = getAllLeafKeys(en.goals, "goals");
  const filLeaves = getAllLeafKeys(fil.goals, "goals");
  const esLeaves = getAllLeafKeys(es.goals, "goals");

  const enMap = new Map(enLeaves.map((item) => [item.key, item.value]));
  const filMap = new Map(filLeaves.map((item) => [item.key, item.value]));
  const esMap = new Map(esLeaves.map((item) => [item.key, item.value]));

  // Check that all en keys exist in fil and es
  for (const [key, enVal] of enMap.entries()) {
    assert.ok(filMap.has(key), `Missing Filipino translation for key: ${key}`);
    assert.ok(esMap.has(key), `Missing Spanish translation for key: ${key}`);

    const filVal = filMap.get(key);
    const esVal = esMap.get(key);

    assert.ok(typeof enVal === "string" && enVal.trim().length > 0, `en value for ${key} must not be empty`);
    assert.ok(typeof filVal === "string" && filVal.trim().length > 0, `fil value for ${key} must not be empty`);
    assert.ok(typeof esVal === "string" && esVal.trim().length > 0, `es value for ${key} must not be empty`);

    // Verify placeholder parity
    const enPlaceholders = extractPlaceholders(enVal);
    const filPlaceholders = extractPlaceholders(filVal);
    const esPlaceholders = extractPlaceholders(esVal);

    assert.deepEqual(filPlaceholders, enPlaceholders, `Placeholder mismatch in Filipino for ${key}: expected ${enPlaceholders.join(",")} got ${filPlaceholders.join(",")}`);
    assert.deepEqual(esPlaceholders, enPlaceholders, `Placeholder mismatch in Spanish for ${key}: expected ${enPlaceholders.join(",")} got ${esPlaceholders.join(",")}`);
  }

  // Check no extra keys in fil or es
  for (const key of filMap.keys()) {
    assert.ok(enMap.has(key), `Extra Filipino key not in English: ${key}`);
  }
  for (const key of esMap.keys()) {
    assert.ok(enMap.has(key), `Extra Spanish key not in English: ${key}`);
  }

  // Key count must be identical
  assert.equal(enLeaves.length, filLeaves.length);
  assert.equal(enLeaves.length, esLeaves.length);
  assert.ok(enLeaves.length >= 40, `Expected at least 40 localized keys for goals, found ${enLeaves.length}`);
});

test("GOAL-F09: Locale-aware date formatting across en, fil, and es", () => {
  const testDate = new Date(2027, 4, 15); // May 15, 2027

  const enDate = testDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const esDate = testDate.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const filDate = testDate.toLocaleDateString("fil-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  assert.ok(enDate.includes("May") || enDate.includes("5/15"), "en date formatted correctly");
  assert.ok(esDate.includes("may") || esDate.includes("15"), "es date formatted with Spanish month");
  assert.ok(filDate.length > 0, "fil date formatted correctly");
});

test("GOAL-F09: All goals components and screens integrate useLocalization", () => {
  const componentPaths = [
    "../components/goal-card.tsx",
    "../components/goal-form-modal.tsx",
    "../components/goal-account-picker-modal.tsx",
    "../components/goal-summary-header.tsx",
    "../screens/goals-screen.tsx",
  ];

  for (const rel of componentPaths) {
    const fullPath = path.resolve(__dirname, rel);
    const content = fs.readFileSync(fullPath, "utf8");

    assert.ok(
      content.includes("useLocalization"),
      `${rel} must import and use useLocalization`,
    );
    assert.ok(
      content.includes('t("goals.') || content.includes("t('goals."),
      `${rel} must call t() with goals translation keys`,
    );
  }
});
