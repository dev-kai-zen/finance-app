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
    request === "expo-notifications" ||
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
  getReminderSettings,
  saveReminderSettings,
} = require("../repositories/reminder-settings.repository");
const {
  DEFAULT_REMINDER_SETTINGS,
} = require("../constants/reminder-settings.constants");

function connect() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
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
            const rows = sqlite.prepare(query).all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );
}

beforeEach(() => {
  connect();
});

afterEach(() => {
  sqlite.close();
});

test("reminder settings: returns default settings when settings table is empty", () => {
  const settings = getReminderSettings(database);
  assert.deepEqual(settings, DEFAULT_REMINDER_SETTINGS);
});

test("reminder settings: persists and retrieves custom reminder settings and lead days", () => {
  saveReminderSettings(
    {
      dailyReminderEnabled: true,
      dailyReminderTime: "21:30",
      creditCardsReminderEnabled: true,
      creditCardsReminderTime: "10:00",
      creditCardsLeadDays: [0, 2, 5],
      scheduledTransactionsReminderEnabled: true,
      scheduledTransactionsReminderTime: "08:15",
      scheduledTransactionsLeadDays: [1, 3, 7],
    },
    database,
  );

  const updated = getReminderSettings(database);
  assert.equal(updated.dailyReminderEnabled, true);
  assert.equal(updated.dailyReminderTime, "21:30");
  assert.equal(updated.creditCardsReminderEnabled, true);
  assert.equal(updated.creditCardsReminderTime, "10:00");
  assert.deepEqual(updated.creditCardsLeadDays, [0, 2, 5]);
  assert.equal(updated.scheduledTransactionsReminderEnabled, true);
  assert.equal(updated.scheduledTransactionsReminderTime, "08:15");
  assert.deepEqual(updated.scheduledTransactionsLeadDays, [1, 3, 7]);
});
