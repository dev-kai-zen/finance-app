const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const {
  normalizePresetSearch,
  rankTransactionPresets,
} = require("../utils/rank-transaction-presets.ts");
const journal = require("../../../../drizzle/meta/_journal.json");

function applyMigration(database, entry) {
  const migrationPath = path.join(
    __dirname,
    "../../../../drizzle",
    `${entry.tag}.sql`,
  );
  const migration = fs.readFileSync(migrationPath, "utf-8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

function setupTestDb(lastMigrationIndex = Number.POSITIVE_INFINITY) {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");

  for (const entry of journal.entries) {
    if (entry.idx > lastMigrationIndex) break;
    applyMigration(database, entry);
  }

  const now = Date.now();
  database.exec(`
    INSERT INTO account_types (
      id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at
    ) VALUES ('type_asset', 'Asset', 'asset', 0, 'wallet', 1, ${now}, ${now});

    INSERT INTO accounts (
      id, account_type_id, name, currency_code, opening_balance_minor_units,
      opening_balance_at, pocket_enabled, is_archived, sort_order, created_at, updated_at
    ) VALUES
      ('account_from', 'type_asset', 'Checking', 'PHP', 0, ${now}, 1, 0, 0, ${now}, ${now}),
      ('account_to', 'type_asset', 'Savings', 'PHP', 0, ${now}, 1, 0, 1, ${now}, ${now});

    INSERT INTO categories (
      id, name, type, is_system, sort_order, created_at, updated_at
    ) VALUES ('category_food', 'Food', 'expense', 0, 0, ${now}, ${now});

    INSERT INTO pockets (
      id, account_id, name, is_archived, sort_order, created_at, updated_at
    ) VALUES ('pocket_bills', 'account_from', 'Bills', 0, 0, ${now}, ${now});
  `);
  return { database, now };
}

test("quick presets: migration removes preset_name without losing existing presets", () => {
  const { database, now } = setupTestDb(18);
  database.prepare(`
    INSERT INTO transaction_presets (
      id, preset_name, transaction_name, type, account_id, category_id,
      amount_cents, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "existing_preset",
    "Old display name",
    "Groceries",
    "expense",
    "account_from",
    "category_food",
    -2500,
    now,
    now,
  );

  applyMigration(database, journal.entries.find((entry) => entry.idx === 19));

  const columns = database
    .prepare("PRAGMA table_info('transaction_presets')")
    .all()
    .map((column) => column.name);
  assert.equal(columns.includes("preset_name"), false);
  assert.equal(columns.includes("transaction_name"), true);

  const preset = database
    .prepare("SELECT * FROM transaction_presets WHERE id = ?")
    .get("existing_preset");
  assert.equal(preset.transaction_name, "Groceries");
  assert.equal(preset.amount_cents, -2500);
});

test("quick presets: stores typed relational transaction defaults", () => {
  const { database, now } = setupTestDb();
  database.prepare(`
    INSERT INTO transaction_presets (
      id, transaction_name, type, account_id, pocket_id,
      category_id, amount_cents, note, sort_order, usage_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "preset_grocery",
    "Groceries",
    "expense",
    "account_from",
    "pocket_bills",
    "category_food",
    null,
    "Variable weekly amount",
    0,
    0,
    now,
    now,
  );

  const preset = database
    .prepare("SELECT * FROM transaction_presets WHERE id = ?")
    .get("preset_grocery");
  assert.equal(preset.transaction_name, "Groceries");
  assert.equal(preset.amount_cents, null);
  assert.equal(preset.account_id, "account_from");
  assert.equal(preset.category_id, "category_food");
});

test("quick presets: validates names, types, zero amounts, and transfer direction", () => {
  const { database, now } = setupTestDb();
  const insert = database.prepare(`
    INSERT INTO transaction_presets (
      id, transaction_name, type, account_id, to_account_id,
      amount_cents, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  assert.throws(() =>
    insert.run("blank", " ", "transfer", "account_from", "account_to", 100, now, now),
  );
  assert.throws(() =>
    insert.run("bad_type", "Bad", "refund", "account_from", null, 100, now, now),
  );
  assert.throws(() =>
    insert.run("zero", "Zero", "expense", "account_from", null, 0, now, now),
  );
  assert.throws(() =>
    insert.run("negative_transfer", "Move", "transfer", "account_from", "account_to", -100, now, now),
  );
});

test("quick presets: preserves repairable presets when category or pocket is deleted", () => {
  const { database, now } = setupTestDb();
  database.prepare(`
    INSERT INTO transaction_presets (
      id, transaction_name, type, account_id, pocket_id,
      category_id, amount_cents, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "repairable",
    "Food",
    "expense",
    "account_from",
    "pocket_bills",
    "category_food",
    -100,
    now,
    now,
  );

  database.exec("DELETE FROM categories WHERE id = 'category_food';");
  database.exec("DELETE FROM pockets WHERE id = 'pocket_bills';");
  const preset = database
    .prepare("SELECT category_id, pocket_id FROM transaction_presets WHERE id = 'repairable'")
    .get();
  assert.equal(preset.category_id, null);
  assert.equal(preset.pocket_id, null);
  assert.throws(() =>
    database.exec("DELETE FROM accounts WHERE id = 'account_from';"),
  );
});

test("quick presets: active ordering excludes sync tombstones", () => {
  const { database, now } = setupTestDb();
  const insert = database.prepare(`
    INSERT INTO transaction_presets (
      id, transaction_name, type, account_id, category_id,
      amount_cents, sort_order, created_at, updated_at, deleted_at
    ) VALUES (?, ?, 'expense', 'account_from', 'category_food', -100, ?, ?, ?, ?)
  `);
  insert.run("second", "Second", 1, now, now, null);
  insert.run("first", "First", 0, now, now, null);
  insert.run("deleted", "Deleted", 2, now, now, now);

  const active = database
    .prepare(`
      SELECT id FROM transaction_presets
      WHERE deleted_at IS NULL
      ORDER BY sort_order, transaction_name
    `)
    .all()
    .map((row) => row.id);
  assert.deepEqual(active, ["first", "second"]);
});

test("quick presets: suggestions normalize text and rank exact, prefix, and recent matches", () => {
  const base = {
    type: "expense",
    accountId: "account_from",
    pocketId: null,
    categoryId: "category_food",
    toAccountId: null,
    toPocketId: null,
    amountCents: null,
    note: null,
    sortOrder: 0,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
  };
  const presets = [
    {
      ...base,
      id: "contains",
      transactionName: "Weekend groceries",
    },
    {
      ...base,
      id: "prefix",
      transactionName: "Grocery store",
    },
    {
      ...base,
      id: "exact",
      transactionName: "Groceries",
      lastUsedAt: new Date(10),
      usageCount: 5,
    },
  ];

  assert.equal(normalizePresetSearch("  GROCERIES  "), "groceries");
  assert.deepEqual(
    rankTransactionPresets(presets, "groceries").map((preset) => preset.id),
    ["exact", "contains"],
  );
  assert.deepEqual(
    rankTransactionPresets(presets, "gr").map((preset) => preset.id),
    ["exact", "prefix", "contains"],
  );
  assert.deepEqual(rankTransactionPresets(presets, "g"), []);
});
