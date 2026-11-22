const { DatabaseSync, backup } = require("node:sqlite");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");

// Native bridge substitute. Uses separate real SQLite connections and real transactions.
function nativeSqlite(filename, options = {}) {
  const native = new DatabaseSync(filename);
  const handle = {
    native,
    prepareSync(query) {
      const statement = native.prepare(query);
      return {
        executeSync(params) {
          if (statement.columns().length) {
            const rows = statement.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
          }
          const result = statement.run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params) {
          statement.setReturnArrays(true);
          const rows = statement.all(...params);
          return { getAllSync: () => rows };
        },
      };
    },
    execSync(query) { native.exec(query); },
    getFirstSync(query, params = []) { return native.prepare(query).get(...params); },
    async execAsync(query) { await options.beforeExec?.(query, handle); native.exec(query); },
    async getFirstAsync(query) { return native.prepare(query).get(); },
    async runAsync(query, params) {
      await options.beforeRun?.(query, params, handle);
      const stmt = native.prepare(query);
      if (stmt.columns().length) stmt.all(...params);
      else stmt.run(...params);
    },
    async serializeAsync() {
      const copy = path.join(path.dirname(filename), crypto.randomUUID() + ".db");
      try { await backup(native, copy); return new Uint8Array(fs.readFileSync(copy)); }
      finally { fs.rmSync(copy, { force: true }); }
    },
    async closeAsync() { native.close(); },
  };
  return handle;
}
module.exports = { nativeSqlite };
