const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
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
  if (request === "@/infrastructure/database/client") {
    return {
      get db() {
        return database;
      },
    };
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

require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
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

require.extensions[".png"] = require.extensions[".jpg"] = require.extensions[".jpeg"] = (module) => {
  module.exports = "test-image";
};

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs.readFileSync(path.join(root, "../drizzle", entry.tag + ".sql"), "utf8").split("--> statement-breakpoint"),
  folderMillis: entry.when,
  hash: "",
  bps: true,
}));

function aliasSelectColumns(query) {
  const selectMatch = /^\s*select\s+/i.exec(query);
  if (!selectMatch) return query;
  const selectStart = selectMatch[0].length;
  let depth = 0;
  let quote = null;
  let fromStart = -1;

  for (let index = selectStart; index < query.length; index += 1) {
    const char = query[index];
    if (quote) {
      if (char === quote && query[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && /^\sfrom\s/i.test(query.slice(index))) {
      fromStart = index;
      break;
    }
  }

  if (fromStart < 0) return query;
  const selectList = query.slice(selectStart, fromStart);
  const columns = [];
  let columnStart = 0;
  depth = 0;
  quote = null;
  for (let index = 0; index <= selectList.length; index += 1) {
    const char = selectList[index];
    if (quote) {
      if (char === quote && selectList[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if ((char === "," && depth === 0) || index === selectList.length) {
      columns.push(selectList.slice(columnStart, index).trim());
      columnStart = index + 1;
    }
  }

  return `${query.slice(0, selectStart)}${columns
    .map((column, index) =>
      `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

function connect(filename = ":memory:") {
  sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA foreign_keys=ON");
  database = drizzle(
    {
      prepareSync(query) {
        return {
          executeSync(params) {
            const stmt = sqlite.prepare(query);
            if (/^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query)) {
              const rows = stmt.all(...params);
              return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
            }
            const result = stmt.run(...params);
            return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
          },
          executeForRawResultSync(params) {
            const stmt = sqlite.prepare(aliasSelectColumns(query));
            const rows = stmt.all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );
}

function migrate(selected = migrations) {
  database.dialect.migrate(selected, database.session);
}

const { saveGoal } = require("@/modules/goals/services/save-goal.service");
const { getGoalsWithProgress } = require("@/modules/goals/services/get-goals-with-progress.service");
const { toggleGoalStatus } = require("@/modules/goals/services/toggle-goal-status.service");
const { saveDefaultCurrencyCode } = require("@/modules/currencies/services/currency-preferences.service");
const { seedDefaultExchangeRates } = require("@/modules/currencies/repositories/exchange-rates.repository");
const system = require("@/modules/accounts/constants/account-types.constants").SYSTEM_ACCOUNT_TYPE_IDS;

function account(id, code, opening = 0) {
  sqlite
    .prepare(
      "INSERT INTO accounts(id,account_type_id,name,currency_code,opening_balance_minor_units,opening_balance_at,pocket_enabled,created_at,updated_at) VALUES (?,?,?,?,?,0,1,0,0)",
    )
    .run(id, system.ASSET_OTHERS, id, code, opening);
}

beforeEach(() => {
  connect();
  migrate();
  seedDefaultExchangeRates(database);
});

afterEach(() => {
  if (sqlite) sqlite.close();
});

test("goals-summary: single PHP goal returns exact amounts and currencyCode='PHP'", () => {
  account("acc_php", "PHP", 100000); // ₱1,000.00
  saveGoal({
    name: "PHP Emergency Fund",
    currencyCode: "PHP",
    targetAmountMinorUnits: 200000, // ₱2,000.00
    accountIds: ["acc_php"],
    pocketIds: [],
  });

  const result = getGoalsWithProgress(database);
  assert.equal(result.goals.length, 1);
  assert.equal(result.summary.currencyCode, "PHP");
  assert.equal(result.summary.totalTargetMinorUnits, 200000);
  assert.equal(result.summary.totalSavedMinorUnits, 100000);
  assert.equal(result.summary.totalRemainingMinorUnits, 100000);
  assert.equal(result.summary.overallProgressPercentage, 50);
});

test("goals-summary (GOAL-F01): single USD goal returns exact amounts and currencyCode='USD' (not PHP)", () => {
  account("acc_usd", "USD", 10000); // $100.00
  saveGoal({
    name: "USD Laptop Fund",
    currencyCode: "USD",
    targetAmountMinorUnits: 20000, // $200.00
    accountIds: ["acc_usd"],
    pocketIds: [],
  });

  const result = getGoalsWithProgress(database);
  assert.equal(result.goals.length, 1);
  assert.equal(result.summary.currencyCode, "USD");
  assert.equal(result.summary.totalTargetMinorUnits, 20000);
  assert.equal(result.summary.totalSavedMinorUnits, 10000);
  assert.equal(result.summary.totalRemainingMinorUnits, 10000);
  assert.equal(result.summary.overallProgressPercentage, 50);
});

test("goals-summary (GOAL-F01): mixed PHP and USD goals convert accurately via exchange rates rather than raw sum", () => {
  account("acc_php", "PHP", 100000); // ₱1,000.00
  account("acc_usd", "USD", 10000);  // $100.00

  // Goal 1: ₱2,000.00 target, ₱1,000.00 saved
  saveGoal({
    name: "PHP Goal",
    currencyCode: "PHP",
    targetAmountMinorUnits: 200000,
    accountIds: ["acc_php"],
    pocketIds: [],
  });

  // Goal 2: $200.00 target, $100.00 saved
  saveGoal({
    name: "USD Goal",
    currencyCode: "USD",
    targetAmountMinorUnits: 20000,
    accountIds: ["acc_usd"],
    pocketIds: [],
  });

  const result = getGoalsWithProgress(database);
  assert.equal(result.goals.length, 2);
  assert.equal(result.summary.currencyCode, "PHP");

  // Old buggy behavior produced raw sum 220000 (200,000 + 20,000)
  // With exchange rates (1 USD = ~58.50 PHP, so $200 = ~₱11,700 = ~1,170,000 minor units):
  // totalTarget must be > 1,000,000 minor units, NOT 220,000!
  assert.notEqual(result.summary.totalTargetMinorUnits, 220000);
  assert.ok(result.summary.totalTargetMinorUnits > 1000000);

  // Both goals are 50% funded, so overall progress must remain 50%
  assert.equal(result.summary.overallProgressPercentage, 50);
  assert.ok(result.summary.totalRemainingMinorUnits > 0);
  assert.equal(
    result.summary.totalRemainingMinorUnits,
    result.summary.totalTargetMinorUnits - result.summary.totalSavedMinorUnits,
  );
});

test("goals-summary: handles JPY (0 decimals) conversion accurately without truncation", () => {
  account("acc_jpy", "JPY", 10000); // ¥10,000
  account("acc_php", "PHP", 50000); // ₱500.00

  saveGoal({
    name: "JPY Goal",
    currencyCode: "JPY",
    targetAmountMinorUnits: 20000, // ¥20,000
    accountIds: ["acc_jpy"],
    pocketIds: [],
  });

  saveGoal({
    name: "PHP Goal",
    currencyCode: "PHP",
    targetAmountMinorUnits: 100000, // ₱1,000.00
    accountIds: ["acc_php"],
    pocketIds: [],
  });

  const result = getGoalsWithProgress(database);
  assert.equal(result.summary.currencyCode, "PHP");
  assert.ok(result.summary.totalTargetMinorUnits > 100000);
  assert.ok(result.summary.totalSavedMinorUnits > 50000);
});

test("goals-summary: overfunded goal surplus does not erase shortfall of underfunded goal", () => {
  account("acc_a", "PHP", 150000); // ₱1,500.00 (surplus of ₱500)
  account("acc_b", "PHP", 20000);  // ₱200.00 (shortfall of ₱800)

  // Goal A: target ₱1,000, saved ₱1,500 (150%, overfunded)
  saveGoal({
    name: "Overfunded Goal",
    currencyCode: "PHP",
    targetAmountMinorUnits: 100000,
    accountIds: ["acc_a"],
    pocketIds: [],
  });

  // Goal B: target ₱1,000, saved ₱200 (20%, shortfall ₱800)
  saveGoal({
    name: "Underfunded Goal",
    currencyCode: "PHP",
    targetAmountMinorUnits: 100000,
    accountIds: ["acc_b"],
    pocketIds: [],
  });

  const result = getGoalsWithProgress(database);
  assert.equal(result.summary.totalTargetMinorUnits, 200000);
  assert.equal(result.summary.totalSavedMinorUnits, 170000);

  // If overfunded surplus reduced shortfall, totalRemainingMinorUnits would be 200,000 - 170,000 = 30,000 (₱300).
  // But Goal B still needs 80,000 (₱800). Goal A has 0 shortfall.
  // Proper independent shortfall sum is 80,000!
  assert.equal(result.summary.totalRemainingMinorUnits, 80000);
});

test("goals-summary: paused goals are excluded from active target and saved totals", () => {
  account("acc_php", "PHP", 100000);

  const goal = saveGoal({
    name: "Paused Goal",
    currencyCode: "PHP",
    targetAmountMinorUnits: 200000,
    accountIds: ["acc_php"],
    pocketIds: [],
  });

  toggleGoalStatus(goal.id, "paused", database);

  const result = getGoalsWithProgress(database);
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].status, "paused");
  assert.equal(result.summary.totalTargetMinorUnits, 0);
  assert.equal(result.summary.totalSavedMinorUnits, 0);
  assert.equal(result.summary.totalRemainingMinorUnits, 0);
  assert.equal(result.summary.activeGoalsCount, 0);
  assert.equal(result.summary.totalGoalsCount, 1);
});

test("goals-summary: empty goals returns 0 totals with user default currency", () => {
  saveDefaultCurrencyCode("USD", database);

  const result = getGoalsWithProgress(database);
  assert.equal(result.goals.length, 0);
  assert.equal(result.summary.currencyCode, "USD");
  assert.equal(result.summary.totalTargetMinorUnits, 0);
  assert.equal(result.summary.totalSavedMinorUnits, 0);
  assert.equal(result.summary.totalRemainingMinorUnits, 0);
  assert.equal(result.summary.overallProgressPercentage, 0);
  assert.equal(result.summary.totalGoalsCount, 0);
});

test("goals-funding (GOAL-F02): actual onAddFunds callback preserves pocketId when funding pocket-linked goals", () => {
  const vm = require("node:vm");
  const screenSource = fs.readFileSync(path.join(root, "modules/goals/screens/goals-screen.tsx"), "utf8");
  const ast = ts.createSourceFile("goals-screen.tsx", screenSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callbackText = null;

  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onAddFunds") {
      callbackText = node.initializer.expression.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);

  assert.ok(callbackText, "onAddFunds callback attribute found in goals-screen.tsx");

  const transpiled = ts.transpileModule("(" + callbackText + ")()", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;

  // 1. Pocket-only goal: emits both accountId and pocketId
  let pushedHref = null;
  vm.runInNewContext(transpiled, {
    goal: {
      linkedAccounts: [],
      linkedPockets: [{ id: "p1", accountId: "a1" }],
    },
    router: {
      push: (href) => {
        pushedHref = href;
      },
    },
  });
  assert.equal(pushedHref, "/transactions?action=new&type=income&accountId=a1&pocketId=p1");

  // 2. Account-only goal: emits only accountId (no pocketId)
  pushedHref = null;
  vm.runInNewContext(transpiled, {
    goal: {
      linkedAccounts: [{ id: "a2", name: "Savings" }],
      linkedPockets: [],
    },
    router: {
      push: (href) => {
        pushedHref = href;
      },
    },
  });
  assert.equal(pushedHref, "/transactions?action=new&type=income&accountId=a2");

  // 3. Unlinked goal: emits base action=new&type=income
  pushedHref = null;
  vm.runInNewContext(transpiled, {
    goal: {
      linkedAccounts: [],
      linkedPockets: [],
    },
    router: {
      push: (href) => {
        pushedHref = href;
      },
    },
  });
  assert.equal(pushedHref, "/transactions?action=new&type=income");
});

test("goals-funding (GOAL-F02): funding pocket updates pocket-only goal balance, while parent account-only income does not", () => {
  account("acc_parent", "PHP", 100000); // ₱1,000.00 opening
  sqlite
    .prepare("INSERT INTO pockets(id,account_id,name,created_at,updated_at) VALUES (?,?,?,0,0)")
    .run("pocket_vacation", "acc_parent", "Vacation Pocket");

  saveGoal({
    name: "Vacation Trip",
    currencyCode: "PHP",
    targetAmountMinorUnits: 500000, // ₱5,000.00
    accountIds: [],
    pocketIds: ["pocket_vacation"],
  });

  // Verify initial 0 progress
  let data = getGoalsWithProgress(database);
  assert.equal(data.goals[0].currentAmountMinorUnits, 0);

  // Income recorded to parent account WITHOUT pocket_id (old buggy behavior)
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO transactions(id,account_id,pocket_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    )
    .run("tx_acc_only", "acc_parent", null, "income", 100000, now, now, now);

  // Goal progress remains 0 because pocket was not credited
  data = getGoalsWithProgress(database);
  assert.equal(data.goals[0].currentAmountMinorUnits, 0);

  // Now record income targeting the pocket directly (new fixed behavior)
  sqlite
    .prepare(
      "INSERT INTO transactions(id,account_id,pocket_id,type,amount_minor_units,occurred_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    )
    .run("tx_pocket", "acc_parent", "pocket_vacation", "income", 250000, now, now, now);

  // Goal progress now reflects the ₱2,500.00 in the pocket!
  data = getGoalsWithProgress(database);
  assert.equal(data.goals[0].currentAmountMinorUnits, 250000);
  assert.equal(data.goals[0].progressPercentage, 50);
});
