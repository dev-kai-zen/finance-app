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
let transactionCount = 0;
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, property) => {
      if (property === Symbol.toPrimitive) return () => "";
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
    request.startsWith("expo") ||
    request.startsWith("@expo") ||
    request.startsWith("react-native")
  ) {
    return createMock();
  }
  if (request === "@/infrastructure/database/client") {
    return { get db() { return database; } };
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
const { CURRENCY_NAMES } = require("@/modules/currencies/constants/currency-preferences.constants");
const { seedCurrenciesIfEmpty } = require("@/modules/currencies/services/seed-currencies.service");
const { listCurrencies } = require("@/modules/currencies/repositories/currencies.repository");
const { getCurrencyMinorUnitExponent } = require("@/utils/currency");

const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs
    .readFileSync(path.join(root, "../drizzle", `${entry.tag}.sql`), "utf8")
    .split("--> statement-breakpoint"),
  folderMillis: entry.when,
  hash: "",
  bps: true,
}));

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

function connect() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  transactionCount = 0;

  database = drizzle(
    {
      execSync(query) {
        sqlite.exec(query);
      },
      prepareSync(query) {
        return {
          executeSync(params) {
            if (/^\s*begin\b/i.test(query)) {
              transactionCount += 1;
            }
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
            const rows = sqlite.prepare(aliasSelectColumns(query)).all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );
  database.dialect.migrate(migrations, database.session);
  transactionCount = 0;
}

beforeEach(connect);
afterEach(() => sqlite.close());

test("fresh seed inserts all built-in currencies in one transaction sorted alphabetically including PHP", () => {
  const expectedCodes = Object.keys(CURRENCY_NAMES).sort();

  seedCurrenciesIfEmpty(database);

  assert.equal(transactionCount, 1, "All currency inserts must run in a single transaction");

  const rows = listCurrencies(database);
  assert.deepEqual(
    rows.map((r) => r.code),
    expectedCodes,
    "Built-in currencies must be sorted strictly A → Z with PHP included alphabetically",
  );
  assert.equal(rows[0].code, "AED");
  assert.notEqual(rows[0].code, "PHP");
  const phpIndex = expectedCodes.indexOf("PHP");
  assert.equal(rows[phpIndex].code, "PHP");
  assert.equal(rows[phpIndex].sortOrder, phpIndex);
});

test("v1.7.0 upgrade normalizes sortOrder alphabetically, preserves custom currencies, and refreshes active catalog", () => {
  const expectedCodes = Object.keys(CURRENCY_NAMES).sort();
  const now = Date.now();
  const legacyV170Codes = [
    "PHP", "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "IDR", "INR",
    "JPY", "KRW", "MYR", "NZD", "SAR", "SGD", "THB", "TWD", "USD", "VND", "AED",
  ];

  const insertStmt = sqlite.prepare(`
    INSERT INTO currencies (code, name, symbol, minor_unit_exponent, sort_order, is_active, is_custom, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?);
  `);

  legacyV170Codes.forEach((code, idx) => {
    insertStmt.run(code, CURRENCY_NAMES[code] ?? code, `${code} `, 2, idx, 0, now, now);
  });
  insertStmt.run("XYZ", "Custom Test Currency", "X$", 3, 9000, 1, now, now);

  seedCurrenciesIfEmpty(database);

  assert.equal(transactionCount, 1, "Upgrade seeding and sortOrder normalization must run in one transaction");

  const rows = listCurrencies(database);
  assert.equal(rows.length, expectedCodes.length + 1);
  assert.deepEqual(
    rows.slice(0, expectedCodes.length).map((r) => r.code),
    expectedCodes,
    "All built-in currencies must be sorted strictly A → Z after upgrading from v1.7.0",
  );
  assert.equal(rows[rows.length - 1].code, "XYZ", "Custom currency stays after built-ins");
  assert.equal(rows[rows.length - 1].sortOrder, 9000, "Custom currency sortOrder is preserved");
  assert.equal(getCurrencyMinorUnitExponent("XYZ"), 3, "Active currency catalog reflects custom currency decimals");

  // Second run must be a 0-write no-op (no transaction opened)
  transactionCount = 0;
  seedCurrenciesIfEmpty(database);
  assert.equal(transactionCount, 0, "Already-seeded normalized catalog must not open a write transaction");
});
