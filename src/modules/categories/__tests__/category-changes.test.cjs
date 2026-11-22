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
  } finally {
    sqlite.close();
  }
});

