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
    VALUES ('cat_sub', 'Streaming', 'expense', 'tv', 1, 0, ${now}, ${now});
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
const { calculateScheduleOccurrence } = require("../utils/recurrence.ts");
const {
  resolveScheduleOccurrencePaidInContext,
} = require("../services/resolve-schedule-paid.service.ts");
const { recordTransactionInContext } = require("../../transactions/services/record-transaction.service");

function monthlyExpenseInput(startsAt) {
  return {
    transactionType: "expense",
    accountId: "acc_1",
    categoryId: "cat_sub",
    amountMinorUnits: -14900,
    name: "Streaming",
    note: null,
    frequency: "monthly",
    intervalCount: 1,
    startsAt,
    timeZone: "UTC",
    endMode: "never",
    weekendPolicy: "exact",
    autoPost: false,
  };
}

function seedTwoDueOccurrences(database, scheduleId, startsAt) {
  const feb = calculateScheduleOccurrence(
    { ...monthlyExpenseInput(startsAt), anchorOccurrenceNumber: 1 },
    1,
  );
  const mar = calculateScheduleOccurrence(
    { ...monthlyExpenseInput(startsAt), anchorOccurrenceNumber: 1 },
    2,
  );
  const apr = calculateScheduleOccurrence(
    { ...monthlyExpenseInput(startsAt), anchorOccurrenceNumber: 1 },
    3,
  );

  updateScheduledTransactionRecord(
    scheduleId,
    {
      anchorOccurrenceNumber: 1,
      nextOccurrenceNumber: 1,
      nextNominalAt: feb.nominalAt,
      nextEffectiveAt: feb.effectiveAt ?? feb.nominalAt,
    },
    database,
  );

  const now = Date.now();
  insertScheduleOccurrence(
    {
      scheduleId,
      sequenceNumber: 1,
      nominalDueAt: feb.nominalAt,
      effectiveDueAt: feb.effectiveAt ?? feb.nominalAt,
      templateSnapshot: "{}",
      status: "due",
      processedAt: null,
      errorMessage: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    database,
  );
  insertScheduleOccurrence(
    {
      scheduleId,
      sequenceNumber: 2,
      nominalDueAt: mar.nominalAt,
      effectiveDueAt: mar.effectiveAt ?? mar.nominalAt,
      templateSnapshot: "{}",
      status: "due",
      processedAt: null,
      errorMessage: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    database,
  );

  return { feb, mar, apr };
}

test("ST-F02 fix: one payment links only the oldest pending occurrence", () => {
  setupTestDb();
  try {
    const startsAt = new Date("2026-02-01T09:00:00.000Z");
    const schedule = saveScheduledTransactionInContext(
      monthlyExpenseInput(startsAt),
      undefined,
      database,
    );
    const { feb, mar } = seedTwoDueOccurrences(database, schedule.id, startsAt);

    const paidAt = new Date("2026-03-15T12:00:00.000Z");
    const tx = recordTransactionInContext(
      {
        kind: "transaction",
        input: {
          accountId: "acc_1",
          categoryId: "cat_sub",
          type: "expense",
          amountMinorUnits: -14900,
          occurredAt: paidAt,
          name: "Streaming",
        },
      },
      database,
      { reconcileBilling: false },
    );

    resolveScheduleOccurrencePaidInContext(
      schedule.id,
      tx.id,
      paidAt,
      database,
    );

    const occurrences = sqlite
      .prepare(
        "SELECT sequence_number, status FROM transaction_schedule_occurrences WHERE schedule_id = ? ORDER BY sequence_number",
      )
      .all(schedule.id);
    assert.deepEqual(
      occurrences.map((row) => [row.sequence_number, row.status]),
      [
        [1, "posted"],
        [2, "due"],
      ],
    );

    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM transaction_schedule_postings").get()
        .n,
      1,
    );
    const posting = sqlite
      .prepare(
        "SELECT o.sequence_number FROM transaction_schedule_postings p JOIN transaction_schedule_occurrences o ON o.id = p.occurrence_id",
      )
      .get();
    assert.equal(posting.sequence_number, 1);

    const updatedSchedule = sqlite
      .prepare(
        "SELECT next_occurrence_number, next_nominal_at FROM transaction_schedules WHERE id = ?",
      )
      .get(schedule.id);
    assert.equal(updatedSchedule.next_occurrence_number, 2);
    assert.equal(
      updatedSchedule.next_nominal_at,
      mar.nominalAt.getTime(),
    );
    assert.notEqual(updatedSchedule.next_nominal_at, feb.nominalAt.getTime());
  } finally {
    sqlite.close();
  }
});

test("ST-F02 fix: repeated resolve for the same transaction id is idempotent", () => {
  setupTestDb();
  try {
    const startsAt = new Date("2026-02-01T09:00:00.000Z");
    const schedule = saveScheduledTransactionInContext(
      monthlyExpenseInput(startsAt),
      undefined,
      database,
    );
    seedTwoDueOccurrences(database, schedule.id, startsAt);

    const paidAt = new Date("2026-03-15T12:00:00.000Z");
    const tx = recordTransactionInContext(
      {
        kind: "transaction",
        input: {
          accountId: "acc_1",
          categoryId: "cat_sub",
          type: "expense",
          amountMinorUnits: -14900,
          occurredAt: paidAt,
          name: "Streaming",
        },
      },
      database,
      { reconcileBilling: false },
    );

    resolveScheduleOccurrencePaidInContext(schedule.id, tx.id, paidAt, database);
    resolveScheduleOccurrencePaidInContext(schedule.id, tx.id, paidAt, database);

    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM transaction_schedule_postings").get()
        .n,
      1,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT count(*) AS n FROM transaction_schedule_occurrences WHERE schedule_id = ? AND status = 'due'",
        )
        .get(schedule.id).n,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("ST-F02 fix: Mark Paid rolls back when schedule posting cannot be created", () => {
  setupTestDb();
  try {
    const now = Date.now();
    const subId = "sub_st_f02";
    const schedId = "sched_st_f02";
    sqlite.prepare(
      "INSERT INTO transaction_schedules (id, status, transaction_type, account_id, category_id, amount_minor_units, frequency, interval_count, starts_at, time_zone, end_mode, weekend_policy, auto_post, anchor_occurrence_number, next_occurrence_number, next_nominal_at, next_effective_at, subscription_id, created_at, updated_at) VALUES (?, 'active', 'expense', 'acc_1', 'cat_sub', -14900, 'monthly', 1, ?, 'UTC', 'never', 'exact', 0, 1, 1, ?, ?, ?, ?, ?)",
    ).run(
      schedId,
      now,
      now,
      now,
      subId,
      now,
      now,
    );
    sqlite.prepare(
      "INSERT INTO subscriptions (id, name, amount_minor_units, currency_code, billing_cycle, billing_cycle_interval, status, auto_post, first_billing_date, next_renewal_date, account_id, category_id, schedule_id, created_at, updated_at) VALUES (?, 'Netflix', 14900, 'PHP', 'monthly', 1, 'active', 0, ?, ?, 'acc_1', 'cat_sub', ?, ?, ?)",
    ).run(subId, now, now, schedId, now, now);
    sqlite.prepare(
      "INSERT INTO transaction_schedule_occurrences (id, schedule_id, sequence_number, nominal_due_at, effective_due_at, template_snapshot, status, created_at, updated_at) VALUES ('occ_due_1', ?, 1, ?, ?, '{}', 'due', ?, ?)",
    ).run(schedId, now, now, now, now);

    const beforeRenewal = sqlite
      .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
      .get(subId).next_renewal_date;

    sqlite.exec(
      "CREATE TRIGGER reject_schedule_posting BEFORE INSERT ON transaction_schedule_postings BEGIN SELECT RAISE(ABORT, 'schedule link failed'); END;",
    );

    const { recordSubscriptionPayment } = require("../../subscriptions/services/record-subscription-payment.service.ts");
    assert.throws(() => recordSubscriptionPayment(subId), /schedule link failed/);

    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM subscription_payments").get().n,
      0,
    );
    assert.equal(
      sqlite
        .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
        .get(subId).next_renewal_date,
      beforeRenewal,
    );
  } finally {
    sqlite.close();
  }
});