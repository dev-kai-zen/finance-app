const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, parent, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
}).outputText, file);
const load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'expo-crypto') return {
    CryptoDigestAlgorithm: {SHA256:'sha256'}, getRandomBytesAsync: async size => crypto.randomBytes(size),
    digest: async (_, bytes) => Uint8Array.from(crypto.createHash('sha256').update(bytes).digest()).buffer,
    AESEncryptionKey: {import: async bytes => bytes},
    AESSealedData: {fromCombined: bytes => bytes},
    aesEncryptAsync: async (bytes, key, options) => {
      const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(options.additionalData);
      const output = Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
      return {combined: async () => output};
    },
    aesDecryptAsync: async (bytes, key, options) => {
      const cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0,12));
      cipher.setAAD(options.additionalData); cipher.setAuthTag(bytes.subarray(bytes.length-16));
      return Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]);
    },
  };
  return load.call(this, name, ...args);
};
const { packPortableBackup, unpackPortableBackup, hashBackupBytes } = require('../utils/portable-backup.ts');
const { createDatabaseBackup, readDatabaseBackup, inspectDatabaseBackup } = require('../utils/backup-format.ts');

async function fixture() {
  const bytes = new TextEncoder().encode('receipt-image-secret');
  const entry = {id:'attachment-1',kind:'note',storageKey:'note.jpg',sizeBytes:bytes.length,sha256:await hashBackupBytes(bytes)};
  const payload = await packPortableBackup(new Uint8Array([1,2,3]),[entry],async (_, output) => {output.set(bytes);});
  return {bytes,entry,payload};
}

for (const password of [null, 'correct-password-123']) {
  test(`V2-04: portable database and attachments round trip ${password ? 'encrypted' : 'unprotected'}`, async () => {
    const {bytes,payload} = await fixture();
    const archive = await createDatabaseBackup(payload,password,'1.8.0');
    assert.equal(inspectDatabaseBackup(archive).attachmentCoverage,'included');
    const restored = await readDatabaseBackup(archive,password);
    assert.deepEqual([...restored.database],[1,2,3]);
    assert.deepEqual([...restored.attachments[0].bytes],[...bytes]);
    if (password) {
      assert.equal(Buffer.from(archive).includes(Buffer.from(bytes)),false,'Receipt bytes stay inside encryption');
      await assert.rejects(readDatabaseBackup(archive,'wrong-password-123'));
    }
  });
}

test('V2-04: legacy archives remain readable with explicitly incomplete attachment coverage', async () => {
  const archive = await createDatabaseBackup(new Uint8Array([1,2,3]),null,'1.7.0');
  assert.equal(inspectDatabaseBackup(archive).attachmentCoverage,'legacy-records-only');
  assert.equal((await readDatabaseBackup(archive,null)).attachments,undefined);
});

test('V2-04: validates file hashes, duplicate paths, path traversal, truncation and memory bounds', async () => {
  const {entry,payload} = await fixture();
  const tampered = payload.slice(); tampered[tampered.length-1] ^= 1;
  await assert.rejects(unpackPortableBackup(tampered),/checksum/);
  await assert.rejects(unpackPortableBackup(payload.subarray(0,-1)),/incomplete/);
  await assert.rejects(packPortableBackup(new Uint8Array([1]),[entry,entry],async()=>{}),/duplicate/);
  for (const storageKey of ['../secret','/secret','a/b.jpg','a\\b.jpg','..','x..jpg']) {
    await assert.rejects(packPortableBackup(new Uint8Array([1]),[{...entry,storageKey}],async()=>{}),/invalid/);
  }
  await assert.rejects(packPortableBackup(new Uint8Array([1]),[{...entry,sizeBytes:33*1024*1024}],async()=>{}),/32 MiB/);
  await assert.rejects(packPortableBackup(new Uint8Array([1]),[entry],async()=>{}),/changed/);
});

test('V2-04: chunked large payload work yields to the event loop', async () => {
  let ticked=false; setTimeout(()=>{ticked=true;},0);
  const bytes=new Uint8Array(1024*1024);
  await hashBackupBytes(bytes);
  assert.equal(ticked,true);
});
