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
const {
  listTransactions,
  listTransactionsPage,
  listAllFilteredTransactions,
  findTransactionListItemById,
} = require("../repositories/transactions.repository");
const {
  getTransactionsForExport,
} = require("../services/get-transactions-for-export.service");

function connectAndMigrate() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = require("../../../../drizzle/meta/_journal.json");
  for (const entry of journal.entries) {
    const sqlText = fs.readFileSync(
      path.join(__dirname, "../../../../drizzle", `${entry.tag}.sql`),
      "utf-8",
    );
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }

  const adapter = {
    execSync(sqlText) {
      sqlite.exec(sqlText);
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

function seedMixedLedger() {
  const baseTime = Date.UTC(2026, 9, 1, 12, 0, 0);
  const typeId = sqlite.prepare("SELECT id FROM account_types LIMIT 1").get().id;

  sqlite
    .prepare(
      "INSERT OR IGNORE INTO hex_colors (id, name, hex, is_system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    )
    .run("color_blue", "Blue", "#2563EB", baseTime, baseTime);

  const insertAccount = sqlite.prepare(
    "INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, hide_from_selection, hide_from_reports, pocket_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, ?, ?)",
  );
  insertAccount.run("acc_main", "Main Bank", typeId, "PHP", 100000, baseTime, 0, 1, baseTime, baseTime);
  insertAccount.run("acc_save", "Savings Vault", typeId, "PHP", 50000, baseTime, 1, 1, baseTime, baseTime);
  insertAccount.run("acc_card", "Visa Card", typeId, "PHP", -20000, baseTime, 2, 0, baseTime, baseTime);

  const insertPocket = sqlite.prepare(
    "INSERT INTO pockets (id, account_id, name, is_archived, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)",
  );
  insertPocket.run("poc_travel", "acc_main", "Travel Pocket", 0, baseTime, baseTime);
  insertPocket.run("poc_emerg", "acc_save", "Emergency Pocket", 1, baseTime, baseTime);

  const insertCat = sqlite.prepare(
    "INSERT INTO categories (id, name, type, icon, hex_colors_id, parent_id, sort_order, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
  );
  insertCat.run("cat_food", "Food", "expense", "utensils", "color_blue", null, 0, baseTime, baseTime);
  insertCat.run("cat_coffee", "Coffee", "expense", "coffee", "color_blue", "cat_food", 1, baseTime, baseTime);
  insertCat.run("cat_fee", "Bank Fee", "expense", "receipt", "color_blue", null, 2, baseTime, baseTime);
  insertCat.run("cat_salary", "Salary", "income", "wallet", "color_blue", null, 3, baseTime, baseTime);

  sqlite
    .prepare(
      "INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)",
    )
    .run("lbl_work", "Work Trip", baseTime, baseTime);
  sqlite
    .prepare(
      "INSERT INTO labels (id, name, sort_order, is_archived, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)",
    )
    .run("lbl_pct", "50% Promo", baseTime, baseTime);

  const insertTx = sqlite.prepare(
    "INSERT INTO transactions (id, account_id, category_id, pocket_id, transaction_group_id, type, currency_code, amount_minor_units, name, note, occurred_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, 'PHP', ?, ?, ?, ?, ?, ?, ?)",
  );

  // 1. Income into Main Bank + Travel Pocket
  insertTx.run("tx_01", "acc_main", "cat_salary", "poc_travel", null, "income", 50000, "Monthly Pay", "October payroll", baseTime + 1000, baseTime + 1000, baseTime + 1000, null);

  // 2 & 3. Tied timestamps (exact same occurredAt and createdAt!)
  insertTx.run("tx_02a", "acc_main", "cat_coffee", "poc_travel", null, "expense", -450, "Latte A", "Morning 50% off", baseTime + 2000, baseTime + 2000, baseTime + 2000, null);
  insertTx.run("tx_02b", "acc_main", "cat_food", null, null, "expense", -1200, "Lunch B", "Team lunch", baseTime + 2000, baseTime + 2000, baseTime + 2000, null);

  // 4. 2-leg transfer from Main Bank (Travel Pocket) -> Savings Vault (Emergency Pocket) + independent fee paid from Visa Card!
  insertTx.run("tx_tr_out", "acc_main", null, "poc_travel", "grp_1", "transfer", -15000, "Move to vault", "Monthly save", baseTime + 3000, baseTime + 3000, baseTime + 3000, null);
  insertTx.run("tx_tr_in", "acc_save", null, "poc_emerg", "grp_1", "transfer", 15000, "Move to vault", "Monthly save", baseTime + 3000, baseTime + 3000, baseTime + 3000, null);
  insertTx.run("tx_tr_fee", "acc_card", "cat_fee", null, "grp_1", "expense", -25, "Transfer Fee", "Instapay fee", baseTime + 3000, baseTime + 3001, baseTime + 3001, null);

  // 5. Split expense on Visa Card (Food + Coffee)
  insertTx.run("tx_split", "acc_card", null, null, null, "expense", -3500, "Supermarket Split", "Split receipt", baseTime + 4000, baseTime + 4000, baseTime + 4000, null);
  sqlite
    .prepare(
      "INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("ent_1", "tx_split", "cat_food", 2500, "Groceries", baseTime + 4000, baseTime + 4000);
  sqlite
    .prepare(
      "INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("ent_2", "tx_split", "cat_coffee", 1000, "Beans", baseTime + 4000, baseTime + 4000);

  // 6. Orphaned 1-leg partial transfer (must remain visible as standalone)
  insertTx.run("tx_orphan_tr", "acc_save", null, null, "grp_orphan", "transfer", -2000, "Partial Transfer", null, baseTime + 5000, baseTime + 5000, baseTime + 5000, null);

  // 7. Soft-deleted transaction (must NEVER appear in active pages or affect balances)
  insertTx.run("tx_deleted", "acc_main", "cat_food", null, null, "expense", -99999, "Deleted Row", null, baseTime + 6000, baseTime + 6000, baseTime + 6000, baseTime + 6500);

  // Labels & Attachments
  sqlite
    .prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES (?, ?, ?)")
    .run("tx_02a", "lbl_pct", baseTime + 2000);
  sqlite
    .prepare("INSERT INTO transaction_labels (transaction_id, label_id, created_at) VALUES (?, ?, ?)")
    .run("tx_tr_out", "lbl_work", baseTime + 3000);

  sqlite
    .prepare(
      "INSERT INTO transaction_attachments (id, transaction_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)",
    )
    .run("att_1", "tx_tr_out", "r1.jpg", "r1.jpg", "image/jpeg", 500, "h1", baseTime, baseTime, null);
  sqlite
    .prepare(
      "INSERT INTO transaction_attachments (id, transaction_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)",
    )
    .run("att_2", "tx_tr_in", "r2.jpg", "r2.jpg", "image/jpeg", 500, "h2", baseTime, baseTime, null);
  sqlite
    .prepare(
      "INSERT INTO transaction_attachments (id, transaction_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)",
    )
    .run("att_del", "tx_02b", "del.jpg", "del.jpg", "image/jpeg", 500, "h3", baseTime, baseTime, baseTime + 10);

  return { baseTime };
}

function collectAllPages(filter, pageSize = 3) {
  const collected = [];
  let cursor = null;
  let totalCount;
  let pageCount = 0;

  while (true) {
    const page = listTransactionsPage(
      { filter, limit: pageSize, cursor, includeTotalCount: cursor === null },
      database,
    );
    pageCount += 1;
    if (totalCount === undefined) {
      totalCount = page.totalCount;
    }
    collected.push(...page.items);
    if (!page.hasMore) break;
    assert.ok(page.nextCursor, "hasMore=true must provide nextCursor");
    cursor = page.nextCursor;
    assert.ok(pageCount < 50, "pagination loop guard");
  }

  return { items: collected, totalCount, pageCount };
}

test("F03: concatenated keyset pages match baseline listTransactions & full CSV export across all 4 sort modes", () => {
  connectAndMigrate();
  seedMixedLedger();

  const baseline = listTransactions(undefined, database);
  const baselineById = new Map(baseline.map((item) => [item.id, item]));
  // Expect 7 logical active items: tx_01, tx_02a, tx_02b, tx_tr_out (grouped), tx_tr_fee, tx_split, tx_orphan_tr
  assert.equal(baseline.length, 7);

  const modes = [
    { sortBy: "date", sortOrder: "desc" },
    { sortBy: "date", sortOrder: "asc" },
    { sortBy: "amount", sortOrder: "desc" },
    { sortBy: "amount", sortOrder: "asc" },
  ];

  for (const mode of modes) {
    const { items, totalCount, pageCount } = collectAllPages(mode, 2);
    assert.equal(totalCount, 7, `totalCount mismatch for ${mode.sortBy} ${mode.sortOrder}`);
    assert.equal(items.length, 7, `items.length mismatch for ${mode.sortBy} ${mode.sortOrder}`);
    assert.ok(pageCount >= 4, "pageSize=2 over 7 items should take 4 pages");

    // Verify exact field-by-field parity with baseline (including historical balances, transfer fee, splits, labels, attachments)
    for (const item of items) {
      const expected = baselineById.get(item.id);
      assert.ok(expected, `Unexpected item id ${item.id}`);
      assert.deepEqual(item, expected, `Item mismatch for ${item.id} under ${mode.sortBy} ${mode.sortOrder}`);
    }

    // Verify export service returns the exact same items in exact same order
    const exportRows = getTransactionsForExport(mode, database);
    assert.deepEqual(
      exportRows.map((r) => r.id),
      items.map((r) => r.id),
      `Export order mismatch for ${mode.sortBy} ${mode.sortOrder}`,
    );
  }

  // Verify transfer grouped item has both legs' attachments (2), fee metadata (25 from acc_card), and destination pocket balance (15000)
  const groupedTransfer = baselineById.get("tx_tr_out");
  assert.equal(groupedTransfer.attachmentCount, 2);
  assert.equal(groupedTransfer.transferFeeAmountMinorUnits, 25);
  assert.equal(groupedTransfer.transferFeeAccountId, "acc_card");
  assert.equal(groupedTransfer.destinationLocationBalanceAfterMinorUnits, 15000);
  assert.equal(groupedTransfer.destinationBalanceAfterMinorUnits, 65000);

  sqlite.close();
});

test("F03: SQLite filter predicates match account, category+split, label, search (with wildcards), date range, and emptyResult", () => {
  connectAndMigrate();
  const { baseTime } = seedMixedLedger();

  // Account filter on acc_save matches grouped transfer (inLeg) + orphan transfer, NOT standalone acc_main items
  const saveAcc = collectAllPages({ accountIds: ["acc_save"] }, 2);
  assert.deepEqual(
    saveAcc.items.map((i) => i.id).sort(),
    ["tx_orphan_tr", "tx_tr_out"],
  );

  // Account filter on acc_card matches tx_tr_fee and tx_split, NOT the transfer tx_tr_out (whose fee was paid from acc_card)
  const cardAcc = collectAllPages({ accountIds: ["acc_card"] }, 2);
  assert.deepEqual(
    cardAcc.items.map((i) => i.id).sort(),
    ["tx_split", "tx_tr_fee"],
  );

  // Category filter on Food + subcategory Coffee matches tx_02a, tx_02b, AND split tx_split
  const foodCat = collectAllPages({ categoryIds: ["cat_food", "cat_coffee"] }, 2);
  assert.deepEqual(
    foodCat.items.map((i) => i.id).sort(),
    ["tx_02a", "tx_02b", "tx_split"],
  );

  // Label filter
  const labeled = collectAllPages({ labelIds: ["lbl_work"] }, 2);
  assert.deepEqual(
    labeled.items.map((i) => i.id),
    ["tx_tr_out"],
  );

  // Search matching destination account name ("Savings Vault") finds grouped transfer + orphan
  const destSearch = collectAllPages({ searchQuery: "savings vault" }, 2);
  assert.deepEqual(
    destSearch.items.map((i) => i.id).sort(),
    ["tx_orphan_tr", "tx_tr_out"],
  );

  // Search with literal SQL wildcard "%" matches ONLY "50% Promo" / "50% off" (tx_02a), not everything!
  const wildcardSearch = collectAllPages({ searchQuery: "50%" }, 2);
  assert.deepEqual(
    wildcardSearch.items.map((i) => i.id),
    ["tx_02a"],
  );

  // Date range filter
  const ranged = collectAllPages(
    { startDate: new Date(baseTime + 2000), endDate: new Date(baseTime + 3000) },
    2,
  );
  assert.deepEqual(
    ranged.items.map((i) => i.id).sort(),
    ["tx_02a", "tx_02b", "tx_tr_fee", "tx_tr_out"],
  );

  // emptyResult short-circuit
  statements = 0;
  const empty = listTransactionsPage({ filter: { emptyResult: true } }, database);
  assert.equal(statements, 0);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.totalCount, 0);

  sqlite.close();
});

test("F03: findTransactionListItemById hydrates standalone, split, outLeg, and inLeg transfer IDs", () => {
  connectAndMigrate();
  seedMixedLedger();

  const baseline = listTransactions(undefined, database);
  const baselineById = new Map(baseline.map((i) => [i.id, i]));

  const fromOutLeg = findTransactionListItemById("tx_tr_out", database);
  const fromInLeg = findTransactionListItemById("tx_tr_in", database);
  const fromSplit = findTransactionListItemById("tx_split", database);

  assert.deepEqual(fromOutLeg, baselineById.get("tx_tr_out"));
  assert.deepEqual(fromInLeg, baselineById.get("tx_tr_out"));
  assert.deepEqual(fromSplit, baselineById.get("tx_split"));
  assert.equal(findTransactionListItemById("tx_deleted", database), null);

  sqlite.close();
});

test("F03: 10,000-row ledger uses transactions_active_feed_index, bounds SQL statements, and matches exact historical balances", () => {
  connectAndMigrate();
  const baseTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  const typeId = sqlite.prepare("SELECT id FROM account_types LIMIT 1").get().id;

  sqlite
    .prepare(
      "INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, hide_from_selection, hide_from_reports, pocket_enabled, created_at, updated_at) VALUES (?, ?, ?, 'PHP', ?, ?, 0, 0, 0, 0, 0, ?, ?)",
    )
    .run("acc_big", "Big Ledger", typeId, 1000000, baseTime, baseTime, baseTime);

  const insertTx = sqlite.prepare(
    "INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at) VALUES (?, 'acc_big', 'expense', 'PHP', ?, ?, ?, ?)",
  );
  sqlite.exec("BEGIN");
  for (let i = 0; i < 10000; i += 1) {
    const t = baseTime + i * 60000;
    const amt = -((i % 500) + 1);
    insertTx.run(`t_${String(i).padStart(5, "0")}`, amt, t, t, t);
  }
  sqlite.exec("COMMIT");

  // 1. Verify SQLite uses partial index transactions_active_feed_index with NO temp B-tree sort
  const plan = sqlite
    .prepare(
      `EXPLAIN QUERY PLAN
       SELECT id FROM transactions
       WHERE deleted_at IS NULL
       ORDER BY occurred_at DESC, created_at DESC, id DESC
       LIMIT 51`,
    )
    .all();
  const planText = plan.map((row) => row.detail).join(" | ");
  assert.match(
    planText,
    /transactions_active_feed_index/,
    `Expected transactions_active_feed_index in query plan, got: ${planText}`,
  );
  assert.doesNotMatch(
    planText,
    /USE TEMP B-TREE FOR ORDER BY/i,
    `Expected zero temp B-tree sort, got: ${planText}`,
  );

  // 2. Verify Page 1 on 10,000 rows uses bounded statement count (<= 12 vs 49+ before!)
  statements = 0;
  const page1 = listTransactionsPage(
    { filter: { sortBy: "date", sortOrder: "desc" }, limit: 50 },
    database,
  );
  const page1Statements = statements;
  assert.equal(page1.items.length, 50);
  assert.equal(page1.totalCount, 10000);
  assert.equal(page1.hasMore, true);
  assert.ok(
    page1Statements <= 12,
    `Expected <= 12 SQL statements for 10k-row Page 1, got ${page1Statements}`,
  );

  // 3. Verify exact historical balance on newest row (t_09999) and 50th row (t_09950)
  let totalDelta = 0;
  let deltaAt9950 = 0;
  for (let i = 0; i < 10000; i += 1) {
    totalDelta += -((i % 500) + 1);
    if (i === 9950) deltaAt9950 = totalDelta;
  }
  assert.equal(page1.items[0].id, "t_09999");
  assert.equal(page1.items[0].accountBalanceAfterMinorUnits, 1000000 + totalDelta);
  assert.equal(page1.items[49].id, "t_09950");
  assert.equal(page1.items[49].accountBalanceAfterMinorUnits, 1000000 + deltaAt9950);

  // 4. Verify wide-span amount DESC (exercises Branch B correlated aggregate over 10k rows!)
  const amountPage1 = listTransactionsPage(
    { filter: { sortBy: "amount", sortOrder: "desc" }, limit: 50 },
    database,
  );
  assert.equal(amountPage1.items.length, 50);
  // First item should be the newest row with amount -500: i = 9999? No, (i % 500) + 1 === 500 => i = 9999 (9999 % 500 = 499 => 500!)
  assert.equal(amountPage1.items[0].id, "t_09999");
  assert.equal(amountPage1.items[0].accountBalanceAfterMinorUnits, 1000000 + totalDelta);
  // 20th item with amount -500 is i = 499 (all i = 499, 999, ..., 9999 => 20 items of -500!)
  let deltaAt499 = 0;
  for (let i = 0; i <= 499; i += 1) deltaAt499 += -((i % 500) + 1);
  assert.equal(amountPage1.items[19].id, "t_00499");
  assert.equal(amountPage1.items[19].accountBalanceAfterMinorUnits, 1000000 + deltaAt499);

  // 5. Verify live backdate/insert between Page 1 and Page 2 stays consistent
  const midTime = baseTime + 9950 * 60000;
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, occurred_at, created_at, updated_at) VALUES ('t_new_top', 'acc_big', 'income', 'PHP', 500, ?, ?, ?)",
    )
    .run(baseTime + 20000 * 60000, baseTime + 20000 * 60000, baseTime + 20000 * 60000);

  const page2 = listTransactionsPage(
    {
      filter: { sortBy: "date", sortOrder: "desc" },
      limit: 50,
      cursor: page1.nextCursor,
      includeTotalCount: false,
    },
    database,
  );
  assert.equal(page2.items.length, 50);
  assert.equal(page2.items[0].id, "t_09949", "Newer insert must not shift Page 2 cursor or duplicate t_09950");
  assert.ok(midTime > 0);

  sqlite.close();
});

test("Chat with Kai transfer edit and delete by transactionGroupId (P1-07): findTransactionListItemById, updateTransfer, and removeTransaction accept tgrp_... IDs", async () => {
  const {
    findTransactionListItemById,
    findTransactionsByGroupId,
  } = require("../repositories/transactions.repository");
  const { updateTransferInContext } = require("../services/update-transfer.service");
  const { removeTransaction } = require("../services/delete-transaction.service");

  connectAndMigrate();
  seedMixedLedger();

  // Seed a 2-leg transfer with transactionGroupId = 'tgrp_kai_1' (what recordTransfer returns to Kai)
  const now = Date.now();
  const groupId = "tgrp_kai_1";
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, transaction_group_id, type, currency_code, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES (?, ?, ?, 'transfer', 'PHP', ?, 'Kai Transfer', ?, ?, ?)",
    )
    .run("tx_kai_out", "acc_main", groupId, -200000, now, now, now);
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, transaction_group_id, type, currency_code, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES (?, ?, ?, 'transfer', 'PHP', ?, 'Kai Transfer', ?, ?, ?)",
    )
    .run("tx_kai_in", "acc_save", groupId, 200000, now, now, now);

  // 1. findTransactionListItemById resolves the canonical transfer item when given tgrp_kai_1
  const resolvedByGroup = findTransactionListItemById(groupId, database);
  assert.ok(resolvedByGroup);
  assert.equal(resolvedByGroup.id, "tx_kai_out");
  assert.equal(resolvedByGroup.transactionGroupId, groupId);
  assert.equal(resolvedByGroup.accountId, "acc_main");
  assert.equal(resolvedByGroup.transferAccountId, "acc_save");
  assert.equal(resolvedByGroup.amountMinorUnits, 200000);

  // 2. updateTransferInContext updates both legs when editing the saved Kai transfer
  updateTransferInContext(
    {
      transactionGroupId: groupId,
      fromAccountId: "acc_main",
      toAccountId: "acc_save",
      amountMinorUnits: 250000,
      name: "Kai Transfer Edited",
      occurredAt: new Date(now),
    },
    database,
  );
  const afterUpdate = findTransactionListItemById(groupId, database);
  assert.ok(afterUpdate);
  assert.equal(afterUpdate.amountMinorUnits, 250000);
  assert.equal(afterUpdate.name, "Kai Transfer Edited");

  // 3. removeTransaction soft-deletes both legs when given tgrp_kai_1 (as Kai passes proposal.transactionId)
  removeTransaction(groupId);
  const afterDelete = findTransactionListItemById(groupId, database);
  assert.equal(afterDelete, null);
  const groupRows = findTransactionsByGroupId(groupId, database);
  assert.equal(groupRows.length, 2);
  assert.ok(groupRows.every((leg) => leg.deletedAt !== null));

  sqlite.close();
});

test("P1-26: buildTransactionSections keeps amount-sorted feeds flat across pages without retro-merging into earlier date headers", () => {
  const {
    buildTransactionSections,
  } = require("@/modules/transactions/utils/group-transactions-sections");

  const makeTx = (id, amountMinorUnits, type, isoDate) => ({
    id,
    type,
    amountMinorUnits,
    currencyCode: "PHP",
    occurredAt: new Date(isoDate),
  });

  // Page 1 (amount DESC): Nov 18 (50,000), Nov 15 (40,000)
  // Page 2 (amount DESC): Nov 18 (200), Nov 15 (100)
  const amountSortedPages = [
    makeTx("tx_p1_a", 5000000, "expense", "2026-11-18T10:00:00.000Z"),
    makeTx("tx_p1_b", 4000000, "expense", "2026-11-15T10:00:00.000Z"),
    makeTx("tx_p2_a", 20000, "expense", "2026-11-18T08:00:00.000Z"),
    makeTx("tx_p2_b", 10000, "income", "2026-11-15T08:00:00.000Z"),
  ];

  const amountSections = buildTransactionSections(
    amountSortedPages,
    "amount",
    "PHP",
  );
  assert.equal(amountSections.length, 1);
  assert.equal(amountSections[0].isFlat, true);
  assert.deepEqual(
    amountSections[0].data.map((t) => t.id),
    ["tx_p1_a", "tx_p1_b", "tx_p2_a", "tx_p2_b"],
    "Page 2 items must append strictly below Page 1 in exact amount order",
  );

  // Date-sorted feed still groups by date with accurate net totals and counts
  const dateSorted = [
    makeTx("tx_d1", 5000000, "expense", "2026-11-18T10:00:00.000Z"),
    makeTx("tx_d2", 20000, "income", "2026-11-18T08:00:00.000Z"),
    makeTx("tx_d3", 4000000, "expense", "2026-11-15T10:00:00.000Z"),
  ];
  const dateSections = buildTransactionSections(dateSorted, "date", "PHP");
  assert.equal(dateSections.length, 2);
  assert.equal(dateSections[0].isFlat, false);
  assert.equal(dateSections[0].count, 2);
  assert.equal(dateSections[0].netMinorUnits, -4980000);
  assert.equal(dateSections[1].count, 1);
  assert.equal(dateSections[1].netMinorUnits, -4000000);

  // Empty list returns []
  assert.deepEqual(buildTransactionSections([], "amount", "PHP"), []);
  assert.deepEqual(buildTransactionSections([], "date", "PHP"), []);
});
