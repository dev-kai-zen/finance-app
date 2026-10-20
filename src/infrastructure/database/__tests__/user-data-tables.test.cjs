const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

Module._load = function (request, parent, ...rest) {
  if (request === "expo-sqlite" || request === "react-native") {
    return {};
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
  APP_RESET_USER_DATA_TABLE_NAMES,
  QUICK_SYNC_WATCHED_TABLE_NAMES,
  USER_DATA_TABLE_NAMES,
  USER_DATA_TABLE_NAME_SET,
} = require("@/infrastructure/database/user-data-tables");

test("user data tables: Quick Sync watches every user-data table", () => {
  assert.deepEqual(
    [...QUICK_SYNC_WATCHED_TABLE_NAMES].sort(),
    [...USER_DATA_TABLE_NAMES].sort(),
  );

  for (const name of USER_DATA_TABLE_NAMES) {
    assert.equal(
      USER_DATA_TABLE_NAME_SET.has(name),
      true,
      `missing from USER_DATA_TABLE_NAME_SET: ${name}`,
    );
  }
});

test("user data tables: app reset tables are included in Quick Sync watch list", () => {
  for (const name of APP_RESET_USER_DATA_TABLE_NAMES) {
    assert.equal(
      USER_DATA_TABLE_NAME_SET.has(name),
      true,
      `reset table not watched by Quick Sync: ${name}`,
    );
  }
});

test("user data tables: names are unique", () => {
  assert.equal(
    new Set(USER_DATA_TABLE_NAMES).size,
    USER_DATA_TABLE_NAMES.length,
  );
});
