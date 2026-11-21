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
let commitCount = 0;
let writesOutsideTransaction = 0;
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
  commitCount = 0; writesOutsideTransaction = 0;
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
            if (/^\s*commit\b/i.test(query)) commitCount++;
            if (/^\s*(insert|update|delete)\b/i.test(query) && !sqlite.isTransaction) writesOutsideTransaction++;
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
  commitCount = 0; writesOutsideTransaction = 0;
}

beforeEach(connect);
afterEach(() => sqlite.close());
const { performance } = require('node:perf_hooks');
const { seedDefaultCategoriesIfEmpty } = require('../services/seed-default-categories.service');
const { prepareWorkspaceCategories } = require('../services/prepare-workspace-categories.service');
const { listCategories } = require('../repositories/categories.repository');
const { DEFAULT_SEED_CATEGORIES } = require('../constants/categories.constants');

test('P3-01: fresh category defaults use one synchronous transaction with exact rows and parent links', t => {
  const start = performance.now();
  seedDefaultCategoriesIfEmpty(database);
  const elapsed = performance.now() - start;
  assert.equal(transactionCount, 1); assert.equal(commitCount, 1); assert.equal(writesOutsideTransaction, 0);
  const rows = sqlite.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  assert.equal(rows.length, DEFAULT_SEED_CATEGORIES.length);
  rows.forEach((row, index) => {
    const expected = DEFAULT_SEED_CATEGORIES[index];
    assert.equal(row.id, expected.id); assert.equal(row.name, expected.name); assert.equal(row.type, expected.type);
    assert.equal(row.parent_id, expected.parentId ?? null);
    assert.equal(row.sort_order, index); assert.equal(row.is_system, Number(expected.isSystem));
    assert.equal(row.icon, expected.icon ?? 'tag');
    assert.equal(row.hex_colors_id, expected.hexColorsId ?? (expected.color ? 'color_' + expected.color : 'color_slate'));
  });
  t.diagnostic('Seeded ' + rows.length + ' category rows in one commit: ' + elapsed.toFixed(2) + 'ms (in-memory SQLite).');
  transactionCount=0;commitCount=0;seedDefaultCategoriesIfEmpty(database);
  assert.equal(transactionCount,0); assert.equal(commitCount,0);
});

test('P3-01: category failure rolls back all earlier rows and a retry succeeds', () => {
  sqlite.exec("CREATE TRIGGER fail_seed BEFORE INSERT ON categories WHEN NEW.id = 'cat_exp_food' BEGIN SELECT RAISE(ABORT, 'seed failed'); END;");
  assert.throws(() => seedDefaultCategoriesIfEmpty(database), /seed failed/);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 0);
  assert.equal(commitCount, 0); assert.equal(writesOutsideTransaction, 0);
  sqlite.exec('DROP TRIGGER fail_seed'); seedDefaultCategoriesIfEmpty(database);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, DEFAULT_SEED_CATEGORIES.length);
});

test('P3-01: existing workspaces are unchanged and category reads never seed an empty workspace', async () => {
  assert.deepEqual(await listCategories(database), []);
  assert.equal(transactionCount,0); assert.equal(writesOutsideTransaction,0);
  sqlite.exec("INSERT INTO categories (id,name,type,sort_order,created_at,updated_at) VALUES ('custom','My category','expense',42,1000,2000)");
  seedDefaultCategoriesIfEmpty(database);
  assert.equal(transactionCount,0);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n,1);
  assert.equal(sqlite.prepare("SELECT updated_at FROM categories WHERE id='custom'").get().updated_at,2000);
});

test('P3-01: workspace preparation respects the caller transaction without yielding writes past commit', () => {
  assert.throws(() => database.transaction(tx => {
    const result=prepareWorkspaceCategories('recommended',tx);
    assert.equal(result,undefined,'Seeding must be synchronous inside Expo SQLite transactions');
    throw new Error('outer failed');
  }),/outer failed/);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n,0);
  assert.equal(writesOutsideTransaction,0);
  database.transaction(tx=>prepareWorkspaceCategories('manual',tx));
  assert.equal(commitCount,1);
  assert.deepEqual(sqlite.prepare('SELECT id FROM categories ORDER BY id').all().map(r=>r.id),['cat_exp_others','cat_inc_others']);
});

test('P3-01: currency failure rolls back a fresh seed and a retry succeeds', () => {
  sqlite.exec("CREATE TRIGGER fail_currency_seed BEFORE INSERT ON currencies WHEN NEW.code='USD' BEGIN SELECT RAISE(ABORT, 'currency seed failed'); END;");
  assert.throws(()=>seedCurrenciesIfEmpty(database),/currency seed failed/);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM currencies').get().n,0);
  assert.equal(commitCount,0);assert.equal(writesOutsideTransaction,0);
  sqlite.exec('DROP TRIGGER fail_currency_seed');seedCurrenciesIfEmpty(database);
  assert.equal(commitCount,1);assert.equal(writesOutsideTransaction,0);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM currencies').get().n,Object.keys(CURRENCY_NAMES).length);
});
