const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "../..");
let sqlite;
let database;
let statements = 0;

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
      get sqliteDatabase() {
        return sqlite;
      },
    };
  }
  if (request.includes("drizzle/migrations") || request.endsWith("migrations")) {
    return {};
  }
  if (request === "expo-file-system") {
    return {
      Paths: { document: { uri: "file:///doc" } },
      Directory: class MockDirectory {
        constructor(...parts) {
          this.uri = `file:///mock/${parts.map((p) => (typeof p === "string" ? p : p?.uri ?? "")).join("/")}`;
          this.exists = true;
        }
        create() {}
      },
      File: class MockFile {
        constructor(...parts) {
          this.uri = `file:///mock/${parts.map((p) => (typeof p === "string" ? p : p?.uri ?? "")).join("/")}`;
        }
      },
    };
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
    .map(
      (column, index) =>
        `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");

function connectAndMigrate() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = require("../../../drizzle/meta/_journal.json");
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(
      path.join(__dirname, "../../../drizzle", `${entry.tag}.sql`),
      "utf-8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }

  const adapter = {
    execSync(sql) {
      sqlite.exec(sql);
    },
    prepareSync(query) {
      statements += 1;
      return {
        executeSync(params = []) {
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
          const info = stmt.run(...params);
          return {
            changes: Number(info.changes ?? 0),
            lastInsertRowId: Number(info.lastInsertRowid ?? 0),
          };
        },
        executeForRawResultSync(params = []) {
          const stmt = sqlite.prepare(aliasSelectColumns(query));
          const rows = stmt.all(...params);
          return {
            getAllSync: () => rows.map((row) => Object.values(row)),
          };
        },
        finalizeSync() {},
      };
    },
  };

  database = drizzle(adapter, { schema });
}

function seedAccountTypeAndAccount(nowMs) {
  const existingType = sqlite
    .prepare("SELECT id FROM account_types LIMIT 1")
    .get();
  const typeId = existingType?.id;
  if (!typeId) {
    throw new Error("Expected seeded system account type after migrations");
  }
  sqlite
    .prepare(
      "INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, hide_from_selection, hide_from_reports, pocket_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)",
    )
    .run("acc-1", "Wallet", typeId, "PHP", 10000, nowMs, nowMs, nowMs);
}

test("F05: scheduleAfterPaint and runDeferredSyncQuery honor cancellation", () => {
  const { scheduleAfterPaint } = require("@/utils/schedule-after-paint");
  const { runDeferredSyncQuery } = require("@/utils/run-deferred-sync-query");

  const queue = new Map();
  let nextId = 1;
  const origRaf = global.requestAnimationFrame;
  const origCancel = global.cancelAnimationFrame;

  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => {
    queue.delete(id);
  };

  try {
    let ran = 0;
    const cancel1 = scheduleAfterPaint(() => {
      ran += 1;
    });
    cancel1();
    for (const cb of [...queue.values()]) cb();
    assert.equal(ran, 0, "cancelled scheduleAfterPaint must not execute");

    let loadingStates = [];
    let markedLoaded = false;
    let queryCount = 0;

    const cancel2 = runDeferredSyncQuery(
      {
        hasCachedResult: false,
        setLoading: (val) => loadingStates.push(val),
        onMarkLoaded: () => {
          markedLoaded = true;
        },
      },
      () => {
        queryCount += 1;
      },
    );

    assert.deepEqual(loadingStates, [true]);
    const firstFrameId = [...queue.keys()][0];
    const firstCb = queue.get(firstFrameId);
    queue.delete(firstFrameId);
    firstCb();
    cancel2();

    for (const cb of [...queue.values()]) cb();
    assert.equal(queryCount, 0, "cancelled deferred query must not run");
    assert.equal(markedLoaded, false, "cancelled deferred query must not mark loaded");
    assert.deepEqual(loadingStates, [true]);
  } finally {
    global.requestAnimationFrame = origRaf;
    global.cancelAnimationFrame = origCancel;
  }
});

test("F03: listDeletedTransactions exits early in 1 SQL statement when Trash is empty", () => {
  connectAndMigrate();
  const { listDeletedTransactions } = require(
    "@/modules/transactions/repositories/transactions.repository",
  );

  statements = 0;
  const result = listDeletedTransactions(database);
  assert.deepEqual(result, []);
  assert.equal(
    statements,
    1,
    `Expected 1 SQL statement for empty Trash, got ${statements}`,
  );
  sqlite.close();
});

test("F06: getAccountsWithBalances picker mode skips management scans & getFundGroupsWorkspace reuses preloaded data", () => {
  connectAndMigrate();
  const now = Date.now();
  seedAccountTypeAndAccount(now);
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run("tx-1", "acc-1", "expense", "PHP", -2500, now, now, now);
  sqlite
    .prepare(
      "INSERT INTO fund_groups (id, name, name_normalized, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
    )
    .run("fg-1", "Emergency", "emergency", now, now);
  sqlite
    .prepare(
      "INSERT INTO fund_group_accounts (fund_group_id, account_id, sort_order) VALUES (?, ?, 0)",
    )
    .run("fg-1", "acc-1");

  const { getAccountsWithBalances } = require(
    "@/modules/accounts/services/get-accounts-with-balances.service",
  );
  const { getFundGroupsWorkspace } = require(
    "@/modules/accounts/services/get-fund-groups.service",
  );

  statements = 0;
  const fullAccounts = getAccountsWithBalances(database, {
    includeManagementFlags: true,
  });
  const fullStatements = statements;

  statements = 0;
  const lightAccounts = getAccountsWithBalances(database, {
    includeManagementFlags: false,
  });
  const lightStatements = statements;

  assert.equal(fullAccounts[0].currentBalanceMinorUnits, 7500);
  assert.equal(lightAccounts[0].currentBalanceMinorUnits, 7500);
  assert.equal(fullAccounts[0].isDeletable, false);
  assert.equal(fullAccounts[0].canChangeCurrency, false);
  assert.ok(
    lightStatements < fullStatements,
    `Expected lightStatements (${lightStatements}) < fullStatements (${fullStatements})`,
  );

  statements = 0;
  const unpreloaded = getFundGroupsWorkspace(database);
  const unpreloadedStatements = statements;

  statements = 0;
  const preloaded = getFundGroupsWorkspace(database, {
    accounts: fullAccounts,
    pockets: [],
  });
  const preloadedStatements = statements;

  assert.deepEqual(
    preloaded.groups[0].totalsByCurrency,
    unpreloaded.groups[0].totalsByCurrency,
  );
  assert.equal(preloaded.groups[0].totalsByCurrency.PHP, 7500);
  assert.ok(
    preloadedStatements < unpreloadedStatements,
    `Expected preloadedStatements (${preloadedStatements}) < unpreloadedStatements (${unpreloadedStatements})`,
  );

  sqlite.close();
});

test("F08: evaluateBudgetSnapshot runs in 0 SQL statements and matches checkBudgetExceeded", () => {
  connectAndMigrate();
  const now = new Date(Date.UTC(2026, 10, 15, 12, 0, 0));
  const nowMs = now.getTime();
  seedAccountTypeAndAccount(nowMs);

  sqlite
    .prepare(
      "INSERT OR IGNORE INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    )
    .run("color_blue", "Blue", "#2563EB", nowMs, nowMs);
  sqlite
    .prepare(
      "INSERT INTO categories (id, name, type, icon, hex_colors_id, sort_order, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)",
    )
    .run("cat-food", "Food", "expense", "utensils", "color_blue", nowMs, nowMs);
  sqlite
    .prepare(
      "INSERT INTO category_budgets (id, category_id, currency_code, amount_minor_units, frequency, start_date, is_enabled, allow_rollover, rollover_mode, notify_on_exceeded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'positive_only', 1, ?, ?)",
    )
    .run("b-1", "cat-food", "PHP", 10000, "monthly", Date.UTC(2026, 10, 1), nowMs, nowMs);
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run("tx-1", "acc-1", "cat-food", "expense", "PHP", -4000, nowMs, nowMs, nowMs);

  const {
    checkBudgetExceeded,
    getBudgetLiveSnapshot,
    evaluateBudgetSnapshot,
  } = require("@/modules/budgets/services/check-budget-exceeded.service");

  const snapshot = getBudgetLiveSnapshot({
    categoryId: "cat-food",
    expenseCurrencyCode: "PHP",
    occurredAt: now,
    context: database,
  });

  statements = 0;
  const r1 = evaluateBudgetSnapshot(snapshot, 5000);
  const r2 = evaluateBudgetSnapshot(snapshot, 7000);
  assert.equal(statements, 0, "evaluateBudgetSnapshot must issue 0 SQL statements");

  const direct1 = checkBudgetExceeded({
    categoryId: "cat-food",
    amountMinorUnits: 5000,
    expenseCurrencyCode: "PHP",
    occurredAt: now,
    context: database,
  });
  const direct2 = checkBudgetExceeded({
    categoryId: "cat-food",
    amountMinorUnits: 7000,
    expenseCurrencyCode: "PHP",
    occurredAt: now,
    context: database,
  });

  assert.deepEqual(r1, direct1);
  assert.deepEqual(r2, direct2);
  assert.equal(r1.exceeds, false);
  assert.equal(r2.exceeds, true);
  assert.equal(r2.exceededByCents, 1000);

  sqlite.close();
});

test("F08 & F14: findLabelsByIds batches lookups and listNoteAttachmentsByNoteIds chunks >500 IDs", () => {
  connectAndMigrate();
  const now = Date.now();

  for (let i = 0; i < 3; i += 1) {
    sqlite
      .prepare(
        "INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
      )
      .run(`lbl-${i}`, `Label ${i}`, i, now, now);
  }

  const { findLabelsByIds } = require(
    "@/modules/labels/repositories/labels.repository",
  );
  statements = 0;
  const foundLabels = findLabelsByIds(["lbl-0", "lbl-1", "lbl-2"], database);
  assert.equal(foundLabels.length, 3);
  assert.equal(statements, 1, "findLabelsByIds should resolve in 1 batch SQL statement");

  const noteIds = [];
  sqlite.exec("BEGIN");
  const insertNote = sqlite.prepare(
    "INSERT INTO notes (id, title, content, is_pinned, created_at, updated_at) VALUES (?, ?, '', 0, ?, ?)",
  );
  for (let i = 0; i < 650; i += 1) {
    const id = `note-${i}`;
    noteIds.push(id);
    insertNote.run(id, `Note ${i}`, now, now);
  }
  sqlite.exec("COMMIT");

  sqlite
    .prepare(
      "INSERT INTO note_attachments (id, note_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .run("att-early", "note-5", "a.jpg", "a.jpg", "image/jpeg", 100, "h1", now - 1000, now);
  sqlite
    .prepare(
      "INSERT INTO note_attachments (id, note_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .run("att-late", "note-620", "b.jpg", "b.jpg", "image/jpeg", 100, "h2", now + 1000, now);

  const { listNoteAttachmentsByNoteIds } = require(
    "@/modules/notes/repositories/note-attachments.repository",
  );
  statements = 0;
  const attachments = listNoteAttachmentsByNoteIds(noteIds, database);
  assert.equal(statements, 2, "650 note IDs should execute in 2 chunked SQL statements");
  assert.deepEqual(
    attachments.map((a) => a.id),
    ["att-late", "att-early"],
  );

  sqlite.close();
});

test("F12: runSafeMigrations fast-paths already-current DB and runs full check when forceFullCheck is set", async () => {
  connectAndMigrate();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    );
    INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h0', 1000);
  `);

  const ops = [];
  const instrumentedClient = {
    execSync(sql) {
      ops.push({ op: "exec", sql });
      sqlite.exec(sql);
    },
    runSync(sql, params = []) {
      ops.push({ op: "run", sql });
      return sqlite.prepare(sql).run(...params);
    },
    getFirstSync(sql, params = []) {
      ops.push({ op: "first", sql });
      return sqlite.prepare(sql).get(...params) ?? null;
    },
    getAllSync(sql, params = []) {
      ops.push({ op: "all", sql });
      return sqlite.prepare(sql).all(...params);
    },
  };

  const fakeDb = Object.assign(Object.create(database), {
    $client: instrumentedClient,
    run: () => {},
  });

  // Stub migrate() on an already-migrated DB by passing matching journal entry
  const fakeConfig = {
    journal: {
      entries: [{ idx: 0, when: 1000, tag: "0000_current", breakpoints: true }],
    },
    migrations: { m0000: "SELECT 1;" },
  };

  // Pre-seed the matching maintenance marker to simulate an already-current cold start
  sqlite
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('__db_maintenance_tag', '0000_current:v1', ?)",
    )
    .run(Date.now());

  const { runSafeMigrations } = require("@/infrastructure/database/migrator");

  ops.length = 0;
  await runSafeMigrations(fakeDb, fakeConfig);

  assert.equal(
    ops.some((o) => /foreign_key_check/i.test(o.sql)),
    false,
    "Current DB cold start must skip full PRAGMA foreign_key_check",
  );
  assert.equal(
    ops.some((o) => /INSERT OR IGNORE INTO hex_colors/i.test(o.sql)),
    false,
    "Current DB cold start must skip 18 hex_colors seed statements",
  );
  assert.equal(
    ops.length,
    2,
    `Expected exactly 2 lightweight marker/migration probe reads, got ${ops.length}`,
  );

  // forceFullCheck: true (restore/reset path) must execute full maintenance & foreign_key_check
  ops.length = 0;
  // Also mock drizzle-orm/expo-sqlite/migrator only if needed? No, migrate() sees created_at >= 1000 and is a no-op!
  // Make sure fakeDb.select / transaction / etc. work via database prototype:
  // Actually migrate(database, config) uses database.all / database.run internally; let's attach $client on database directly.
  database.$client = instrumentedClient;
  // Ensure database.get/all work with __drizzle_migrations already present:
  await runSafeMigrations(database, fakeConfig, { forceFullCheck: true });

  assert.equal(
    ops.some((o) => /foreign_key_check/i.test(o.sql)),
    true,
    "forceFullCheck must run PRAGMA foreign_key_check",
  );
  assert.equal(
    ops.some((o) => /INSERT OR IGNORE INTO hex_colors/i.test(o.sql)),
    true,
    "forceFullCheck must run default hex color seeding",
  );

  sqlite.close();
});

