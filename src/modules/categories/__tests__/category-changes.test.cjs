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
let queries = [];

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
  queries = [];
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
        queries.push(query);
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
    VALUES ('cat_dining', 'Dining', 'expense', 'utensils', 1, 0, ${now}, ${now}),
           ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', 1, 1, ${now}, ${now});
  `);

  return database;
}

const vm = require('node:vm');
const { saveCategory } = require('../services/save-category.service');
const { notifyCategoryChanges } = require('../services/category-changes.service');
function mountCategories(options, overrides = {}) {
  let cursor = 0, focused = true, focusCallback, activeCallback, cleanup;
  const slots = [], pending = new Set();
  const same = (a,b) => a && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]));
  const react = {
    useState(initial) { const i=cursor++; if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}]; },
    useRef(initial) { const i=cursor++;return slots[i]??(slots[i]={current:initial}); },
    useCallback(callback,deps) { const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={callback,deps};return slots[i].callback; },
    useEffect(callback,deps) { const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={callback,deps};pending.add(callback);} },
  };
  const file = path.resolve(__dirname,'../hooks/use-categories.ts');
  const localRequire = Module.createRequire(file), exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
    exports,
    require(name) {
      if(name==='react')return react;
      if(name==='expo-router')return{useFocusEffect:cb=>{focusCallback=cb;}};
      if(name==='@/utils/schedule-after-paint')return{scheduleAfterPaint:cb=>{pending.add(cb);return()=>pending.delete(cb);}};
      if(name==='../repositories/categories.repository' && overrides.listCategories) return { listCategories: overrides.listCategories };
      return localRequire(name);
    },
  });
  return {
    render(){cursor=0;const value=exports.useCategories(options);if(focused&&activeCallback!==focusCallback){cleanup?.();activeCallback=focusCallback;cleanup=focusCallback();}return value;},
    async flush(){const jobs=[...pending];pending.clear();jobs.forEach(cb=>cb());await new Promise(resolve=>setImmediate(resolve));},
    blur(){cleanup?.();cleanup=null;activeCallback=null;focused=false;},
    focus(){focused=true;},
    get pending(){return pending.size;},
  };
}

test('P2-11a: quick-added categories refresh a focused consumer; repeated events coalesce and blur unsubscribes', async () => {
  setupTestDb(); const h=mountCategories();
  try {
    queries=[];h.render();assert.equal(queries.length,0);await h.flush();
    await saveCategory({name:'Pet Care',type:'expense',icon:'paw-print'});
    notifyCategoryChanges();notifyCategoryChanges();assert.equal(h.pending,1);
    await h.flush();assert.ok(h.render().categories.some(c=>c.name==='Pet Care'));
    await assert.rejects(saveCategory({name:'Pet Care',type:'expense',icon:'paw-print'}));
    assert.equal(h.pending,0,'Rejected mutations do not notify');
    h.blur();notifyCategoryChanges();assert.equal(h.pending,0);
    h.focus();h.render();assert.equal(h.pending,1);await h.flush();
    const pending=h.render().refresh();h.blur();await pending;assert.equal(h.pending,0);
  } finally {h.blur();sqlite.close();}
});

test('P2-11a: a self-initiated save performs one deferred refresh and skipQuery hosts perform no reads', async () => {
  setupTestDb(); const h=mountCategories();
  try {
    h.render();await h.flush();
    const save=h.render().saveCategory({name:'Travel',type:'expense',icon:'plane'});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(h.pending,1);
    await h.flush();assert.ok(await save);assert.equal(h.pending,0);
    assert.ok(h.render().categories.some(c=>c.name==='Travel'));
    h.blur();const skipped=mountCategories({skipQuery:true});queries=[];skipped.render();notifyCategoryChanges();await skipped.flush();
    assert.equal(queries.length,0);skipped.blur();
  } finally {h.blur();sqlite.close();}
});

test('P2-11a: superseded async reads and blur cannot publish stale category snapshots', async () => {
  const reads=[];
  const h=mountCategories(undefined,{listCategories:()=>new Promise(resolve=>reads.push(resolve))});
  try {
    h.render();await h.flush();notifyCategoryChanges();await h.flush();
    reads[1]([{id:'new',name:'New'}]);await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.render().categories[0].id,'new');
    reads[0]([{id:'old',name:'Old'}]);await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.render().categories[0].id,'new');
    notifyCategoryChanges();await h.flush();h.blur();reads[2]([{id:'blurred'}]);await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.render().categories[0].id,'new');
  } finally {h.blur();}
});

test("B06: deleteCategory safely reassigns split transaction entries, direct transactions, and presets without foreign-key constraint errors", async () => {
  setupTestDb();
  try {
    const { deleteCategory } = require("../services/delete-category.service");
    const now = Date.now();
    // Insert system default 'cat_exp_others' and custom category 'cat_custom'
    sqlite.exec(`
      INSERT INTO categories (id, name, type, icon, is_system, sort_order, created_at, updated_at)
      VALUES ('cat_exp_others', 'Other Expenses', 'expense', 'more-horizontal', 1, 99, ${now}, ${now}),
             ('cat_custom', 'Custom Coffee', 'expense', 'coffee', 0, 1, ${now}, ${now});
    `);

    // Insert direct transaction with cat_custom
    sqlite.exec(`
      INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
      VALUES ('tx_direct', 'acc_1', 'cat_custom', 'expense', -5000, 'Direct Coffee', ${now}, ${now}, ${now}),
             ('tx_split', 'acc_1', NULL, 'expense', -15000, 'Split Groceries', ${now}, ${now}, ${now});
    `);

    // Insert split entry on tx_split referencing cat_custom
    sqlite.exec(`
      INSERT INTO transaction_entries (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
      VALUES ('split_entry_1', 'tx_split', 'cat_custom', 5000, ${now}, ${now});
    `);

    // Insert a preset referencing cat_custom
    sqlite.exec(`
      INSERT INTO transaction_presets (id, transaction_name, type, account_id, category_id, amount_minor_units, currency_code, usage_count, sort_order, created_at, updated_at)
      VALUES ('preset_1', 'Morning Coffee', 'expense', 'acc_1', 'cat_custom', 5000, 'PHP', 0, 0, ${now}, ${now});
    `);

    // Insert a scheduled transaction referencing cat_custom with restrict foreign key (C-F01)
    sqlite.exec(`
      INSERT INTO transaction_schedules (id, status, transaction_type, account_id, category_id, amount_minor_units, currency_code, frequency, interval_count, starts_at, time_zone, end_mode, weekend_policy, auto_post, anchor_occurrence_number, next_occurrence_number, created_at, updated_at)
      VALUES ('sched_1', 'active', 'expense', 'acc_1', 'cat_custom', -5000, 'PHP', 'monthly', 1, ${now}, 'UTC', 'never', 'exact', 0, 1, 1, ${now}, ${now});
      INSERT INTO transaction_schedule_occurrences (id, schedule_id, sequence_number, nominal_due_at, template_snapshot, status, created_at, updated_at)
      VALUES ('occ_1', 'sched_1', 1, ${now}, '{"transactionType":"expense","accountId":"acc_1","pocketId":null,"categoryId":"cat_custom","toAccountId":null,"toPocketId":null,"amountMinorUnits":-5000,"name":"Coffee Schedule","note":null}', 'due', ${now}, ${now});
    `);

    // Delete custom category
    await deleteCategory("cat_custom", database);

    // Verify category is deleted
    const cat = sqlite.prepare("SELECT * FROM categories WHERE id = 'cat_custom'").get();
    assert.equal(cat, undefined, "Custom category should be deleted");

    // Verify direct transaction was reassigned to fallback (cat_exp_others)
    const directTx = sqlite.prepare("SELECT category_id FROM transactions WHERE id = 'tx_direct'").get();
    assert.equal(directTx.category_id, "cat_exp_others", "Direct transaction should be reassigned to cat_exp_others");

    // Verify split entry was reassigned to fallback (cat_exp_others)
    const splitEntry = sqlite.prepare("SELECT category_id FROM transaction_entries WHERE id = 'split_entry_1'").get();
    assert.equal(splitEntry.category_id, "cat_exp_others", "Split entry should be reassigned to cat_exp_others");

    // Verify preset was reassigned to fallback (cat_exp_others)
    const preset = sqlite.prepare("SELECT category_id FROM transaction_presets WHERE id = 'preset_1'").get();
    assert.equal(preset.category_id, "cat_exp_others", "Preset should be reassigned to cat_exp_others");

    // Verify scheduled transaction was reassigned to fallback (cat_exp_others) (C-F01)
    const schedule = sqlite.prepare("SELECT category_id FROM transaction_schedules WHERE id = 'sched_1'").get();
    assert.equal(schedule.category_id, "cat_exp_others", "Scheduled transaction should be reassigned to cat_exp_others");

    // Verify scheduled occurrence template snapshot was updated to fallback (cat_exp_others) (C-F01)
    const occ = sqlite.prepare("SELECT template_snapshot FROM transaction_schedule_occurrences WHERE id = 'occ_1'").get();
    const parsedSnapshot = JSON.parse(occ.template_snapshot);
    assert.equal(parsedSnapshot.categoryId, "cat_exp_others", "Scheduled occurrence snapshot should be updated to cat_exp_others");
  } finally {
    sqlite.close();
  }
});


const { loadCategoryPresets, deleteCategoryPresets } = require("../services/category-presets.service");
const { subscribeCategoryChanges } = require("../services/category-changes.service");

const PRESET_REFERENCE_CASES = [
  { id: "expense", type: "expense", from: "cat_sub_food_groceries", to: "cat_exp_others" },
  { id: "income", type: "income", from: "cat_inc_salary", to: "cat_inc_others" },
  { id: "legacy", type: "expense", from: "cat_exp_groceries", to: "cat_exp_others" },
  { id: "custom", type: "expense", from: "cat_custom", to: "cat_custom" },
  { id: "protected", type: "income", from: "cat_inc_others", to: "cat_inc_others" },
];

async function setupPresetDeletionFixture() {
  setupTestDb();
  await loadCategoryPresets(database);
  const now = 1700000000000;
  const insertCategory = sqlite.prepare(`INSERT INTO categories
    (id, name, type, parent_id, is_system, sort_order, created_at, updated_at)
    VALUES (?, ?, 'expense', ?, ?, 0, ?, ?)`);
  insertCategory.run("cat_custom", "Custom", null, 0, now, now);
  insertCategory.run("cat_custom_child", "Custom child", "cat_exp_food", 0, now, now);
  insertCategory.run("cat_exp_groceries", "Legacy groceries", null, 1, now, now);
  insertCategory.run("cat_legacy_child", "Legacy custom child", "cat_exp_groceries", 0, now, now);

  for (const item of PRESET_REFERENCE_CASES) {
    const amount = item.type === "income" ? 20000 : -10000;
    sqlite.prepare(`INSERT INTO transaction_presets
      (id, transaction_name, type, account_id, category_id, amount_minor_units, currency_code, created_at, updated_at)
      VALUES (?, ?, ?, 'acc_1', ?, ?, 'PHP', ?, ?)`)
      .run(`preset_${item.id}`, item.id, item.type, item.from, amount, now, now);
    sqlite.prepare(`INSERT INTO transaction_schedules
      (id, status, transaction_type, account_id, category_id, amount_minor_units, currency_code,
       frequency, starts_at, time_zone, created_at, updated_at)
      VALUES (?, ?, ?, 'acc_1', ?, ?, 'PHP', 'monthly', ?, 'Asia/Manila', ?, ?)`)
      .run(`schedule_${item.id}`, item.type === "income" ? "paused" : "active", item.type, item.from, amount, now, now, now);
    for (const [index, status] of ["due", "failed", "posted"].entries()) {
      sqlite.prepare(`INSERT INTO transaction_schedule_occurrences
        (id, schedule_id, sequence_number, nominal_due_at, template_snapshot, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(`occ_${item.id}_${status}`, `schedule_${item.id}`, index + 1, now + index * 86400000,
          JSON.stringify({ categoryId: item.from, amountMinorUnits: amount, name: item.id }), status, now, now);
    }
  }
}

function presetDeletionSnapshot() {
  return Object.fromEntries([
    "categories", "accounts", "transactions", "transaction_entries", "transaction_presets",
    "transaction_schedules", "transaction_schedule_occurrences",
  ].map((table) => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map((row) => ({ ...row }))]));
}

function assertReassignedRows(before, after) {
  const fallbacks = new Map(PRESET_REFERENCE_CASES.map((item) => [item.from, item.to]));
  assert.deepEqual(after, before.map((row, index) => ({
    ...row,
    category_id: fallbacks.get(row.category_id) ?? row.category_id,
    updated_at: fallbacks.get(row.category_id) !== row.category_id && fallbacks.has(row.category_id)
      ? after[index].updated_at : row.updated_at,
  })));
}

test("C-F02: bulk deletion preserves Quick Presets and schedules before the first transaction", async () => {
  await setupPresetDeletionFixture();
  let notifications = 0;
  const unsubscribe = subscribeCategoryChanges(() => {
    assert.equal(queries.at(-1), "commit", "Notify only after the transaction commits");
    notifications += 1;
  });
  try {
    assert.equal(sqlite.prepare("SELECT count(*) AS count FROM transactions").get().count, 0);
    const before = presetDeletionSnapshot();
    queries = [];
    await deleteCategoryPresets(database);
    const after = presetDeletionSnapshot();
    assertReassignedRows(before.transaction_presets, after.transaction_presets);
    assertReassignedRows(before.transaction_schedules, after.transaction_schedules);
    assert.deepEqual(after.accounts, before.accounts);
    assert.deepEqual(after.categories, before.categories
      .filter((row) => (!row.id.startsWith("cat_exp_") && !row.id.startsWith("cat_inc_") && !row.id.startsWith("cat_sub_"))
        || ["cat_exp_others", "cat_inc_others"].includes(row.id))
      .map((row) => ({ ...row, parent_id: row.parent_id ? null : row.parent_id,
        updated_at: row.parent_id ? after.categories.find((category) => category.id === row.id).updated_at : row.updated_at })));
    for (const [index, row] of before.transaction_schedule_occurrences.entries()) {
      const actual = after.transaction_schedule_occurrences[index];
      if (row.status === "posted") {
        assert.deepEqual(actual, row, "Historical occurrence snapshots remain unchanged");
      } else {
        const snapshot = JSON.parse(row.template_snapshot);
        const expectedCategory = PRESET_REFERENCE_CASES.find((item) => item.from === snapshot.categoryId).to;
        assert.deepEqual(JSON.parse(actual.template_snapshot), { ...snapshot, categoryId: expectedCategory });
        assert.deepEqual(actual, { ...row, template_snapshot: actual.template_snapshot, updated_at: actual.updated_at });
      }
    }
    assert.equal(notifications, 1);
    assert.equal(queries[0], "begin");
    assert.equal(queries.at(-1), "commit");
    assert.equal(queries.filter((query) => /^(begin|commit)$/i.test(query)).length, 2);
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
    queries = [];
    await deleteCategoryPresets(database);
    assert.deepEqual(presetDeletionSnapshot(), after, "Repeated deletion leaves the remaining data intact");
  } finally {
    unsubscribe();
    sqlite.close();
  }
});

test("C-F02: service-level deletion preserves direct and split transactions with bounded indexed writes", async () => {
  await setupPresetDeletionFixture();
  try {
    const now = 1700000000000;
    const insertTransaction = sqlite.prepare(`INSERT INTO transactions
      (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
      VALUES (?, 'acc_1', ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of PRESET_REFERENCE_CASES) {
      const amount = item.type === "income" ? 20000 : -10000;
      insertTransaction.run(`direct_${item.id}`, item.from, item.type, amount, item.id, now, now, now);
      insertTransaction.run(`split_${item.id}`, null, item.type, amount, item.id, now, now, now);
      sqlite.prepare(`INSERT INTO transaction_entries
        (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(`entry_${item.id}`, `split_${item.id}`, item.from, Math.abs(amount), now, now);
    }
    for (let index = 0; index < 1000; index += 1) {
      insertTransaction.run(`extra_${index}`, "cat_sub_food_groceries", "expense", -100, "Large fixture", now, now, now);
    }
    const before = presetDeletionSnapshot();
    queries = [];
    await deleteCategoryPresets(database);
    const after = presetDeletionSnapshot();
    assertReassignedRows(before.transactions, after.transactions);
    assertReassignedRows(before.transaction_entries, after.transaction_entries);
    assertReassignedRows(before.transaction_presets, after.transaction_presets);
    assert.deepEqual(after.accounts, before.accounts);
    assert.equal(queries[0], "begin");
    assert.equal(queries.at(-1), "commit");
    assert.ok(queries.length < 450, "SQL statement count stays bounded despite 1,000 additional transactions");
    assert.ok(!queries.some((query) => /^select\b.*\bfrom "(?:transactions|transaction_entries|transaction_presets)"/i.test(query)),
      "Reassignment never hydrates the ledger or presets into JavaScript");
    for (const table of ["transactions", "transaction_entries", "transaction_presets"]) {
      const plan = sqlite.prepare(`EXPLAIN QUERY PLAN UPDATE ${table} SET category_id = ? WHERE category_id = ?`)
        .all("cat_exp_others", "cat_sub_food_groceries").map((row) => row.detail).join("\n");
      assert.match(plan, /USING (?:COVERING )?INDEX .*category/i);
      assert.doesNotMatch(plan, /TEMP B-TREE/i);
    }
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("C-F02: a mid-deletion failure rolls back references, removed categories, and detached custom children", async () => {
  await setupPresetDeletionFixture();
  let notifications = 0;
  const unsubscribe = subscribeCategoryChanges(() => { notifications += 1; });
  try {
    sqlite.exec(`
      INSERT INTO transactions
        (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at)
      VALUES ('rollback_direct', 'acc_1', 'cat_sub_food_groceries', 'expense', -10000, 'Direct', 1, 1, 1),
             ('rollback_split', 'acc_1', NULL, 'expense', -10000, 'Split', 1, 1, 1);
      INSERT INTO transaction_entries
        (id, transaction_id, category_id, amount_minor_units, created_at, updated_at)
      VALUES ('rollback_entry', 'rollback_split', 'cat_sub_food_groceries', 10000, 1, 1);
    `);
    const before = presetDeletionSnapshot();
    sqlite.exec(`CREATE TRIGGER fail_preset_deletion BEFORE DELETE ON categories
      WHEN OLD.id = 'cat_exp_food'
      BEGIN SELECT RAISE(ABORT, 'Injected preset deletion failure'); END;`);
    queries = [];
    await assert.rejects(deleteCategoryPresets(database), /Injected preset deletion failure/);
    assert.deepEqual(presetDeletionSnapshot(), before);
    assert.equal(notifications, 0, "Failed deletion does not notify consumers");
    assert.equal(queries[0], "begin");
    assert.equal(queries.at(-1), "rollback");
    assert.ok(!queries.includes("commit"));
    sqlite.exec("DROP TRIGGER fail_preset_deletion");
    queries = [];
    await deleteCategoryPresets(database);
    assert.equal(notifications, 1, "Retry commits and notifies once");
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    unsubscribe();
    sqlite.close();
  }
});

test("C-F02: bulk deletion waits for paint and cancels pending work on blur", async () => {
  await setupPresetDeletionFixture();
  const h = mountCategories({ skipQuery: true });
  try {
    h.render();
    await h.flush();
    const before = presetDeletionSnapshot();
    queries = [];
    const cancelled = h.render().deleteCategoryPresets();
    assert.equal(h.render().saving, true);
    assert.equal(queries.length, 0, "The pending state can paint before any database work");
    assert.equal(await h.render().deleteCategoryPresets(), false, "Ignore repeated taps while pending");
    h.blur();
    assert.equal(await cancelled, false);
    await h.flush();
    assert.deepEqual(presetDeletionSnapshot(), before);
    assert.equal(queries.length, 0, "Blur cancels the scheduled write");
    h.focus();
    h.render();
    await h.flush();
    const deleted = h.render().deleteCategoryPresets();
    assert.equal(queries.length, 0);
    await h.flush();
    assert.equal(await deleted, true);
    assert.equal(h.render().saving, false);
    assert.equal(queries[0], "begin");
    assert.equal(queries.at(-1), "commit");
  } finally {
    h.blur();
    sqlite.close();
  }
});

function loadColorFormComponent(relativeFile, react, colorContext) {
  const file = path.resolve(__dirname, relativeFile);
  const exported = {};
  const theme = { colors: { primary: "#2563EB", surfaceMuted: "#EEEEEE", categorical: {
    green: "#22C55E", teal: "#14B8A6", blue: "#2563EB", indigo: "#6366F1", purple: "#8B5CF6",
    pink: "#EC4899", orange: "#F97316", amber: "#F59E0B", slate: "#64748B",
  } } };
  const native = new Proxy({
    useWindowDimensions: () => ({ width: 390, height: 800 }),
    StyleSheet: { create: (styles) => styles },
  }, { get: (target, key) => target[key] ?? String(key) });
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }, fileName: file,
  }).outputText;
  vm.runInNewContext(code, {
    exports: exported,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return {
        jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "Fragment",
      };
      if (name === "react-native") return native;
      if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ bottom: 0 }) };
      if (name === "@/hooks/use-app-theme") return { useAppTheme: () => theme, useThemeStyles: () => ({}) };
      if (name === "@/constants/layout") return { isTabletOrDesktop: () => false };
      if (name === "@/modules/hex-colors") return { useHexColors: () => colorContext(), HexColorFormModal: "HexColorFormModal" };
      if (name === "@/modules/settings") return { useExperiencePreferences: () => ({ guideHelperEnabled: false }) };
      if (name === "@/modules/walkthrough") return {
        useCategoryFormWalkthrough: () => ({}), WalkthroughTarget: "WalkthroughTarget",
        WalkthroughRegistryProvider: "WalkthroughRegistryProvider", CategoryFormWalkthroughOverlay: "WalkthroughOverlay",
      };
      if (name === "../constants/categories.constants") return require("../constants/categories.constants");
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  return exported;
}

function findFormElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (Array.isArray(tree)) {
    for (const child of tree) { const found = findFormElement(child, predicate); if (found) return found; }
    return null;
  }
  if (predicate(tree)) return tree;
  return findFormElement(tree.props?.children, predicate);
}

function mountCategoryColorForm(props) {
  const { listHexColors } = require("../../hex-colors/repositories/hex-colors.repository");
  const { createHexColor } = require("../../hex-colors/services/create-hex-color.service");
  let colors = listHexColors(database), cursor = 0;
  const slots = [], effects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index][i]))) {
        slots[index] = deps; effects.push(callback);
      }
    },
  };
  const component = loadColorFormComponent("../components/category-form-modal.tsx", react, () => ({
    colors, addColor(input) { const created = createHexColor(input); colors = listHexColors(database); return created; },
  })).CategoryFormModal;
  let tree;
  function render() {
    cursor = 0;
    const element = component({ visible: true, onClose() {}, onClearError() {}, ...props });
    tree = element.props.children.type(element.props.children.props);
    if (effects.length) { effects.splice(0).forEach((effect) => effect()); return render(); }
    return tree;
  }
  return {
    render,
    element(label) { render(); const found = findFormElement(tree, (node) => node.props?.accessibilityLabel === label);
      assert.ok(found, `Missing element: ${label}`); return found; },
    addColor(input) { this.element("Add custom color").props.onPress(); render();
      return findFormElement(tree, (node) => node.type === "HexColorFormModal").props.onSave(input); },
  };
}

for (const [type, parentId] of [["expense", null], ["income", null], ["expense", "cat_dining"], ["income", "cat_income_parent"]]) {
  test(`C-F03: quick-add ${type} ${parentId ? "subcategory" : "category"} saves its actual custom color ID`, async () => {
    setupTestDb();
    try {
      if (type === "income" && parentId) {
        sqlite.prepare(`INSERT INTO categories (id, name, type, is_system, created_at, updated_at)
          VALUES (?, 'Income parent', 'income', 0, 1, 1)`).run(parentId);
      }
      let saved;
      const h = mountCategoryColorForm({ initialType: type, initialParentId: parentId,
        onSave: async (input, id) => { saved = await saveCategory(input, id, database); return saved; } });
      h.element("Category name").props.onChangeText("Custom color test");
      h.addColor({ name: "Sunset Orange", hex: "#FF5500" });
      const color = sqlite.prepare("SELECT id FROM hex_colors WHERE hex = '#FF5500'").get();
      assert.ok(color);
      queries = [];
      h.element("Category name").props.onChangeText("Custom color test updated");
      h.render();
      assert.equal(queries.length, 0, "Typing and rendering use the cached color list");
      await h.element(parentId ? "Create Subcategory" : "Create Category").props.onPress();
      assert.equal(saved.hexColorsId, color.id);
      assert.equal(saved.color, "#FF5500");
      assert.equal(saved.parentId, parentId);
      assert.equal(saved.type, type);
      assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
    } finally { sqlite.close(); }
  });
}

test("C-F03: switching built-in and custom swatches never submits a stale color ID", async () => {
  setupTestDb();
  try {
    const submitted = [];
    const h = mountCategoryColorForm({ onSave: async (input) => { submitted.push(input); return false; } });
    h.element("Category name").props.onChangeText("Swatch test");
    h.addColor({ name: "Sunset", hex: "#FF5500" });
    h.addColor({ name: "Dusk", hex: "#8899AA" });
    const colors = sqlite.prepare("SELECT id, hex FROM hex_colors WHERE is_system = 0").all();
    queries = [];
    for (const label of ["Select color green", "Select custom color #FF5500", "Select custom color #8899AA"]) {
      h.element(label).props.onPress();
      await h.element("Create Category").props.onPress();
    }
    assert.equal(submitted[0].hexColorsId, "color_green");
    assert.equal(submitted[1].hexColorsId, colors.find((color) => color.hex === "#FF5500").id);
    assert.equal(submitted[2].hexColorsId, colors.find((color) => color.hex === "#8899AA").id);
    assert.equal(queries.length, 0, "Color selection never queries SQLite");
  } finally { sqlite.close(); }
});

test("C-F03: editing a category preserves its saved custom color and shows its swatch", async () => {
  setupTestDb();
  try {
    const { createHexColor } = require("../../hex-colors/services/create-hex-color.service");
    const color = createHexColor({ name: "Sunset", hex: "#FF5500" });
    const existing = await saveCategory({ name: "Existing custom", type: "expense", hexColorsId: color.id }, undefined, database);
    let saved;
    const h = mountCategoryColorForm({ categoryToEdit: existing,
      onSave: async (input, id) => { saved = await saveCategory(input, id, database); return saved; } });
    h.element("Select custom color #FF5500");
    h.element("Category name").props.onChangeText("Renamed custom");
    await h.element("Update Category").props.onPress();
    assert.equal(saved.id, existing.id);
    assert.equal(saved.name, "Renamed custom");
    assert.equal(saved.hexColorsId, color.id);
    assert.equal(saved.color, color.hex);
  } finally { sqlite.close(); }
});

test("C-F03: the custom color modal keeps its visibility wrapper free of Hooks", () => {
  let hookCalls = 0;
  const react = { useState(initial) { hookCalls += 1; return [initial, () => {}]; },
    useEffect() { hookCalls += 1; } };
  const component = loadColorFormComponent("../../hex-colors/components/hex-color-form-modal.tsx", react).HexColorFormModal;
  const props = { onClose() {}, onSave() { return true; } };
  for (const visible of [false, true, false, true]) {
    const element = component({ ...props, visible });
    assert.equal(hookCalls, 0, "Opening the modal never changes the wrapper's Hook count");
    if (visible) {
      assert.equal(typeof element.type, "function", "Open the Hook-owning content as a separate component");
    } else {
      assert.equal(element, null, "Closed modals do not mount content");
    }
  }
});
