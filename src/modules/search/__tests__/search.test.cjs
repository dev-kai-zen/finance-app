const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, property) => {
      if (property === Symbol.toPrimitive) return () => "";
      if (property === "create") return (value) => value || {};
      return createMock();
    },
  });
};

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
    request === "expo-router" ||
    request === "lucide-react-native" ||
    request === "react"
  ) {
    return createMock();
  }
  return originalLoad.call(this, request, parent, ...rest);
};

require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  }).outputText;

  module._compile(code, filename);
};

const {
  SEARCH_CATALOG,
  SUGGESTED_SHORTCUT_IDS,
} = require("../constants/search-catalog.ts");
const { en } = require("../../../infrastructure/localization/translations/en.ts");
const { es } = require("../../../infrastructure/localization/translations/es.ts");
const { fil } = require("../../../infrastructure/localization/translations/fil.ts");

function resolvePath(obj, dotPath) {
  return dotPath.split(".").reduce((acc, part) => acc && acc[part], obj);
}

test("search catalog: all items have required fields and valid translation keys", () => {
  assert.ok(SEARCH_CATALOG.length > 0, "SEARCH_CATALOG must not be empty");

  for (const item of SEARCH_CATALOG) {
    assert.ok(item.id, "Search item must have an id");
    assert.ok(item.category, `Search item ${item.id} must have a category`);
    assert.ok(item.titleKey, `Search item ${item.id} must have titleKey`);
    assert.ok(item.descriptionKey, `Search item ${item.id} must have descriptionKey`);
    assert.ok(item.iconName, `Search item ${item.id} must have iconName`);
    assert.ok(item.iconColor, `Search item ${item.id} must have iconColor`);
    assert.ok(Array.isArray(item.keywords) && item.keywords.length > 0, `Search item ${item.id} must have keywords`);

    assert.ok(
      resolvePath(en, item.titleKey),
      `Missing EN translation for titleKey: ${item.titleKey} on ${item.id}`,
    );
    assert.ok(
      resolvePath(es, item.titleKey),
      `Missing ES translation for titleKey: ${item.titleKey} on ${item.id}`,
    );
    assert.ok(
      resolvePath(fil, item.titleKey),
      `Missing FIL translation for titleKey: ${item.titleKey} on ${item.id}`,
    );

    assert.ok(
      resolvePath(en, item.descriptionKey),
      `Missing EN translation for descriptionKey: ${item.descriptionKey} on ${item.id}`,
    );
    assert.ok(
      resolvePath(es, item.descriptionKey),
      `Missing ES translation for descriptionKey: ${item.descriptionKey} on ${item.id}`,
    );
    assert.ok(
      resolvePath(fil, item.descriptionKey),
      `Missing FIL translation for descriptionKey: ${item.descriptionKey} on ${item.id}`,
    );
  }
});

test("search catalog: suggestions contain valid item IDs", () => {
  assert.ok(SUGGESTED_SHORTCUT_IDS.length > 0, "Suggested shortcuts must not be empty");
  for (const id of SUGGESTED_SHORTCUT_IDS) {
    const item = SEARCH_CATALOG.find((catItem) => catItem.id === id);
    assert.ok(item, `Suggested shortcut id '${id}' not found in SEARCH_CATALOG`);
  }
});

test("search catalog: finds Password & Fingerprint setting easily", () => {
  const queryVariations = ["password", "fingerprint", "pin", "biometrics", "lock", "passcode"];

  for (const query of queryVariations) {
    const trimmed = query.toLowerCase();
    const matches = SEARCH_CATALOG.filter((item) => {
      const enTitle = resolvePath(en, item.titleKey) || "";
      const enDesc = resolvePath(en, item.descriptionKey) || "";
      const titleMatch = enTitle.toLowerCase().includes(trimmed);
      const descMatch = enDesc.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some((k) =>
        k.toLowerCase().includes(trimmed) || trimmed.includes(k.toLowerCase()),
      );
      return titleMatch || descMatch || keywordMatch;
    });

    const hasSecurity = matches.some((item) => item.id === "setting_security");
    assert.ok(
      hasSecurity,
      `Expected 'setting_security' to match query '${query}', found: ${matches.map((m) => m.id).join(", ")}`,
    );

    const securityItem = matches.find((item) => item.id === "setting_security");
    assert.equal(securityItem.targetId, "settingsSecurity");
    assert.equal(securityItem.openModal, true);
    assert.equal(securityItem.route, "/settings?target=settingsSecurity&openModal=true");
  }
});

test("search catalog: finds Income & Expense actions and screens", () => {
  const expenseMatches = SEARCH_CATALOG.filter((item) => {
    const query = "expense";
    const enTitle = resolvePath(en, item.titleKey) || "";
    const enDesc = resolvePath(en, item.descriptionKey) || "";
    return (
      enTitle.toLowerCase().includes(query) ||
      enDesc.toLowerCase().includes(query) ||
      item.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  assert.ok(
    expenseMatches.some((item) => item.id === "action_record_expense"),
    "Expected action_record_expense to match 'expense'",
  );
  assert.ok(
    expenseMatches.some((item) => item.id === "screen_categories_expense"),
    "Expected screen_categories_expense to match 'expense'",
  );

  const incomeMatches = SEARCH_CATALOG.filter((item) => {
    const query = "income";
    const enTitle = resolvePath(en, item.titleKey) || "";
    const enDesc = resolvePath(en, item.descriptionKey) || "";
    return (
      enTitle.toLowerCase().includes(query) ||
      enDesc.toLowerCase().includes(query) ||
      item.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  assert.ok(
    incomeMatches.some((item) => item.id === "action_record_income"),
    "Expected action_record_income to match 'income'",
  );
  assert.ok(
    incomeMatches.some((item) => item.id === "screen_categories_income"),
    "Expected screen_categories_income to match 'income'",
  );
});

test("search settings translation: labels exist in EN, ES, and FIL", () => {
  assert.ok(en.search.openSearch, "Missing EN openSearch");
  assert.ok(es.search.openSearch, "Missing ES openSearch");
  assert.ok(fil.search.openSearch, "Missing FIL openSearch");

  assert.ok(en.search.searchPlaceholder, "Missing EN searchPlaceholder");
  assert.ok(es.search.searchPlaceholder, "Missing ES searchPlaceholder");
  assert.ok(fil.search.searchPlaceholder, "Missing FIL searchPlaceholder");

  assert.ok(en.settings.quickSearchTitle, "Missing EN quickSearchTitle");
  assert.ok(es.settings.quickSearchTitle, "Missing ES quickSearchTitle");
  assert.ok(fil.settings.quickSearchTitle, "Missing FIL quickSearchTitle");

  assert.ok(en.settings.quickSearchDescription, "Missing EN quickSearchDescription");
  assert.ok(es.settings.quickSearchDescription, "Missing ES quickSearchDescription");
  assert.ok(fil.settings.quickSearchDescription, "Missing FIL quickSearchDescription");
});

test("search catalog: finds Nickname setting easily", () => {
  const queryVariations = ["nickname", "name", "profile", "palayaw", "apodo"];

  for (const query of queryVariations) {
    const trimmed = query.toLowerCase();
    const matches = SEARCH_CATALOG.filter((item) => {
      const enTitle = resolvePath(en, item.titleKey) || "";
      const enDesc = resolvePath(en, item.descriptionKey) || "";
      const titleMatch = enTitle.toLowerCase().includes(trimmed);
      const descMatch = enDesc.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some((k) =>
        k.toLowerCase().includes(trimmed) || trimmed.includes(k.toLowerCase()),
      );
      return titleMatch || descMatch || keywordMatch;
    });

    const hasNickname = matches.some((item) => item.id === "setting_nickname");
    assert.ok(
      hasNickname,
      `Expected 'setting_nickname' to match query '${query}', found: ${matches.map((m) => m.id).join(", ")}`,
    );

    const nicknameItem = matches.find((item) => item.id === "setting_nickname");
    assert.equal(nicknameItem.targetId, "settingsNickname");
    assert.equal(nicknameItem.openModal, true);
    assert.equal(nicknameItem.route, "/settings?target=settingsNickname&openModal=true");
  }
});

test("search catalog: finds specific reports", () => {
  const reportQueries = [
    { query: "cash flow", expectedId: "screen_report_cash_flow" },
    { query: "balance sheet", expectedId: "screen_report_balance_sheet" },
    { query: "net worth", expectedId: "screen_report_net_worth" },
    { query: "labels", expectedId: "screen_report_labels_summary" },
  ];

  for (const { query, expectedId } of reportQueries) {
    const trimmed = query.toLowerCase();
    const matches = SEARCH_CATALOG.filter((item) => {
      const enTitle = resolvePath(en, item.titleKey) || "";
      const enDesc = resolvePath(en, item.descriptionKey) || "";
      const titleMatch = enTitle.toLowerCase().includes(trimmed);
      const descMatch = enDesc.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some((k) =>
        k.toLowerCase().includes(trimmed) || trimmed.includes(k.toLowerCase()),
      );
      return titleMatch || descMatch || keywordMatch;
    });

    assert.ok(
      matches.some((item) => item.id === expectedId),
      `Expected '${expectedId}' to match query '${query}'`,
    );
  }
});

test("search catalog: finds new quick actions", () => {
  const actionQueries = [
    { query: "scheduled", expectedId: "action_add_scheduled" },
    { query: "category", expectedId: "action_add_category" },
    { query: "credit card", expectedId: "action_add_credit_card" },
  ];

  for (const { query, expectedId } of actionQueries) {
    const trimmed = query.toLowerCase();
    const matches = SEARCH_CATALOG.filter((item) => {
      const enTitle = resolvePath(en, item.titleKey) || "";
      const enDesc = resolvePath(en, item.descriptionKey) || "";
      const titleMatch = enTitle.toLowerCase().includes(trimmed);
      const descMatch = enDesc.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some((k) =>
        k.toLowerCase().includes(trimmed) || trimmed.includes(k.toLowerCase()),
      );
      return titleMatch || descMatch || keywordMatch;
    });

    assert.ok(
      matches.some((item) => item.id === expectedId),
      `Expected '${expectedId}' to match query '${query}'`,
    );
  }
});

test("search catalog: creation quick actions route with action=new", () => {
  const goalItem = SEARCH_CATALOG.find((item) => item.id === "action_add_goal");
  assert.ok(goalItem, "action_add_goal must exist");
  assert.equal(goalItem.route, "/goals?action=new");

  const budgetItem = SEARCH_CATALOG.find((item) => item.id === "action_add_budget");
  assert.ok(budgetItem, "action_add_budget must exist");
  assert.equal(budgetItem.route, "/budgets?action=new");

  const noteItem = SEARCH_CATALOG.find((item) => item.id === "action_add_note");
  assert.ok(noteItem, "action_add_note must exist");
  assert.equal(noteItem.route, "/notes?action=new");

  const scheduledItem = SEARCH_CATALOG.find((item) => item.id === "action_add_scheduled");
  assert.ok(scheduledItem, "action_add_scheduled must exist");
  assert.equal(scheduledItem.route, "/transactions/scheduled?action=new");
});

test("search catalog: finds trash, export csv, and archived accounts actions", () => {
  const queries = [
    { query: "trash", expectedId: "action_transactions_trash" },
    { query: "deleted transactions", expectedId: "action_transactions_trash" },
    { query: "export", expectedId: "action_export_transactions_csv" },
    { query: "csv", expectedId: "action_export_transactions_csv" },
    { query: "archived accounts", expectedId: "action_archived_accounts" },
    { query: "archive", expectedId: "action_archived_accounts" },
  ];

  for (const { query, expectedId } of queries) {
    const trimmed = query.toLowerCase();
    const matches = SEARCH_CATALOG.filter((item) => {
      const enTitle = resolvePath(en, item.titleKey) || "";
      const enDesc = resolvePath(en, item.descriptionKey) || "";
      const titleMatch = enTitle.toLowerCase().includes(trimmed);
      const descMatch = enDesc.toLowerCase().includes(trimmed);
      const keywordMatch = item.keywords.some((k) =>
        k.toLowerCase().includes(trimmed) || trimmed.includes(k.toLowerCase()),
      );
      return titleMatch || descMatch || keywordMatch;
    });

    assert.ok(
      matches.some((item) => item.id === expectedId),
      `Expected '${expectedId}' to match query '${query}'`,
    );
  }
});


