const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const fs = require("node:fs");

function loadColorContrastUtil() {
  const filePath = path.resolve(__dirname, "../color-contrast.ts");
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

test("color-contrast: hexToRgb parses 3-digit, 6-digit, and prefixed hex", () => {
  const { hexToRgb } = loadColorContrastUtil();
  assert.deepEqual(hexToRgb("#FFF"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb("10B981"), { r: 16, g: 185, b: 129 });
  assert.deepEqual(hexToRgb("invalid"), { r: 0, g: 0, b: 0 });
});

test("color-contrast: getRelativeLuminance returns 1 for white and 0 for black", () => {
  const { getRelativeLuminance } = loadColorContrastUtil();
  assert.equal(Math.round(getRelativeLuminance("#FFFFFF")), 1);
  assert.equal(Math.round(getRelativeLuminance("#000000")), 0);
  assert.ok(getRelativeLuminance("#F8FAFC") > 0.9);
  assert.ok(getRelativeLuminance("#0F172A") < 0.05);
});

test("color-contrast: isLightColor correctly distinguishes light and dark backgrounds", () => {
  const { isLightColor } = loadColorContrastUtil();
  assert.equal(isLightColor("#FFFFFF"), true);
  assert.equal(isLightColor("#F8FAFC"), true);
  assert.equal(isLightColor("#000000"), false);
  assert.equal(isLightColor("#0F172A"), false);
  assert.equal(isLightColor("#1E293B"), false);
});

test("color-contrast: getContrastTextColor returns dark text for light bg and light text for dark bg", () => {
  const { getContrastTextColor } = loadColorContrastUtil();
  assert.equal(getContrastTextColor("#FFFFFF"), "#0F172A");
  assert.equal(getContrastTextColor("#F8FAFC"), "#0F172A");
  assert.equal(getContrastTextColor("#000000"), "#FFFFFF");
  assert.equal(getContrastTextColor("#0F172A"), "#FFFFFF");
  assert.equal(
    getContrastTextColor("#FFFFFF", { darkText: "#111827", lightText: "#F8FAFC" }),
    "#111827",
  );
  assert.equal(
    getContrastTextColor("#0F172A", { darkText: "#111827", lightText: "#F8FAFC" }),
    "#F8FAFC",
  );
});

