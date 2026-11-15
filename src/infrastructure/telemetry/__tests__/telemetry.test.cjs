const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
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

let loggedEvents = [];
let recordedErrors = [];
let perfTraces = [];

const mockAnalytics = {
  logEvent: (instance, name, params) => {
    loggedEvents.push({ name, params });
  },
  setAnalyticsCollectionEnabled: async () => {},
};

const mockCrashlytics = {
  recordError: (instance, error) => {
    recordedErrors.push(error);
  },
  setAttribute: async () => {},
  setCrashlyticsCollectionEnabled: async () => {},
};

const mockPerf = {
  trace: (instance, name) => {
    perfTraces.push(name);
    return {
      start: () => {},
      stop: () => {},
      putMetric: () => {},
      putAttribute: () => {},
    };
  },
};

Module._load = function (request, ...args) {
  if (request === "@react-native-firebase/app") {
    return {
      getApps: () => [{ name: "[DEFAULT]" }],
      getApp: () => ({ name: "[DEFAULT]" }),
    };
  }
  if (request === "@react-native-firebase/analytics") {
    return {
      getAnalytics: () => ({}),
      logEvent: mockAnalytics.logEvent,
      setAnalyticsCollectionEnabled: mockAnalytics.setAnalyticsCollectionEnabled,
    };
  }
  if (request === "@react-native-firebase/crashlytics") {
    return {
      getCrashlytics: () => ({}),
      recordError: mockCrashlytics.recordError,
      setAttribute: mockCrashlytics.setAttribute,
      setCrashlyticsCollectionEnabled: mockCrashlytics.setCrashlyticsCollectionEnabled,
    };
  }
  if (request === "@react-native-firebase/perf") {
    return {
      getPerformance: () => ({
        dataCollectionEnabled: true,
        instrumentationEnabled: true,
      }),
      trace: mockPerf.trace,
    };
  }
  if (request === "react-native") {
    return {
      Platform: { OS: "android" },
      InteractionManager: {
        runAfterInteractions: (cb) => {
          cb();
          return { cancel: () => {} };
        },
      },
    };
  }
  if (request === "@/utils/schedule-after-interactions") {
    return {
      scheduleAfterInteractions: (cb) => {
        cb();
        return () => {};
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(code, filename);
};

const telemetry = require("../index.ts");

test("telemetry: logTelemetryEvent filters out financial PII parameters strictly", async () => {
  loggedEvents = [];
  await telemetry.syncTelemetryConsent({
    usageAnalyticsEnabled: true,
    crashReportsEnabled: true,
  });

  telemetry.logTelemetryEvent("transaction_created", {
    type: "expense",
    has_category: true,
    has_labels: false,
    has_attachments: false,
    is_split: false,
    // Inject accidental forbidden fields to test the privacy barrier
    amount: 1500,
    balance: 50000,
    note: "Secret personal loan",
    account_number: "1234-5678",
  });

  assert.equal(loggedEvents.length, 1);
  const event = loggedEvents[0];
  assert.equal(event.name, "transaction_created");
  assert.equal(event.params.type, "expense");
  assert.equal(event.params.has_category, true);
  // Ensure all forbidden fields were stripped out completely
  assert.equal(event.params.amount, undefined);
  assert.equal(event.params.balance, undefined);
  assert.equal(event.params.note, undefined);
  assert.equal(event.params.account_number, undefined);
});

test("telemetry: does not dispatch analytics events when usage analytics is opted out", async () => {
  loggedEvents = [];
  await telemetry.syncTelemetryConsent({
    usageAnalyticsEnabled: false,
    crashReportsEnabled: true,
  });

  telemetry.logTelemetryEvent("transaction_created", {
    type: "income",
    has_category: true,
    has_labels: false,
    has_attachments: false,
    is_split: false,
  });

  assert.equal(loggedEvents.length, 0);
});

test("telemetry: performance trace is a no-op when diagnostics are disabled", async () => {
  perfTraces = [];
  await telemetry.syncTelemetryConsent({
    usageAnalyticsEnabled: true,
    crashReportsEnabled: false,
  });

  const trace = telemetry.startPerformanceTrace("csv_import_parse");
  trace.putMetric("rows", 50);
  trace.stop();

  assert.equal(perfTraces.length, 0);
});

test("telemetry: crashlytics does not record errors when crash reporting is disabled", async () => {
  recordedErrors = [];
  await telemetry.syncTelemetryConsent({
    usageAnalyticsEnabled: true,
    crashReportsEnabled: false,
  });

  telemetry.recordCrashlyticsError(new Error("Test error"));
  assert.equal(recordedErrors.length, 0);
});
