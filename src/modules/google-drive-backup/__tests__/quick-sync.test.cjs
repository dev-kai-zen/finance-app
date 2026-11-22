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
let mockFetchHandler = null;
let mockReplaceDatabaseHandler = null;
let mockGoogleUser = { email: "user@gmail.com" };

Module._load = function (request, parent, ...rest) {
  if (request === "@/infrastructure/database" && mockReplaceDatabaseHandler) return { ...originalLoad.call(this, request, parent, ...rest), replaceDatabaseFromSnapshot: (...args) => mockReplaceDatabaseHandler(...args) };
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
  if (request === "expo/fetch") {
    return {
      fetch: async (...args) => {
        if (mockFetchHandler) {
          return mockFetchHandler(...args);
        }
        throw new Error("Unexpected expo/fetch call in test");
      },
    };
  }
  if (
    /^(expo|@expo|react|react-native|@react-native)/.test(request) ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  if (request === "@/modules/local-backup") {
    return {
      prepareBackupRestore: async () => new Uint8Array([9]),
      legacyAttachmentNotice: () => "",
      readDatabaseBackup: async () => ({ database: new Uint8Array([1]), createdAt: new Date() }),
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
        const {withQuickSyncReplacement} = require("@/infrastructure/sync/quick-sync-operation-coordinator");
        return withQuickSyncReplacement(async () => {
          if (mockRestoreHandler) return mockRestoreHandler(...args);
        });
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
  sanitizeQuickSyncCustomDeviceName,
  setQuickSyncCustomDeviceName,
  updateQuickSyncDeviceMetadata,
} = require("@/infrastructure/sync/quick-sync-device.storage");
const {
  evaluateQuickSyncRemoteState,
} = require("@/infrastructure/sync/quick-sync-conflict");
const {
  buildQuickSyncAppProperties,
  QUICK_SYNC_DEVICE_ID_PROPERTY,
  QUICK_SYNC_DEVICE_NAME_PROPERTY,
  QUICK_SYNC_REVISION_ID_PROPERTY,
  truncateUtf8Bytes,
  uploadOrUpdateGoogleDriveQuickSyncBackup: realUploadOrUpdateQuickSyncBackup,
  getGoogleDriveQuickSyncFileMetadata: realGetQuickSyncMetadata,
} = require("@/infrastructure/sync/adapters/google-drive-backup.adapter");
const {
  resetGoogleDriveConnectionForAppReset,
} = require("@/modules/google-drive-backup/services/reset-google-drive-for-app-reset.service");
const {
  checkQuickSyncRemoteStatus,
  dismissQuickSyncConflictPrompt,
  openQuickSyncConflictPrompt,
  resolveQuickSyncConflictByRestore,
  restoreFromQuickSync,
  triggerQuickSync,
  setQuickSyncEnabled,
  resetQuickSyncConnection,
} = require("@/modules/google-drive-backup/services/quick-sync.service");
const {
  flushDebouncedQuickSync,
  queueDebouncedQuickSync,
} = require("@/infrastructure/sync/quick-sync-debounce");
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
  mockFetchHandler = null;
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
  assert.equal(config.syncAttachments, true);
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

test("quick sync: saves and loads syncAttachments toggle", () => {
  saveQuickSyncConfig({ syncAttachments: false });
  let config = getQuickSyncConfig();
  assert.equal(config.syncAttachments, false);

  saveQuickSyncConfig({ syncAttachments: true });
  config = getQuickSyncConfig();
  assert.equal(config.syncAttachments, true);
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

test("quick sync appProperties UTF-8 byte cap (P1-20): truncates emoji and CJK device labels safely under Drive's 124-byte limit", () => {
  const emojiLabel = "📱".repeat(25); // 25 emojis = 100 UTF-8 bytes
  const cjkLabel = "あ".repeat(40); // 40 CJK chars = 120 UTF-8 bytes

  const emojiProps = buildQuickSyncAppProperties({
    deviceId: "device-123",
    deviceName: emojiLabel,
    syncRevisionId: "rev-123",
  });
  const emojiName = emojiProps[QUICK_SYNC_DEVICE_NAME_PROPERTY];
  assert.ok(emojiName.length > 0);
  assert.equal(
    Buffer.byteLength(emojiName, "utf8") <= 80,
    true,
    "Device name value must be <= 80 UTF-8 bytes",
  );
  assert.equal(
    Buffer.byteLength(QUICK_SYNC_DEVICE_NAME_PROPERTY + emojiName, "utf8") <= 124,
    true,
    "Key + value must never exceed Google Drive's 124-byte appProperty limit",
  );
  // Must not split surrogate pairs (20 whole 4-byte emojis = 80 bytes)
  assert.equal(Array.from(emojiName).length, 20);
  assert.equal(emojiName, "📱".repeat(20));

  const cjkProps = buildQuickSyncAppProperties({
    deviceId: "device-".repeat(20),
    deviceName: cjkLabel,
    syncRevisionId: "rev-".repeat(30),
  });
  for (const [key, value] of Object.entries(cjkProps)) {
    assert.equal(
      Buffer.byteLength(key + value, "utf8") <= 124,
      true,
      `appProperty ${key} exceeded 124 UTF-8 bytes`,
    );
  }
  assert.equal(
    Buffer.byteLength(cjkProps[QUICK_SYNC_DEVICE_ID_PROPERTY], "utf8") <= 80,
    true,
  );
  assert.equal(
    Buffer.byteLength(cjkProps[QUICK_SYNC_REVISION_ID_PROPERTY], "utf8") <= 80,
    true,
  );
  assert.equal(truncateUtf8Bytes("a📱b", 4), "a");
  assert.equal(truncateUtf8Bytes("a📱b", 5), "a📱");
});

test("quick sync trashed Drive file recovery (P1-20): clears stale trashed fileId and publishes a new active snapshot without PATCH", async () => {
  saveOnboardingSettings({
    [ONBOARDING_SETTING_KEYS.status]: "completed",
    [ONBOARDING_SETTING_KEYS.workspaceMode]: "personal",
  });
  saveQuickSyncConfig({
    enabled: true,
    network: "wifi_only",
    fileId: "trashed-file-1",
    accountEmail: "user@gmail.com",
    lastSyncedAt: "2026-11-20T05:00:00.000Z",
  });

  // 1. performSync layer: remote metadata check returns null because file is trashed on Drive
  mockGetRemoteMetadataHandler = async () => null;
  let receivedUploadFileId = "UNSET";
  mockUploadHandler = async (_token, _bytes, existingFileId, props) => {
    receivedUploadFileId = existingFileId;
    return {
      id: "fresh-active-file-2",
      modifiedTime: "2026-11-20T06:30:00.000Z",
      version: 1,
      headRevisionId: "head-fresh-1",
      syncRevisionId: props.syncRevisionId,
    };
  };

  const synced = await triggerQuickSync();
  assert.equal(synced, true);
  assert.equal(
    receivedUploadFileId,
    null,
    "performSync must clear stale trashed fileId when remote active file is missing",
  );
  assert.equal(getQuickSyncConfig().fileId, "fresh-active-file-2");

  // The adapter never overwrites a trashed or active file.
  const fetchCalls = [];
  mockFetchHandler = async (url, init = {}) => {
    const method = init.method ?? "GET";
    fetchCalls.push({ method, url });

    // Folder lookups (root + Backups)
    if (method === "GET" && url.includes("mimeType")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: "folder-1", name: "Backups" }],
        }),
      };
    }

    // Active file listing in Backups folder returns no active Quick Sync file
    if (method === "GET" && new URL(url).searchParams.get("q")?.includes("trashed = false")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      };
    }

    if (url.includes("/generateIds")) return { ok: true, status: 200, json: async () => ({ ids: ["fresh-active-file-3"] }) };
    if (method === "POST" && url.includes("upload/drive/v3/files")) {
      return { ok: true, status: 200, headers: new Headers({ location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=test" }) };
    }
    // POST creates a brand-new active Quick Sync file
    if (method === "PUT" && url.includes("upload_id=test")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "fresh-active-file-3",
          name: "kaizen-finance-quick-sync.kfb",
          createdTime: "2026-11-20T06:32:00.000Z",
          modifiedTime: "2026-11-20T06:32:00.000Z",
          size: "3",
          md5Checksum: "5289df737df57326fcdd22597afb1fac",
          version: "1",
          headRevisionId: "head-fresh-3",
          trashed: false,
          appProperties: {
            isQuickSync: "true",
            syncRevisionId: "rev-fresh-3",
          },
        }),
      };
    }

    throw new Error(`Unhandled fetch in P1-20 test: ${method} ${url}`);
  };

  const created = await realUploadOrUpdateQuickSyncBackup(
    "test-token",
    new Uint8Array([1, 2, 3]),
    "trashed-file-1",
    {
      deviceId: "device-1",
      deviceName: "📱".repeat(25),
      syncRevisionId: "rev-fresh-3",
    },
  );
  assert.equal(created.id, "fresh-active-file-3");
  assert.equal(created.trashed, false);
  assert.ok(
    fetchCalls.some((c) => c.method === "POST" && c.url.includes("upload/drive/v3/files")),
    "Adapter must publish a new active snapshot",
  );
});

test("quick sync restore mutex (P1-23): cancels debounced sync, blocks concurrent trigger/check during restore, and waits for in-flight upload", async () => {
  saveOnboardingSettings({
    [ONBOARDING_SETTING_KEYS.status]: "completed",
    [ONBOARDING_SETTING_KEYS.workspaceMode]: "personal",
  });
  saveQuickSyncConfig({
    enabled: true,
    network: "wifi_only",
    fileId: "file-1",
    accountEmail: "user@gmail.com",
  });

  // Scenario A: Debounced edit queued + restore starts -> cancels debounce & blocks trigger/check during restore
  let uploadCalls = 0;
  mockGetRemoteMetadataHandler = async () => null;
  mockUploadHandler = async (_token, _bytes, existingFileId, props) => {
    uploadCalls += 1;
    return {
      id: existingFileId ?? "file-1",
      modifiedTime: "2026-11-20T07:00:00.000Z",
      version: 1,
      headRevisionId: "head-1",
      syncRevisionId: props.syncRevisionId,
    };
  };

  let releaseRestore;
  const restoreGate = new Promise((resolve) => {
    releaseRestore = resolve;
  });
  let restoreStarted = false;
  mockRestoreHandler = async () => {
    restoreStarted = true;
    await restoreGate;
  };

  queueDebouncedQuickSync();
  const restorePromise = restoreFromQuickSync("file-1");
  await Promise.resolve();

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(restoreStarted, true);
  flushDebouncedQuickSync();
  const concurrentTrigger = await triggerQuickSync({ immediate: true });
  const concurrentCheck = await checkQuickSyncRemoteStatus({ force: true });

  assert.equal(concurrentTrigger, false, "triggerQuickSync must no-op while restore is in flight");
  assert.equal(concurrentCheck, "skipped", "checkQuickSyncRemoteStatus must skip while restore is in flight");
  assert.equal(uploadCalls, 0, "No upload may run concurrently with restore");

  releaseRestore();
  await restorePromise;
  assert.equal(uploadCalls, 0);

  // Scenario B: Upload already in flight -> restore waits for upload to settle before running
  const events = [];
  let releaseUpload;
  const uploadGate = new Promise((resolve) => {
    releaseUpload = resolve;
  });

  mockUploadHandler = async (_token, _bytes, existingFileId, props) => {
    events.push("upload:start");
    await uploadGate;
    events.push("upload:end");
    return {
      id: existingFileId ?? "file-1",
      modifiedTime: "2026-11-20T07:05:00.000Z",
      version: 2,
      headRevisionId: "head-2",
      syncRevisionId: props.syncRevisionId,
    };
  };
  mockRestoreHandler = async () => {
    events.push("restore:start");
    events.push("restore:end");
  };

  const uploadPromise = triggerQuickSync({ immediate: true });
  // Wait until upload reaches network gate
  for (let i = 0; i < 10 && !events.includes("upload:start"); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.deepEqual(events, ["upload:start"]);

  markQuickSyncLocalChangesPending();
  void triggerQuickSync(); // Queue a follow-up before requesting restore.
  const queuedRestore = restoreFromQuickSync("file-1");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(
    events,
    ["upload:start"],
    "Restore must wait until in-flight upload finishes before executing",
  );

  releaseUpload();
  await Promise.all([uploadPromise, queuedRestore]);
  assert.deepEqual(events, [
    "upload:start",
    "upload:end",
    "restore:start",
    "restore:end",
  ]);
});

test("quick sync device label sanitization (P1-24): double-space input matches sanitized saved label", () => {
  const saved = setQuickSyncCustomDeviceName("My Phone");
  assert.equal(saved.customDeviceName, "My Phone");

  // Double-space / surrounding-whitespace draft normalizes to the same saved label -> not dirty
  const doubleSpaceNormalized = sanitizeQuickSyncCustomDeviceName("  My   Phone  ") ?? "";
  assert.equal(doubleSpaceNormalized, saved.customDeviceName);

  // Distinct label with extra internal spaces normalizes cleanly when saved
  const nextNormalized = sanitizeQuickSyncCustomDeviceName("Work   Phone") ?? "";
  assert.equal(nextNormalized, "Work Phone");
  const updated = setQuickSyncCustomDeviceName(nextNormalized);
  assert.equal(updated.customDeviceName, "Work Phone");
});

test("quick sync NetInfo double-fire coalescing (P1-25): preserves force=true across overlapping deferred check resets", () => {
  const {
    mergeDeferredQuickSyncCheck,
  } = require("@/modules/google-drive-backup/components/quick-sync-processor");

  // Reconnect event #1 schedules { requireNetworkMatch: true, force: true }
  const first = mergeDeferredQuickSyncCheck(null, {
    requireNetworkMatch: true,
    force: true,
  });
  assert.deepEqual(first, { requireNetworkMatch: true, force: true });

  // Reconnect event #2 (50ms later on Android) sends { requireNetworkMatch: true, force: false }
  const afterSecondNetInfo = mergeDeferredQuickSyncCheck(first, {
    requireNetworkMatch: true,
    force: false,
  });
  assert.deepEqual(
    afterSecondNetInfo,
    { requireNetworkMatch: true, force: true },
    "Second NetInfo event must not downgrade force=true to force=false",
  );

  // Startup check (requireNetworkMatch: false, force: true) followed by initial NetInfo event
  const startup = mergeDeferredQuickSyncCheck(null, {
    requireNetworkMatch: false,
    force: true,
  });
  const afterInitialNetInfo = mergeDeferredQuickSyncCheck(startup, {
    requireNetworkMatch: true,
    force: false,
  });
  assert.deepEqual(afterInitialNetInfo, {
    requireNetworkMatch: false,
    force: true,
  });
});


test('V2-02: single canonical quick sync file updates in-place and preserves user data', async () => {
  const files=[]; const payloads=new Map(); const calls=[]; const sessions=new Map(); let generated=0;
  mockFetchHandler=async (url,init={})=>{
    calls.push(init.method ?? 'GET');
    const parsed=new URL(url), q=parsed.searchParams.get('q') ?? '';
    let body;
    if(parsed.pathname.endsWith('/generateIds')) body={ids:['file-'+(++generated)]};
    else if(q.includes('mimeType')) body={files:[{id:'folder',name:'Backups'}]};
    else if((init.method === 'POST' || init.method === 'PATCH') && parsed.searchParams.get('uploadType') === 'resumable') {
      const metadata=JSON.parse(init.body);
      const targetId = init.method === 'PATCH' ? parsed.pathname.split('/').at(-1) : metadata.id;
      const location='https://www.googleapis.com/upload/drive/v3/files?upload_id=' + (targetId || ++generated);
      sessions.set(location,{ ...metadata, id: targetId });
      return {ok:true,status:200,headers:new Headers({location})};
    } else if(init.method === 'PUT') {
      const metadata=sessions.get(url);
      const file={...metadata,createdTime:'2026-11-21T00:00:00Z',modifiedTime:'2026-11-21T00:00:00Z',
        size:String(init.body.length),md5Checksum:require('node:crypto').createHash('md5').update(init.body).digest('hex')};
      const existingIdx = files.findIndex(f => f.id === file.id);
      if (existingIdx >= 0) files[existingIdx] = file;
      else files.push(file);
      payloads.set(file.id,Buffer.from(init.body));body=file;
    } else if(q) {
      if (q.includes("name = 'kaizen-finance-quick-sync.kfb'")) {
        const canonical = files.find(f => f.name === 'kaizen-finance-quick-sync.kfb' && !f.trashed);
        body = { files: canonical ? [canonical] : [] };
      } else {
        const offset=Number(parsed.searchParams.get('pageToken') ?? 0);
        body={files:files.slice(offset,offset+1),...(offset+1<files.length?{nextPageToken:String(offset+1)}:{})};
      }
    } else body=files.find(file=>parsed.pathname.endsWith('/'+file.id));
    return {ok:true,status:200,json:async()=>body};
  };
  const upload=(id, existingId=null)=>realUploadOrUpdateQuickSyncBackup('token',new Uint8Array([id.charCodeAt(0)]),existingId,{deviceId:id,deviceName:'Phone',syncRevisionId:id});
  const first=await upload('dev1');
  assert.equal(first.name, 'kaizen-finance-quick-sync.kfb');
  assert.equal(files.length, 1);
  assert.equal(files[0].appProperties.isQuickSync, 'true');

  // Second upload with same canonical file updates in-place
  const second=await upload('dev2', first.id);
  assert.equal(second.id, first.id);
  assert.equal(files.length, 1, 'Only 1 canonical file exists in Drive');
  assert.equal(payloads.get(first.id)[0], 'd'.charCodeAt(0));
  assert.ok(calls.includes('PATCH'), 'Existing file is updated in-place via PATCH');

  const meta=await realGetQuickSyncMetadata('token', first.id);
  assert.equal(meta.id, first.id);
  assert.equal(meta.name, 'kaizen-finance-quick-sync.kfb');
});


test('V2-02: competing publication retains dirty local state and cannot adopt self', async () => {
  saveOnboardingSettings({[ONBOARDING_SETTING_KEYS.status]:'completed',[ONBOARDING_SETTING_KEYS.workspaceMode]:'personal'});
  saveQuickSyncConfig({enabled:true});
  markQuickSyncLocalChangesPending();
  const before=getQuickSyncDeviceMetadata();
  mockUploadHandler=async()=>({id:'ours',modifiedTime:'2026-11-21T00:00:00Z',syncRevisionId:'ours',headRevisionId:'h',version:1,hasConcurrentRevisions:true,lastUpdatedByDeviceId:before.deviceId});
  assert.equal(await triggerQuickSync(),false);
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
  assert.equal(getQuickSyncState().status,'remote_ahead');
  assert.equal(getQuickSyncDeviceMetadata().lastKnownRemoteSyncId,before.lastKnownRemoteSyncId);
});


test('V2-02: explicit overwrite acknowledges the observed competing parents', async () => {
  saveOnboardingSettings({[ONBOARDING_SETTING_KEYS.status]:'completed',[ONBOARDING_SETTING_KEYS.workspaceMode]:'personal'});
  saveQuickSyncConfig({enabled:true});
  markQuickSyncLocalChangesPending();
  mockGetRemoteMetadataHandler=async()=>({id:'A',modifiedTime:'2026-11-21T00:00:00Z',hasConcurrentRevisions:true,tipTokens:['A','B']});
  mockUploadHandler=async(_token,_bytes,_file,properties)=>{
    assert.deepEqual(properties.parentTokens,['A','B']);
    return {id:'merge',syncRevisionId:properties.syncRevisionId,modifiedTime:'2026-11-21T01:00:00Z',headRevisionId:'merge-head',version:1};
  };
  assert.equal(await triggerQuickSync({forceOverwrite:true}),true);
  assert.equal(getQuickSyncState().status,'synced');
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,false);
});


test('V2-02: actual restore publishes the selected branch and preserves edits made during publication', async () => {
  mockReplaceDatabaseHandler=async snapshot=>{assert.deepEqual([...snapshot],[9]);};
  try {
    saveOnboardingSettings({[ONBOARDING_SETTING_KEYS.status]:'completed',[ONBOARDING_SETTING_KEYS.workspaceMode]:'personal'});
    saveQuickSyncConfig({enabled:true});
    mockGetRemoteMetadataHandler=async(_token,id,exact)=>{
      assert.equal(id,'selected'); assert.equal(exact,true);
      return {id:'selected',hasConcurrentRevisions:true,tipTokens:['selected','other'],modifiedTime:'2026-11-21T00:00:00Z'};
    };
    mockFetchHandler=async()=>({ok:true,status:200,arrayBuffer:async()=>new Uint8Array([1]).buffer});
    mockUploadHandler=async(_token,_bytes,_file,properties)=>{
      assert.deepEqual(properties.parentTokens,['selected','other']);
      const {isDatabaseReplacing}=require('@/infrastructure/database');
      assert.equal(isDatabaseReplacing(),false,'Network publication must not suppress local writes');
      markQuickSyncLocalChangesPending();
      return {id:'resolved',syncRevisionId:properties.syncRevisionId,modifiedTime:'2026-11-21T01:00:00Z'};
    };
    await require('@/modules/google-drive-backup/services/restore-google-drive-backup.service').restoreQuickSyncBackup('selected');
    assert.equal(getQuickSyncConfig().fileId,'resolved');
    assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
    assert.equal(getQuickSyncState().status,'idle');
  } finally {mockReplaceDatabaseHandler=null;}
});


function deferredOperation() {
  let resolve, reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function enablePersonalQuickSync() {
  saveOnboardingSettings({[ONBOARDING_SETTING_KEYS.status]:'completed',[ONBOARDING_SETTING_KEYS.workspaceMode]:'personal'});
  saveQuickSyncConfig({enabled:true});
  markQuickSyncLocalChangesPending();
}

test('V2-03: replacement drains active upload, drops stale completion, and blocks follow-up uploads', async () => {
  enablePersonalQuickSync();
  const {withQuickSyncReplacement,isQuickSyncReplacementPending}=require('@/infrastructure/sync');
  const started=deferredOperation(), upload=deferredOperation();
  let uploads=0;
  mockUploadHandler=async()=>{uploads++;started.resolve();await upload.promise;return {id:'stale',modifiedTime:'2026-11-22T00:00:00Z',syncRevisionId:'stale'};};
  const pending=triggerQuickSync();await started.promise;
  void triggerQuickSync(); // A queued follow-up must not survive replacement.
  let replaced=false;
  const replacement=withQuickSyncReplacement(async()=>{
    replaced=true;
    saveQuickSyncConfig({lastSyncedAt:null});
    clearQuickSyncRemoteBaselineOnManualRestore();
    setQuickSyncRuntimeStatus('idle');
  });
  assert.equal(isQuickSyncReplacementPending(),true);
  assert.equal(await triggerQuickSync(),false);
  assert.equal(await checkQuickSyncRemoteStatus({force:true}),'skipped');
  assert.equal(replaced,false);
  upload.resolve();
  assert.equal(await pending,false,'The invalidated upload must not publish metadata');
  await replacement;
  assert.equal(getQuickSyncDeviceMetadata().lastKnownRemoteSyncId,null);
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
  assert.equal(getQuickSyncState().status,'idle');
  assert.equal(uploads,1);
  assert.equal(isQuickSyncReplacementPending(),false);
});

test('V2-03: an in-flight remote check cannot adopt a baseline or upload after replacement', async () => {
  enablePersonalQuickSync();
  const {withQuickSyncReplacement}=require('@/infrastructure/sync');
  const started=deferredOperation(), read=deferredOperation();let uploads=0;
  mockGetRemoteMetadataHandler=async()=>{started.resolve();return read.promise;};
  mockUploadHandler=async()=>{uploads++;throw new Error('Unexpected upload');};
  const check=checkQuickSyncRemoteStatus({force:true});await started.promise;
  const replacement=withQuickSyncReplacement(async()=>{clearQuickSyncRemoteBaselineOnManualRestore();});
  read.resolve(null);
  assert.equal(await check,'skipped');await replacement;
  assert.equal(uploads,0);
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
  assert.equal(getQuickSyncDeviceMetadata().lastKnownRemoteFileId,null);
});

test('V2-03: disable and disconnect invalidate late upload success/failure without resurrecting state', async () => {
  for (const disconnect of [false,true]) {
    enablePersonalQuickSync();
    const cachedConfig = getQuickSyncConfig();
    const started=deferredOperation(), upload=deferredOperation();
    mockUploadHandler=async()=>{started.resolve();return upload.promise;};
    const pending=triggerQuickSync();await started.promise;
    if(disconnect) resetQuickSyncConnection();else await setQuickSyncEnabled(false);
    if(disconnect) upload.reject(new Error('Late network failure'));
    else upload.resolve({id:'stale',modifiedTime:'2026-11-22T00:00:00Z'});
    assert.equal(await pending,false);
    assert.equal(getQuickSyncConfig().enabled,false);
    assert.equal(getQuickSyncState().status,'disabled');
    assert.equal(getQuickSyncDeviceMetadata().lastKnownRemoteFileId,null);
    assert.equal(await triggerQuickSync({config:cachedConfig}),false);
    assert.equal(await checkQuickSyncRemoteStatus({force:true,config:cachedConfig}),'skipped');
  }
});

test('V2-03: failed replacement releases the gate and clears a stale syncing status', async () => {
  enablePersonalQuickSync();
  const {withQuickSyncReplacement,isQuickSyncReplacementPending}=require('@/infrastructure/sync');
  const started=deferredOperation(), upload=deferredOperation();
  mockUploadHandler=async()=>{started.resolve();return upload.promise;};
  const pending=triggerQuickSync();await started.promise;
  const restore=withQuickSyncReplacement(async()=>{throw new Error('Restore rejected');});
  const rejected=assert.rejects(restore,/Restore rejected/);
  upload.resolve({id:'stale',modifiedTime:'2026-11-22T00:00:00Z'});
  await pending;await rejected;
  assert.equal(isQuickSyncReplacementPending(),false);
  assert.equal(getQuickSyncState().status,'idle');
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
});


test('V2-07: failed large upload preserves the last-success timestamp and dirty local state', async()=>{
  saveOnboardingSettings({[ONBOARDING_SETTING_KEYS.status]:'completed',[ONBOARDING_SETTING_KEYS.workspaceMode]:'personal'});
  const last='2026-11-20T00:00:00Z';
  saveQuickSyncConfig({enabled:true,fileId:'old-file',lastSyncedAt:last});
  markQuickSyncLocalChangesPending();
  mockGetRemoteMetadataHandler=async()=>null;
  mockCreateArchiveHandler=async()=>({bytes:new Uint8Array(6*1024*1024),createdAt:new Date()});
  mockUploadHandler=async(_token,bytes)=>{assert.ok(bytes.length>5*1024*1024);throw new Error('Upload interrupted. Try again.');};
  assert.equal(await triggerQuickSync(),false);
  assert.equal(getQuickSyncConfig().lastSyncedAt,last);
  assert.equal(getQuickSyncConfig().fileId,'old-file');
  assert.equal(getQuickSyncDeviceMetadata().hasUnsyncedLocalChanges,true);
  assert.equal(getQuickSyncState().status,'error');
});
