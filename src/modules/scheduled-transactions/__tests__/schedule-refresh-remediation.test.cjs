const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "../../..");

test("ST-F06 fix: hook stale-while-revalidate and catch-up only on focus", () => {
  const hookSource = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/hooks/use-scheduled-transactions.ts"),
    "utf8",
  );
  assert.match(hookSource, /hasLoadedOnceRef/);
  assert.match(hookSource, /hasCachedResult:\s*hasLoadedOnceRef\.current/);
  assert.doesNotMatch(hookSource, /occurrences:\s*loading\s*\?\s*\[\]\s*:\s*occurrences/);
  assert.match(
    hookSource,
    /"FINANCE_APP_SCHEDULES_CHANGED",\s*\n\s*\(\)\s*=>\s*refresh\(\),/,
  );
  assert.match(hookSource, /refresh\(\{\s*requestCatchUp:\s*true\s*\}\)/);
  assert.match(hookSource, /listActionableScheduleOccurrences\(101\)/);

  const serviceSource = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/services/process-due-schedules.service.ts"),
    "utf8",
  );
  assert.match(serviceSource, /export function isScheduleCatchUpActive/);
});

test("ST-F06 fix: load-more keeps cached rows visible while paging", () => {
  const hookSource = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/hooks/use-scheduled-transactions.ts"),
    "utf8",
  );
  assert.match(
    hookSource,
    /loadMoreOccurrences[\s\S]*hasCachedResult:\s*true/,
  );
});

test("ST-F06 fix: screen skeleton only on first schedule load", () => {
  const screenSource = fs.readFileSync(
    path.join(root, "modules/scheduled-transactions/screens/scheduled-transactions-screen.tsx"),
    "utf8",
  );
  assert.match(screenSource, /loading\s*&&\s*schedules\.length\s*===\s*0/);
});