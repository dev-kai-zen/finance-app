const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../../");

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function (request, parent, ...rest) {
  let target = request;
  if (target.startsWith("@/")) {
    target = path.join(root, target.slice(2));
  }
  return originalResolve.call(this, target, parent, ...rest);
};

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive) return () => "";
      if (prop === "create") return (s) => s || {};
      return createMock();
    },
  });
};

Module._load = function (request, ...args) {
  if (request.endsWith(".json")) {
    const filePath = request.startsWith("@/")
      ? path.join(root, request.slice(2))
      : request;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return {};
    }
  }
  if (request === "@/infrastructure/database/client" || request.includes("database/client")) {
    return { get db() { return {}; } };
  }
  if (request.includes("drizzle/migrations") || request.endsWith("migrations")) {
    return {};
  }
  if (
    request.startsWith("expo") ||
    request.startsWith("@expo") ||
    request.startsWith("react-native") ||
    request.startsWith("react") ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  return originalLoad.call(this, request, ...args);
};

require.extensions[".tsx"] = require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const {
  getDashboardWalkthroughSteps,
  DASHBOARD_WALKTHROUGH_STEPS,
} = require("../dashboard/dashboard-walkthrough-steps.ts");

test("dashboard walkthrough: default layout generates steps for all default visible cards and omits hidden ones", () => {
  const steps = getDashboardWalkthroughSteps();
  const targetIds = steps.map((s) => s.targetId);

  assert.deepEqual(targetIds, [
    "greetingCard",
    "netWorthCard",
    "collapseIcon",
    "settingsIcon",
    "settingsDemonstration",
    "quickActionsCard",
    "cashflowCard",
    "recentTxCard",
    "customizeHomeButton",
    "fabButton",
  ]);

  // Ensure eyeIcon is completely excluded
  assert.equal(targetIds.includes("eyeIcon"), false);
  // Ensure default hidden widgets (accountsStrip, topCategories) are omitted
  assert.equal(targetIds.includes("accountsCard"), false);
  assert.equal(targetIds.includes("topCategoriesCard"), false);
});

test("dashboard walkthrough: dynamically includes accountsStrip and topCategories when enabled", () => {
  const steps = getDashboardWalkthroughSteps({
    order: [
      "greeting",
      "netWorth",
      "quickActions",
      "cashflow",
      "accountsStrip",
      "topCategories",
      "recentTransactions",
    ],
    hidden: [],
    showGreetingQuote: true,
  });

  const targetIds = steps.map((s) => s.targetId);

  assert.deepEqual(targetIds, [
    "greetingCard",
    "netWorthCard",
    "collapseIcon",
    "settingsIcon",
    "settingsDemonstration",
    "quickActionsCard",
    "cashflowCard",
    "accountsCard",
    "topCategoriesCard",
    "recentTxCard",
    "customizeHomeButton",
    "fabButton",
  ]);
});

test("dashboard walkthrough: respects custom widget ordering", () => {
  const steps = getDashboardWalkthroughSteps({
    order: [
      "recentTransactions",
      "quickActions",
      "netWorth",
      "greeting",
    ],
    hidden: [],
    showGreetingQuote: true,
  });

  const targetIds = steps.map((s) => s.targetId);

  assert.deepEqual(targetIds, [
    "recentTxCard",
    "quickActionsCard",
    "netWorthCard",
    "collapseIcon",
    "settingsIcon",
    "settingsDemonstration",
    "greetingCard",
    "customizeHomeButton",
    "fabButton",
  ]);
});

test("dashboard walkthrough: omits hidden widgets", () => {
  const steps = getDashboardWalkthroughSteps({
    order: [
      "greeting",
      "netWorth",
      "quickActions",
      "cashflow",
      "recentTransactions",
    ],
    hidden: ["netWorth", "quickActions"],
    showGreetingQuote: true,
  });

  const targetIds = steps.map((s) => s.targetId);

  assert.deepEqual(targetIds, [
    "greetingCard",
    "cashflowCard",
    "recentTxCard",
    "customizeHomeButton",
    "fabButton",
  ]);
});
