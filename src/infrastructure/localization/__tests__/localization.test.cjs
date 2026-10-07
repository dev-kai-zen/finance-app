const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
let storedPreference = null;

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

Module._load = function (request, parent, ...rest) {
  if (
    request ===
    "@/infrastructure/localization/repositories/language-preference.repository"
  ) {
    return {
      readLanguagePreferenceValue: () => storedPreference,
      writeLanguagePreferenceValue: (_key, value) => {
        storedPreference = value;
      },
    };
  }

  return originalLoad.call(this, request, parent, ...rest);
};

require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const {
  getLanguagePreference,
  resolveSupportedLocale,
  setLanguagePreference,
} = require("@/infrastructure/localization/services/language-preference.service");
const {
  SUPPORTED_LANGUAGES,
} = require("@/infrastructure/localization/constants/localization.constants");
const {
  filterLanguages,
} = require("@/infrastructure/localization/utils/filter-languages");

beforeEach(() => {
  storedPreference = null;
});

test("defaults to the system preference and persists explicit selections", () => {
  assert.equal(getLanguagePreference(), "system");

  setLanguagePreference("fil");
  assert.equal(getLanguagePreference(), "fil");

  setLanguagePreference("es");
  assert.equal(getLanguagePreference(), "es");
});

test("falls back safely when a stored preference is unsupported", () => {
  storedPreference = "fr";
  assert.equal(getLanguagePreference(), "system");
});

test("resolves supported device languages and falls back to English", () => {
  assert.equal(resolveSupportedLocale("system", "es"), "es");
  assert.equal(resolveSupportedLocale("system", "fil"), "fil");
  assert.equal(resolveSupportedLocale("system", "tl"), "fil");
  assert.equal(resolveSupportedLocale("system", "fr"), "en");
  assert.equal(resolveSupportedLocale("fil", "es"), "fil");
});

test("searches by English name, native name, and locale code", () => {
  assert.deepEqual(
    filterLanguages(SUPPORTED_LANGUAGES, "span").map(({ code }) => code),
    ["es"],
  );
  assert.deepEqual(
    filterLanguages(SUPPORTED_LANGUAGES, "espanol").map(({ code }) => code),
    ["es"],
  );
  assert.deepEqual(
    filterLanguages(SUPPORTED_LANGUAGES, "fil").map(({ code }) => code),
    ["fil"],
  );
});

test("returns the full supported list for a blank search", () => {
  assert.deepEqual(
    filterLanguages(SUPPORTED_LANGUAGES, "   ").map(({ code }) => code),
    ["en", "fil", "es"],
  );
});
