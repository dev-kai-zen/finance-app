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
const {
  getAccountBalanceDeltasAtDates,
  getAccountBalanceDeltasAtDate,
  getAccountTransactionDelta,
} = require("../services/get-account-balance-deltas.service");
const {
  getPocketBalanceDeltasAtDate,
  getPocketTransactionBalanceDeltas,
} = require("../services/get-pocket-transaction-balance-deltas.service");

function setupTestDb() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
  for (const entry of journal.entries) {
    const file = path.join(root, "../drizzle", `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(file, "utf-8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
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
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 0, ${now}, 0, 0, ${now}, ${now}),
           ('acc_2', 'act_dep', 'Savings Account', 'PHP', 0, ${now}, 0, 1, ${now}, ${now});
  `);

  return database;
}

test("getAccountBalanceDeltasAtDates: correctly accumulates deltas across sorted cutoffs in a single pass", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = new Date(2026, 0, 10, 12, 0).getTime();
  const t2 = new Date(2026, 0, 15, 12, 0).getTime();
  const t3 = new Date(2026, 0, 20, 12, 0).getTime();

  insert.run("tx_1", "acc_1", "income", 10000, t1, t1, t1);
  insert.run("tx_2", "acc_1", "expense", -3000, t2, t2, t2);
  insert.run("tx_3", "acc_2", "income", 50000, t2, t2, t2);
  insert.run("tx_4", "acc_1", "expense", -2000, t3, t3, t3);

  const cutoffs = [
    new Date(2026, 0, 5),   // Before any tx
    new Date(2026, 0, 12),  // After tx_1
    new Date(2026, 0, 18),  // After tx_2 and tx_3
    new Date(2026, 0, 25),  // After all txs
  ];

  const results = getAccountBalanceDeltasAtDates(cutoffs, db);

  assert.equal(results.length, 4);
  // Cutoff 0: Jan 5 -> no transactions
  assert.deepEqual(results[0], {});
  // Cutoff 1: Jan 12 -> tx_1 only (acc_1: 10000)
  assert.deepEqual(results[1], { acc_1: 10000 });
  // Cutoff 2: Jan 18 -> tx_1 + tx_2 (acc_1: 7000), tx_3 (acc_2: 50000)
  assert.deepEqual(results[2], { acc_1: 7000, acc_2: 50000 });
  // Cutoff 3: Jan 25 -> tx_1 + tx_2 + tx_4 (acc_1: 5000), tx_3 (acc_2: 50000)
  assert.deepEqual(results[3], { acc_1: 5000, acc_2: 50000 });
});

test("getAccountBalanceDeltasAtDates: handles unsorted and duplicate cutoffs preserving input index order", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, amount_minor_units, occurred_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = new Date(2026, 0, 10).getTime();
  const t2 = new Date(2026, 0, 20).getTime();

  insert.run("tx_1", "acc_1", "income", 15000, t1, t1, t1);
  insert.run("tx_2", "acc_1", "expense", -5000, t2, t2, t2);

  // Unsorted cutoffs with duplicate
  const cutoffs = [
    new Date(2026, 0, 25), // after both: 10000
    new Date(2026, 0, 5),  // before any: {}
    new Date(2026, 0, 15), // after tx_1: 15000
    new Date(2026, 0, 25), // duplicate after both: 10000
  ];

  const results = getAccountBalanceDeltasAtDates(cutoffs, db);

  assert.equal(results.length, 4);
  assert.deepEqual(results[0], { acc_1: 10000 });
  assert.deepEqual(results[1], {});
  assert.deepEqual(results[2], { acc_1: 15000 });
  assert.deepEqual(results[3], { acc_1: 10000 });
});

test("getAccountBalanceDeltasAtDates: ignores deleted transactions and handles empty input", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, amount_minor_units, occurred_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = new Date(2026, 0, 10).getTime();
  insert.run("tx_active", "acc_1", "income", 8000, t1, t1, t1, null);
  insert.run("tx_deleted", "acc_1", "income", 20000, t1, t1, t1, t1);

  assert.deepEqual(getAccountBalanceDeltasAtDates([], db), []);

  const res = getAccountBalanceDeltasAtDates([new Date(2026, 0, 15)], db);
  assert.deepEqual(res[0], { acc_1: 8000 });

  const single = getAccountBalanceDeltasAtDate(new Date(2026, 0, 15), db);
  assert.deepEqual(single, { acc_1: 8000 });
});

test("getAccountTransactionDelta: computes native aggregate delta with optional exclusion and ignores deleted rows", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, amount_minor_units, occurred_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = new Date(2026, 0, 10).getTime();
  insert.run("tx_1", "acc_1", "income", 50000, t1, t1, t1, null);
  insert.run("tx_2", "acc_1", "expense", -15000, t1, t1, t1, null);
  insert.run("tx_3", "acc_1", "expense", -5000, t1, t1, t1, null);
  insert.run("tx_del", "acc_1", "expense", -20000, t1, t1, t1, t1); // deleted
  insert.run("tx_other", "acc_2", "income", 99999, t1, t1, t1, null); // other account

  // 1. Account with no transactions returns 0
  assert.equal(getAccountTransactionDelta("acc_nonexistent", db), 0);

  // 2. Net sum for acc_1 without exclusions: 50000 - 15000 - 5000 = 30000
  assert.equal(getAccountTransactionDelta("acc_1", db), 30000);

  // 3. Net sum excluding tx_2: 50000 - 5000 = 45000
  assert.equal(getAccountTransactionDelta("acc_1", db, { excludeTransactionId: "tx_2" }), 45000);

  // 4. Net sum excluding non-existent ID remains 30000
  assert.equal(getAccountTransactionDelta("acc_1", db, { excludeTransactionId: "tx_unknown" }), 30000);

  // 5. Net sum for acc_2 is isolated: 99999
  assert.equal(getAccountTransactionDelta("acc_2", db), 99999);
});

test("CAL-F08: getAccountBalanceDeltasAtDate single-cutoff native SQLite grouping and bounds", () => {
  const db = setupTestDb();
  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, type, amount_minor_units, occurred_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tBefore = new Date(2026, 9, 15).getTime(); // Oct 15
  const tCutoff = new Date(2026, 9, 31).getTime(); // Oct 31
  const tAfter = new Date(2026, 10, 5).getTime();  // Nov 5

  // Account 1 transactions
  insert.run("tx_1", "acc_1", "income", 50000, tBefore, tBefore, tBefore, null);
  insert.run("tx_2", "acc_1", "expense", -15000, tCutoff, tCutoff, tCutoff, null);
  insert.run("tx_3_future", "acc_1", "expense", -10000, tAfter, tAfter, tAfter, null); // After cutoff
  insert.run("tx_4_del", "acc_1", "income", 90000, tBefore, tBefore, tBefore, tBefore); // Deleted

  // Account 2 transactions
  insert.run("tx_5", "acc_2", "expense", -5000, tBefore, tBefore, tBefore, null);
  insert.run("tx_6_future", "acc_2", "income", 100000, tAfter, tAfter, tAfter, null); // After cutoff

  const cutoff = new Date(2026, 9, 31);
  const deltas = getAccountBalanceDeltasAtDate(cutoff, db);

  // Assert exact arithmetic totals
  assert.equal(deltas.acc_1, 35000); // 50000 - 15000 (excluding future -10000 and deleted 90000)
  assert.equal(deltas.acc_2, -5000); // -5000 (excluding future 100000)
  assert.equal(Object.keys(deltas).length, 2, "Result should be bounded to distinct accounts, not rows");

  // Mathematical parity assertion against multi-cutoff chart function
  const multiCutoffResult = getAccountBalanceDeltasAtDates([cutoff], db)[0] ?? {};
  assert.deepEqual(deltas, multiCutoffResult);
});

test("CAL-F08: getPocketBalanceDeltasAtDate single-cutoff native SQLite grouping and bounds", () => {
  const db = setupTestDb();
  const now = Date.now();
  sqlite.exec(`
    INSERT INTO pockets (id, account_id, name, is_archived, sort_order, created_at, updated_at)
    VALUES ('pock_1', 'acc_1', 'Savings Pocket', 0, 0, ${now}, ${now}),
           ('pock_2', 'acc_2', 'Emergency Pocket', 0, 0, ${now}, ${now});
  `);

  const insert = sqlite.prepare(`
    INSERT INTO transactions (id, account_id, pocket_id, type, amount_minor_units, occurred_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tBefore = new Date(2026, 9, 10).getTime();
  const tCutoff = new Date(2026, 9, 31).getTime();
  const tAfter = new Date(2026, 10, 2).getTime();

  // Pocket 1 transactions
  insert.run("ptx_1", "acc_1", "pock_1", "income", 15000, tBefore, tBefore, tBefore, null);
  insert.run("ptx_2", "acc_1", "pock_1", "expense", -3000, tCutoff, tCutoff, tCutoff, null);
  insert.run("ptx_3_future", "acc_1", "pock_1", "expense", -5000, tAfter, tAfter, tAfter, null); // Future
  insert.run("ptx_4_del", "acc_1", "pock_1", "income", 20000, tBefore, tBefore, tBefore, tBefore); // Deleted

  // Pocket 2 transactions (under acc_2)
  insert.run("ptx_5", "acc_2", "pock_2", "expense", -4000, tBefore, tBefore, tBefore, null);
  insert.run("ptx_6_future", "acc_2", "pock_2", "income", 50000, tAfter, tAfter, tAfter, null); // Future

  // Transaction with no pocketId (null pocket)
  insert.run("ptx_nopock", "acc_1", null, "income", 99999, tBefore, tBefore, tBefore, null);

  const cutoff = new Date(2026, 9, 31);
  const pocketDeltas = getPocketBalanceDeltasAtDate(cutoff, db);

  // Assert exact arithmetic totals
  assert.equal(pocketDeltas.pock_1, 12000); // 15000 - 3000
  assert.equal(pocketDeltas.pock_2, -4000); // -4000
  assert.equal(pocketDeltas.null, undefined);
  assert.equal(Object.keys(pocketDeltas).length, 2, "Result should be bounded to distinct pockets, not rows");

  // Undated pocket balance deltas include all non-deleted transactions across all dates
  const allPocketDeltas = getPocketTransactionBalanceDeltas(db);
  assert.equal(allPocketDeltas.pock_1, 7000); // 15000 - 3000 - 5000
  assert.equal(allPocketDeltas.pock_2, 46000); // -4000 + 50000
});
