const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const resolve = Module._resolveFilename, load = Module._load;
let state, prevented, callback, routerBack, steps;
let hooks = [], hookIndex = 0;
const theme = {
  colors: {}, spacing: { lg: 16, md: 12, sm: 8 }, borderRadius: { large: 12, small: 4 }, typography: { fontSize: { sm: 14, base: 16, xl: 20, xs: 12 }, lineHeight: { base: 24, sm: 20 } },
};
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
const jsx = (type, props) => ({ type, props });
Module._load = function (request, ...args) {
  if (request === "react") return { useEffect: () => {}, useState: (initial) => {
    const index = hookIndex++;
    if (!Object.hasOwn(hooks, index)) hooks[index] = typeof initial === "function" ? initial() : initial;
    return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
  } };
  if (request === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
  if (request === "react-native") return { View: "View", Text: "Text", Pressable: "Pressable", ActivityIndicator: "ActivityIndicator", FlatList: "FlatList", KeyboardAvoidingView: "KeyboardAvoidingView", Platform: { OS: "android" }, StyleSheet: { create: (styles) => styles }, useWindowDimensions: () => ({ width: 390 }) };
  if (request === "expo-router/react-navigation") return { usePreventRemove: (condition, handler) => { prevented = condition; callback = handler; } };
  if (request === "expo-router") return { useRouter: () => ({ back: () => routerBack++ }), useNavigation: () => ({ dispatch: () => {} }) };
  if (request === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ bottom: 0 }) };
  if (request === "@/hooks/use-app-theme") return { useAppTheme: () => theme, useThemeStyles: (factory) => factory(theme) };
  if (request === "@/infrastructure/localization") return { useLocalization: () => ({ t: (key) => key, activeLanguage: { code: "en" } }) };
  if (request === "@/modules/accounts") return { AccountPickerModal: "AccountPickerModal", AccountTypePickerModal: "AccountTypePickerModal" };
  if (request === "@/modules/categories") return { CategoryPickerModal: "CategoryPickerModal" };
  if (request === "@/modules/onboarding") return { useWorkspace: () => ({ state: { mode: "personal" } }) };
  if (request === "../hooks/use-data-import") return { useDataImport: () => state };
  if (request.startsWith("@/components/")) {
    const names = { "app-button": "AppButton", "confirm-modal": "ConfirmModal", "info-modal": "InfoModal", "modal-screen-header": "ModalScreenHeader", "full-screen-form-modal": "FullScreenFormModal", "keyboard-aware-form": "KeyboardAwareForm", "date-picker-modal": "DatePickerModal", "screen-title-with-help": "HelpIconButton" };
    const name = names[request.split("/").pop()]; return { [name]: name };
  }
  if (request.endsWith("/import-controls")) return { ImportInput: "ImportInput", ImportSelect: "ImportSelect", ImportAction: "ImportAction", ImportChoice: "ImportChoice", ImportChip: "ImportChip", ImportDateField: "ImportDateField", ImportFieldButton: "ImportFieldButton", ImportTypePicker: "ImportTypePicker" };
  return load.call(this, request, ...args);
};
require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
const { DataImportScreen } = require("../screens/data-import-screen.tsx");
const { ImportReviewEntry } = require("../components/import-review-entry.tsx");
beforeEach(() => {
  steps = []; routerBack = 0; hooks = []; hookIndex = 0;
  state = { step: "history", options: { kind: "transactions", columns: {}, defaultAccount: "", source: "" }, history: [], accountNames: [], categoryNames: [], busy: false, loading: false, file: null, setStep: (step) => steps.push(step) };
});
const header = (tree) => tree.props.children.find((child) => child?.type === "ModalScreenHeader");

test("history has its own title and header back returns to the import landing screen", () => {
  const title = header(DataImportScreen());
  assert.equal(title.props.title, "dataImport.history");
  title.props.onPressBack();
  assert.deepEqual(steps, ["file"]); assert.equal(routerBack, 0);
});
test("system back from history returns to import without popping the route", () => {
  DataImportScreen(); assert.equal(prevented, true);
  callback({ data: { action: { type: "GO_BACK" } } });
  assert.deepEqual(steps, ["file"]); assert.equal(routerBack, 0);
});
test("import landing keeps the normal back action and exposes header help", () => {
  state.step = "file"; state.options.kind = "accounts";
  const title = header(DataImportScreen());
  assert.equal(title.props.title, "dataImport.title");
  assert.equal(typeof title.props.onPressHelp, "function");
  title.props.onPressBack(); assert.equal(routerBack, 1);
});

test("wizard back moves through steps instead of discarding the draft", () => {
  state.step = "review"; state.file = { name: "file.csv", document: { headers: [], rows: [] } };
  header(DataImportScreen()).props.onPressBack();
  assert.deepEqual(steps, ["categories"]); assert.equal(routerBack, 0);
  state.step = "matching"; DataImportScreen(); callback({ data: { action: { type: "GO_BACK" } } });
  assert.deepEqual(steps, ["categories", "columns"]);
});

test("accounts-only review returns directly to the account step", () => {
  state.options.kind = "accounts"; state.step = "review";
  header(DataImportScreen()).props.onPressBack();
  assert.deepEqual(steps, ["matching"]);
});

function walk(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return node.map((child) => walk(child, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return Object.values(node.props ?? {}).map((child) => walk(child, predicate)).find(Boolean);
}
test("blank optional source does not disable continuing to accounts", () => {
  state.step = "columns"; state.options = { ...state.options, dateFormat: "ymd", decimal: ".", columns: { date: 0, amount: 1, account: 2 } };
  state.file = { name: "file.csv", document: { headers: ["Date", "Amount", "Account"], rows: [{ number: 2, cells: ["2026-01-02", "100", "Cash"] }] } };
  const tree = DataImportScreen();
  const next = walk(tree, (node) => node.type === "ImportAction" && node.props.label === "dataImport.wizard.nextAccounts");
  assert.equal(next.props.disabled, false);
});

function reviewFixture() {
  const row = { number: 2, cells: ["2026-01-02", "expense", "150", "Cash", "Food"], sourceKey: "old", skip: false, repeated: false, duplicate: false };
  const mapping = { existingId: "", name: "Cash", accountTypeId: "wallet", currency: "PHP", openingBalance: "1000", balanceDate: "2026-01-01" };
  const updates = [];
  state = { ...state, options: { kind: "transactions", source: "", columns: { date: 0, type: 1, amount: 2, account: 3, category: 4 }, defaultAccount: "", defaultCurrency: "PHP", dateFormat: "ymd", decimal: ".", accounts: { cash: mapping }, categories: {}, decisions: {} },
    file: { document: { headers: ["Date", "Type", "Amount", "Account", "Category"], rows: [{ number: 2, cells: row.cells }] } },
    catalog: { accounts: [], accountTypes: [{ id: "wallet", name: "Wallet", creditCard: false }], categories: [], currencies: ["PHP"] },
    updateRow: (...args) => updates.push(args),
  };
  const render = () => { hookIndex = 0; return ImportReviewEntry({ row, state }); };
  const button = (tree, label) => walk(tree, (node) => node.type === "ImportAction" && node.props.label === label);
  return { row, updates, render, button, mapping };
}
test("cancelling an entry editor preserves values and account choices", () => {
  const f = reviewFixture();
  f.button(f.render(), "dataImport.wizard.editEntry").props.onPress();
  const tree = f.render();
  const amount = walk(tree, (node) => node.type === "ImportInput" && node.props.label === "dataImport.fields.amount");
  amount.props.onChange("125.50");
  const account = walk(tree, (node) => typeof node.type === "function" && node.type.name === "ImportAccountCard");
  account.props.state.account("cash", { openingBalance: "2000" });
  walk(f.render(), (node) => node.type === "FullScreenFormModal").props.onClose();
  assert.equal(f.updates.length, 0); assert.equal(f.row.cells[2], "150"); assert.equal(f.mapping.openingBalance, "1000");
});
test("applying an entry editor submits the corrected values for revalidation", () => {
  const f = reviewFixture();
  f.button(f.render(), "dataImport.wizard.editEntry").props.onPress();
  const amount = walk(f.render(), (node) => node.type === "ImportInput" && node.props.label === "dataImport.fields.amount");
  amount.props.onChange("125.50");
  walk(f.render(), (node) => node.type === "FullScreenFormModal").props.onSave();
  assert.equal(f.updates.length, 1); assert.equal(f.updates[0][1][2], "125.50");
  assert.equal(f.row.cells[2], "150");
});

test("review starts with attention entries and filter buttons change the displayed group", () => {
  state.step = "review";
  state.preview = { rows: [
    { number: 2, cells: ["Bad amount"], issue: "amount", skip: false, repeated: false },
    { number: 3, cells: ["Lunch"], skip: false, repeated: false },
    { number: 4, cells: ["Past import"], skip: true, repeated: true },
  ], accepted: 1, errors: 1, skipped: 1, ready: false, balances: [], income: {}, expense: {} };
  const render = () => { hookIndex = 0; return DataImportScreen(); };
  let tree = render();
  const list = (node) => walk(node, (entry) => entry.type === "FlatList" && entry.props.initialNumToRender === 20);
  assert.equal(list(tree).props.data.length, 1); assert.equal(list(tree).props.data[0].index, 0);
  const ready = walk(tree, (entry) => entry.type === "Pressable" && walk(entry.props.children, (child) => child.type === "Text" && child.props.children === "dataImport.ui.ready"));
  ready.props.onPress(); tree = render();
  assert.equal(list(tree).props.data.length, 1); assert.equal(list(tree).props.data[0].index, 1);
});
