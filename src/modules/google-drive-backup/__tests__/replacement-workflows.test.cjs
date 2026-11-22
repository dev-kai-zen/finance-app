const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../..');

function load(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Promise, Set, Error, Date, setTimeout, clearTimeout,
    require(name) { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const events = [];
  let replacing = false;
  const coordinator = load('src/infrastructure/sync/quick-sync-operation-coordinator.ts', {
    './quick-sync-debounce': { cancelDebouncedQuickSync() {} },
    './quick-sync-state': { getQuickSyncState: () => ({status:'idle'}), setQuickSyncRuntimeStatus() {} },
  });
  const sync = { ...coordinator, cancelDebouncedQuickSync() {}, clearQuickSyncRemoteConflict() {},
    getQuickSyncConfig: () => ({ enabled: true, syncAttachments: true, network: 'any', lastSyncedAt: null, fileId: 'file' }),
    saveQuickSyncConfig() { events.push('config'); },
    clearQuickSyncRemoteBaselineOnManualRestore() { events.push('baseline'); },
    clearQuickSyncRemoteTracking() {}, setQuickSyncRuntimeStatus() {} };
  const database = { setDatabaseReplacing(value) { replacing = value; },
    async replaceDatabaseFromSnapshot() { events.push('replace'); },
    announceDatabaseReplacement() {},
    async withDatabaseSnapshotLock(fn) { events.push('snapshot-lock'); return fn(); },
    sqliteDatabase: { getFirstSync: () => ({ foreign_keys: 0 }) },
    db: { transaction(fn) { return fn({}); } } };
  const backups = { prepareBackupRestore: async backup => backup.database, legacyAttachmentNotice: () => "", readDatabaseBackup: async () => ({ database: new Uint8Array([1]), createdAt: new Date() }),
    createLocalBackup: async () => { events.push('safety'); }, clearLocalBackupStorage() {} };
  const imports = {
    '@/infrastructure/database': database, '@/infrastructure/sync': sync,
    '@/modules/onboarding': { finalizeRestoredWorkspace() {} },
    '@/modules/local-backup/repositories/local-backup-files.repository': { readLocalBackupFile: async () => new Uint8Array([1]) },
    '@/modules/local-backup/utils/backup-format': backups,
    './create-local-backup.service': backups,
    './backup-attachments.service': backups,
    '@/modules/local-backup': backups,
    './google-drive-auth.service': { withGoogleDriveAccessToken: async fn => fn('token') },
    'expo-sqlite': {}, 'drizzle-orm/expo-sqlite': {},
    '../../../../drizzle/migrations': {}, '@/infrastructure/database/schema': {},
    '../repositories/reset-data.repository': { deleteAllUserData() { events.push('delete'); } },
    './experience-preferences.service': { invalidateExperiencePreferencesCache() {} },
    '@/modules/google-drive-backup': { resetGoogleDriveConnectionForAppReset: async () => { events.push('disconnect'); } },
    '@/modules/notes': { clearNoteAttachmentStorage() {} },
    '@/modules/transactions': { clearTransactionAttachmentStorage() {} },
  };
  return { imports, sync, coordinator, events, get replacing() { return replacing; } };
}

for (const kind of ['local', 'drive', 'reset']) {
  test(`V2-03: actual ${kind} entry point drains work before replacement or snapshot locking`, async () => {
    const env = setup();
    const gate = deferred();
    env.coordinator.trackQuickSyncOperation(gate.promise);
    env.sync.downloadGoogleDriveBackupFile = async () => new Uint8Array([1]);
    let action;
    if (kind === 'local') action = load('src/modules/local-backup/services/restore-local-backup.service.ts', env.imports).restoreLocalBackup('backup', null);
    if (kind === 'drive') action = load('src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts', env.imports).restoreGoogleDriveBackup('file', null);
    if (kind === 'reset') action = load('src/modules/settings/services/reset-app-data.service.ts', env.imports).resetAppData();
    assert.equal(env.coordinator.isQuickSyncReplacementPending(), true);
    await Promise.resolve();
    assert.deepEqual(env.events, [], 'Do not acquire the snapshot lock or mutate until old operations drain');
    gate.reject(new Error('Old upload failed'));
    await action;
    assert.equal(env.coordinator.isQuickSyncReplacementPending(), false);
    assert.equal(env.replacing, false);
    if (kind === 'reset') assert.deepEqual(env.events, ['snapshot-lock', 'disconnect', 'delete']);
    else {
      assert.ok(env.events.indexOf('replace') < env.events.indexOf('baseline'));
      if (kind === 'local') assert.ok(env.events.indexOf('safety') < env.events.indexOf('replace'));
    }
  });
}

test('V2-03: overlapping replacements serialize and release the gate after failure', async () => {
  const { coordinator, events } = setup();
  const started = deferred(), gate = deferred();
  const first = coordinator.withQuickSyncReplacement(async () => {
    events.push('first'); started.resolve(); await gate.promise; throw new Error('Restore failed');
  });
  const rejected = assert.rejects(first, /Restore failed/);
  await started.promise;
  const second = coordinator.withQuickSyncReplacement(async () => { events.push('second'); });
  await Promise.resolve();
  assert.deepEqual(events, ['first']);
  gate.resolve(); await rejected; await second;
  assert.deepEqual(events, ['first', 'second']);
  assert.equal(coordinator.isQuickSyncReplacementPending(), false);
  const token = coordinator.getQuickSyncOperationGeneration();
  assert.equal(coordinator.isQuickSyncOperationCurrent(token), true);
});

test('V2-03: a failed safety backup leaves the workspace untouched and releases coordination', async () => {
  const env = setup();
  env.imports['./create-local-backup.service'].createLocalBackup = async () => { throw new Error('No storage'); };
  const service = load('src/modules/local-backup/services/restore-local-backup.service.ts', env.imports);
  await assert.rejects(service.restoreLocalBackup('backup', null), /No storage/);
  assert.deepEqual(env.events, []);
  assert.equal(env.coordinator.isQuickSyncReplacementPending(), false);
  assert.equal(env.replacing, false);
});

test('V2-03: invalidating a download prevents stale data from reaching the database', async () => {
  const env = setup(), started = deferred(), download = deferred();
  env.sync.downloadGoogleDriveBackupFile = async () => { started.resolve(); return download.promise; };
  const service = load('src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts', env.imports);
  const restore = service.restoreGoogleDriveBackup('file', null);
  const rejected = assert.rejects(restore, /superseded/);
  await started.promise;
  env.coordinator.invalidateQuickSyncOperations();
  download.resolve(new Uint8Array([1]));
  await rejected;
  assert.deepEqual(env.events, []);
  assert.equal(env.coordinator.isQuickSyncReplacementPending(), false);
});

test('V2-03: invalidation during replacement quarantines restored connection settings and remounts', async () => {
  const env = setup(), started = deferred(), replace = deferred();
  const configs = [], statuses = [];
  let announced = 0;
  env.imports['@/infrastructure/database'].replaceDatabaseFromSnapshot = async () => { started.resolve(); await replace.promise; };
  env.imports['@/infrastructure/database'].announceDatabaseReplacement = () => { announced++; };
  env.sync.saveQuickSyncConfig = value => { configs.push(value); };
  env.sync.setQuickSyncRuntimeStatus = value => { statuses.push(value); };
  const service = load('src/modules/local-backup/services/restore-local-backup.service.ts', env.imports);
  const restore = service.restoreLocalBackup('file', null);
  const rejected = assert.rejects(restore, /superseded/);
  await started.promise;
  env.coordinator.invalidateQuickSyncOperations();
  replace.resolve(); await rejected;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(configs.at(-1).enabled, false);
  assert.equal(statuses.at(-1), 'disabled');
  assert.equal(announced, 1);
  assert.equal(env.replacing, false);
  assert.equal(env.coordinator.isQuickSyncReplacementPending(), false);
});

for (const operation of ['upload','delete']) {
  test(`V2-04: attachment ${operation} drains before restore and cannot publish stale file or row changes`, async () => {
    const env=setup(), started=deferred(), network=deferred();
    const changes=[]; let queries=0;
    Object.assign(env.sync, {
      listDueSyncOperations(){queries++;return [{id:'op',entityId:'attachment',operation,payload:{driveFileId:'remote',storageKey:'old.jpg'}}];},
      uploadGoogleDriveAttachmentFile:async()=>{started.resolve();await network.promise;return {id:'remote'};},
      deleteGoogleDriveAttachmentFile:async()=>{started.resolve();await network.promise;},
      completeSyncOperation(){changes.push('completed');}, failSyncOperation(){changes.push('failed');},
    });
    const service=load('src/modules/transactions/services/transaction-attachments.service.ts',{
      '@/infrastructure/database/client':{}, '@/infrastructure/sync':env.sync,
      '@/modules/google-drive-backup':{withGoogleDriveAccessToken:async fn=>fn('token')},
      'expo-file-system':{},
      '../repositories/transaction-attachments.repository':{
        findTransactionAttachmentById:()=>({id:'attachment',storageKey:'old.jpg',driveFileId:operation==='upload'?null:'remote'}),
        updateTransactionAttachmentSync(_id,patch){changes.push(patch.syncStatus);},
        deleteTransactionAttachmentRecord(){changes.push('deleted row');},
      },
      '../repositories/transactions.repository':{},
      './transaction-attachment-storage.service':{
        getTransactionAttachmentLocalUri:()=>'/old.jpg',
        deleteTransactionAttachmentLocalFile(){changes.push('deleted file');},
      },
    });
    const pending=service.syncPendingTransactionAttachments();await started.promise;
    let replaced=false;
    const replacement=env.coordinator.withQuickSyncReplacement(async()=>{replaced=true;});
    await service.syncPendingTransactionAttachments();
    assert.equal(queries,1,'Pending replacement must not query the attachment outbox');
    assert.equal(replaced,false);
    network.resolve();await pending;await replacement;
    assert.equal(replaced,true);
    assert.deepEqual(changes,operation==='upload'?['syncing']:[]);
  });
}

for (const kind of ['local','drive']) {
  test(`V2-04: ${kind} restore publishes the prepared snapshot only after file installation`,async()=>{
    const env=setup();const installed=[];
    const backups=env.imports['@/modules/local-backup'];
    backups.prepareBackupRestore=async()=>{installed.push('files');return new Uint8Array([9]);};
    env.imports['@/infrastructure/database'].replaceDatabaseFromSnapshot=async snapshot=>{
      assert.deepEqual(installed,['files']);assert.deepEqual([...snapshot],[9]);installed.push('database');
    };
    env.sync.downloadGoogleDriveBackupFile=async()=>new Uint8Array([1]);
    if(kind==='local')await load('src/modules/local-backup/services/restore-local-backup.service.ts',env.imports).restoreLocalBackup('file',null);
    else await load('src/modules/google-drive-backup/services/restore-google-drive-backup.service.ts',env.imports).restoreGoogleDriveBackup('file',null);
    assert.deepEqual(installed,['files','database']);
  });
}
