const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const Module=require('node:module');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'../../../..');
let fixtureRoot, moves=0, failMove=false, available=1024*1024*1024, queries=[];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function remove(directory) {
  const target=path.resolve(directory);
  assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep));
  assert.ok(target.includes('finance-v204-'));
  fs.rmSync(target,{recursive:true,force:true});
}
class Directory {
  constructor(...parts){this.uri=path.join(...parts.map(p=>p.uri??p));}
  get exists(){return fs.existsSync(this.uri);}
  create(){fs.mkdirSync(this.uri,{recursive:true});}
  delete(){remove(this.uri);}
}
class File {
  constructor(...parts){this.uri=path.join(...parts.map(p=>p.uri??p));}
  get exists(){return fs.existsSync(this.uri);}
  get size(){return fs.statSync(this.uri).size;}
  create(){fs.writeFileSync(this.uri,new Uint8Array());}
  delete(){assert.ok(path.resolve(this.uri).startsWith(fixtureRoot+path.sep));fs.unlinkSync(this.uri);}
  async move(destination){moves++;if(failMove===true || moves===failMove)throw new Error('Interrupted install');assert.equal(destination.exists,false);fs.renameSync(this.uri,destination.uri);this.uri=destination.uri;}
  open(mode){
    const fd=fs.openSync(this.uri,mode);let offset=0;
    return {readBytes(length){assert.ok(length<=65536);const bytes=Buffer.alloc(length);const n=fs.readSync(fd,bytes,0,length,offset);offset+=n;return bytes.subarray(0,n);},
      writeBytes(bytes){assert.ok(bytes.length<=65536);fs.writeSync(fd,bytes,0,bytes.length,offset);offset+=bytes.length;},close(){fs.closeSync(fd);}};
  }
}
const Paths={get cache(){return path.join(fixtureRoot,'cache');},get availableDiskSpace(){return available;}};
function attachmentUri(kind,key){const dir=new Directory(fixtureRoot,kind);dir.create();return new File(dir,key).uri;}
const resolve=Module._resolveFilename, load=Module._load;
Module._resolveFilename=function(name,parent,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:file}).outputText,file);
function context(db){return drizzle({prepareSync(query){queries.push(query);return {
  executeSync(params){const stmt=db.prepare(query);if(/^\s*select/i.test(query)){const rows=stmt.all(...params);return {getAllSync:()=>rows,getFirstSync:()=>rows[0]};}return stmt.run(...params);},
  executeForRawResultSync(params){const rows=db.prepare(query).all(...params);return {getAllSync:()=>rows.map(Object.values)};},
};}});}
Module._load=function(name,...args){
  if(name==='expo-sqlite')return {};
  if(name==='expo-crypto')return {randomUUID:()=>crypto.randomUUID()};
  if(name==='expo-file-system')return {File,Directory,Paths,FileMode:{ReadOnly:'r',WriteOnly:'w'}};
  if(name==='@/infrastructure/database')return {withSnapshotDatabase:async(bytes,action)=>{
    const file=path.join(fixtureRoot,'snapshot-'+crypto.randomUUID()+'.db');fs.writeFileSync(file,bytes);
    const db=new DatabaseSync(file);
    try{return await action(context(db),{serializeAsync:async()=>new Uint8Array(fs.readFileSync(file))});}finally{db.close();}
  }};
  if(name==='@/modules/notes')return {
    ...require('../../notes/services/backup-attachments.service.ts'),getNoteBackupAttachmentUri:key=>attachmentUri('note',key),
  };
  if(name==='@/modules/transactions')return {
    ...require('../../transactions/services/backup-attachments.service.ts'),getTransactionBackupAttachmentUri:key=>attachmentUri('transaction',key),
  };
  // Feature file getters themselves are tested elsewhere; storage paths here
  // point at disposable, real files rather than the developer's app data.
  if(name==='./note-attachment-storage.service')return {getNoteAttachmentLocalUri:key=>attachmentUri('note',key)};
  if(name==='./transaction-attachment-storage.service')return {getTransactionAttachmentLocalUri:key=>attachmentUri('transaction',key)};
  return load.call(this,name,...args);
};
const {drizzle}=require('drizzle-orm/expo-sqlite');
const {createPortableSnapshot,prepareBackupRestore}=require('../services/backup-attachments.service.ts');
const {unpackPortableBackup}=require('../utils/portable-backup.ts');
function fixture(){
  fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'finance-v204-'));
  const file=path.join(fixtureRoot,'original.db'),db=new DatabaseSync(file);
  const notes=new Uint8Array([1,2,3]),transactions=new Uint8Array([4,5,6]);
  for(const [table,id,key,bytes] of [['note_attachments','n1','note.jpg',notes],['transaction_attachments','t1','transaction.pdf',transactions]]){
    db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY,storage_key TEXT,size_bytes INTEGER,sha256 TEXT,deleted_at INTEGER)`);
    db.prepare(`INSERT INTO ${table} VALUES (?,?,?,?,NULL)`).run(id,key,bytes.length,hash(bytes));
    fs.writeFileSync(attachmentUri(id==='n1'?'note':'transaction',key),bytes);
  }
  db.close();return {database:new Uint8Array(fs.readFileSync(file)),notes,transactions};
}
afterEach(()=>{if(fixtureRoot)remove(fixtureRoot);fixtureRoot=undefined;moves=0;failMove=false;available=1024*1024*1024;});

test('V2-04: clean-device restore verifies bytes and rewrites real SQLite attachment paths without overwriting current files',async()=>{
  const original=fixture();
  const packed=await createPortableSnapshot(original.database);
  const backup=await unpackPortableBackup(packed);
  fs.unlinkSync(attachmentUri('note','note.jpg'));fs.unlinkSync(attachmentUri('transaction','transaction.pdf'));
  const keep=attachmentUri('note','current.jpg');fs.writeFileSync(keep,'current workspace');
  const restored=await prepareBackupRestore({...backup,createdAt:new Date(),appVersion:'1.8.0'});
  const file=path.join(fixtureRoot,'restored.db');fs.writeFileSync(file,restored);const db=new DatabaseSync(file);
  try{
    for(const [table,kind,expected] of [['note_attachments','note',original.notes],['transaction_attachments','transaction',original.transactions]]){
      const row=db.prepare(`SELECT * FROM ${table}`).get();
      assert.ok(!['note.jpg','transaction.pdf'].includes(row.storage_key));
      assert.deepEqual([...fs.readFileSync(attachmentUri(kind,row.storage_key))],[...expected]);
      assert.equal(hash(fs.readFileSync(attachmentUri(kind,row.storage_key))),row.sha256);
    }
    assert.equal(fs.readFileSync(keep,'utf8'),'current workspace');
    assert.deepEqual([...original.database],[...backup.database],'The original backup remains immutable');
  }finally{db.close();}
});

test('V2-04: missing or modified local files cannot produce a successful portable backup',async()=>{
  const original=fixture();
  fs.writeFileSync(attachmentUri('note','note.jpg'),new Uint8Array([9,9,9]));
  await assert.rejects(createPortableSnapshot(original.database),/changed/);
  fs.unlinkSync(attachmentUri('note','note.jpg'));
  await assert.rejects(createPortableSnapshot(original.database),/missing/);
});

test('V2-04: low disk space, interrupted installation and mismatched manifests leave live files intact',async()=>{
  const original=fixture();const backup=await unpackPortableBackup(await createPortableSnapshot(original.database));
  const value={...backup,createdAt:new Date(),appVersion:'1.8.0'};
  available=0;await assert.rejects(prepareBackupRestore(value),/storage/);available=1024*1024*1024;
  failMove=2;await assert.rejects(prepareBackupRestore(value),/Interrupted/);failMove=false;
  assert.deepEqual(fs.readdirSync(path.join(fixtureRoot,'note')),['note.jpg'],'A failed preparation cleans newly installed UUID files');
  await assert.rejects(prepareBackupRestore({...value,attachments:[]}),/manifest/);
  assert.deepEqual([...fs.readFileSync(attachmentUri('note','note.jpg'))],[...original.notes]);
  assert.deepEqual([...fs.readFileSync(attachmentUri('transaction','transaction.pdf'))],[...original.transactions]);
});

test('V2-04: attachment inventory is paged in SQL with a primary-key order and bounded statements',async()=>{
  fixture();
  const db=new DatabaseSync(path.join(fixtureRoot,'original.db'));
  try {
    const insert=db.prepare('INSERT INTO note_attachments VALUES (?,?,?,?,NULL)');
    db.exec('BEGIN');
    for(let index=0;index<1000;index++)insert.run('x'+String(index).padStart(4,'0'),'image'+index+'.jpg',1,hash(new Uint8Array([1])));
    db.exec('COMMIT');
    queries=[];
    const {getNoteBackupAttachments}=require('../../notes/services/backup-attachments.service.ts');
    const rows=await getNoteBackupAttachments(context(db));
    assert.equal(rows.length,1001);
    assert.equal(queries.length,4,'Three bounded pages and one empty completion probe');
    assert.ok(queries.every(query=>/limit \?/i.test(query)));
    const plan=db.prepare('EXPLAIN QUERY PLAN '+queries[1]).all('n1',500);
    assert.ok(plan.some(row=>row.detail.includes('INDEX')));
    assert.ok(plan.every(row=>!row.detail.includes('TEMP B-TREE')));
  } finally {db.close();}
});

test('V2-04: listing metadata reads the bounded header rather than the attachment payload',()=>{
  fixture();
  const {readLocalBackupInfo}=require('../repositories/local-backup-files.repository.ts');
  const header=Buffer.from(JSON.stringify({formatVersion:2,createdAt:new Date().toISOString(),appVersion:'1.8.0',
    databaseBytes:2*1024*1024,databaseSha256:'0'.repeat(64),protection:{name:'none'}}));
  const prefix=Buffer.alloc(12);prefix.write('KAIZENP1');prefix.writeUInt32BE(header.length,8);
  const file=path.join(fixtureRoot,'large.kfb');fs.writeFileSync(file,Buffer.concat([prefix,header]));
  fs.truncateSync(file,12+header.length+2*1024*1024);
  const originalOpen=File.prototype.open;let bytesRead=0;
  File.prototype.open=function(mode){const handle=originalOpen.call(this,mode),read=handle.readBytes;return {...handle,readBytes(length){bytesRead+=length;return read(length);}};};
  try {
    const info=readLocalBackupInfo(file);
    assert.equal(info.attachmentCoverage,'included');
    assert.equal(bytesRead,12+header.length);
    assert.ok(bytesRead<65536);
  } finally {File.prototype.open=originalOpen;}
});
