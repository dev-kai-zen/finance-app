const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const resolve = Module._resolveFilename, load = Module._load;
const jsx = (type, props) => ({ type, props });
const theme = { colors: {}, spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, typography: { fontSize: { xs: 12, sm: 14, base: 16 } }, borderRadius: { medium: 8, large: 12, round: 999 } };
let slots = [], cursor = 0;
Module._resolveFilename = function (request, parent, ...args) { return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args); };
Module._load = function (request, ...args) {
  if (request === "react") return { useState: (initial) => { const index = cursor++; if (!Object.hasOwn(slots, index)) slots[index] = initial; return [slots[index], (value) => { slots[index] = value; }]; } };
  if (request === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
  if (request === "react-native") return { View: "View", Text: "Text", TextInput: "TextInput", Pressable: "Pressable", Keyboard: { dismiss: () => {} } };
  if (request === "lucide-react-native") return { Check: "Check", ChevronDown: "ChevronDown" };
  if (request === "@/hooks/use-app-theme") return { useAppTheme: () => theme };
  if (request === "@/infrastructure/localization") return { useLocalization: () => ({ activeLanguage: { code: "en" }, t: (key) => key }) };
  if (request.startsWith("@/components/")) {
    const exports = { "app-button": "AppButton", "full-screen-form-modal": "FullScreenFormModal", "keyboard-aware-form": "KeyboardAwareForm", "date-picker-modal": "DatePickerModal", "screen-title-with-help": "HelpIconButton" };
    const name = exports[request.split("/").pop()]; return { [name]: name };
  }
  return load.call(this, request, ...args);
};
require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
const { ImportDateField } = require("../components/import-controls.tsx");
beforeEach(() => { slots = []; cursor = 0; });
test("calendar corrections preserve the chosen file format and existing transaction time", () => {
  const updates = [];
  const tree = ImportDateField({ label: "Date", value: "02/01/2026 09:30", format: "dmy", onChange: (value) => updates.push(value) });
  const calendar = tree.props.children.find((child) => child.type === "DatePickerModal");
  assert.equal(calendar.props.selectedDate, "2026-01-02");
  calendar.props.onSelectDate("2026-02-03");
  assert.deepEqual(updates, ["03/02/2026 09:30"]);
});
test("an invalid source date stays unchanged until the user selects a calendar date", () => {
  const updates = [];
  const tree = ImportDateField({ label: "Date", value: "invalid", format: "mdy", onChange: (value) => updates.push(value) });
  const calendar = tree.props.children.find((child) => child.type === "DatePickerModal");
  assert.equal(calendar.props.selectedDate, undefined); assert.equal(updates.length, 0);
  calendar.props.onSelectDate("2026-02-03");
  assert.deepEqual(updates, ["02/03/2026"]);
});
