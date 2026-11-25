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
  if (request === "@/modules/scheduled-transactions") {
    return {
      getScheduleBySubscriptionId: (...args) =>
        require("../services/manage-scheduled-transaction.service").getScheduleBySubscriptionId(...args),
      processDueSchedules: (...args) =>
        require("../services/process-due-schedules.service").processDueSchedules(...args),
      saveScheduledTransactionInContext: (...args) =>
        require("../services/save-scheduled-transaction.service").saveScheduledTransactionInContext(...args),
      resolveScheduleOccurrencePaidInContext: (...args) =>
        require("../services/resolve-schedule-paid.service").resolveScheduleOccurrencePaidInContext(...args),
      setScheduledTransactionPaused: () => {},
      getScheduledTransaction: (...args) =>
        require("../repositories/scheduled-transactions.repository").findScheduledTransaction(...args),
      removeScheduledTransaction: (...args) =>
        require("../services/manage-scheduled-transaction.service").removeScheduledTransaction(...args),
    };
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

function input(overrides = {}) {
  return {
    name: "Service",
    amountMinorUnits: 14900,
    currencyCode: "PHP",
    billingCycle: "monthly",
    status: "active",
    firstBillingDate: new Date(2026, 0, 15),
    ...overrides,
  };
}

const { saveSubscriptionInContext } = require("../../subscriptions/services/save-subscription.service");
const {
  postScheduledOccurrence,
  processDueSchedules,
} = require("../services/process-due-schedules.service");

test("ST-F03 fix: manual post rolls back ledger when subscription payment audit fails", () => {
  setupTestDb();
  try {
    const past = new Date(2026, 0, 15);
    const id = saveSubscriptionInContext(
      input({
        accountId: "acc_1",
        categoryId: "cat_sub",
        autoPost: false,
        firstBillingDate: past,
      }),
      undefined,
      database,
    );
  const scheduleId = sqlite
      .prepare("SELECT schedule_id FROM subscriptions WHERE id = ?")
      .get(id).schedule_id;

    processDueSchedules(new Date(2026, 1, 1));
    const due = sqlite
      .prepare(
        "SELECT id, status FROM transaction_schedule_occurrences WHERE schedule_id = ? AND status = 'due'",
      )
      .get(scheduleId);
    assert.ok(due);

    const beforeRenewal = sqlite
      .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
      .get(id).next_renewal_date;

    sqlite.exec(
      "CREATE TRIGGER reject_subscription_payment_before_insert BEFORE INSERT ON subscription_payments BEGIN SELECT RAISE(ABORT, 'subscription audit failed'); END;",
    );

    assert.throws(() => postScheduledOccurrence(due.id), /subscription audit failed/);

    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM subscription_payments").get().n,
      0,
    );
    assert.equal(
      sqlite
        .prepare("SELECT status FROM transaction_schedule_occurrences WHERE id = ?")
        .get(due.id).status,
      "due",
    );
    assert.equal(
      sqlite
        .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
        .get(id).next_renewal_date,
      beforeRenewal,
    );
  } finally {
    sqlite.close();
  }
});

test("ST-F03 fix: auto-post leaves no ledger row when subscription payment audit fails", () => {
  setupTestDb();
  try {
    const past = new Date(2026, 0, 15);
    const id = saveSubscriptionInContext(
      input({
        accountId: "acc_1",
        categoryId: "cat_sub",
        autoPost: true,
        firstBillingDate: past,
      }),
      undefined,
      database,
    );
    const scheduleId = sqlite
      .prepare("SELECT schedule_id FROM subscriptions WHERE id = ?")
      .get(id).schedule_id;

    sqlite.exec(
      "CREATE TRIGGER reject_subscription_payment_before_insert BEFORE INSERT ON subscription_payments BEGIN SELECT RAISE(ABORT, 'subscription audit failed'); END;",
    );

    processDueSchedules(new Date(2026, 1, 1));

    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 0);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM subscription_payments").get().n,
      0,
    );
    const occurrence = sqlite
      .prepare(
        "SELECT status FROM transaction_schedule_occurrences WHERE schedule_id = ? ORDER BY sequence_number LIMIT 1",
      )
      .get(scheduleId);
    assert.ok(occurrence);
    assert.notEqual(occurrence.status, "posted");
  } finally {
    sqlite.close();
  }
});

test("ST-F03 fix: successful manual post writes subscription payment and advances renewal", () => {
  setupTestDb();
  try {
    const past = new Date(2026, 0, 15);
    const id = saveSubscriptionInContext(
      input({
        accountId: "acc_1",
        categoryId: "cat_sub",
        autoPost: false,
        firstBillingDate: past,
      }),
      undefined,
      database,
    );
    const beforeRenewal = sqlite
      .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
      .get(id).next_renewal_date;

    processDueSchedules(new Date(2026, 1, 1));
    const due = sqlite
      .prepare(
        "SELECT id FROM transaction_schedule_occurrences WHERE schedule_id = (SELECT schedule_id FROM subscriptions WHERE id = ?) AND status = 'due'",
      )
      .get(id);

    postScheduledOccurrence(due.id);

    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM transactions").get().n, 1);
    assert.equal(
      sqlite.prepare("SELECT count(*) AS n FROM subscription_payments WHERE subscription_id = ?").get(id).n,
      1,
    );
    const afterRenewal = sqlite
      .prepare("SELECT next_renewal_date FROM subscriptions WHERE id = ?")
      .get(id).next_renewal_date;
    assert.ok(afterRenewal > beforeRenewal);
    assert.equal(
      sqlite
        .prepare("SELECT status FROM transaction_schedule_occurrences WHERE id = ?")
        .get(due.id).status,
      "posted",
    );
  } finally {
    sqlite.close();
  }
});