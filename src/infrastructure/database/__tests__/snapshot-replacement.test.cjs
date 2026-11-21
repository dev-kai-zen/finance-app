const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync, backup } = require('node:sqlite');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../snapshot.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const tables = ['account_types','accounts','categories','credit_card_details','hex_colors','pockets','settings','transactions','fund_groups','fund_group_accounts','fund_group_pockets','transaction_presets','transaction_schedules','transaction_schedule_occurrences','transaction_schedule_postings','transaction_attachments','sync_operations'];

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-v206-'));
  const handles = [], events = [], faults = new Map();
  let phase = 'preflight', deserializations = 0;
  const step = name => { events.push(name); if (faults.has(name)) throw faults.get(name); };
  function wrap(filename, label) {
    const native = new DatabaseSync(filename);
    const handle = { native, filename, label,
      async serializeAsync() {
        step(label + '.serialize');
        return faults.has('recovery.invalidBytes') ? new Uint8Array([1]) : new Uint8Array(fs.readFileSync(filename));
      },
      async getFirstAsync(sql) { step(label + '.integrity'); return native.prepare(sql).get(); },
      async getAllAsync(sql) { step(label + '.tables'); return native.prepare(sql).all(); },
      async execAsync(sql) {
        const operation = sql.includes('wal_checkpoint') ? 'checkpoint' : sql.includes('journal_mode') ? 'wal' : 'foreignKeys';
        step(label + '.' + phase + '.' + operation);
        native.exec(sql);
      },
      async closeAsync() { events.push(label + '.close'); native.close(); handle.closed = true; if (faults.has(label + '.close')) throw faults.get(label + '.close'); },
    };
    handles.push(handle); return handle;
  }
  function fixture(name, amount) {
    const filename = path.join(directory, name + '.db');
    const native = new DatabaseSync(filename);
    for (const table of tables) native.exec('CREATE TABLE ' + table + '(id TEXT PRIMARY KEY, amount INTEGER)');
    native.prepare('INSERT INTO transactions VALUES (?,?)').run(name, amount);
    native.close(); return filename;
  }
  const live = wrap(fixture('original', 1000), 'live');
  const snapshot = new Uint8Array(fs.readFileSync(fixture('incoming', 2000)));
  const imports = {
    'expo-sqlite': {
      async deserializeDatabaseAsync(bytes) {
        const label = ++deserializations % 2 ? 'candidate' : 'recovery';
        step(label + '.deserialize');
        const filename = path.join(directory, 'temporary-' + deserializations + '.db');
        fs.writeFileSync(filename, bytes); return wrap(filename, label);
      },
      async backupDatabaseAsync({ sourceDatabase, destDatabase }) {
        phase = sourceDatabase.label === 'candidate' ? 'published' : 'rollback';
        step('copy.' + phase);
        await backup(sourceDatabase.native, destDatabase.filename);
        step('copy.' + phase + '.after');
      },
    },
    'drizzle-orm/expo-sqlite': {}, './schema': {}, '../../../drizzle/migrations': {},
    './client': { db: {}, sqliteDatabase: live },
    './migrator': { async runSafeMigrations(_db, _migrations, options) { assert.equal(options.forceFullCheck, true); step('migrate'); if (faults.has('migrate.wait')) await faults.get('migrate.wait'); } },
  };
  const exports = {};
  class SnapshotBytes extends Uint8Array {
    constructor(...args) { if (args[0] instanceof Uint8Array) step('normalize.allocate'); super(...args); }
  }
  vm.runInNewContext(code, { exports, Uint8Array: SnapshotBytes, TextDecoder, Error, Promise,
    // Avoid real backoff delays while testing all exhausted checkpoint retries.
    setTimeout: callback => setTimeout(callback, 0),
    require(name) { assert.ok(name in imports, name); return imports[name]; },
  });
  t.after(() => {
    for (const handle of handles) if (!handle.closed) { try { handle.native.close(); } catch {} }
    const absolute = path.resolve(directory);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith('finance-v206-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  return { api: exports, live, snapshot, faults, events, handles,
    balance: () => live.native.prepare('SELECT sum(amount) AS amount FROM transactions').get().amount,
    async retry() { faults.clear(); deserializations = 0; phase = 'preflight'; await exports.replaceDatabaseFromSnapshot(snapshot); },
  };
}

for (const point of ['normalize.allocate','candidate.deserialize','candidate.integrity','candidate.tables',
  'live.preflight.checkpoint','live.serialize','recovery.invalidBytes','recovery.deserialize','recovery.integrity','recovery.tables',
  'copy.published','copy.published.after','migrate','live.integrity','live.tables','live.published.wal','live.published.foreignKeys','live.published.checkpoint']) {
  test('V2-06: releases state, preserves the original ledger, and admits later work after ' + point, async t => {
    const env = setup(t), primary = new Error(point);
    env.faults.set(point, primary);
    const error = await env.api.replaceDatabaseFromSnapshot(env.snapshot).then(() => assert.fail('Expected failure'), error => error);
    if (point !== 'recovery.invalidBytes') assert.equal(error, primary);
    else assert.match(error.message, /valid SQLite/);
    assert.equal(env.api.isDatabaseReplacing(), false);
    assert.equal(env.balance(), 1000);
    assert.ok(env.handles.filter(h => h.label !== 'live').every(h => h.closed));
    if (!env.events.includes('copy.published')) assert.equal(env.events.includes('copy.rollback'), false);
    // Exercise the same flag guard used by the sync change listener after failure.
    let acceptedMutations = 0;
    if (!env.api.isDatabaseReplacing()) { env.live.native.exec("INSERT INTO transactions VALUES ('later', 50)"); acceptedMutations++; }
    assert.equal(acceptedMutations, 1); assert.equal(env.balance(), 1050);
    env.faults.clear(); await env.api.createDatabaseSnapshot(); // snapshot lock was released too
    await env.retry(); assert.equal(env.balance(), 2000);
    assert.equal(env.api.isDatabaseReplacing(), false);
  });
}

test('V2-06: malformed image and nested restore scopes release exactly their own depth', async t => {
  const env = setup(t);
  env.api.setDatabaseReplacing(true); env.api.setDatabaseReplacing(true);
  await assert.rejects(env.api.replaceDatabaseFromSnapshot(new Uint8Array([1])), /valid SQLite/);
  assert.equal(env.api.isDatabaseReplacing(), true);
  env.api.setDatabaseReplacing(false); assert.equal(env.api.isDatabaseReplacing(), true);
  env.api.setDatabaseReplacing(false); assert.equal(env.api.isDatabaseReplacing(), false);
  await env.retry(); assert.equal(env.balance(), 2000);
});

test('V2-06: a valid SQLite image missing required tables never overwrites live data', async t => {
  const env = setup(t);
  const filename = path.join(path.dirname(env.live.filename), 'incomplete.db');
  const native = new DatabaseSync(filename); native.exec('CREATE TABLE unrelated(id)'); native.close();
  await assert.rejects(env.api.replaceDatabaseFromSnapshot(new Uint8Array(fs.readFileSync(filename))), /Missing:/);
  assert.equal(env.balance(),1000); assert.equal(env.api.isDatabaseReplacing(),false);
  assert.equal(env.events.includes('copy.published'),false);
});

test('V2-06: cleanup attempts both handles and cannot mask the primary migration error', async t => {
  const env=setup(t), primary=new Error('migration');
  env.faults.set('migrate',primary);
  env.faults.set('candidate.close',new Error('candidate close'));
  env.faults.set('recovery.close',new Error('recovery close'));
  await assert.rejects(env.api.replaceDatabaseFromSnapshot(env.snapshot), error=>error===primary);
  assert.equal(env.balance(),1000); assert.equal(env.api.isDatabaseReplacing(),false);
  assert.deepEqual(env.events.filter(e=>e.endsWith('.close')),['candidate.close','recovery.close']);
  await env.retry();
});

for (const point of ['candidate.close','recovery.close']) {
  test('V2-06: successful publication with '+point+' failure still releases state and closes both handles',async t=>{
    const env=setup(t), primary=new Error(point);env.faults.set(point,primary);
    await assert.rejects(env.api.replaceDatabaseFromSnapshot(env.snapshot),error=>error===primary);
    assert.equal(env.balance(),2000); assert.equal(env.api.isDatabaseReplacing(),false);
    assert.deepEqual(env.events.filter(e=>e.endsWith('.close')),['candidate.close','recovery.close']);
    await env.retry();
  });
}

test('V2-06: rollback failure reports the primary and recovery errors while cleanup still runs',async t=>{
  const env=setup(t), primary=new Error('migration'), recovery=new Error('rollback');
  env.faults.set('migrate',primary);env.faults.set('copy.rollback',recovery);
  env.faults.set('candidate.close',new Error('cleanup'));
  await assert.rejects(env.api.replaceDatabaseFromSnapshot(env.snapshot),error=>{
    assert.equal(error.cause,primary);assert.deepEqual(Array.from(error.errors),[primary,recovery]);
    assert.match(error.message,/safety backup/);return true;
  });
  assert.equal(env.api.isDatabaseReplacing(),false);
  assert.deepEqual(env.events.filter(e=>e.endsWith('.close')),['candidate.close','recovery.close']);
  await env.retry();
});

test('V2-06: replacement state remains active through asynchronous cleanup and respects an outer scope',async t=>{
  const env=setup(t); let release;
  env.faults.set('migrate.wait',new Promise(resolve=>{release=resolve;}));
  const initialBackup=env.api.createDatabaseSnapshot();await initialBackup;
  env.api.setDatabaseReplacing(true);
  const action=env.api.replaceDatabaseFromSnapshot(env.snapshot);
  while(!env.events.includes('migrate')) await new Promise(resolve=>setTimeout(resolve,1));
  const candidate=env.handles.find(h=>h.label==='candidate'),originalClose=candidate.closeAsync;
  candidate.closeAsync=async()=>{assert.equal(env.api.isDatabaseReplacing(),true);await originalClose();};
  release();await action;
  assert.equal(env.api.isDatabaseReplacing(),true);
  env.api.setDatabaseReplacing(false);assert.equal(env.api.isDatabaseReplacing(),false);
  assert.equal(env.balance(),2000);
});


test('V2-06: the flag and snapshot lock stay held until asynchronous close completes',async t=>{
  const env=setup(t);let releaseMigration,releaseClose,closeStarted;
  env.faults.set('migrate.wait',new Promise(resolve=>{releaseMigration=resolve;}));
  const closing=new Promise(resolve=>{closeStarted=resolve;});
  const closeGate=new Promise(resolve=>{releaseClose=resolve;});
  const action=env.api.replaceDatabaseFromSnapshot(env.snapshot);
  while(!env.events.includes('migrate')) await new Promise(resolve=>setTimeout(resolve,1));
  const candidate=env.handles.find(h=>h.label==='candidate'),originalClose=candidate.closeAsync;
  candidate.closeAsync=async()=>{closeStarted();await closeGate;await originalClose();};
  releaseMigration();await closing;
  assert.equal(env.api.isDatabaseReplacing(),true);
  let snapshotCompleted=false;
  const queued=env.api.createDatabaseSnapshot().then(()=>{snapshotCompleted=true;});
  await Promise.resolve();assert.equal(snapshotCompleted,false);
  releaseClose();await action;await queued;
  assert.equal(env.api.isDatabaseReplacing(),false);
});

test('V2-06: verification is bounded to three async integrity/schema pairs and precedes overwrite',async t=>{
  const env=setup(t);await env.api.replaceDatabaseFromSnapshot(env.snapshot);
  assert.equal(env.events.filter(e=>e.endsWith('.integrity')).length,3);
  assert.equal(env.events.filter(e=>e.endsWith('.tables')).length,3);
  assert.ok(env.events.indexOf('recovery.tables')<env.events.indexOf('copy.published'));
  assert.equal(env.events.filter(e=>e==='live.serialize').length,1);
  assert.equal(env.balance(),2000);assert.equal(env.api.isDatabaseReplacing(),false);
});
