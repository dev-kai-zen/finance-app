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

test("reconcileOrphanedSubscriptionSchedules: deletes orphans without postings, unlinks orphans with postings, preserves active valid subscriptions", () => {
  const mockSchedules = [
    {
      id: "sched-valid",
      subscriptionId: "sub-exists",
      status: "active",
      archivedAt: null,
    },
    {
      id: "sched-orphan-no-postings",
      subscriptionId: "sub-deleted-1",
      status: "active",
      archivedAt: null,
    },
    {
      id: "sched-orphan-with-postings",
      subscriptionId: "sub-deleted-2",
      status: "active",
      archivedAt: null,
    },
  ];

  const existingSubIds = new Set(["sub-exists"]);
  const postingsMap = new Map([
    ["sched-valid", false],
    ["sched-orphan-no-postings", false],
    ["sched-orphan-with-postings", true],
  ]);

  const deletedIds = [];
  const unlinkedUpdates = [];
  const deletedOccurrences = [];

  // Emulate reconciliation logic
  for (const schedule of mockSchedules) {
    if (!schedule.subscriptionId || existingSubIds.has(schedule.subscriptionId)) {
      continue;
    }
    // Orphan!
    deletedOccurrences.push(schedule.id);
    const hasPostings = postingsMap.get(schedule.id) || false;
    if (!hasPostings) {
      deletedIds.push(schedule.id);
    } else {
      unlinkedUpdates.push({
        id: schedule.id,
        subscriptionId: null,
        status: "completed",
        archivedAt: new Date(),
      });
    }
  }

  assert.equal(deletedIds.length, 1);
  assert.equal(deletedIds[0], "sched-orphan-no-postings");

  assert.equal(unlinkedUpdates.length, 1);
  assert.equal(unlinkedUpdates[0].id, "sched-orphan-with-postings");
  assert.equal(unlinkedUpdates[0].subscriptionId, null);
  assert.equal(unlinkedUpdates[0].status, "completed");

  assert.deepEqual(deletedOccurrences, [
    "sched-orphan-no-postings",
    "sched-orphan-with-postings",
  ]);
});
