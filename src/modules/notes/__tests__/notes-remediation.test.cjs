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

let isPro = false;
const { PRO_LIMITS } = require("../../pro/constants/pro.constants");
const nativeLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "expo-crypto") return { randomUUID: require("node:crypto").randomUUID };
  if (request === "@/modules/pro") return { PRO_LIMITS, getCurrentProStatus: () => ({ isPro }) };
  return nativeLoad.call(this, request, ...args);
};
const { listNotes, countNotes } = require("../repositories/notes.repository");
const { createNote } = require("../services/create-note.service");
function seedNotes(count, deleted = 0) {
  const insert = sqlite.prepare("INSERT INTO notes (id, title, content, created_at, updated_at, deleted_at) VALUES (?, ?, '', 1000, 1000, ?)");
  for (let i = 0; i < count + deleted; i++) insert.run('note_' + i, i === 0 ? 'Unique match' : 'Other ' + i, i >= count ? 1000 : null);
}

test("P2-09: unfiltered active count survives one/no search matches and excludes Trash", () => {
  const db = setupTestDb();
  try {
    seedNotes(PRO_LIMITS.FREE_MAX_NOTES, 3);
    assert.equal(listNotes({ search: 'Unique match' }, db).length, 1);
    assert.equal(countNotes(db), PRO_LIMITS.FREE_MAX_NOTES);
    assert.equal(listNotes({ search: 'zzzzzz' }, db).length, 0);
    queries = [];
    assert.equal(countNotes(db), PRO_LIMITS.FREE_MAX_NOTES);
    assert.equal(queries.length, 1);
    assert.ok(queries[0].includes('count(*)'));
    assert.ok(!queries[0].includes('note_attachments'));
    const plan = sqlite.prepare("EXPLAIN QUERY PLAN " + queries[0]).all();
    assert.ok(plan.some(row => row.detail.includes('notes_deleted_at_idx')));
    assert.ok(plan.every(row => !row.detail.includes('TEMP B-TREE')));
  } finally { sqlite.close(); }
});

test("P2-09: free creation is capped atomically even for simultaneous saves, while Pro can exceed the limit", async () => {
  setupTestDb();
  isPro = false;
  try {
    seedNotes(PRO_LIMITS.FREE_MAX_NOTES - 1, 2);
    const saves = await Promise.allSettled([createNote({ title: 'First' }), createNote({ title: 'Second' })]);
    assert.equal(saves.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(saves.filter(result => result.status === 'rejected').length, 1);
    assert.equal(countNotes(), PRO_LIMITS.FREE_MAX_NOTES);
    await assert.rejects(createNote({ title: 'Over limit' }), /Upgrade to Pro/);
    isPro = true;
    await createNote({ title: 'Pro note' });
    assert.equal(countNotes(), PRO_LIMITS.FREE_MAX_NOTES + 1);
    isPro = false;
    sqlite.exec("UPDATE notes SET deleted_at = 2000 WHERE title IN ('First', 'Pro note')");
    await createNote({ title: 'Slot freed by deletion' });
    assert.equal(countNotes(), PRO_LIMITS.FREE_MAX_NOTES);
  } finally { sqlite.close(); isPro = false; }
});

function mountNotes(options) {
  const vm = require('node:vm');
  let cursor = 0, unmounted = false;
  const slots = [], effects = [], cleanups = [], pending = new Set(), timers = new Map();
  let timerId = 0;
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { assert.equal(unmounted, false); slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useCallback(callback, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, callback }; return slots[i].callback; },
    useEffect(callback, deps) { const i = cursor++; if (!same(slots[i], deps)) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = callback(); }); } },
  };
  function evaluate(file, resolver) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, { exports, require: resolver,
      setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id) });
    return exports;
  }
  const deferred = evaluate(path.resolve(__dirname, '../../../utils/run-deferred-sync-query.ts'), () => ({
    scheduleAfterPaint: callback => { pending.add(callback); return () => pending.delete(callback); },
  }));
  const filename = path.resolve(__dirname, '../hooks/use-notes.ts');
  const localRequire = Module.createRequire(filename);
  const { useNotes } = evaluate(filename, name => name === 'react' ? react : name === '@/utils/run-deferred-sync-query' ? deferred : localRequire(name));
  return {
    render() { cursor = 0; const value = useNotes(options); effects.splice(0).forEach(callback => callback()); return value; },
    flush() { const jobs = [...pending]; pending.clear(); jobs.forEach(callback => callback()); },
    advanceSearch() { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(callback => callback()); },
    unmount() { cleanups.forEach(callback => callback?.()); unmounted = true; },
    get pending() { return pending.size; },
  };
}

test("P2-09: hook keeps total count and FAB eligibility across debounced search with no keystroke SQL", () => {
  setupTestDb(); seedNotes(PRO_LIMITS.FREE_MAX_NOTES, 2);
  const hook = mountNotes();
  try {
    queries = []; hook.render(); assert.equal(queries.length, 0);
    hook.flush();
    let state = hook.render();
    assert.equal(state.totalNotesCount, PRO_LIMITS.FREE_MAX_NOTES);
    queries = [];
    state.setSearch('Unique match'); hook.render(); hook.advanceSearch(); hook.render();
    assert.equal(queries.length, 0, 'No SQL until the deferred load');
    hook.flush(); state = hook.render();
    assert.equal(state.notes.length, 1);
    assert.equal(state.totalNotesCount, PRO_LIMITS.FREE_MAX_NOTES);
    state.setSearch('zzzzzz'); hook.render(); hook.advanceSearch(); hook.render();
    assert.equal(hook.render().loading, true);
    hook.flush(); state = hook.render();
    assert.equal(state.notes.length, 0);
    assert.equal(state.totalNotesCount, PRO_LIMITS.FREE_MAX_NOTES);
    assert.equal(state.hasAnyNotes, true);
    assert.equal(state.loading, false);
    state.setSearch(''); hook.render(); hook.render(); hook.flush();
    assert.equal(hook.render().notes.length, PRO_LIMITS.FREE_MAX_NOTES);
    queries = []; hook.render().refresh(); hook.render().cancelRefresh(); hook.flush();
    assert.equal(queries.length, 0);
  } finally { hook.unmount(); sqlite.close(); }
});

test("P2-09: skipQuery and unmount cancel note/count reads", () => {
  setupTestDb();
  try {
    const skipped = mountNotes({ skipQuery: true }); queries = [];
    skipped.render().refresh(); skipped.flush();
    assert.equal(queries.length, 0); skipped.unmount();
    const pending = mountNotes(); pending.render(); pending.unmount(); pending.flush();
    assert.equal(queries.length, 0);
  } finally { sqlite.close(); }
});
