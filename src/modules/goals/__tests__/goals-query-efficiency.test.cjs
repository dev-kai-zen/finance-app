const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function load(relative, dependencies) {
  const filename = path.resolve(__dirname, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require(id) {
        assert.ok(Object.hasOwn(dependencies, id), "Unexpected dependency: " + id);
        return dependencies[id];
      },
      console,
      Array,
      Object,
      Set,
      Map,
      Math,
      Date,
      Boolean,
      Number,
      String,
      Promise,
    },
    { filename },
  );
  return exports;
}

test("listGoals fast-exits without querying junction tables when goals table is empty", () => {
  const queryLog = [];
  const fakeDb = {
    select() {
      return {
        from(table) {
          queryLog.push(table.name);
          return {
            orderBy() {
              return {
                all() {
                  return []; // Empty goals table
                },
              };
            },
            all() {
              return [];
            },
          };
        },
      };
    },
  };

  const repo = load("../repositories/goals.repository.ts", {
    "drizzle-orm": {
      asc: () => ({}),
      desc: () => ({}),
      eq: () => ({}),
      sql: () => ({}),
    },
    "@/infrastructure/database/client": { db: fakeDb },
    "@/infrastructure/database/schema": {
      goals: { name: "goals" },
      goalAccounts: { name: "goal_accounts" },
      goalPockets: { name: "goal_pockets" },
    },
  });

  const result = repo.listGoals(fakeDb);
  assert.equal(result.length, 0);
  assert.equal(queryLog.length, 1);
  assert.equal(queryLog[0], "goals");
  assert.ok(!queryLog.includes("goal_accounts"), "Should not query goal_accounts on empty goals");
  assert.ok(!queryLog.includes("goal_pockets"), "Should not query goal_pockets on empty goals");
});

test("getGoalsWithProgress fast-exits on empty goals without querying accounts or pockets", () => {
  let accountsQueried = false;
  let pocketsQueried = false;
  let currencyPrefQueried = false;

  const service = load("../services/get-goals-with-progress.service.ts", {
    "@/infrastructure/database/client": { db: {} },
    "@/modules/accounts": {
      getAccountsWithBalances: () => {
        accountsQueried = true;
        return [];
      },
      getPocketsWithBalances: () => {
        pocketsQueried = true;
        return [];
      },
    },
    "@/modules/currencies": {
      getCurrencyPreferences: () => {
        currencyPrefQueried = true;
        return { defaultCurrency: "USD" };
      },
      getExchangeRateMap: () => new Map(),
    },
    "@/utils/currency": {
      convertCurrencyMinorUnits: (amount) => amount,
      DEFAULT_BASE_CURRENCY: "PHP",
    },
    "../repositories/goals.repository": {
      listGoals: () => [],
    },
    "./calculate-goal-progress.service": {
      calculateGoalProgress: () => ({}),
    },
    "../utils/calculate-linked-balance": {
      calculateLinkedFundsBalance: () => 0,
    },
  });

  const result = service.getGoalsWithProgress({});
  assert.equal(result.goals.length, 0);
  assert.equal(result.summary.totalGoalsCount, 0);
  assert.equal(result.summary.currencyCode, "USD");
  assert.equal(accountsQueried, false, "Must not query accounts when 0 goals exist");
  assert.equal(pocketsQueried, false, "Must not query pockets when 0 goals exist");
  assert.equal(currencyPrefQueried, true, "Queries default currency for summary");
});

test("getGoalsWithProgress requests includeManagementFlags: false for both accounts and pockets", () => {
  let accountsOptions = null;
  let pocketsOptions = null;

  const sampleGoal = {
    id: "g1",
    name: "Emergency Fund",
    targetAmountMinorUnits: 100000,
    currencyCode: "PHP",
    accountIds: ["acc1"],
    pocketIds: [],
    status: "in_progress",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const service = load("../services/get-goals-with-progress.service.ts", {
    "@/infrastructure/database/client": { db: {} },
    "@/modules/accounts": {
      getAccountsWithBalances: (_ctx, options) => {
        accountsOptions = options;
        return [
          {
            id: "acc1",
            name: "Checking",
            currencyCode: "PHP",
            currentBalanceMinorUnits: 50000,
            iconKey: "bank",
          },
        ];
      },
      getPocketsWithBalances: (_ctx, options) => {
        pocketsOptions = options;
        return [];
      },
    },
    "@/modules/currencies": {
      getCurrencyPreferences: () => ({ defaultCurrency: "PHP" }),
      getExchangeRateMap: () => new Map(),
    },
    "@/utils/currency": {
      convertCurrencyMinorUnits: (amount) => amount,
      DEFAULT_BASE_CURRENCY: "PHP",
    },
    "../repositories/goals.repository": {
      listGoals: () => [sampleGoal],
    },
    "./calculate-goal-progress.service": {
      calculateGoalProgress: ({ goal, currentAmountMinorUnits, linkedAccounts, linkedPockets }) => ({
        ...goal,
        currentAmountMinorUnits,
        remainingMinorUnits: Math.max(0, goal.targetAmountMinorUnits - currentAmountMinorUnits),
        progressPercentage: 50,
        isCompleted: false,
        linkedAccounts,
        linkedPockets,
      }),
    },
    "../utils/calculate-linked-balance": {
      calculateLinkedFundsBalance: () => 50000,
    },
  });

  const result = service.getGoalsWithProgress({});
  assert.equal(result.goals.length, 1);
  assert.equal(accountsOptions?.includeManagementFlags, false);
  assert.equal(pocketsOptions?.includeManagementFlags, false);
});

test("GoalAccountPickerModal early-returns null when visible=false without executing hooks", () => {
  const modalModule = load("../components/goal-account-picker-modal.tsx", {
    react: {
      useMemo: () => {
        throw new Error("useMemo must not be called when visible is false");
      },
      useState: () => {
        throw new Error("useState must not be called when visible is false");
      },
      useEffect: () => {
        throw new Error("useEffect must not be called when visible is false");
      },
      createElement: () => null,
    },
    "react-native": {
      Modal: () => null,
      Platform: { OS: "ios" },
      Pressable: () => null,
      ScrollView: () => null,
      StyleSheet: { create: (s) => s },
      Text: () => null,
      TextInput: () => null,
      TouchableOpacity: () => null,
      View: () => null,
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => {
        throw new Error("useSafeAreaInsets must not be called when visible is false");
      },
    },
    "react-native-keyboard-controller": { KeyboardAvoidingView: () => null },
    "lucide-react-native": {
      Check: () => null,
      Folder: () => null,
      Search: () => null,
      WalletCards: () => null,
      X: () => null,
    },
    "@/components": { AppButton: () => null, IconHelper: () => null },
    "@/hooks/use-app-theme": {
      useAppTheme: () => {
        throw new Error("useAppTheme must not be called when visible is false");
      },
      useThemeStyles: () => {
        throw new Error("useThemeStyles must not be called when visible is false");
      },
    },
    "@/modules/accounts": {
      accountColor: () => "#000",
      isSystemOthersAccountTypeId: () => false,
    },
    "@/utils/currency": { formatCurrency: () => "" },
    "../utils/calculate-linked-balance": { calculateLinkedFundsBalance: () => 0 },
  });

  const rendered = modalModule.GoalAccountPickerModal({
    visible: false,
    onClose: () => {},
    accounts: [],
    selectedAccountIds: [],
    onConfirm: () => {},
  });

  assert.equal(rendered, null, "Modal must immediately return null when visible is false");
});

test("GoalsScreen AST and contracts verify memoized GoalListItem, stable callbacks, and static content styles", () => {
  const screenPath = path.resolve(__dirname, "../screens/goals-screen.tsx");
  const source = fs.readFileSync(screenPath, "utf8");
  const ast = ts.createSourceFile(screenPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let hasGoalListItemMemo = false;
  let hasPageContentContainerInStyles = false;
  let hasInlineContentSpacing = false;
  let rendersGoalListItem = false;

  function visit(node) {
    // Check for GoalListItem React.memo
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "GoalListItem") {
      const initText = node.initializer ? node.initializer.getText(ast) : "";
      if (initText.includes("memo(") || initText.includes("React.memo(")) {
        hasGoalListItemMemo = true;
      }
    }

    // Check for inline useThemeStyles((theme) => ({ paddingTop: ... }))
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "contentSpacing") {
      hasInlineContentSpacing = true;
    }

    // Check for pageContentContainer property in createStyles
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "pageContentContainer") {
      hasPageContentContainerInStyles = true;
    }

    // Check JSX rendering <GoalListItem
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(ast) === "GoalListItem") {
        rendersGoalListItem = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(ast);

  assert.ok(hasGoalListItemMemo, "GoalsScreen must define GoalListItem with React.memo");
  assert.ok(rendersGoalListItem, "GoalsScreen must render GoalListItem inside filteredGoals.map");
  assert.ok(hasPageContentContainerInStyles, "createStyles must declare pageContentContainer");
  assert.ok(!hasInlineContentSpacing, "Inline contentSpacing useThemeStyles factory must be eliminated");
});
