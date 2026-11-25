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

test("ST-F08 fix: scheduledTransactions keys exist in en, fil, and es", () => {
  const { en } = require("@/infrastructure/localization/translations/en");
  const { fil } = require("@/infrastructure/localization/translations/fil");
  const { es } = require("@/infrastructure/localization/translations/es");

  const requiredPrefixes = [
    "needsAttention",
    "recurrence.monthly",
    "postingMode.autoPost",
    "status.active",
    "occurrence.due",
    "fallback.unknownAccount",
  ];

  for (const prefix of requiredPrefixes) {
    const parts = prefix.split(".");
    let enNode = en.scheduledTransactions;
    let filNode = fil.scheduledTransactions;
    let esNode = es.scheduledTransactions;
    for (const part of parts) {
      enNode = enNode?.[part];
      filNode = filNode?.[part];
      esNode = esNode?.[part];
    }
    assert.ok(enNode, `Missing en scheduledTransactions.${prefix}`);
    assert.ok(filNode, `Missing fil scheduledTransactions.${prefix}`);
    assert.ok(esNode, `Missing es scheduledTransactions.${prefix}`);
    if (typeof enNode === "string") {
      assert.notEqual(filNode, enNode, `fil must differ from en for ${prefix}`);
      assert.notEqual(esNode, enNode, `es must differ from en for ${prefix}`);
    }
  }
});

test("ST-F08 fix: UI uses localized formatter instead of English-only recurrence", () => {
  const screen = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/screens/scheduled-transactions-screen.tsx"),
    "utf8",
  );
  const card = fs.readFileSync(
    path.join(
      root,
      "modules/scheduled-transactions/components/scheduled-occurrence-card.tsx",
    ),
    "utf8",
  );
  assert.match(screen, /format-schedule-recurrence/);
  assert.match(card, /format-schedule-recurrence/);
  assert.match(screen, /formatScheduleRecurrence\(schedule,\s*t\)/);
  const recurrenceSource = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/utils/recurrence.ts"),
    "utf8",
  );
  assert.doesNotMatch(recurrenceSource, /export function formatScheduleRecurrence/);
});

test("ST-F08 fix: formatScheduleRecurrence uses translation keys", () => {
  const { formatScheduleRecurrence } = require("../utils/format-schedule-recurrence.ts");
  const seen = [];
  const t = (key, options) => {
    seen.push({ key, options });
    if (options?.count != null) return `${key}:${options.count}`;
    if (options?.summary) return `${key}:${options.summary}`;
    return key;
  };

  const text = formatScheduleRecurrence(
    {
      frequency: "monthly",
      intervalCount: 1,
      endMode: "after_count",
      maxOccurrences: 6,
      endsOn: null,
    },
    t,
  );

  assert.match(text, /scheduledTransactions\.recurrence\.afterCount/);
  assert.ok(seen.some((entry) => entry.key === "scheduledTransactions.recurrence.monthly"));
});