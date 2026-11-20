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
    .map(
      (column, index) =>
        `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const {
  searchTransactions,
} = require("../services/search-transactions.service");
const {
  listTransactions,
} = require("../repositories/transactions.repository");

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
            const rawRows = stmt.all(...params);
            return {
              getAllSync: () =>
                rawRows.map((row) =>
                  Object.keys(row)
                    .sort((a, b) => {
                      const numA = Number(a.replace("__raw_", ""));
                      const numB = Number(b.replace("__raw_", ""));
                      return numA - numB;
                    })
                    .map((key) => row[key]),
                ),
            };
          },
        };
      },
    },
    { schema },
  );

  return { sqlite, database };
}

test("searchTransactions: returns empty array for blank query", () => {
  setupTestDb();
  const res = searchTransactions("   ", 8, database);
  assert.deepEqual(res, []);
});

test("searchTransactions: matches name, note, or category with limit and excludes deleted", () => {
  const { sqlite: db, database } = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('at1', 'Cash', 'asset', 0, 'wallet', 1, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, pocket_enabled, created_at, updated_at)
    VALUES ('acc1', 'Cash Wallet', 'at1', 'PHP', 100000, ${now}, 0, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO categories (id, name, type, icon, hex_colors_id, is_system, created_at, updated_at)
    VALUES ('cat1', 'Food & Dining', 'expense', 'utensils', null, 0, ${now}, ${now})
  `).run();

  // Insert 3 transactions
  // 1. Matched by name
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, name, note, occurred_at, created_at, updated_at)
    VALUES ('tx1', 'acc1', 'cat1', 'expense', 'PHP', -15000, 'Starbucks Coffee', 'Morning latte', ${now - 1000}, ${now - 1000}, ${now - 1000})
  `).run();

  // 2. Matched by note
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, name, note, occurred_at, created_at, updated_at)
    VALUES ('tx2', 'acc1', null, 'expense', 'PHP', -5000, 'Bakery', 'Coffee and croissant', ${now - 2000}, ${now - 2000}, ${now - 2000})
  `).run();

  // 3. Matched by category
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, name, note, occurred_at, created_at, updated_at)
    VALUES ('tx3', 'acc1', 'cat1', 'expense', 'PHP', -30000, 'Dinner Out', 'Family meal', ${now - 3000}, ${now - 3000}, ${now - 3000})
  `).run();

  // 4. Deleted transaction (should be excluded)
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, name, note, occurred_at, created_at, updated_at, deleted_at)
    VALUES ('tx4_del', 'acc1', 'cat1', 'expense', 'PHP', -8000, 'Coffee shop deleted', null, ${now}, ${now}, ${now}, ${now})
  `).run();

  const coffeeResults = searchTransactions("coffee", 8, database);
  assert.equal(coffeeResults.length, 2, "Should find tx1 and tx2 matching 'coffee'");
  assert.equal(coffeeResults[0].id, "tx1");
  assert.equal(coffeeResults[1].id, "tx2");

  const foodResults = searchTransactions("food", 8, database);
  assert.equal(foodResults.length, 2, "Should find tx1 and tx3 via category name 'Food & Dining'");

  const limited = searchTransactions("coffee", 1, database);
  assert.equal(limited.length, 1, "Respects limit parameter");
});

test("searchTransactions (P1-09): deduplicates 2-leg transfers, matches split categories, escapes SQL LIKE wildcards, and resolves account currency", () => {
  const { sqlite: db, database } = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('at1', 'Cash', 'asset', 0, 'wallet', 1, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, pocket_enabled, created_at, updated_at)
    VALUES
      ('acc_php_1', 'Cash Wallet', 'at1', 'PHP', 100000, ${now}, 0, ${now}, ${now}),
      ('acc_php_2', 'Bank Vault', 'at1', 'PHP', 100000, ${now}, 0, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO categories (id, name, type, icon, hex_colors_id, is_system, created_at, updated_at)
    VALUES
      ('cat_groceries', 'Groceries', 'expense', 'shopping-bag', null, 0, ${now}, ${now}),
      ('cat_pharmacy', 'Pharmacy & Meds', 'expense', 'pill', null, 0, ${now}, ${now})
  `).run();

  // 1. Two-leg transfer ("Monthly Savings Move")
  db.prepare(`
    INSERT INTO transactions (id, account_id, transaction_group_id, type, currency_code, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES
      ('tx_trf_out', 'acc_php_1', 'tgrp_move_1', 'transfer', 'PHP', -250000, 'Monthly Savings Move', ${now - 1000}, ${now - 1000}, ${now - 1000}),
      ('tx_trf_in', 'acc_php_2', 'tgrp_move_1', 'transfer', 'PHP', 250000, 'Monthly Savings Move', ${now - 1000}, ${now - 1000}, ${now - 1000})
  `).run();

  // 2. Split expense with category_id = NULL on parent and child categories in transaction_entries
  db.prepare(`
    INSERT INTO transactions (id, account_id, category_id, type, currency_code, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES ('tx_split_1', 'acc_php_1', null, 'expense', 'USD', -58500, 'Supermarket Run', ${now - 2000}, ${now - 2000}, ${now - 2000})
  `).run();
  db.prepare(`
    INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, note, created_at, updated_at)
    VALUES
      ('te_1', 'tx_split_1', 'cat_groceries', 38500, 'Veggies', ${now - 2000}, ${now - 2000}),
      ('te_2', 'tx_split_1', 'cat_pharmacy', 20000, 'Vitamins 50% off', ${now - 2000}, ${now - 2000})
  `).run();

  // A: Transfer search returns 1 canonical row (no duplicate -₱ and +₱ rows)
  const transferHits = searchTransactions("Monthly Savings Move", 8, database);
  assert.equal(transferHits.length, 1);
  assert.equal(transferHits[0].id, "tx_trf_out");
  assert.equal(transferHits[0].amountMinorUnits, 250000);

  // B: Split child category search finds the split transaction and populates matched categoryName + account currency
  const splitHits = searchTransactions("Pharmacy", 8, database);
  assert.equal(splitHits.length, 1);
  assert.equal(splitHits[0].id, "tx_split_1");
  assert.equal(splitHits[0].categoryName, "Pharmacy & Meds");
  assert.equal(splitHits[0].currencyCode, "PHP");

  // C: Searching '%' only matches the transaction that literally has '50% off' in its split entry note
  const percentHits = searchTransactions("%", 8, database);
  assert.equal(percentHits.length, 1);
  assert.equal(percentHits[0].id, "tx_split_1");

  const underscoreHits = searchTransactions("_", 8, database);
  assert.equal(underscoreHits.length, 0);
});

test("listTransactions: scopes results by startDate and endDate", () => {
  const { sqlite: db, database } = setupTestDb();
  const day1 = new Date(2026, 10, 1, 10, 0, 0).getTime();
  const day15 = new Date(2026, 10, 15, 12, 0, 0).getTime();
  const day30 = new Date(2026, 10, 30, 18, 0, 0).getTime();
  const nextMonthDay2 = new Date(2026, 11, 2, 9, 0, 0).getTime();
  const now = Date.now();

  db.prepare(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('at1', 'Cash', 'asset', 0, 'wallet', 1, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO accounts (id, name, account_type_id, currency_code, opening_balance_minor_units, opening_balance_at, pocket_enabled, created_at, updated_at)
    VALUES ('acc1', 'Cash Wallet', 'at1', 'PHP', 0, ${now}, 0, ${now}, ${now})
  `).run();

  db.prepare(`
    INSERT INTO transactions (id, account_id, type, currency_code, amount_minor_units, name, occurred_at, created_at, updated_at)
    VALUES 
      ('t_nov1', 'acc1', 'expense', 'PHP', -1000, 'Nov 1 Tx', ${day1}, ${now}, ${now}),
      ('t_nov15', 'acc1', 'expense', 'PHP', -2000, 'Nov 15 Tx', ${day15}, ${now}, ${now}),
      ('t_nov30', 'acc1', 'expense', 'PHP', -3000, 'Nov 30 Tx', ${day30}, ${now}, ${now}),
      ('t_dec2', 'acc1', 'expense', 'PHP', -4000, 'Dec 2 Tx', ${nextMonthDay2}, ${now}, ${now})
  `).run();

  // Query only November 2026
  const novStart = new Date(2026, 10, 1, 0, 0, 0, 0);
  const novEnd = new Date(2026, 10, 30, 23, 59, 59, 999);

  const novResults = listTransactions(
    { startDate: novStart, endDate: novEnd, includeBalances: false },
    database,
  );

  assert.equal(novResults.length, 3, "Only transactions in November are retrieved");
  assert.ok(novResults.some((t) => t.id === "t_nov1"));
  assert.ok(novResults.some((t) => t.id === "t_nov15"));
  assert.ok(novResults.some((t) => t.id === "t_nov30"));
  assert.ok(!novResults.some((t) => t.id === "t_dec2"), "December transaction must be excluded");
});
