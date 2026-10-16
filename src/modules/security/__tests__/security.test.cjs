const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const nodeCrypto = require("node:crypto");
const ts = require("typescript");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

// Mock storage
const secureStorageMock = new Map();

// Mock biometrics state
let mockBiometricsHardware = true;
let mockBiometricsEnrolled = true;
let mockBiometricPromptSuccess = true;

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
      Platform: { OS: "ios" },
      AppState: {
        addEventListener: () => ({ remove: () => {} }),
      },
      StyleSheet: {
        create: (s) => s,
        absoluteFill: {},
      },
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

  if (request === "expo-crypto") {
    return {
      getRandomBytesAsync: async (count) => nodeCrypto.randomBytes(count),
      randomUUID: () => nodeCrypto.randomUUID(),
      digestStringAsync: async (algo, str) =>
        nodeCrypto.createHash("sha256").update(str).digest("hex"),
      CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    };
  }

  if (request === "expo-local-authentication") {
    return {
      hasHardwareAsync: async () => mockBiometricsHardware,
      isEnrolledAsync: async () => mockBiometricsEnrolled,
      supportedAuthenticationTypesAsync: async () => [1],
      authenticateAsync: async () => ({
        success: mockBiometricPromptSuccess,
        error: mockBiometricPromptSuccess ? undefined : "Cancelled",
      }),
      AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
      },
    };
  }

  return originalLoad.call(this, request, parent, ...rest);
};

require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const {
  getSecurityConfig,
  setPassword,
  verifyCurrentPassword,
  removePassword,
  setBiometricsEnabled,
} = require("../services/security-state.service");
const { appLockLifecycle } = require("../services/app-lock-lifecycle.service");

beforeEach(() => {
  secureStorageMock.clear();
  mockBiometricsHardware = true;
  mockBiometricsEnrolled = true;
  mockBiometricPromptSuccess = true;
  appLockLifecycle.unlock();
});

afterEach(() => {
  secureStorageMock.clear();
});

test("security: initial state has no password and biometrics disabled", async () => {
  const config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, false);
  assert.equal(config.isBiometricsEnabled, false);
});

test("security: setting password enables isPasswordSet and validates verification", async () => {
  const setRes = await setPassword("testPassword123");
  assert.equal(setRes.success, true);

  const config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, true);
  assert.equal(config.isBiometricsEnabled, false);

  const valid = await verifyCurrentPassword("testPassword123");
  assert.equal(valid.success, true);

  const invalid = await verifyCurrentPassword("wrongPassword");
  assert.equal(invalid.success, false);
});

test("security: changing password requires valid current password", async () => {
  await setPassword("initialPassword");

  const wrongChange = await setPassword("newPassword", "badCurrent");
  assert.equal(wrongChange.success, false);

  const validChange = await setPassword("newPassword", "initialPassword");
  assert.equal(validChange.success, true);

  const testNew = await verifyCurrentPassword("newPassword");
  assert.equal(testNew.success, true);

  const testOld = await verifyCurrentPassword("initialPassword");
  assert.equal(testOld.success, false);
});

test("security: cannot enable fingerprint without a password", async () => {
  const result = await setBiometricsEnabled(true);
  assert.equal(result.success, false);
  assert.match(result.error, /set a password/i);
});

test("security: enabling fingerprint works after password is set", async () => {
  await setPassword("securePass");
  const result = await setBiometricsEnabled(true);
  assert.equal(result.success, true);

  const config = await getSecurityConfig();
  assert.equal(config.isBiometricsEnabled, true);
});

test("security: disabling fingerprint turns it off", async () => {
  await setPassword("securePass");
  await setBiometricsEnabled(true);

  const disableRes = await setBiometricsEnabled(false);
  assert.equal(disableRes.success, true);

  const config = await getSecurityConfig();
  assert.equal(config.isBiometricsEnabled, false);
  assert.equal(config.isPasswordSet, true);
});

test("security: removing password clears credentials and disables fingerprint", async () => {
  await setPassword("securePass");
  await setBiometricsEnabled(true);

  const removeFail = await removePassword("wrongPassword");
  assert.equal(removeFail.success, false);

  const removeOk = await removePassword("securePass");
  assert.equal(removeOk.success, true);

  const config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, false);
  assert.equal(config.isBiometricsEnabled, false);
});

test("security: appLockLifecycle manages lock state and subscription", async () => {
  let latestLocked = false;
  const unsubscribe = appLockLifecycle.subscribe((locked) => {
    latestLocked = locked;
  });

  appLockLifecycle.lock();
  assert.equal(appLockLifecycle.getIsLocked(), true);
  assert.equal(latestLocked, true);

  appLockLifecycle.unlock();
  assert.equal(appLockLifecycle.getIsLocked(), false);
  assert.equal(latestLocked, false);

  unsubscribe();
});
