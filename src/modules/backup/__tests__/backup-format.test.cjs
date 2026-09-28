const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalLoad = Module._load;

Module._load = function (request, parent, ...rest) {
  if (request === "expo-crypto") {
    return {
      AESEncryptionKey: {},
      AESSealedData: {},
      CryptoDigestAlgorithm: { SHA256: "SHA-256" },
      aesDecryptAsync: async () => {
        throw new Error("Not available in this unit test.");
      },
      aesEncryptAsync: async () => {
        throw new Error("Not available in this unit test.");
      },
      digest: async (_algorithm, bytes) => {
        const hash = crypto.createHash("sha256").update(bytes).digest();
        return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
      },
      getRandomBytesAsync: async (length) => crypto.randomBytes(length),
    };
  }
  return originalLoad.call(this, request, parent, ...rest);
};

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
  createDatabaseBackup,
  readDatabaseBackup,
} = require(path.join(root, "modules/backup/utils/backup-format.ts"));

test("unprotected backups round-trip without a password", async () => {
  const database = Uint8Array.from([1, 2, 3, 4, 5]);
  const createdAt = new Date("2026-09-28T01:02:03.000Z");
  const archive = await createDatabaseBackup(
    database,
    null,
    "1.0.0",
    createdAt,
  );
  const restored = await readDatabaseBackup(archive, null);

  assert.equal(new TextDecoder().decode(archive.slice(0, 8)), "KAIZENP1");
  assert.deepEqual(restored.database, database);
  assert.equal(restored.appVersion, "1.0.0");
  assert.equal(restored.createdAt.toISOString(), createdAt.toISOString());
});

test("unprotected backups reject modified database bytes", async () => {
  const archive = await createDatabaseBackup(
    Uint8Array.from([10, 20, 30]),
    null,
    "1.0.0",
  );
  archive[archive.length - 1] ^= 0xff;

  await assert.rejects(
    readDatabaseBackup(archive, null),
    /checksum is invalid/i,
  );
});

test("password-protected backups never restore without their password", async () => {
  const archive = new TextEncoder().encode("KAIZENB1placeholder");
  await assert.rejects(
    readDatabaseBackup(archive, null),
    /needs its password/i,
  );
});
