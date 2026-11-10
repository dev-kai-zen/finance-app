const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
const files = new Map();
let sequence = 0, shared, available, pickerError, writeError;
class File {
  constructor(base, name) { this.uri = name ? `${base.uri ?? base}${name}` : base; }
  create() { files.set(this.uri, ""); }
  write(contents) { if (writeError) throw writeError; files.set(this.uri, contents); }
  delete() { files.delete(this.uri); }
  get exists() { return files.has(this.uri); }
}
const directory = {
  createFile(name, mimeType) {
    assert.equal(mimeType, "text/csv");
    const file = new File("content://selected-folder/", name); file.create(); return file;
  },
};
Module._load = function (request, ...args) {
  if (request === "expo-file-system") return { File, Paths: { cache: { uri: "file:///cache/" } }, Directory: { pickDirectoryAsync: async () => { if (pickerError) throw pickerError; return directory; } } };
  if (request === "expo-sharing") return { isAvailableAsync: async () => available, shareAsync: async (uri, options) => { shared = { uri, options }; assert.ok(files.has(uri)); } };
  if (request === "expo-crypto") return { randomUUID: () => `${++sequence}-unique-identifier` };
  if (request === "expo-document-picker") return {};
  if (request === "@/modules/security") return { appLockLifecycle: { withLockSuspended: async (fn) => fn() } };
  return load.call(this, request, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { shareImportTemplate, downloadImportTemplate } = require("../services/import-files.service.ts");
const { parseCsv } = require("../utils/csv.ts");
beforeEach(() => { files.clear(); sequence = 0; shared = null; available = true; pickerError = null; writeError = null; });

test("shared templates remain readable after the share promise resolves", async () => {
  await shareImportTemplate("transactions");
  const attachment = shared.uri, contents = files.get(attachment);
  assert.ok(contents.startsWith("\uFEFFDate,"));
  assert.equal(parseCsv(contents).rows.length, 3);
  assert.equal(shared.options.mimeType, "text/csv");
  await shareImportTemplate("accounts");
  assert.notEqual(shared.uri, attachment);
  assert.equal(files.get(attachment), contents, "A later share must not overwrite or remove Gmail's attachment");
});
test("downloads write the same template to the selected local folder", async () => {
  await shareImportTemplate("accounts");
  const expected = files.get(shared.uri);
  const name = await downloadImportTemplate("accounts");
  assert.match(name, /^kaizen-accounts-import-template-.+\.csv$/);
  assert.equal(files.get(`content://selected-folder/${name}`), expected);
  assert.equal(parseCsv(expected).rows.length, 2);
});
test("cancelling a download does not create a file or report a failure", async () => {
  pickerError = new Error("Directory picker was dismissed");
  assert.equal(await downloadImportTemplate("accounts"), null);
  assert.equal(files.size, 0);
});
test("download picker and storage failures are surfaced", async () => {
  pickerError = new Error("Permission denied");
  await assert.rejects(downloadImportTemplate("transactions"), /Permission denied/);
  pickerError = null; writeError = new Error("Storage full");
  await assert.rejects(downloadImportTemplate("transactions"), /Storage full/);
});
test("unavailable sharing creates no attachment", async () => {
  available = false;
  await assert.rejects(shareImportTemplate("accounts"), /sharing/);
  assert.equal(files.size, 0);
});
