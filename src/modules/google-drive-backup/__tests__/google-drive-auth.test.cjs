const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, imports, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, setTimeout, clearTimeout,
    require(name) { assert.ok(name in imports, "Unexpected dependency: " + name); return imports[name]; },
    ...extra,
  });
  return exports;
}

async function setup(t, options = {}) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 100000 });
  let appStateListener;
  const { appLockLifecycle } = load("../../security/services/app-lock-lifecycle.service.ts", {
    "react-native": { Platform: { OS: "android" }, AppState: { addEventListener(name, callback) {
      appStateListener = callback; return { remove() {} };
    } } },
    "./security-state.service": { getSecurityConfig: async () => ({ isPasswordSet: true, autoLockTimeoutMs: 0 }) },
  });
  await appLockLifecycle.initialize(); appLockLifecycle.unlock();
  async function nativeRoundTrip() {
    assert.equal(appLockLifecycle.isSuspended(), true, "Suspend before native dialogs open");
    await appStateListener("inactive");
    await appStateListener("background");
    await appStateListener("active");
    assert.equal(appLockLifecycle.getIsLocked(), false, "Returning from authorized dialog must not lock");
  }
  const scopes = ["https://www.googleapis.com/auth/drive.appdata", "https://www.googleapis.com/auth/drive.file"];
  let consentCalls = 0;
  const google = {
    GoogleOneTapSignIn: {
      configure() { assert.equal(appLockLifecycle.isSuspended(), true); },
      async checkPlayServices() {
        await nativeRoundTrip();
        if (options.failure === "play-services") throw new Error("Play Services failed");
      },
      async presentExplicitSignIn() {
        await nativeRoundTrip();
        if (options.failure === "sign-in") throw new Error("Sign-in failed");
        return { type: options.cancelled ? "cancelled" : options.unexpected ? "unexpected" : "success",
          data: { scopes: options.needsConsent ? [] : scopes,
            user: { id: "user", email: "user@example.test", name: "Test User" } } };
      },
      async requestScopes(requested) {
        consentCalls++;
        assert.equal(requested.length, 2);
        await nativeRoundTrip();
        if (options.failure === "consent") throw new Error("Consent failed");
        return { accessToken: options.denied ? null : "test-token" };
      },
    },
    isCancelledResponse: response => response.type === "cancelled",
    isSuccessResponse: response => response.type === "success",
  };
  const auth = load("../services/google-drive-auth.service.ts", {
    "expo-constants": { default: { appOwnership: "standalone", expoVersion: null } },
    "@/modules/security": { appLockLifecycle },
    "react-native-nitro-google-signin": google,
  }, { process: { env: { EXPO_OS: "android", EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: options.unconfigured ? "" : "test-client" } } });
  return {
    ...auth, appLockLifecycle,
    get consentCalls() { return consentCalls; },
    async assertLockRestored() {
      t.mock.timers.tick(2501);
      assert.equal(appLockLifecycle.isSuspended(), false, "Finally must release the sign-in suspension");
      await appStateListener("background"); await appStateListener("active");
      assert.equal(appLockLifecycle.getIsLocked(), true, "A normal background/resume still locks immediately");
    },
  };
}

test("P2-10: Google connect protects Play Services, account picker and Drive consent while preserving auto-lock afterward", async t => {
  const auth = await setup(t, { needsConsent: true });
  const user = await auth.connectGoogleDrive();
  assert.equal(user.id, "user"); assert.equal(user.email, "user@example.test");
  assert.equal(auth.consentCalls, 1);
  assert.equal(auth.appLockLifecycle.getIsLocked(), false);
  await auth.assertLockRestored();
});

test("P2-10: existing grants skip consent and picker cancellation releases suspension", async t => {
  const auth = await setup(t, { cancelled: true });
  assert.equal(await auth.connectGoogleDrive(), null);
  assert.equal(auth.consentCalls, 0);
  await auth.assertLockRestored();
});

test("P2-10: already-granted scopes return a user without requesting more permission", async t => {
  const auth = await setup(t);
  assert.equal((await auth.connectGoogleDrive()).name, "Test User");
  assert.equal(auth.consentCalls, 0);
  await auth.assertLockRestored();
});

for (const failure of ["play-services", "sign-in", "consent"]) {
  test("P2-10: " + failure + " failures restore auto-lock", async t => {
    const auth = await setup(t, { failure, needsConsent: true });
    await assert.rejects(auth.connectGoogleDrive(), /failed/i);
    await auth.assertLockRestored();
  });
}

test("P2-10: rejected Drive permission restores auto-lock", async t => {
  const auth = await setup(t, { needsConsent: true, denied: true });
  await assert.rejects(auth.connectGoogleDrive(), /permission is required/);
  await auth.assertLockRestored();
});

test("P2-10: configuration errors and unexpected responses release suspension", async t => {
  const auth = await setup(t, { unconfigured: true });
  await assert.rejects(auth.connectGoogleDrive(), /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  await auth.assertLockRestored();
});

test("P2-10: unexpected sign-in response releases suspension", async t => {
  const auth = await setup(t, { unexpected: true });
  await assert.rejects(auth.connectGoogleDrive(), /could not be completed/);
  await auth.assertLockRestored();
});

test("P2-10: connect preserves an outer app-lock suspension", async t => {
  const auth = await setup(t);
  auth.appLockLifecycle.pauseAutoLock();
  await auth.connectGoogleDrive();
  t.mock.timers.tick(2501);
  assert.equal(auth.appLockLifecycle.isSuspended(), true, "Do not release another operation's suspension");
  auth.appLockLifecycle.resumeAutoLock();
  await auth.assertLockRestored();
});
