const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, property) => {
      if (property === Symbol.toPrimitive) return () => "";
      if (property === "create") return (value) => value || {};
      return createMock();
    },
  });
};

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

globalThis.__DEV__ = false;

let mockNetInfoState = { isConnected: true, type: "wifi" };
let mockUploadHandler = null;
let mockGetRemoteMetadataHandler = null;
let mockCreateArchiveHandler = null;
let mockRestoreHandler = null;
let mockGoogleUser = { email: "user@gmail.com" };

Module._load = function (request, parent, ...rest) {
  if (request === "expo-device") {
    return {
      brand: "google",
      modelName: "Pixel 8",
      osName: "Android",
    };
  }
  if (request === "expo-crypto") {
    let counter = 0;
    return {
      randomUUID: () => {
        counter += 1;
        return counter === 1 ? "uuid-device-local-1" : `uuid-device-local-${counter}`;
      },
    };
  }
  if (request === "@react-native-community/netinfo") {
    const netInfo = {
      fetch: async () => mockNetInfoState,
      addEventListener: () => () => {},
    };
    return { __esModule: true, default: netInfo, ...netInfo };
  }
  if (
    /^(expo|@expo|react|react-native|@react-native)/.test(request) ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  if (request === "@/modules/local-backup") {
    return {
      createBackupArchive: async (...args) => {
        if (mockCreateArchiveHandler) {
          return mockCreateArchiveHandler(...args);
        }
        return { bytes: new Uint8Array([1, 2, 3]) };
      },
    };
  }
  if (
    request === "./google-drive-auth.service" &&
    parent?.filename?.includes("google-drive-backup")
  ) {
    return {
      restoreGoogleDriveSession: async () => mockGoogleUser,
      withGoogleDriveAccessToken: async (fn) => fn("test-access-token"),
      disconnectGoogleDrive: async () => {},
      getGoogleDriveConfigurationError: () => null,
    };
  }
  if (
    request === "./restore-google-drive-backup.service" &&
    parent?.filename?.includes("google-drive-backup")
  ) {
    return {
      restoreQuickSyncBackup: async (...args) => {
        if (mockRestoreHandler) {
          return mockRestoreHandler(...args);
        }
      },
    };
  }
  if (request.endsWith("drizzle/migrations")) {
    return { __esModule: true, default: { journal: { entries: [] }, migrations: {} } };
  }
  if (request === "@/infrastructure/database/client") {
    return {
      get db() {
        return database;
      },
      openDatabase: () => database,
      closeDatabase: () => {},
    };
  }
  const loaded = originalLoad.call(this, request, parent, ...rest);
  if (
    request === "./adapters/google-drive-backup.adapter" &&
    parent?.filename?.includes("sync")
  ) {
    return {
      ...loaded,
      getGoogleDriveQuickSyncFileMetadata: async (...args) => {
        if (mockGetRemoteMetadataHandler) {
          return mockGetRemoteMetadataHandler(...args);
        }
        return null;
      },
      uploadOrUpdateGoogleDriveQuickSyncBackup: async (...args) => {
        if (mockUploadHandler) {
          return mockUploadHandler(...args);
        }
        return {
          id: "file-1",
          modifiedTime: "2026-11-20T06:00:00.000Z",
          version: 1,
          headRevisionId: "head-1",
          syncRevisionId: args[3]?.syncRevisionId ?? "rev-1",
        };
      },
    };
  }
  return loaded;
};

require.extensions[".ts"] = require.extensions[".tsx"] = (module, filename) => {
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

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const {
  getQuickSyncConfig,
  resetQuickSyncLocalMetadata,
  saveQuickSyncConfig,
  subscribeToQuickSyncSettings,
} = require("@/infrastructure/sync/quick-sync-settings.repository");
const {
  clearQuickSyncRemoteConflict,
  getQuickSyncState,
  setQuickSyncConflictPromptVisible,
  setQuickSyncRemoteConflict,
  subscribeToQuickSync,
  setQuickSyncRuntimeStatus,
  resetQuickSyncStateForTests,
} = require("@/infrastructure/sync/quick-sync-state");
const {
  clearQuickSyncRemoteBaselineOnManualRestore,
  clearQuickSyncRemoteTracking,
  formatQuickSyncDeviceDisplayName,
  getQuickSyncDeviceMetadata,
  getQuickSyncHardwareDeviceName,
  markQuickSyncLocalChangesPending,
  resetQuickSyncDeviceIdentityForAppReset,
  resetQuickSyncDeviceMetadataForTests,
  setQuickSyncCustomDeviceName,
  updateQuickSyncDeviceMetadata,
} = require("@/infrastructure/sync/quick-sync-device.storage");
const {
  evaluateQuickSyncRemoteState,
} = require("@/infrastructure/sync/quick-sync-conflict");
const {
  resetGoogleDriveConnectionForAppReset,
} = require("@/modules/google-drive-backup/services/reset-google-drive-for-app-reset.service");
const {
  checkQuickSyncRemoteStatus,
  dismissQuickSyncConflictPrompt,
  openQuickSyncConflictPrompt,
  resolveQuickSyncConflictByRestore,
  triggerQuickSync,
} = require("@/modules/google-drive-backup/services/quick-sync.service");
const {
  ONBOARDING_SETTING_KEYS,
} = require("@/modules/onboarding/constants/onboarding.constants");
const {
  saveOnboardingSettings,
} = require("@/modules/onboarding/repositories/onboarding.repository");

const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs
    .readFileSync(path.join(root, "../drizzle", `${entry.tag}.sql`), "utf8")
    .split("--> statement-breakpoint"),
  folderMillis: entry.when,
  hash: "",
  bps: true,
}));

function applyMigrations(dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    );
  `);
  migrations.forEach((migration) => {
    migration.sql.forEach((query) => {
      const trimmed = query.trim();
      if (trimmed) dbInstance.exec(trimmed);
    });
  });
}

function aliasSelectColumns(query) {
  const selectMatch = /^\s*select\s+/i.exec(query);
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
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
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
    .map(
      (column, index) =>
        `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

function createDatabaseAdapter(rawSqlite) {
  return {
    prepareSync(query) {
      return {
        executeSync(params) {
          const statement = rawSqlite.prepare(query);
          if (
            /^\s*(select|pragma|with)\b/i.test(query) ||
            /\breturning\b/i.test(query)
          ) {
            const rows = statement.all(...params);
            return {
              getAllSync: () => rows,
              getFirstSync: () => rows[0] ?? null,
            };
          }
          const result = statement.run(...params);
          return {
            changes: Number(result.changes),
            lastInsertRowId: Number(result.lastInsertRowid),
          };
        },
        executeForRawResultSync(params) {
          const rows = rawSqlite.prepare(aliasSelectColumns(query)).all(...params);
          return { getAllSync: () => rows.map((row) => Object.values(row)) };
        },
      };
    },
  };
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);
  const adapter = createDatabaseAdapter(sqlite);
  database = drizzle(adapter, { schema });
});

afterEach(() => {
  mockNetInfoState = { isConnected: true, type: "wifi" };
  mockUploadHandler = null;
  mockGetRemoteMetadataHandler = null;
  mockCreateArchiveHandler = null;
  mockRestoreHandler = null;
  mockGoogleUser = { email: "user@gmail.com" };
  resetQuickSyncStateForTests();
  resetQuickSyncDeviceMetadataForTests();
  if (sqlite) {
    try {
      sqlite.close();
    } catch {
      // Ignore cleanup error
    }
  }
});

test("quick sync: returns default configuration when not set", () => {
  const config = getQuickSyncConfig();
  assert.equal(config.enabled, false);
  assert.equal(config.network, "wifi_only");
  assert.equal(config.lastSyncedAt, null);
  assert.equal(config.fileId, null);
});

test("quick sync: saves and loads enabled toggle", () => {
  saveQuickSyncConfig({ enabled: true });
  let config = getQuickSyncConfig();
  assert.equal(config.enabled, true);

  saveQuickSyncConfig({ enabled: false });
  config = getQuickSyncConfig();
  assert.equal(config.enabled, false);
});

test("quick sync: saves and normalizes network preference", () => {
  saveQuickSyncConfig({ network: "any" });
  let config = getQuickSyncConfig();
  assert.equal(config.network, "any");

  saveQuickSyncConfig({ network: "wifi_only" });
  config = getQuickSyncConfig();
  assert.equal(config.network, "wifi_only");
});

test("quick sync: preserves fileId and lastSyncedAt timestamps", () => {
  const now = new Date().toISOString();
  saveQuickSyncConfig({
    fileId: "drive-file-123",
    lastSyncedAt: now,
  });

  const config = getQuickSyncConfig();
  assert.equal(config.fileId, "drive-file-123");
  assert.equal(config.lastSyncedAt, now);
});

test("quick sync: notifies settings subscribers on change", () => {
  let callCount = 0;
  const unsubscribe = subscribeToQuickSyncSettings(() => {
    callCount += 1;
  });

  saveQuickSyncConfig({ enabled: true });
  assert.equal(callCount, 1);

  saveQuickSyncConfig({ network: "any" });
  assert.equal(callCount, 2);

  unsubscribe();
  saveQuickSyncConfig({ enabled: false });
  assert.equal(callCount, 2); // Unsubscribed
});

test("quick sync: state broadcasts runtime status and disabled state", () => {
  saveQuickSyncConfig({ enabled: false });
  let state = getQuickSyncState();
  assert.equal(state.enabled, false);
  assert.equal(state.status, "disabled");

  saveQuickSyncConfig({ enabled: true });
  setQuickSyncRuntimeStatus("syncing");
  state = getQuickSyncState();
  assert.equal(state.enabled, true);
  assert.equal(state.status, "syncing");

  setQuickSyncRuntimeStatus("synced");
  state = getQuickSyncState();
  assert.equal(state.status, "synced");
});

test("quick sync: preserves accountEmail and resetQuickSyncLocalMetadata clears cloud link", () => {
  saveQuickSyncConfig({
    fileId: "file-account-1",
    accountEmail: "account1@gmail.com",
    lastSyncedAt: new Date().toISOString(),
  });

  let config = getQuickSyncConfig();
  assert.equal(config.fileId, "file-account-1");
  assert.equal(config.accountEmail, "account1@gmail.com");
  assert.ok(config.lastSyncedAt);

  resetQuickSyncLocalMetadata();

  config = getQuickSyncConfig();
  assert.equal(config.fileId, null);
  assert.equal(config.accountEmail, null);
  assert.equal(config.lastSyncedAt, null);
});

test("quick sync device metadata: formats policy-safe hardware model and custom label", () => {
  assert.equal(getQuickSyncHardwareDeviceName(), "Google Pixel 8");
  assert.equal(formatQuickSyncDeviceDisplayName(null), "Google Pixel 8");
  assert.equal(
    formatQuickSyncDeviceDisplayName("Partner's Phone", "Pixel 8"),
    "Partner's Phone (Pixel 8)",
  );
  assert.equal(
    formatQuickSyncDeviceDisplayName("My Pixel 8", "Pixel 8"),
    "My Pixel 8",
  );

  const initial = getQuickSyncDeviceMetadata();
  setQuickSyncCustomDeviceName("Work Phone");
  markQuickSyncLocalChangesPending();
  updateQuickSyncDeviceMetadata({
    lastKnownRemoteVersion: 14,
    lastKnownRemoteFileId: "file-14",
    lastKnownRemoteModifiedTime: "2026-11-20T05:00:00.000Z",
  });

  clearQuickSyncRemoteTracking();
  const afterClear = getQuickSyncDeviceMetadata();
  assert.equal(afterClear.deviceId, initial.deviceId);
  assert.equal(afterClear.customDeviceName, "Work Phone");
  assert.equal(afterClear.lastKnownRemoteSyncId, null);
  assert.equal(afterClear.lastKnownRemoteHeadRevisionId, null);
  assert.equal(afterClear.lastKnownRemoteVersion, null);
  assert.equal(afterClear.lastKnownRemoteFileId, null);
  assert.equal(afterClear.hasUnsyncedLocalChanges, false);

  // Full app reset rotates deviceId and clears customDeviceName
  setQuickSyncCustomDeviceName("Work Phone");
  markQuickSyncLocalChangesPending();
  const afterAppReset = resetQuickSyncDeviceIdentityForAppReset();
  assert.notEqual(afterAppReset.deviceId, initial.deviceId);
  assert.equal(afterAppReset.customDeviceName, null);
  assert.equal(afterAppReset.lastKnownRemoteSyncId, null);
  assert.equal(afterAppReset.lastKnownRemoteHeadRevisionId, null);
  assert.equal(afterAppReset.lastKnownRemoteVersion, null);
  assert.equal(afterAppReset.lastKnownRemoteModifiedTime, null);
  assert.equal(afterAppReset.lastKnownRemoteFileId, null);
  assert.equal(afterAppReset.hasUnsyncedLocalChanges, false);
});

test("quick sync app reset (P1-01): rotating deviceId and guarding hasNeverSynced prevents silent cloud overwrite after reset", async () => {
  const beforeReset = getQuickSyncDeviceMetadata();
  setQuickSyncCustomDeviceName("Main Phone");
  saveQuickSyncConfig({
    enabled: true,
    fileId: "file-1",
    accountEmail: "user@gmail.com",
    lastSyncedAt: "2026-11-20T05:30:00.000Z",
  });
  updateQuickSyncDeviceMetadata({
    lastKnownRemoteSyncId: "sync-rev-10",
    lastKnownRemoteHeadRevisionId: "head-rev-10",
    lastKnownRemoteVersion: 25,
    lastKnownRemoteModifiedTime: "2026-11-20T05:30:00.000Z",
    lastKnownRemoteFileId: "file-1",
    hasUnsyncedLocalChanges: true,
  });

  const remoteCloudFileFromBeforeReset = {
    id: "file-1",
    name: "kaizen-finance-quick-sync.kfb",
    createdTime: "2026-11-20T05:00:00.000Z",
    modifiedTime: "2026-11-20T05:30:00.000Z",
    size: 4096,
    location: "visible",
    passwordProtected: false,
    version: 25,
    headRevisionId: "head-rev-10",
    trashed: false,
    syncRevisionId: "sync-rev-10",
    lastUpdatedByDeviceId: beforeReset.deviceId,
    lastUpdatedByDeviceName: "Main Phone (Google Pixel 8)",
  };

  await resetGoogleDriveConnectionForAppReset();

  const postResetConfig = getQuickSyncConfig();
  const postResetMeta = getQuickSyncDeviceMetadata();
  assert.equal(postResetConfig.enabled, false);
  assert.equal(postResetConfig.fileId, null);
  assert.equal(postResetConfig.lastSyncedAt, null);
  assert.notEqual(postResetMeta.deviceId, beforeReset.deviceId);
  assert.equal(postResetMeta.customDeviceName, null);
  assert.equal(postResetMeta.hasUnsyncedLocalChanges, false);

  // User completes fresh onboarding, reconnects same Google account, and toggles Quick Sync ON
  const evaluationAfterReset = evaluateQuickSyncRemoteState(
    remoteCloudFileFromBeforeReset,
    {
      fileId: postResetConfig.fileId,
      lastSyncedAt: postResetConfig.lastSyncedAt,
      lastKnownRemoteSyncId: postResetMeta.lastKnownRemoteSyncId,
      lastKnownRemoteHeadRevisionId: postResetMeta.lastKnownRemoteHeadRevisionId,
      lastKnownRemoteVersion: postResetMeta.lastKnownRemoteVersion,
      lastKnownRemoteModifiedTime: postResetMeta.lastKnownRemoteModifiedTime,
      lastKnownRemoteFileId: postResetMeta.lastKnownRemoteFileId,
      deviceId: postResetMeta.deviceId,
      hasUnsyncedLocalChanges: true,
    },
  );
  assert.equal(evaluationAfterReset.status, "remote_ahead");

  // Even if deviceId were identical when local has never synced (e.g. after disconnect/clear),
  // it must still return remote_ahead and never adopt_self
  const evaluationSameDeviceNeverSynced = evaluateQuickSyncRemoteState(
    remoteCloudFileFromBeforeReset,
    {
      fileId: null,
      lastSyncedAt: null,
      lastKnownRemoteSyncId: null,
      lastKnownRemoteHeadRevisionId: null,
      lastKnownRemoteVersion: null,
      lastKnownRemoteModifiedTime: null,
      lastKnownRemoteFileId: null,
      deviceId: beforeReset.deviceId,
      hasUnsyncedLocalChanges: true,
    },
  );
  assert.equal(evaluationSameDeviceNeverSynced.status, "remote_ahead");
});

test("quick sync conflict evaluation: detects remote ahead via syncRevisionId/headRevisionId and avoids false self-conflicts", () => {
  const remoteBase = {
    id: "file-1",
    name: "kaizen-finance-quick-sync.kfb",
    createdTime: "2026-11-20T05:00:00.000Z",
    modifiedTime: "2026-11-20T05:30:00.000Z",
    size: 1024,
    location: "visible",
    passwordProtected: false,
    version: 25,
    headRevisionId: "head-rev-10",
    trashed: false,
    syncRevisionId: "sync-rev-10",
    lastUpdatedByDeviceId: "device-other",
    lastUpdatedByDeviceName: "Partner's Phone (Pixel 8)",
  };

  // Missing / trashed remote file
  assert.equal(
    evaluateQuickSyncRemoteState(null, {
      fileId: "file-1",
      lastSyncedAt: "2026-11-20T05:00:00.000Z",
      lastKnownRemoteSyncId: "sync-rev-9",
      lastKnownRemoteHeadRevisionId: "head-rev-9",
      lastKnownRemoteVersion: 24,
      lastKnownRemoteModifiedTime: "2026-11-20T05:00:00.000Z",
      lastKnownRemoteFileId: "file-1",
      deviceId: "device-local",
      hasUnsyncedLocalChanges: false,
    }).status,
    "missing",
  );
  assert.equal(
    evaluateQuickSyncRemoteState(
      { ...remoteBase, trashed: true },
      {
        fileId: "file-1",
        lastSyncedAt: "2026-11-20T05:00:00.000Z",
        lastKnownRemoteSyncId: "sync-rev-9",
        lastKnownRemoteHeadRevisionId: "head-rev-9",
        lastKnownRemoteVersion: 24,
        lastKnownRemoteModifiedTime: "2026-11-20T05:00:00.000Z",
        lastKnownRemoteFileId: "file-1",
        deviceId: "device-local",
        hasUnsyncedLocalChanges: false,
      },
    ).status,
    "missing",
  );

  // Different syncRevisionId from another device -> remote_ahead
  const aheadResult = evaluateQuickSyncRemoteState(remoteBase, {
    fileId: "file-1",
    lastSyncedAt: "2026-11-20T05:00:00.000Z",
    lastKnownRemoteSyncId: "sync-rev-9",
    lastKnownRemoteHeadRevisionId: "head-rev-9",
    lastKnownRemoteVersion: 24,
    lastKnownRemoteModifiedTime: "2026-11-20T05:00:00.000Z",
    lastKnownRemoteFileId: "file-1",
    deviceId: "device-local",
    hasUnsyncedLocalChanges: true,
  });
  assert.equal(aheadResult.status, "remote_ahead");
  assert.equal(aheadResult.conflict.remoteDeviceName, "Partner's Phone (Pixel 8)");
  assert.equal(aheadResult.conflict.hasUnsyncedLocalChanges, true);

  // Same syncRevisionId even if Google Drive internally bumped file.version (24 -> 25) -> up_to_date!
  const driveVersionBumpOnly = evaluateQuickSyncRemoteState(remoteBase, {
    fileId: "file-1",
    lastSyncedAt: "2026-11-20T05:30:00.000Z",
    lastKnownRemoteSyncId: "sync-rev-10",
    lastKnownRemoteHeadRevisionId: "head-rev-10",
    lastKnownRemoteVersion: 24,
    lastKnownRemoteModifiedTime: "2026-11-20T05:30:00.000Z",
    lastKnownRemoteFileId: "file-1",
    deviceId: "device-local",
    hasUnsyncedLocalChanges: true,
  });
  assert.equal(driveVersionBumpOnly.status, "up_to_date");

  // Same headRevisionId fallback (when syncRevisionId absent) despite version bump -> up_to_date!
  const headRevisionMatch = evaluateQuickSyncRemoteState(
    { ...remoteBase, syncRevisionId: null },
    {
      fileId: "file-1",
      lastSyncedAt: "2026-11-20T05:30:00.000Z",
      lastKnownRemoteSyncId: null,
      lastKnownRemoteHeadRevisionId: "head-rev-10",
      lastKnownRemoteVersion: 24,
      lastKnownRemoteModifiedTime: "2026-11-20T05:30:00.000Z",
      lastKnownRemoteFileId: "file-1",
      deviceId: "device-local",
      hasUnsyncedLocalChanges: false,
    },
  );
  assert.equal(headRevisionMatch.status, "up_to_date");

  // Newly linked second device (never synced) when Drive file exists -> remote_ahead
  const freshDeviceResult = evaluateQuickSyncRemoteState(remoteBase, {
    fileId: null,
    lastSyncedAt: null,
    lastKnownRemoteSyncId: null,
    lastKnownRemoteHeadRevisionId: null,
    lastKnownRemoteVersion: null,
    lastKnownRemoteModifiedTime: null,
    lastKnownRemoteFileId: null,
    deviceId: "device-local",
    hasUnsyncedLocalChanges: false,
  });
  assert.equal(freshDeviceResult.status, "remote_ahead");

  // Self-writer protection: if THIS device was the last writer on Drive, NEVER self-conflict
  // even when hasUnsyncedLocalChanges is true
  const selfAdoptResult = evaluateQuickSyncRemoteState(
    { ...remoteBase, lastUpdatedByDeviceId: "device-local" },
    {
      fileId: "file-1",
      lastSyncedAt: "2026-11-20T05:00:00.000Z",
      lastKnownRemoteSyncId: "sync-rev-9",
      lastKnownRemoteHeadRevisionId: "head-rev-9",
      lastKnownRemoteVersion: 24,
      lastKnownRemoteModifiedTime: "2026-11-20T05:00:00.000Z",
      lastKnownRemoteFileId: "file-1",
      deviceId: "device-local",
      hasUnsyncedLocalChanges: true,
    },
  );
  assert.equal(selfAdoptResult.status, "adopt_self");

  // Legacy upgrade fallback (no syncRevisionId/headRevisionId yet): within 10s -> up_to_date, >10s -> remote_ahead
  assert.equal(
    evaluateQuickSyncRemoteState(
      { ...remoteBase, syncRevisionId: null, headRevisionId: null },
      {
        fileId: "file-1",
        lastSyncedAt: "2026-11-20T05:29:55.000Z",
        lastKnownRemoteSyncId: null,
        lastKnownRemoteHeadRevisionId: null,
        lastKnownRemoteVersion: null,
        lastKnownRemoteModifiedTime: null,
        lastKnownRemoteFileId: null,
        deviceId: "device-local",
        hasUnsyncedLocalChanges: false,
      },
    ).status,
    "up_to_date",
  );
  assert.equal(
    evaluateQuickSyncRemoteState(
      { ...remoteBase, syncRevisionId: null, headRevisionId: null },
      {
        fileId: "file-1",
        lastSyncedAt: "2026-11-20T05:20:00.000Z",
        lastKnownRemoteSyncId: null,
        lastKnownRemoteHeadRevisionId: null,
        lastKnownRemoteVersion: null,
        lastKnownRemoteModifiedTime: null,
        lastKnownRemoteFileId: null,
        deviceId: "device-local",
        hasUnsyncedLocalChanges: false,
      },
    ).status,
    "remote_ahead",
  );
});

test("quick sync state: tracks remote_ahead conflict and prompt visibility", () => {
  saveQuickSyncConfig({ enabled: true });

  setQuickSyncRemoteConflict({
    fileId: "file-1",
    remoteVersion: 12,
    remoteModifiedTime: "2026-11-20T05:30:00.000Z",
    remoteDeviceId: "device-other",
    remoteDeviceName: "Pixel 8",
    localLastSyncedAt: "2026-11-20T05:00:00.000Z",
    hasUnsyncedLocalChanges: false,
  });

  let state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, true);
  assert.equal(state.remoteConflict?.remoteDeviceName, "Pixel 8");

  // Dismissing prompt keeps conflict paused so background uploads never overwrite
  setQuickSyncConflictPromptVisible(false);
  state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, false);

  // Syncing state takes precedence during active restore/overwrite resolution
  setQuickSyncRuntimeStatus("syncing");
  state = getQuickSyncState();
  assert.equal(state.status, "syncing");

  clearQuickSyncRemoteConflict();
  setQuickSyncRuntimeStatus("synced");
  state = getQuickSyncState();
  assert.equal(state.status, "synced");
  assert.equal(state.remoteConflict, null);
  assert.equal(state.conflictPromptVisible, false);
});

test("quick sync in-flight edit (P1-02): edits made during an active upload keep hasUnsyncedLocalChanges true and chain a follow-up upload", async () => {
  saveOnboardingSettings({
    [ONBOARDING_SETTING_KEYS.status]: "completed",
    [ONBOARDING_SETTING_KEYS.workspaceMode]: "personal",
  });
  saveQuickSyncConfig({
    enabled: true,
    network: "wifi_only",
    accountEmail: "user@gmail.com",
  });

  const uploadedSnapshots = [];
  let latestRemoteMetadata = null;
  let archiveCounter = 0;

  mockCreateArchiveHandler = async () => {
    archiveCounter += 1;
    return { bytes: new Uint8Array([archiveCounter]) };
  };

  mockGetRemoteMetadataHandler = async () => latestRemoteMetadata;

  mockUploadHandler = async (_token, bytes, existingFileId, props) => {
    const uploadNumber = uploadedSnapshots.length + 1;
    uploadedSnapshots.push({
      uploadNumber,
      snapshotByte: bytes[0],
      existingFileId,
      syncRevisionId: props.syncRevisionId,
    });

    if (uploadNumber === 1) {
      // Simulate user adding Transaction B while Upload #1 is in flight over the network
      // and the 3s debounce firing while activeSyncPromise is still running.
      markQuickSyncLocalChangesPending();
      void triggerQuickSync();

      // Verify hasUnsyncedLocalChanges stays true during Upload #1
      assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges, true);
    }

    latestRemoteMetadata = {
      id: "file-1",
      name: "kaizen-finance-quick-sync.kfb",
      createdTime: "2026-11-20T05:00:00.000Z",
      modifiedTime: `2026-11-20T06:0${uploadNumber}:00.000Z`,
      size: 1024,
      location: "visible",
      passwordProtected: false,
      version: uploadNumber,
      headRevisionId: `head-${uploadNumber}`,
      trashed: false,
      syncRevisionId: props.syncRevisionId,
      lastUpdatedByDeviceId: props.deviceId,
      lastUpdatedByDeviceName: props.deviceName,
    };

    return latestRemoteMetadata;
  };

  // Start Upload #1 for Transaction A
  markQuickSyncLocalChangesPending();
  const synced = await triggerQuickSync();

  assert.equal(synced, true);
  assert.equal(uploadedSnapshots.length, 2);
  assert.equal(uploadedSnapshots[0].snapshotByte, 1);
  assert.equal(uploadedSnapshots[1].snapshotByte, 2);
  assert.equal(uploadedSnapshots[1].existingFileId, "file-1");
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges, false);
  assert.equal(
    getQuickSyncDeviceMetadata().lastKnownRemoteSyncId,
    uploadedSnapshots[1].syncRevisionId,
  );
  assert.equal(getQuickSyncState().status, "synced");
});

test("quick sync mixed v1.8.0 + v1.7.0 devices (P1-03): detects v1.7.0 PATCH upload when Drive preserves stale syncRevisionId and lastUpdatedByDeviceId", () => {
  // Device A (v1.8.0) synced rev-10 / head-10.
  // Then Device B (v1.7.0) uploaded new bytes via Drive v3 PATCH without syncRevisionId,
  // so Drive preserved sync-rev-10 and device-A in appProperties while advancing headRevisionId to head-11.
  const remoteAfterV170Patch = {
    id: "file-1",
    name: "kaizen-finance-quick-sync.kfb",
    createdTime: "2026-11-20T05:00:00.000Z",
    modifiedTime: "2026-11-20T05:45:00.000Z",
    size: 2048,
    location: "visible",
    passwordProtected: false,
    version: 26,
    headRevisionId: "head-rev-11",
    trashed: false,
    syncRevisionId: "sync-rev-10",
    lastUpdatedByDeviceId: "device-A",
    lastUpdatedByDeviceName: "Device A (Pixel 8)",
  };

  const deviceABaseline = {
    fileId: "file-1",
    lastSyncedAt: "2026-11-20T05:30:00.000Z",
    lastKnownRemoteSyncId: "sync-rev-10",
    lastKnownRemoteHeadRevisionId: "head-rev-10",
    lastKnownRemoteVersion: 25,
    lastKnownRemoteModifiedTime: "2026-11-20T05:30:00.000Z",
    lastKnownRemoteFileId: "file-1",
    deviceId: "device-A",
    hasUnsyncedLocalChanges: true,
  };

  const result = evaluateQuickSyncRemoteState(
    remoteAfterV170Patch,
    deviceABaseline,
  );
  assert.equal(result.status, "remote_ahead");
  assert.equal(result.conflict.remoteDeviceId, null);
  assert.equal(result.conflict.remoteDeviceName, null);
  assert.equal(result.conflict.hasUnsyncedLocalChanges, true);

  // Fallback when headRevisionId is unavailable on the Drive response: modifiedTime advancement > 10s
  // still detects the legacy v1.7.0 overwrite and prevents adopt_self
  const resultWithoutHeadRevision = evaluateQuickSyncRemoteState(
    { ...remoteAfterV170Patch, headRevisionId: null },
    { ...deviceABaseline, lastKnownRemoteHeadRevisionId: null },
  );
  assert.equal(resultWithoutHeadRevision.status, "remote_ahead");
  assert.equal(resultWithoutHeadRevision.conflict.remoteDeviceId, null);
  assert.equal(resultWithoutHeadRevision.conflict.remoteDeviceName, null);
});

test("quick sync conflict restore failure (P1-18): resets syncing status back to remote_ahead instead of deadlocking UI", async () => {
  saveQuickSyncConfig({ enabled: true });

  const conflict = {
    fileId: "file-1",
    remoteVersion: 14,
    remoteModifiedTime: "2026-11-20T06:10:00.000Z",
    remoteDeviceId: "device-other",
    remoteDeviceName: "Partner's Phone (Pixel 8)",
    localLastSyncedAt: "2026-11-20T05:30:00.000Z",
    hasUnsyncedLocalChanges: false,
  };
  setQuickSyncRemoteConflict(conflict, { openPrompt: true });

  mockRestoreHandler = async () => {
    assert.equal(
      getQuickSyncState().status,
      "syncing",
      "Status must be syncing while restore is in flight",
    );
    throw new Error("Network request failed");
  };

  await assert.rejects(
    () => resolveQuickSyncConflictByRestore(),
    /Network request failed/,
  );

  // Immediately after failure, status must return to remote_ahead (not stuck in syncing)
  let state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, true);
  assert.equal(state.lastError, "Network request failed");
  assert.equal(state.remoteConflict?.fileId, "file-1");

  // Dismissing the modal ("Decide later") must keep status as remote_ahead so header chip can reopen it
  dismissQuickSyncConflictPrompt();
  state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, false);

  openQuickSyncConflictPrompt();
  state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, true);
});

test("quick sync manual/local backup restore (P1-19): clearing baseline blocks adopt_self and silent Drive overwrite, surfacing conflict modal", async () => {
  saveOnboardingSettings({
    [ONBOARDING_SETTING_KEYS.status]: "completed",
    [ONBOARDING_SETTING_KEYS.workspaceMode]: "personal",
  });
  setQuickSyncCustomDeviceName("Main Phone");
  const localMetaBeforeRestore = getQuickSyncDeviceMetadata();

  // Simulate state after syncing 5 transactions to Quick Sync on THIS device
  saveQuickSyncConfig({
    enabled: true,
    network: "wifi_only",
    fileId: "file-1",
    accountEmail: "user@gmail.com",
    lastSyncedAt: "2026-11-20T06:00:00.000Z",
  });
  updateQuickSyncDeviceMetadata({
    lastKnownRemoteSyncId: "sync-rev-10",
    lastKnownRemoteHeadRevisionId: "head-rev-10",
    lastKnownRemoteVersion: 10,
    lastKnownRemoteModifiedTime: "2026-11-20T06:00:00.000Z",
    lastKnownRemoteFileId: "file-1",
    hasUnsyncedLocalChanges: false,
  });

  // Cloud Drive still holds the 5-transaction Quick Sync uploaded by THIS same device
  mockGetRemoteMetadataHandler = async () => ({
    id: "file-1",
    name: "kaizen-finance-quick-sync.kfb",
    createdTime: "2026-11-20T05:00:00.000Z",
    modifiedTime: "2026-11-20T06:00:00.000Z",
    size: 4096,
    location: "visible",
    passwordProtected: false,
    version: 10,
    headRevisionId: "head-rev-10",
    trashed: false,
    syncRevisionId: "sync-rev-10",
    lastUpdatedByDeviceId: localMetaBeforeRestore.deviceId,
    lastUpdatedByDeviceName: "Main Phone (Google Pixel 8)",
  });

  let uploadCalls = 0;
  mockUploadHandler = async (_token, _bytes, existingFileId, props) => {
    uploadCalls += 1;
    return {
      id: existingFileId ?? "file-1",
      modifiedTime: "2026-11-20T06:15:00.000Z",
      version: 11,
      headRevisionId: "head-rev-11",
      syncRevisionId: props.syncRevisionId,
    };
  };

  // Simulate restoring an older 2-transaction backup (whose settings had quick_sync enabled + old lastSyncedAt)
  saveQuickSyncConfig({
    enabled: true,
    fileId: "file-1",
    accountEmail: "user@gmail.com",
    lastSyncedAt: null,
  });
  clearQuickSyncRemoteConflict();
  const afterManualRestore = clearQuickSyncRemoteBaselineOnManualRestore();

  assert.equal(afterManualRestore.deviceId, localMetaBeforeRestore.deviceId);
  assert.equal(afterManualRestore.customDeviceName, "Main Phone");
  assert.equal(afterManualRestore.lastKnownRemoteSyncId, null);
  assert.equal(afterManualRestore.lastKnownRemoteHeadRevisionId, null);
  assert.equal(afterManualRestore.lastKnownRemoteVersion, null);
  assert.equal(afterManualRestore.lastKnownRemoteModifiedTime, null);
  assert.equal(afterManualRestore.lastKnownRemoteFileId, null);
  assert.equal(afterManualRestore.hasUnsyncedLocalChanges, true);

  // Post-restore check must detect remote_ahead (NOT adopt_self or up_to_date) and must NOT upload
  const checkResult = await checkQuickSyncRemoteStatus({
    force: true,
    openPromptOnConflict: true,
  });
  assert.equal(checkResult, "remote_ahead");
  assert.equal(uploadCalls, 0);

  let state = getQuickSyncState();
  assert.equal(state.status, "remote_ahead");
  assert.equal(state.conflictPromptVisible, true);
  assert.equal(state.remoteConflict?.hasUnsyncedLocalChanges, true);

  // Subsequent normal local edit / triggerQuickSync must stay blocked and NOT silently overwrite Drive
  const normalSyncResult = await triggerQuickSync();
  assert.equal(normalSyncResult, false);
  assert.equal(uploadCalls, 0);

  // Explicit user overwrite ("Overwrite Drive Data") must succeed and update the existing fileId
  const overwriteResult = await triggerQuickSync({
    immediate: true,
    forceOverwrite: true,
  });
  assert.equal(overwriteResult, true);
  assert.equal(uploadCalls, 1);
  assert.equal(getQuickSyncState().status, "synced");
});
