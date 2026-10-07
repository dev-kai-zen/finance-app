const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;
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
    request === "expo-sqlite" ||
    request === "expo-router" ||
    request === "expo-constants" ||
    request === "@expo/ui" ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  if (request === "@/infrastructure/database/client") {
    return {
      db: database,
      openDatabase: () => database,
      closeDatabase: () => {},
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

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const {
  getDefaultAccounts,
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
  subscribeToDefaultAccounts,
} = require("@/modules/settings/services/default-accounts.service");
const {
  getTransactionViewMode,
  setTransactionViewMode,
} = require("@/modules/settings/services/transaction-view-mode.service");

const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs
    .readFileSync(path.join(root, "../drizzle", `${entry.tag}.sql`), "utf8")
    .split("--> statement-breakpoint"),
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
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
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
    .map(
      (column, index) =>
        `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

function connect() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  database = drizzle(
    {
      prepareSync(query) {
        return {
          executeSync(params) {
            const statement = sqlite.prepare(query);
            if (/^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query)) {
              const rows = statement.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
              };
            }
            const result = statement.run(...params);
            return {
              changes: Number(result.changes),
              lastInsertRowId: Number(result.lastInsertRowid),
            };
          },
          executeForRawResultSync(params) {
            const rows = sqlite.prepare(aliasSelectColumns(query)).all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );
  database.dialect.migrate(migrations, database.session);
}

beforeEach(() => {
  connect();
});

afterEach(() => {
  sqlite.close();
});

test("returns null defaults when settings are not configured", () => {
  const defaults = getDefaultAccounts(database);
  assert.equal(defaults.defaultExpenseAccountId, null);
  assert.equal(defaults.defaultExpensePocketId, null);
  assert.equal(defaults.defaultIncomeAccountId, null);
  assert.equal(defaults.defaultIncomePocketId, null);
});

test("transaction view mode defaults to compact and persists user changes", () => {
  assert.equal(getTransactionViewMode(database), "compact");

  setTransactionViewMode("detailed", database);
  assert.equal(getTransactionViewMode(database), "detailed");

  setTransactionViewMode("compact", database);
  assert.equal(getTransactionViewMode(database), "compact");
});

test("transaction view mode falls back to compact for an invalid stored value", () => {
  sqlite
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    )
    .run("transaction_list_view_mode", "grid", Date.now());

  assert.equal(getTransactionViewMode(database), "compact");
});

test("sets and retrieves default expense and income accounts and pockets", () => {
  setDefaultExpenseAccount("acc-expense-1", "pocket-groceries", database);
  let defaults = getDefaultAccounts(database);
  assert.equal(defaults.defaultExpenseAccountId, "acc-expense-1");
  assert.equal(defaults.defaultExpensePocketId, "pocket-groceries");
  assert.equal(defaults.defaultIncomeAccountId, null);
  assert.equal(defaults.defaultIncomePocketId, null);

  setDefaultIncomeAccount("acc-income-2", "pocket-salary", database);
  defaults = getDefaultAccounts(database);
  assert.equal(defaults.defaultExpenseAccountId, "acc-expense-1");
  assert.equal(defaults.defaultExpensePocketId, "pocket-groceries");
  assert.equal(defaults.defaultIncomeAccountId, "acc-income-2");
  assert.equal(defaults.defaultIncomePocketId, "pocket-salary");
});

test("clears default accounts and pockets when passing null", () => {
  setDefaultExpenseAccount("acc-expense-1", "pocket-1", database);
  setDefaultIncomeAccount("acc-income-2", "pocket-2", database);

  setDefaultExpenseAccount(null, null, database);
  let defaults = getDefaultAccounts(database);
  assert.equal(defaults.defaultExpenseAccountId, null);
  assert.equal(defaults.defaultExpensePocketId, null);
  assert.equal(defaults.defaultIncomeAccountId, "acc-income-2");
  assert.equal(defaults.defaultIncomePocketId, "pocket-2");

  setDefaultIncomeAccount(null, null, database);
  defaults = getDefaultAccounts(database);
  assert.equal(defaults.defaultExpenseAccountId, null);
  assert.equal(defaults.defaultExpensePocketId, null);
  assert.equal(defaults.defaultIncomeAccountId, null);
  assert.equal(defaults.defaultIncomePocketId, null);
});

test("notifies subscribers when default accounts change", () => {
  let callCount = 0;
  const unsubscribe = subscribeToDefaultAccounts(() => {
    callCount += 1;
  });

  setDefaultExpenseAccount("acc-expense-test", "pocket-test", database);
  assert.equal(callCount, 1);

  setDefaultIncomeAccount("acc-income-test", "pocket-test-2", database);
  assert.equal(callCount, 2);

  unsubscribe();
  setDefaultExpenseAccount(null, null, database);
  assert.equal(callCount, 2); // Unsubscribed, should not increase
});
