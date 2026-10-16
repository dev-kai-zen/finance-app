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

globalThis.__DEV__ = false;

Module._load = function (request, parent, ...rest) {
  if (
    request === "react-native" ||
    request === "expo-sqlite" ||
    request === "expo-router" ||
    request === "expo-constants" ||
    request === "@expo/ui" ||
    request === "lucide-react-native" ||
    request === "@react-native-community/netinfo" ||
    request === "react-native-reanimated" ||
    request === "expo-file-system" ||
    request === "expo-modules-core" ||
    request === "expo/fetch" ||
    request === "react-native-nitro-google-signin"
  ) {
    return createMock();
  }
  if (request === "@/infrastructure/database/client") {
    return {
      get db() {
        return database;
      },
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
  getQuickSyncConfig,
  saveQuickSyncConfig,
  subscribeToQuickSyncSettings,
} = require("@/infrastructure/sync/quick-sync-settings.repository");
const {
  getQuickSyncState,
  subscribeToQuickSync,
  setQuickSyncRuntimeStatus,
  resetQuickSyncStateForTests,
} = require("@/infrastructure/sync/quick-sync-state");

const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs
    .readFileSync(path.join(root, "../drizzle", `${entry.tag}.sql`), "utf8")
    .split("--> statement-breakpoint"),
  folderMillis: entry.when,
  hash: "",
  bps: true,
}));

function applyMigrations(dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    );
  `);
  migrations.forEach((migration) => {
    migration.sql.forEach((query) => {
      const trimmed = query.trim();
      if (trimmed) dbInstance.exec(trimmed);
    });
  });
}

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

function createDatabaseAdapter(rawSqlite) {
  return {
    prepareSync(query) {
      return {
        executeSync(params) {
          const statement = rawSqlite.prepare(query);
          if (
            /^\s*(select|pragma|with)\b/i.test(query) ||
            /\breturning\b/i.test(query)
          ) {
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
          const rows = rawSqlite.prepare(aliasSelectColumns(query)).all(...params);
          return { getAllSync: () => rows.map((row) => Object.values(row)) };
        },
      };
    },
  };
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);
  const adapter = createDatabaseAdapter(sqlite);
  database = drizzle(adapter, { schema });
});

afterEach(() => {
  resetQuickSyncStateForTests();
  if (sqlite) {
    try {
      sqlite.close();
    } catch {
      // Ignore cleanup error
    }
  }
});

test("quick sync: returns default configuration when not set", () => {
  const config = getQuickSyncConfig();
  assert.equal(config.enabled, false);
  assert.equal(config.network, "wifi_only");
  assert.equal(config.lastSyncedAt, null);
  assert.equal(config.fileId, null);
});

test("quick sync: saves and loads enabled toggle", () => {
  saveQuickSyncConfig({ enabled: true });
  let config = getQuickSyncConfig();
  assert.equal(config.enabled, true);

  saveQuickSyncConfig({ enabled: false });
  config = getQuickSyncConfig();
  assert.equal(config.enabled, false);
});

test("quick sync: saves and normalizes network preference", () => {
  saveQuickSyncConfig({ network: "any" });
  let config = getQuickSyncConfig();
  assert.equal(config.network, "any");

  saveQuickSyncConfig({ network: "wifi_only" });
  config = getQuickSyncConfig();
  assert.equal(config.network, "wifi_only");
});

test("quick sync: preserves fileId and lastSyncedAt timestamps", () => {
  const now = new Date().toISOString();
  saveQuickSyncConfig({
    fileId: "drive-file-123",
    lastSyncedAt: now,
  });

  const config = getQuickSyncConfig();
  assert.equal(config.fileId, "drive-file-123");
  assert.equal(config.lastSyncedAt, now);
});

test("quick sync: notifies settings subscribers on change", () => {
  let callCount = 0;
  const unsubscribe = subscribeToQuickSyncSettings(() => {
    callCount += 1;
  });

  saveQuickSyncConfig({ enabled: true });
  assert.equal(callCount, 1);

  saveQuickSyncConfig({ network: "any" });
  assert.equal(callCount, 2);

  unsubscribe();
  saveQuickSyncConfig({ enabled: false });
  assert.equal(callCount, 2); // Unsubscribed
});

test("quick sync: state broadcasts runtime status and disabled state", () => {
  saveQuickSyncConfig({ enabled: false });
  let state = getQuickSyncState();
  assert.equal(state.enabled, false);
  assert.equal(state.status, "disabled");

  saveQuickSyncConfig({ enabled: true });
  setQuickSyncRuntimeStatus("syncing");
  state = getQuickSyncState();
  assert.equal(state.enabled, true);
  assert.equal(state.status, "syncing");

  setQuickSyncRuntimeStatus("synced");
  state = getQuickSyncState();
  assert.equal(state.status, "synced");
});
