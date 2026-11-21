const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
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
  ACCOUNT_CSV_HEADERS,
  accountToCsvRow,
  buildAccountsCsv,
  createAccountsCsvFileName,
  escapeCsvCell,
  formatMinorUnitsForCsv,
} = require("../utils/accounts-csv.ts");

const mockAccount = {
  id: "acc_1",
  accountTypeId: "type_bank",
  name: "BPI Savings",
  note: 'Main "salary" account',
  iconKey: "bank",
  currencyCode: "PHP",
  openingBalanceMinorUnits: 1000000,
  openingBalanceAt: new Date("2026-01-01T00:00:00Z"),
  startingBalanceLocked: true,
  hideFromSelection: false,
  hideFromReports: false,
  pocketEnabled: true,
  maintainingBalanceMinorUnits: 300000,
  isArchived: false,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T10:00:00Z"),
  updatedAt: new Date("2026-01-15T15:30:00Z"),
  accountType: {
    id: "type_bank",
    name: "Bank",
    accountGroup: "asset",
    color: "#2563eb",
  },
  creditCardDetails: null,
  currentBalanceMinorUnits: 2545075,
};

const mockPockets = [
  {
    id: "pkt_1",
    accountId: "acc_1",
    name: "Emergency Fund",
    isArchived: false,
    sortOrder: 0,
    createdAt: new Date("2026-01-02T10:00:00Z"),
    updatedAt: new Date("2026-01-02T10:00:00Z"),
    currentBalanceMinorUnits: 1500000,
  },
  {
    id: "pkt_2",
    accountId: "acc_1",
    name: "Vacation",
    isArchived: false,
    sortOrder: 1,
    createdAt: new Date("2026-01-03T10:00:00Z"),
    updatedAt: new Date("2026-01-03T10:00:00Z"),
    currentBalanceMinorUnits: 500000,
  },
];

test("accounts-csv: escapeCsvCell handles quotes and special characters", () => {
  assert.equal(escapeCsvCell("Checking"), "Checking");
  assert.equal(escapeCsvCell('Hello "World"'), '"Hello ""World"""');
  assert.equal(escapeCsvCell("Bank, Inc."), '"Bank, Inc."');
});

test("accounts-csv: formatMinorUnitsForCsv renders user-friendly decimal strings", () => {
  assert.equal(formatMinorUnitsForCsv(10000, "PHP"), "100.00");
  assert.equal(formatMinorUnitsForCsv(2545075, "PHP"), "25450.75");
  assert.equal(formatMinorUnitsForCsv(-50050, "USD"), "-500.50");
  assert.equal(formatMinorUnitsForCsv(1500, "JPY"), "1500");
  assert.equal(formatMinorUnitsForCsv(0, "PHP"), "0.00");
});

test("accounts-csv: accountToCsvRow properly maps all account fields and pockets summary", () => {
  const row = accountToCsvRow(mockAccount, mockPockets);

  assert.equal(row[0], "acc_1"); // Account ID
  assert.equal(row[1], "BPI Savings"); // Account Name
  assert.equal(row[2], "Bank"); // Account Type
  assert.equal(row[3], "asset"); // Account Group
  assert.equal(row[4], "PHP"); // Currency
  assert.equal(row[5], "25450.75"); // Current Balance (Decimal, not 2545075)
  assert.equal(row[6], "10000.00"); // Opening Balance
  assert.equal(row[8], "true"); // Locked Starting Balance
  assert.equal(row[9], "3000.00"); // Maintaining Balance
  assert.equal(row[13], "true"); // Pockets Enabled
  assert.equal(
    row[14],
    "Emergency Fund (15000.00); Vacation (5000.00)", // Pockets Summary
  );
  assert.equal(row[15], "false"); // Hide From Selection
  assert.equal(row[16], "false"); // Hide From Reports
  assert.equal(row[17], "false"); // Archived
  assert.equal(row[18], 'Main "salary" account'); // Note
});

test("accounts-csv: buildAccountsCsv includes headers and formatted rows with CRLF", () => {
  const csv = buildAccountsCsv([mockAccount], mockPockets);
  const lines = csv.split("\r\n");

  assert.equal(lines.length, 2);
  assert.equal(lines[0], ACCOUNT_CSV_HEADERS.join(","));
  assert.match(lines[1], /"Main ""salary"" account"/);
  assert.match(lines[1], /25450\.75/);
});

test("accounts-csv: createAccountsCsvFileName produces accounts- timestamped name", () => {
  const fixedDate = new Date(2026, 10, 18, 14, 30, 0); // Nov 18, 2026
  const fileName = createAccountsCsvFileName(fixedDate);
  assert.equal(fileName, "accounts-2026-11-18-143000.csv");
});

test("accounts-csv (P1-22): shareAccountsCsv keeps active cache file intact after shareAsync and prunes stale exports", async () => {
  const originalLoad = Module._load;
  const createdFiles = new Map();
  const sharedCalls = [];
  let deletedUris = [];

  class MockFile {
    constructor(...parts) {
      const normalized = parts.map((p) => (typeof p === "string" ? p : p.uri));
      this.uri = normalized.join("/");
      this.name = this.uri.split("/").pop();
      this.exists = createdFiles.has(this.uri);
      this.lastModified = createdFiles.get(this.uri)?.lastModified ?? null;
    }
    create() {
      this.exists = true;
      this.lastModified = Date.now();
      createdFiles.set(this.uri, { bytes: null, lastModified: this.lastModified });
    }
    write(bytes) {
      this.exists = true;
      this.lastModified = Date.now();
      createdFiles.set(this.uri, { bytes, lastModified: this.lastModified });
    }
    delete() {
      this.exists = false;
      deletedUris.push(this.uri);
      createdFiles.delete(this.uri);
    }
  }

  let cacheDirExists = true;
  class MockDirectory {
    constructor(...parts) {
      const normalized = parts.map((p) => (typeof p === "string" ? p : p.uri));
      this.uri = normalized.join("/");
      this.exists = cacheDirExists;
    }
    create() {
      cacheDirExists = true;
      this.exists = true;
    }
    list() {
      return Array.from(createdFiles.entries())
        .filter(([uri]) => uri.startsWith(`${this.uri}/`))
        .map(([uri, entry]) => {
          const f = new MockFile(uri);
          f.exists = true;
          f.lastModified = entry.lastModified;
          return f;
        });
    }
  }

  // Seed one stale file (20 min old) and one recent file (1 min old)
  const staleUri = "file:///cache/accounts-csv-exports/accounts-stale.csv";
  const recentUri = "file:///cache/accounts-csv-exports/accounts-recent.csv";
  createdFiles.set(staleUri, {
    bytes: new Uint8Array([1]),
    lastModified: Date.now() - 20 * 60 * 1000,
  });
  createdFiles.set(recentUri, {
    bytes: new Uint8Array([2]),
    lastModified: Date.now() - 60 * 1000,
  });

  Module._load = function (request, parent, ...rest) {
    if (request === "expo-crypto") {
      return { randomUUID: () => "12345678-abcd-ef00-1234-567890abcdef" };
    }
    if (request === "expo-file-system") {
      return {
        Directory: MockDirectory,
        File: MockFile,
        Paths: { cache: { uri: "file:///cache" } },
      };
    }
    if (request === "expo-sharing") {
      return {
        isAvailableAsync: async () => true,
        shareAsync: async (uri, options) => {
          sharedCalls.push({ uri, options });
        },
      };
    }
    if (request === "@/infrastructure/telemetry") {
      return { logTelemetryEvent: () => {} };
    }
    if (request === "@/modules/security") {
      return {
        appLockLifecycle: {
          withLockSuspended: async (fn) => fn(),
        },
      };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };

  try {
    const { shareAccountsCsv } = require("../services/export-accounts-csv.service.ts");
    await shareAccountsCsv([mockAccount], mockPockets);

    assert.equal(sharedCalls.length, 1);
    const sharedUri = sharedCalls[0].uri;
    assert.ok(sharedUri.startsWith("file:///cache/accounts-csv-exports/accounts-"));
    assert.equal(sharedCalls[0].options.mimeType, "text/csv");
    assert.equal(sharedCalls[0].options.UTI, "public.comma-separated-values-text");

    // Newly shared file must remain on disk after shareAsync resolves
    assert.equal(createdFiles.has(sharedUri), true);
    assert.equal(deletedUris.includes(sharedUri), false);

    // Stale (>15m) export was cleaned up, while recent (<15m) export was preserved
    assert.equal(createdFiles.has(staleUri), false);
    assert.equal(createdFiles.has(recentUri), true);
  } finally {
    Module._load = originalLoad;
  }
});

test("ads (P1-22): iOS subscriptions banner placement falls back to iOS default unit ID, never Android", () => {
  const originalLoad = Module._load;
  const originalDev = globalThis.__DEV__;
  const savedEnv = {
    EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS:
      process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS,
    EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SUBSCRIPTIONS:
      process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SUBSCRIPTIONS,
    EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS:
      process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS,
  };

  globalThis.__DEV__ = false;
  delete process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS;
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID_SUBSCRIPTIONS =
    "ca-app-pub-android-only/1111";
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS = "ca-app-pub-ios-default/2222";

  Module._load = function (request, parent, ...rest) {
    if (request === "react-native") {
      return { Platform: { OS: "ios" } };
    }
    if (request === "react-native-google-mobile-ads") {
      return { TestIds: { BANNER: "ca-app-pub-test/banner" } };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };

  try {
    const adsPath = require.resolve("@/modules/ads/constants/ads.constants.ts");
    delete require.cache[adsPath];
    const { getBannerAdUnitId } = require("@/modules/ads/constants/ads.constants.ts");

    assert.equal(
      getBannerAdUnitId("subscriptions"),
      "ca-app-pub-ios-default/2222",
      "iOS subscriptions placement must fall back to EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS",
    );

    delete process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS;
    assert.equal(
      getBannerAdUnitId("subscriptions"),
      "ca-app-pub-test/banner",
      "When no iOS default unit ID is set, must fall back to TestIds.BANNER, never Android",
    );

    process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS_SUBSCRIPTIONS =
      "ca-app-pub-ios-subs/3333";
    assert.equal(
      getBannerAdUnitId("subscriptions"),
      "ca-app-pub-ios-subs/3333",
    );
  } finally {
    Module._load = originalLoad;
    globalThis.__DEV__ = originalDev;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('P2-11d: account export protects formula-like text while preserving negative numeric balances', () => {
  const { parseCsv } = require('../../data-import/utils/csv.ts');
  for (const value of ['=1+1', '+SUM(1,2)', '-formula', '@value', '\t=1+1', "'=literal", "'ordinary"]) {
    const account = { ...mockAccount, name: value.trim(), note: value, isArchived: true,
      openingBalanceMinorUnits: -10000, currentBalanceMinorUnits: -25000 };
    const cells = accountToCsvRow(account);
    assert.ok(cells[1].startsWith("'")); assert.ok(cells[18].startsWith("'"));
    assert.equal(cells[5], '-250.00'); assert.equal(cells[6], '-100.00'); assert.equal(cells[17], 'true');
    const roundTrip = parseCsv(buildAccountsCsv([account]));
    assert.equal(roundTrip.rows[0].cells[1], value.trim());
    assert.equal(roundTrip.rows[0].cells[18], value.trim());
  }
  const external = parseCsv("Account,Note\nCash,'=literal");
  assert.equal(external.rows[0].cells[1], "'=literal", 'Do not unescape unrelated CSV formats');
});
