const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const fs = require("node:fs");

function loadDevModeUtil() {
  const filePath = path.resolve(__dirname, "../dev-mode.ts");
  const code = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const m = new Module(filePath, module);
  m.filename = filePath;
  m.paths = Module._nodeModulePaths(path.dirname(filePath));
  m._compile(transpiled, filePath);
  return m.exports;
}

test("dev-mode: allows dev mode when __DEV__ is true", () => {
  const originalDev = global.__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
  try {
    global.__DEV__ = true;
    delete process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
    const { isDevModeAllowed } = loadDevModeUtil();
    assert.equal(isDevModeAllowed(), true);
  } finally {
    global.__DEV__ = originalDev;
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_ENABLE_DEV_MODE = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
    }
  }
});

test("dev-mode: allows dev mode in release when EXPO_PUBLIC_ENABLE_DEV_MODE is 'true'", () => {
  const originalDev = global.__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
  try {
    global.__DEV__ = false;
    process.env.EXPO_PUBLIC_ENABLE_DEV_MODE = "true";
    const { isDevModeAllowed } = loadDevModeUtil();
    assert.equal(isDevModeAllowed(), true);
  } finally {
    global.__DEV__ = originalDev;
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_ENABLE_DEV_MODE = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
    }
  }
});

test("dev-mode: denies dev mode in release when EXPO_PUBLIC_ENABLE_DEV_MODE is false or unset", () => {
  const originalDev = global.__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
  try {
    global.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
    let { isDevModeAllowed } = loadDevModeUtil();
    assert.equal(isDevModeAllowed(), false);

    process.env.EXPO_PUBLIC_ENABLE_DEV_MODE = "false";
    ({ isDevModeAllowed } = loadDevModeUtil());
    assert.equal(isDevModeAllowed(), false);
  } finally {
    global.__DEV__ = originalDev;
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_ENABLE_DEV_MODE = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_ENABLE_DEV_MODE;
    }
  }
});
