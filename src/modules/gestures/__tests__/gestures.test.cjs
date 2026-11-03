const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const mockSettings = new Map();

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
    request === "react-native" ||
    request === "expo" ||
    request === "expo-sensors" ||
    request === "expo-haptics" ||
    request === "expo-router" ||
    request.includes("infrastructure/database")
  ) {
    return {};
  }
  if (request.includes("infrastructure/sync")) {
    return { queueDebouncedQuickSync: () => {} };
  }
  if (request.endsWith("settings.repository") || request.endsWith("settings.repository.ts")) {
    return {
      getSettingByKey: (key) => mockSettings.get(key) ?? null,
      saveSettingsEntries: (entries) => {
        for (const [k, v] of Object.entries(entries)) {
          mockSettings.set(k, v);
        }
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

test("gestures constants: has expected default thresholds and cooldowns", () => {
  const {
    DEFAULT_SHAKE_ACTION,
    SHAKE_FORCE_THRESHOLD,
    SHAKE_COOLDOWN_MS,
  } = require("../constants/gestures.constants.ts");

  assert.equal(DEFAULT_SHAKE_ACTION, "disabled");
  assert.equal(SHAKE_FORCE_THRESHOLD, 1.75);
  assert.equal(SHAKE_COOLDOWN_MS, 1500);
});

test("gestures service: getShakeActionSetting defaults to disabled and handles known values", () => {
  const {
    getShakeActionSetting,
  } = require("../../settings/services/gesture-settings.service.ts");

  mockSettings.clear();
  assert.equal(getShakeActionSetting(), "disabled");

  mockSettings.set("gestures.shakeAction", "manual_entry");
  assert.equal(getShakeActionSetting(), "manual_entry");

  mockSettings.set("gestures.shakeAction", "disabled");
  assert.equal(getShakeActionSetting(), "disabled");

  mockSettings.set("gestures.shakeAction", "invalid_value");
  assert.equal(getShakeActionSetting(), "disabled");
});

test("gestures service: subscribeToShakeActionSetting notifies subscribers and persists", () => {
  const {
    subscribeToShakeActionSetting,
    setShakeActionSetting,
    getShakeActionSetting,
  } = require("../../settings/services/gesture-settings.service.ts");

  mockSettings.clear();
  let callCount = 0;
  const unsubscribe = subscribeToShakeActionSetting(() => {
    callCount += 1;
  });

  setShakeActionSetting("manual_entry");
  assert.equal(callCount, 1);
  assert.equal(getShakeActionSetting(), "manual_entry");

  setShakeActionSetting("disabled");
  assert.equal(callCount, 2);
  assert.equal(getShakeActionSetting(), "disabled");

  unsubscribe();
  setShakeActionSetting("chat_with_kai");
  assert.equal(callCount, 2); // Unsubscribed, should not increment
});
