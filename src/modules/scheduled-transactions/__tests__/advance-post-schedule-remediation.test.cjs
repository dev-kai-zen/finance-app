const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;
const mutationEvents = [];

const originalResolve = Module._resolveFilename;
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

const originalLoad = Module._load;
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
  if (request === "react-native") {
    return new Proxy(createMock(), {
      get(_target, prop) {
        if (prop === "DeviceEventEmitter") {
          return {
            emit(event, payload) {
              if (event === "FINANCE_APP_TRANSACTION_MUTATED") {
                mutationEvents.push(payload);
              }
            },
            addListener: () => ({ remove: () => {} }),
          };
        }
        if (prop === "StyleSheet") {
          return { create: (styles) => styles, flatten: (styles) => styles, hairlineWidth: 1 };
        }
        if (prop === "Platform") {
          return { OS: "ios", select: (choices) => choices.ios ?? choices.default };
        }
        return createMock();
      },
    });
  }
  if (
    request.startsWith("expo") ||
    request.startsWith("@expo") ||
    request.startsWith("react") ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  if (request === "@/modules/transactions") {
    return {
      recordTransactionInContext(command, context) {
        return require("../../transactions/services/create-transaction.service").createTransactionInContext(
          command.input,
          context,
          { reconcileBilling: false },
        );
      },
    };
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

function aliasSelectColumns(query) {
  const selectMatch = query.match(/^\s*select\s+/i);
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

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");

function setupTestDb() {
  mutationEvents.length = 0;
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
  for (const entry of journal.entries) {
    const file = path.join(root, "../drizzle", `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(file, "utf-8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  database = drizzle(
    {
      prepareSync(query) {
        return {
          executeSync(params) {
            const stmt = sqlite.prepare(query);
            if (
              /^\s*(select|pragma|with)\b/i.test(query) ||
              /\breturning\b/i.test(query)
            ) {
              const rows = stmt.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
              };
            }
            const result = stmt.run(...params);
            return {
              changes: Number(result.changes),
              lastInsertRowId: Number(result.lastInsertRowid),
            };
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

  const now = Date.now();
  sqlite.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'landmark', 1, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, sort_order, created_at, updated_at)
    VALUES ('cat_rent', 'Rent', 'expense', 'home', 1, 0, ${now}, ${now});
  `);

  return database;
}

const {
  saveScheduledTransactionInContext,
} = require("../services/save-scheduled-transaction.service.ts");
const {
  advancePostScheduledTransaction,
} = require("../services/advance-post-schedule.service.ts");
const { calculateScheduleOccurrence } = require("../utils/recurrence.ts");
const { updateScheduledTransactionRecord } = require("../repositories/scheduled-transactions.repository.ts");

test("ST-F04 fix: advance post emits FINANCE_APP_TRANSACTION_MUTATED once", () => {
  setupTestDb();
  try {
    const startsAt = new Date("2026-02-01T09:00:00.000Z");
    const schedule = saveScheduledTransactionInContext(
      {
        transactionType: "expense",
        accountId: "acc_1",
        categoryId: "cat_rent",
        amountMinorUnits: -10000,
        name: "Rent",
        note: null,
        frequency: "monthly",
        intervalCount: 1,
        startsAt,
        timeZone: "UTC",
        endMode: "never",
        weekendPolicy: "exact",
        autoPost: false,
      },
      undefined,
      database,
    );

    const june = calculateScheduleOccurrence(
      {
        transactionType: "expense",
        accountId: "acc_1",
        categoryId: "cat_rent",
        amountMinorUnits: -10000,
        frequency: "monthly",
        intervalCount: 1,
        startsAt,
        timeZone: "UTC",
        endMode: "never",
        weekendPolicy: "exact",
        anchorOccurrenceNumber: 1,
      },
      5,
    );
    updateScheduledTransactionRecord(
      schedule.id,
      {
        nextOccurrenceNumber: 5,
        nextNominalAt: june.nominalAt,
        nextEffectiveAt: june.effectiveAt ?? june.nominalAt,
      },
      database,
    );

    advancePostScheduledTransaction(schedule.id, {
      now: new Date("2026-04-20T12:00:00.000Z"),
      transactionDate: new Date("2026-06-01T09:00:00.000Z"),
    });

    assert.equal(mutationEvents.length, 1);
    assert.deepEqual(mutationEvents[0], { sourceId: "schedule-advance-post" });
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 1);
  } finally {
    sqlite.close();
  }
});

test("ST-F04 fix: failed advance post does not emit FINANCE_APP_TRANSACTION_MUTATED", () => {
  setupTestDb();
  try {
    assert.throws(
      () => advancePostScheduledTransaction("missing_schedule"),
      /Scheduled transaction was not found/,
    );
    assert.equal(mutationEvents.length, 0);
  } finally {
    sqlite.close();
  }
});