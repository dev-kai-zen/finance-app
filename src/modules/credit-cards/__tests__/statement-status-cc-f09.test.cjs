const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTs(file, imports) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    console: { error() {} },
    Date: global.Date,
    require(name) {
      assert.ok(name in imports, "Unexpected dependency: " + name);
      return imports[name];
    },
  });
  return exports;
}

const { toCalendarDate } = loadTs("../utils/billing-dates.ts", {});
const {
  getStatementPaymentStatus,
  getStatementPaymentPresentation,
} = loadTs("../utils/statement-activity.ts", {});

const statement = {
  issuedAmountMinorUnits: 100000,
  remainingAmountMinorUnits: 100000,
  dueOn: "2026-11-23",
};

test("CC-F09: partial payment after due date is overdue_partial, not plain partial", () => {
  const partialPastDue = {
    issuedAmountMinorUnits: 100000,
    remainingAmountMinorUnits: 50000,
    dueOn: "2026-11-01",
  };
  assert.equal(
    getStatementPaymentStatus(partialPastDue, "2026-11-24"),
    "overdue_partial",
  );
  const presentation = getStatementPaymentPresentation(
    partialPastDue,
    "2026-11-24",
  );
  assert.equal(presentation.badgeKind, "overdue");
  assert.equal(
    presentation.labelKey,
    "creditCardMonitoring.status.pastDuePartial",
  );
});

test("CC-F09: statement due date uses same local calendar comparison as monitoring", () => {
  assert.equal(getStatementPaymentStatus(statement, "2026-11-24"), "overdue");
  assert.equal(getStatementPaymentStatus(statement, "2026-11-23"), "unpaid");
  assert.equal(getStatementPaymentStatus(statement, "2026-11-22"), "unpaid");
});

test("CC-F09: toCalendarDate uses local device calendar fields (not UTC ISO slice)", () => {
  const localMidnight = new Date(2026, 10, 24, 0, 30);
  assert.equal(toCalendarDate(localMidnight), "2026-11-24");
  const isoSlice = localMidnight.toISOString().slice(0, 10);
  if (isoSlice !== "2026-11-24") {
    assert.notEqual(
      getStatementPaymentStatus(statement, isoSlice),
      getStatementPaymentStatus(statement, toCalendarDate(localMidnight)),
      "UTC ISO today must not drive overdue when local calendar has rolled forward",
    );
  }
});

test("CC-F09: partial payment before due date remains partial", () => {
  const partialNotDue = {
    issuedAmountMinorUnits: 100000,
    remainingAmountMinorUnits: 40000,
    dueOn: "2026-11-15",
  };
  assert.equal(
    getStatementPaymentStatus(partialNotDue, "2026-11-10"),
    "partial",
  );
});