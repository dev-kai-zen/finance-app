const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

// Helper to transpile TS file on the fly
function loadTsModule(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath);
  const code = fs.readFileSync(fullPath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  const fn = new Function("require", "exports", "module", transpiled);
  fn(require, mod.exports, mod);
  return mod.exports;
}

const { en } = loadTsModule("../../../infrastructure/localization/translations/en.ts");
const { fil } = loadTsModule("../../../infrastructure/localization/translations/fil.ts");
const { es } = loadTsModule("../../../infrastructure/localization/translations/es.ts");

const {
  getLocalizedMonthName,
  getLocalizedWeekdayNames,
  formatFriendlyDate,
  resolveBcp47Locale,
  formatDateKey,
} = loadTsModule("../utils/calendar-dates.ts");

function collectKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(collectKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("CAL-F11: Calendar Localization and Parity", () => {
  test("100% key parity for calendar namespace across en, fil, and es", () => {
    const enKeys = collectKeys(en.calendar).sort();
    const filKeys = collectKeys(fil.calendar).sort();
    const esKeys = collectKeys(es.calendar).sort();

    assert.ok(enKeys.length > 50, `Expected at least 50 calendar keys, found ${enKeys.length}`);

    const missingInFil = enKeys.filter((k) => !filKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));

    assert.deepEqual(missingInFil, [], `Keys missing in fil.ts: ${missingInFil.join(", ")}`);
    assert.deepEqual(missingInEs, [], `Keys missing in es.ts: ${missingInEs.join(", ")}`);
  });

  test("resolveBcp47Locale maps supported locales accurately", () => {
    assert.equal(resolveBcp47Locale("en"), "en-US");
    assert.equal(resolveBcp47Locale("fil"), "fil-PH");
    assert.equal(resolveBcp47Locale("es"), "es-ES");
    assert.equal(resolveBcp47Locale(undefined), "en-US");
  });

  test("getLocalizedMonthName produces capitalized localized names", () => {
    const enNov = getLocalizedMonthName(2026, 10, "en");
    assert.equal(enNov, "November");

    const esJan = getLocalizedMonthName(2026, 0, "es");
    assert.equal(esJan, "Enero");

    const filJan = getLocalizedMonthName(2026, 0, "fil");
    assert.ok(filJan.length > 0);
  });

  test("getLocalizedWeekdayNames returns 7 short weekday headers", () => {
    const enWeekdays = getLocalizedWeekdayNames("en");
    assert.equal(enWeekdays.length, 7);
    assert.equal(enWeekdays[0], "Sun");
    assert.equal(enWeekdays[6], "Sat");

    const esWeekdays = getLocalizedWeekdayNames("es");
    assert.equal(esWeekdays.length, 7);
    assert.equal(esWeekdays[0].startsWith("D"), true); // Dom

    const filWeekdays = getLocalizedWeekdayNames("fil");
    assert.equal(filWeekdays.length, 7);
  });

  test("formatFriendlyDate localizes Today, Yesterday, and arbitrary dates", () => {
    const now = new Date();
    const todayKey = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayKey = formatDateKey(
      yesterdayDate.getFullYear(),
      yesterdayDate.getMonth(),
      yesterdayDate.getDate(),
    );

    const mockT = (key) => {
      if (key === "common.today") return "Ngayon";
      if (key === "calendar.yesterday") return "Kahapon";
      return key;
    };

    // Today with mockT
    assert.equal(formatFriendlyDate(todayKey, "fil", mockT), "Ngayon");
    // Yesterday with mockT
    assert.equal(formatFriendlyDate(yesterdayKey, "fil", mockT), "Kahapon");

    // Without t (fallback)
    assert.equal(formatFriendlyDate(todayKey), "Today");
    assert.equal(formatFriendlyDate(yesterdayKey), "Yesterday");

    // Specific date
    const pastKey = "2026-03-15";
    const formattedEn = formatFriendlyDate(pastKey, "en");
    assert.ok(formattedEn.includes("2026"));
    assert.ok(formattedEn.includes("15"));
  });

  test("singular and plural units exist across all three languages", () => {
    const units = ["transaction", "transactions", "schedule", "schedules", "account", "accounts", "record", "records"];
    for (const unit of units) {
      assert.ok(en.calendar.scope.units[unit], `en.calendar.scope.units.${unit} is missing`);
      assert.ok(fil.calendar.scope.units[unit], `fil.calendar.scope.units.${unit} is missing`);
      assert.ok(es.calendar.scope.units[unit], `es.calendar.scope.units.${unit} is missing`);
    }
  });
});
