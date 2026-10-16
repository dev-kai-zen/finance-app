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
  resetPasswordWithBiometrics,
  removePasswordWithBiometrics,
  clearAllSecurityCredentials,
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

test("security (Option 1): resetPasswordWithBiometrics resets password without current password when biometric succeeds", async () => {
  await setPassword("oldPassword123");
  await setBiometricsEnabled(true);

  // Biometric reset should succeed without requiring old password
  mockBiometricPromptSuccess = true;
  const resetRes = await resetPasswordWithBiometrics("newPassword999");
  assert.equal(resetRes.success, true);

  // Verify new password is active and old password fails
  const newCheck = await verifyCurrentPassword("newPassword999");
  assert.equal(newCheck.success, true);

  const oldCheck = await verifyCurrentPassword("oldPassword123");
  assert.equal(oldCheck.success, false);
});

test("security (Option 1): resetPasswordWithBiometrics fails if biometric prompt is cancelled or rejected", async () => {
  await setPassword("existingPass");
  await setBiometricsEnabled(true);

  mockBiometricPromptSuccess = false;
  const resetRes = await resetPasswordWithBiometrics("anotherPass");
  assert.equal(resetRes.success, false);

  // Original password remains untouched
  const check = await verifyCurrentPassword("existingPass");
  assert.equal(check.success, true);
});

test("security (Option 1): removePasswordWithBiometrics removes password with biometric verification", async () => {
  await setPassword("tempPass");
  await setBiometricsEnabled(true);

  mockBiometricPromptSuccess = true;
  const removeRes = await removePasswordWithBiometrics();
  assert.equal(removeRes.success, true);

  const config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, false);
  assert.equal(config.isBiometricsEnabled, false);
});

test("security (Option 3): clearAllSecurityCredentials wipes all security keys from storage", async () => {
  await setPassword("secret123");
  await setBiometricsEnabled(true);

  let config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, true);
  assert.equal(config.isBiometricsEnabled, true);

  await clearAllSecurityCredentials();

  config = await getSecurityConfig();
  assert.equal(config.isPasswordSet, false);
  assert.equal(config.isBiometricsEnabled, false);
});
