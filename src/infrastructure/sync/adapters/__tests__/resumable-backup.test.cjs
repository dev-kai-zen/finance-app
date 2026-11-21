const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../../..');
const digest = bytes => createHash('md5').update(bytes).digest('hex');
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers });
const CHUNK = 256 * 1024;

function setup() {
  const calls = [], files = new Map(), sessions = new Map(), delays = [];
  let generated = 0, sessionCount = 0, before, after, bridge;
  const metadata = session => ({ ...session.metadata, size: String(session.offset), md5Checksum: digest(session.bytes),
    version: '1', createdTime: '2026-11-21T00:00:00Z', modifiedTime: '2026-11-21T00:00:00Z' });
  async function transport(url, options = {}) {
    const method = options.method || 'GET', headers = new Headers(options.headers);
    const call = { url, method, headers, body: options.body };
    calls.push(call);
    const intercepted = await before?.(call);
    if (intercepted) return intercepted;
    const parsed = new URL(url);
    let response;
    if (parsed.pathname.endsWith('/generateIds')) response = json({ ids: ['reserved-' + ++generated] });
    else if (method === 'POST' && parsed.searchParams.get('uploadType') === 'resumable') {
      const data = JSON.parse(options.body);
      if (files.has(data.id)) response = json({}, 409);
      else {
        const location = 'https://www.googleapis.com/upload/drive/v3/files?upload_id=' + ++sessionCount;
        sessions.set(location, { metadata: data, bytes: new Uint8Array(Number(headers.get('X-Upload-Content-Length'))), offset: 0 });
        response = new Response(null, { status: 200, headers: { location } });
      }
    } else if (method === 'PUT') {
      const session = sessions.get(url);
      if (!session) response = json({}, 404);
      else if (files.has(session.metadata.id)) response = json(metadata(session));
      else {
        const range = headers.get('content-range');
        if (!range.startsWith('bytes */')) {
          const [, start, end, total] = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range).map(Number);
          assert.equal(start, session.offset); assert.equal(total, session.bytes.length);
          assert.equal(options.body.byteLength, end - start + 1);
          assert.equal(Number(headers.get('content-length')), options.body.byteLength);
          assert.ok(options.body.byteLength <= CHUNK);
          assert.ok(end + 1 === total || options.body.byteLength % CHUNK === 0);
          session.bytes.set(options.body, start); session.offset = end + 1;
        }
        if (session.offset === session.bytes.length) { files.set(session.metadata.id, session); response = json(metadata(session), 201); }
        else response = new Response(null, { status: 308, headers: session.offset ? { range: 'bytes=0-' + (session.offset - 1) } : {} });
      }
    } else if (parsed.searchParams.get('q')) {
      const q = parsed.searchParams.get('q');
      response = q.includes('mimeType') ? json({ files: [{ id: 'folder', name: 'Backups' }] }) : json({ files: [...files.values()].map(metadata) });
    } else {
      const session = files.get(parsed.pathname.split('/').at(-1));
      response = !session ? json({}, 404) : parsed.searchParams.get('alt') === 'media' ? new Response(session.bytes) : json(metadata(session));
    }
    return await after?.(call, response) || response;
  }
  const loaded = new Map();
  function load(relative, imports = {}) {
    const file = path.resolve(root, relative);
    if (loaded.has(file)) return loaded.get(file);
    const exports = {}; loaded.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, Uint8Array, TextEncoder, TextDecoder, URL, URLSearchParams, AbortController, Error, Promise,
      process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "test-client" } },
      setTimeout(callback, delay) { delays.push(delay); return setTimeout(callback, delay >= 30_000 ? delay : 0); }, clearTimeout,
      require(name) {
        if (name in imports) return imports[name];
        if (name === 'expo/fetch') return { fetch: (...args) => (bridge || transport)(...args) };
        if (name === 'expo-file-system') return {};
        if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
        return require(name);
      },
    });
    return exports;
  }
  const api = load('src/infrastructure/sync/adapters/google-drive-backup.adapter.ts');
  return { api, load, calls, files, sessions, delays, transport,
    before(fn) { before = fn; }, after(fn) { after = fn; }, useTransport(fn) { bridge = fn; },
    upload: (bytes, token = 'token') => api.uploadGoogleDriveBackupFile(token, bytes, new Date('2026-11-21T00:00:00Z'), true, 'included'),
    get generated() { return generated; }, get sessionCount() { return sessionCount; },
  };
}

for (const size of [5 * 1024 * 1024 - 1, 5 * 1024 * 1024, 5 * 1024 * 1024 + 1, 12 * 1024 * 1024 + 13]) {
  test('V2-07: uploads and downloads ' + size + ' bytes exactly with bounded request bodies', async () => {
    const env = setup(), bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = i % 251;
    const uploaded = await env.upload(bytes);
    assert.equal(uploaded.size, size); assert.equal(uploaded.attachmentCoverage, 'included');
    assert.equal(uploaded.passwordProtected, true);
    const restored = await env.api.downloadGoogleDriveBackupFile('token', uploaded.id);
    assert.deepEqual(restored, bytes);
    assert.equal(env.generated, 1); assert.equal(env.files.size, 1);
    const chunks = env.calls.filter(c => c.body instanceof Uint8Array);
    assert.equal(chunks.length, Math.ceil(size / CHUNK));
    assert.ok(chunks.every(c => c.body.buffer === bytes.buffer));
    assert.ok(env.calls.every(c => c.method !== 'PATCH'));
  });
}

test('V2-07: interrupted partial chunk probes the actual accepted position before continuing', async () => {
  const env = setup(), bytes = new Uint8Array(2 * CHUNK + 17).fill(42); let interrupted = false;
  env.before(call => {
    if (call.method === 'PUT' && call.body && !interrupted) {
      interrupted = true;
      const session = env.sessions.get(call.url);
      session.bytes.set(call.body.subarray(0, 12345)); session.offset = 12345;
      throw new TypeError('connection lost after partial receipt');
    }
  });
  await env.upload(bytes);
  const calls = env.calls.filter(c => c.method === 'PUT');
  assert.equal(calls[1].headers.get('content-range'), 'bytes */' + bytes.length);
  assert.match(calls[2].headers.get('content-range'), /^bytes 12345-/);
  assert.deepEqual([...env.files.values()][0].bytes, bytes);
});

test('V2-07: lost final response recovers the same completed file without duplicating publication', async () => {
  const env = setup(), bytes = new Uint8Array(CHUNK + 3).fill(7); let lost = false;
  env.after((call, response) => { if (response.status === 201 && !lost) { lost = true; throw new Error('lost final response'); } });
  const file = await env.upload(bytes);
  assert.equal(file.id, 'reserved-1'); assert.equal(env.files.size, 1); assert.equal(env.sessionCount, 1);
  const again = await env.upload(bytes); assert.equal(again.id, file.id); assert.equal(env.generated, 1);
});

test('V2-07: 401 refresh retries the same archive/session and resumes instead of duplicating', async () => {
  const env = setup(), bytes = new Uint8Array(3 * CHUNK + 2).fill(4); let expired = false;
  env.before(call => {
    if (!expired && call.method === 'PUT' && call.body && call.headers.get('content-range').startsWith('bytes ' + CHUNK + '-')) {
      expired = true; return json({}, 401);
    }
  });
  let refreshes = 0;
  const auth = env.load('src/modules/google-drive-backup/services/google-drive-auth.service.ts', {
    'expo-constants': { default: {} },
    '@/infrastructure/sync/quick-sync-operation-coordinator': {}, '@/modules/security': {},
    'react-native-nitro-google-signin': { GoogleOneTapSignIn: {
      configure() {}, getTokens: async () => ({ accessToken: refreshes ? 'new-token' : 'old-token' }),
      async clearCachedAccessToken(token) { assert.equal(token, 'old-token'); refreshes++; },
    } },
  });
  await auth.withGoogleDriveAccessToken(token => env.upload(bytes, token));
  assert.equal(refreshes, 1);
  assert.equal(env.generated, 1); assert.equal(env.sessionCount, 1); assert.equal(env.files.size, 1);
  const refreshed = env.calls.filter(c => c.headers.get('authorization') === 'Bearer new-token' && c.method === 'PUT');
  assert.equal(refreshed[0].headers.get('content-range'), 'bytes */' + bytes.length);
  assert.deepEqual([...env.files.values()][0].bytes, bytes);
});

test('V2-07: expired session restarts with the reserved ID; completed-but-expired session recovers metadata', async () => {
  for (const completed of [false, true]) {
    const env = setup(), bytes = new Uint8Array(CHUNK + 5); let expired = false;
    env.after((call, response) => {
      if (!expired && call.method === 'PUT' && response.status === (completed ? 201 : 308)) {
        expired = true; env.sessions.delete(call.url); throw new Error('offline');
      }
    });
    await env.upload(bytes);
    assert.equal(env.generated, 1); assert.equal(env.files.size, 1);
    assert.equal(env.sessionCount, completed ? 1 : 2);
  }
});

for (const status of [429, 500, 503, 403]) {
  test('V2-07: retries transient ' + status + ' with a status probe and bounded backoff', async () => {
    const env = setup(); let failed = false;
    env.before(call => {
      if (call.method === 'PUT' && !failed) { failed = true; return json({ error: { errors: [{ reason: 'rateLimitExceeded' }] } }, status, { 'retry-after': '1' }); }
    });
    await env.upload(new Uint8Array(10));
    assert.equal(env.files.size, 1);
    assert.ok(env.calls.some(c => c.headers.get('content-range') === 'bytes */10'));
    assert.ok(env.delays.includes(250));
  });
}

for (const status of [400, 403]) {
  test('V2-07: permanent ' + status + ' stops immediately without claiming success', async () => {
    const env = setup(); env.before(call => call.method === 'PUT' ? json({ error: { errors: [{ reason: 'storageQuotaExceeded' }] } }, status) : undefined);
    await assert.rejects(env.upload(new Uint8Array(10)), error => error.status === status);
    assert.equal(env.files.size, 0); assert.equal(env.calls.filter(c => c.method === 'PUT').length, 1);
  });
}

test('V2-07: retry exhaustion, stalled ranges, invalid ranges, and checksum mismatch fail closed', async () => {
  for (const failure of ['offline', 'stalled', 'range', 'checksum']) {
    const env = setup();
    env.before(call => {
      if (call.method !== 'PUT') return;
      if (failure === 'offline') throw new Error('offline');
      if (failure === 'stalled') return new Response(null, { status: 308 });
      if (failure === 'range') return new Response(null, { status: 308, headers: { range: 'bytes=0-99999999' } });
    });
    if (failure === 'checksum') env.after(async (call, response) => response.status === 201 ? json({ ...(await response.json()), md5Checksum: 'bad' }) : undefined);
    await assert.rejects(env.upload(new Uint8Array(10)));
    assert.ok(env.calls.filter(c => c.method === 'PUT').length <= 7);
  }
});

test('V2-07: superseded Quick Sync stops issuing chunks and preserves immutable parent metadata', async () => {
  const env = setup(); let current = true;
  env.after((call, response) => { if (call.method === 'PUT') current = false; });
  await assert.rejects(env.api.uploadOrUpdateGoogleDriveQuickSyncBackup('token', new Uint8Array(2 * CHUNK), 'old-file', {
    deviceId: 'device', syncRevisionId: 'revision', parentTokens: ['old-file'], attachmentCoverage: 'included',
    assertCurrent() { if (!current) throw new Error('superseded'); },
  }), /superseded/);
  assert.equal(env.calls.filter(c => c.method === 'PUT').length, 1);
  const metadata = [...env.sessions.values()][0].metadata;
  assert.equal(metadata.appProperties.syncParent0, 'old-file');
  assert.equal(metadata.appProperties.quickSyncProtocol, '2');
  assert.equal(metadata.appProperties.isQuickSync, undefined);
  assert.equal(env.files.size, 0); assert.ok(env.calls.every(c => c.method !== 'PATCH'));
});

test('V2-07: concurrent attempts on the same archive cannot create duplicate sessions', async () => {
  const env = setup(), bytes = new Uint8Array(CHUNK); let release;
  const gate = new Promise(resolve => { release = resolve; });
  env.before(async call => { if (call.url.includes('generateIds')) await gate; });
  const first = env.upload(bytes);
  await assert.rejects(env.upload(bytes), /already in progress/);
  release(); await first; assert.equal(env.files.size, 1); assert.equal(env.generated, 1);
});

test('V2-07: lost initiation response and conflicting create retry reuse the reserved file ID', async () => {
  const env = setup(); let lost = false;
  env.after((call, response) => {
    if (call.method === 'POST' && !lost) { lost = true; throw new Error('lost session response'); }
  });
  const bytes = new Uint8Array(10).fill(9);
  await env.upload(bytes);
  assert.equal(env.generated, 1); assert.equal(env.files.size, 1);
  assert.ok(env.calls.filter(c => c.method === 'POST').every(c => JSON.parse(c.body).id === 'reserved-1'));
  // Force a retry to start a session against an already completed generated ID.
  env.before(call => call.method === 'PUT' ? json({}, 404) : undefined);
  assert.equal((await env.upload(bytes)).id, 'reserved-1');
  assert.equal(env.files.size, 1);
  const conflict = setup();
  conflict.before(call => {
    if (call.method !== 'POST') return;
    const metadata = JSON.parse(call.body);
    conflict.files.set(metadata.id, { metadata, bytes, offset: bytes.length });
    return json({}, 409);
  });
  assert.equal((await conflict.upload(bytes)).id, 'reserved-1');
  assert.equal(conflict.files.size, 1);
  assert.equal(conflict.calls.filter(c => c.method === 'PUT').length, 0);
});

test('V2-07: unsafe session URLs and excessive Retry-After fail without forwarding credentials or looping', async () => {
  for (const mode of ['url', 'retry-after']) {
    const env = setup();
    env.before(call => {
      if (mode === 'url' && call.method === 'POST') return new Response(null, { status: 200, headers: { location: 'https://evil.example/upload' } });
      if (mode === 'retry-after' && call.method === 'PUT') return json({}, 429, { 'retry-after': '3600' });
    });
    await assert.rejects(env.upload(new Uint8Array(10)), mode === 'url' ? /valid.*session/ : /later/);
    assert.ok(env.calls.every(c => new URL(c.url).hostname === 'www.googleapis.com'));
    assert.ok(env.calls.filter(c => c.method === 'PUT').length <= 1);
  }
});

test('V2-07: binary chunks and restored archive survive real HTTP transport above 5 MiB', async t => {
  const http = require('node:http'), env = setup();
  const server = http.createServer(async (request, response) => {
    try {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      const result = await env.transport('https://www.googleapis.com' + request.url, {
        method: request.method, headers: request.headers,
        ...(data.length ? { body: request.method === 'POST' ? data.toString('utf8') : new Uint8Array(data) } : {}),
      });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch { response.destroy(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  env.useTransport((url, options) => fetch('http://127.0.0.1:' + server.address().port + new URL(url).pathname + new URL(url).search, options));
  const format = env.load('src/modules/local-backup/utils/backup-format.ts', { 'expo-crypto': {} });
  const database = new Uint8Array(6 * 1024 * 1024 + 11).fill(137);
  const archive = await format.createDatabaseBackup(database, null, '1.8.0', new Date('2026-11-21T00:00:00Z'));
  const file = await env.api.uploadGoogleDriveBackupFile("token", archive, new Date("2026-11-21T00:00:00Z"), false, "legacy-records-only");
  const downloaded = await env.api.downloadGoogleDriveBackupFile('token', file.id);
  assert.deepEqual(downloaded, archive);
  assert.deepEqual((await format.readDatabaseBackup(downloaded, null)).database, database);
});
