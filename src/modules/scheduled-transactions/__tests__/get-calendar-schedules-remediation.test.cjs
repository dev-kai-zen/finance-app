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
let occurrenceQueries = 0;

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
  occurrenceQueries = 0;
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
        if (/from\s+[`"']?transaction_schedule_occurrences/i.test(query)) {
          occurrenceQueries += 1;
        }
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
  insertScheduleOccurrence,
  updateScheduledTransactionRecord,
} = require("../repositories/scheduled-transactions.repository.ts");
const {
  getCalendarScheduleOccurrences,
} = require("../services/get-calendar-schedules.service.ts");

const jan = new Date("2026-01-15T12:00:00.000Z").getTime();
const mar = new Date("2026-03-15T12:00:00.000Z").getTime();
const jun = new Date("2026-06-15T12:00:00.000Z").getTime();

test("ST-F05 fix: calendar month returns only recorded rows in that window", () => {
  setupTestDb();
  try {
    const startsAt = new Date("2026-01-01T09:00:00.000Z");
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

    const now = Date.now();
    const occRows = [
      ["occ_jan", 1, jan],
      ["occ_mar", 2, mar],
      ["occ_jun", 3, jun],
    ];
    for (const [id, seq, dueMs] of occRows) {
      sqlite.prepare(
        "INSERT INTO transaction_schedule_occurrences (id, schedule_id, sequence_number, nominal_due_at, effective_due_at, template_snapshot, status, processed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', 'posted', ?, ?, ?)",
      ).run(id, schedule.id, seq, dueMs, dueMs, now, now, now);
    }

    updateScheduledTransactionRecord(
      schedule.id,
      {
        nextOccurrenceNumber: 4,
        nextNominalAt: new Date("2026-07-01T09:00:00.000Z"),
        nextEffectiveAt: new Date("2026-07-01T09:00:00.000Z"),
      },
      database,
    );

    const marchOnly = getCalendarScheduleOccurrences({
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.999Z"),
    });
    assert.deepEqual(
      marchOnly.filter((row) => !row.isProjected).map((row) => row.id),
      ["occ_mar"],
    );

    occurrenceQueries = 0;
    getCalendarScheduleOccurrences({
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.999Z"),
    });
    assert.equal(occurrenceQueries, 1, "One bounded occurrence query per call");
  } finally {
    sqlite.close();
  }
});

test("ST-F05 fix: projection still fills upcoming rows inside the month window", () => {
  setupTestDb();
  try {
    const startsAt = new Date("2026-01-01T09:00:00.000Z");
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

    updateScheduledTransactionRecord(
      schedule.id,
      {
        nextOccurrenceNumber: 3,
        nextNominalAt: new Date("2026-03-01T09:00:00.000Z"),
        nextEffectiveAt: new Date("2026-03-01T09:00:00.000Z"),
      },
      database,
    );

    const march = getCalendarScheduleOccurrences({
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.999Z"),
    });

    const projected = march.filter((row) => row.isProjected);
    assert.equal(projected.length, 1);
    assert.equal(projected[0].sequenceNumber, 3);
    assert.equal(projected[0].status, "upcoming");
  } finally {
    sqlite.close();
  }
});