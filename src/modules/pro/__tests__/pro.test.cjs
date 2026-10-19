const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

const secureStorageMock = new Map();

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

Module._load = function (request, parent, ...rest) {
  if (request === "react-native") {
    return {
      Platform: { OS: "android" },
      StyleSheet: {
        create: (s) => s,
      },
      View: () => null,
      Text: () => null,
      Pressable: () => null,
      Modal: () => null,
      ActivityIndicator: () => null,
      Alert: { alert: () => {} },
      ScrollView: () => null,
    };
  }

  if (request === "expo-secure-store") {
    return {
      isAvailableAsync: async () => true,
      getItemAsync: async (key) => secureStorageMock.get(key) ?? null,
      setItemAsync: async (key, value) => {
        secureStorageMock.set(key, String(value));
      },
      deleteItemAsync: async (key) => {
        secureStorageMock.delete(key);
      },
      AFTER_FIRST_UNLOCK: "AFTER_FIRST_UNLOCK",
    };
  }

  if (request === "react-native-purchases") {
    return {
      LOG_LEVEL: { DEBUG: "DEBUG", INFO: "INFO" },
      setLogLevel: () => {},
      configure: () => {},
      getOfferings: async () => ({
        current: null,
      }),
      purchasePackage: async () => ({
        customerInfo: {
          entitlements: {
            active: {
              pro: { identifier: "pro" },
            },
          },
        },
      }),
      restorePurchases: async () => ({
        entitlements: {
          active: {},
        },
      }),
      getCustomerInfo: async () => ({
        entitlements: {
          active: {},
        },
      }),
    };
  }

  return originalLoad.call(this, request, parent, ...rest);
};

// TypeScript loader hook
require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const proRepo = require("../repositories/pro-storage.repository");
const proService = require("../services/pro-status.service");
const proBilling = require("../services/pro-billing.service");
const { PRO_CONSTANTS } = require("../constants/pro.constants");

beforeEach(() => {
  secureStorageMock.clear();
});

afterEach(() => {
  secureStorageMock.clear();
});

test("pro repository: returns isPro false and null fields initially", async () => {
  const state = await proRepo.readCachedProState();
  assert.equal(state.isPro, false);
  assert.equal(state.unlockedAt, null);
  assert.equal(state.productId, null);
  assert.equal(state.isDevSimulated, false);
});

test("pro repository: writes and reads cached pro unlock", async () => {
  await proRepo.writeCachedProUnlock("kaizen_pro_lifetime");
  const state = await proRepo.readCachedProState();
  assert.equal(state.isPro, true);
  assert.equal(state.productId, "kaizen_pro_lifetime");
  assert.ok(state.unlockedAt);
});

test("pro repository: clears cached pro unlock correctly", async () => {
  await proRepo.writeCachedProUnlock("kaizen_pro_lifetime");
  let state = await proRepo.readCachedProState();
  assert.equal(state.isPro, true);

  await proRepo.clearCachedProUnlock();
  state = await proRepo.readCachedProState();
  assert.equal(state.isPro, false);
  assert.equal(state.productId, null);
});

test("pro repository: dev simulation flag overrides pro status", async () => {
  await proRepo.writeDevSimulatedPro(true);
  const state = await proRepo.readCachedProState();
  assert.equal(state.isDevSimulated, true);
  assert.equal(state.isPro, true);

  await proRepo.writeDevSimulatedPro(false);
  const clearedState = await proRepo.readCachedProState();
  assert.equal(clearedState.isDevSimulated, false);
  assert.equal(clearedState.isPro, false);
});

test("pro billing: returns fallback offering package when remote is unconfigured", async () => {
  const pkg = await proBilling.fetchProPackage();
  assert.equal(pkg.productId, PRO_CONSTANTS.LIFETIME_PRODUCT_ID);
  assert.equal(pkg.priceString, PRO_CONSTANTS.FALLBACK_PRICE);
});

test("pro service: initializes and notifies listeners of pro status changes", async () => {
  let receivedState = null;
  const unsubscribe = proService.subscribeToProStatus((state) => {
    receivedState = state;
  });

  await proService.setDevSimulationMode(true);
  assert.ok(receivedState);
  assert.equal(receivedState.isPro, true);
  assert.equal(receivedState.source, "dev_simulation");

  await proService.setDevSimulationMode(false);
  assert.equal(receivedState.isPro, false);

  unsubscribe();
});

test("pro service: simulates purchase in sandbox mode when no remote key is set", async () => {
  const result = await proService.purchasePro();
  assert.equal(result.success, true);
  assert.equal(result.isPro, true);

  const status = proService.getCurrentProStatus();
  assert.equal(status.isPro, true);

  await proService.resetProStatusForTesting();
  const resetStatus = proService.getCurrentProStatus();
  assert.equal(resetStatus.isPro, false);
});

