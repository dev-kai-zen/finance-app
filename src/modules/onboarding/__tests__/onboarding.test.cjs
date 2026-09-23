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
  if (request === "expo-sqlite") return createMock();
  if (request === "@/infrastructure/database/client") {
    return { get db() { return database; } };
  }
  if (request === "@/modules/accounts") {
    return originalLoad.call(
      this,
      path.join(root, "modules/accounts/services/workspace-accounts.service.ts"),
      parent,
      ...rest,
    );
  }
  if (request === "@/modules/categories") {
    return originalLoad.call(
      this,
      path.join(root, "modules/categories/services/prepare-workspace-categories.service.ts"),
      parent,
      ...rest,
    );
  }
  if (request === "@/modules/transactions") {
    return originalLoad.call(
      this,
      path.join(root, "modules/transactions/services/workspace-transactions.service.ts"),
      parent,
      ...rest,
    );
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
const workspace = require("@/modules/onboarding/services/workspace.service");
const accountWorkspace = require("@/modules/accounts");
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

beforeEach(connect);
afterEach(() => sqlite.close());

test("fresh databases remain pending until the user chooses a path", () => {
  assert.deepEqual(workspace.initializeWorkspaceState(), {
    status: "pending",
    mode: null,
    primaryCurrency: "PHP",
  });
});

test("sample loading is coherent, idempotent, and relationally valid", async () => {
  const state = await workspace.loadSampleWorkspace();
  assert.equal(state.mode, "sample");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM accounts").get().count, 6);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM pockets").get().count, 2);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM transactions").get().count, 31);
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM transactions WHERE deleted_at IS NOT NULL").get().count,
    1,
  );
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);

  await workspace.loadSampleWorkspace();
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM accounts").get().count, 6);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM transactions").get().count, 31);
});

test("personal setup atomically replaces every sample account and transaction", async () => {
  await workspace.loadSampleWorkspace();
  const state = await workspace.completePersonalSetup({
    account: {
      name: "My Checking",
      openingAmount: "12500.50",
      template: "bank",
    },
    categorySetup: "essentials",
  });

  assert.equal(state.mode, "personal");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM accounts").get().count, 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM transactions").get().count, 0);
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM account_types WHERE is_system = 0").get().count,
    0,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM categories").get().count, 8);
  assert.equal(
    sqlite.prepare("SELECT opening_balance_minor_units AS amount FROM accounts").get().amount,
    1_250_050,
  );
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});

test("existing account data is adopted as a personal workspace", () => {
  accountWorkspace.createInitialAccount(
    { name: "Existing account", openingAmount: "10", template: "cash" },
    database,
  );
  assert.equal(workspace.initializeWorkspaceState().mode, "personal");
  assert.equal(
    sqlite.prepare("SELECT value FROM settings WHERE key = 'workspace.mode'").get().value,
    "personal",
  );
});
