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
    require(name) {
      assert.ok(name in imports, "Unexpected dependency: " + name);
      return imports[name];
    },
  });
  return exports;
}

const billingDates = loadTs("../utils/billing-dates.ts", {});
const { buildInstallmentScheduleRows } = loadTs(
  "../utils/build-installment-schedule.ts",
  {
    "./billing-dates": billingDates,
  },
);
const {
  assertInstallmentScheduleSupported,
  getInstallmentScheduleSupportError,
  isInstallmentScheduleSupported,
  maxSupportedInstallmentTermMonths,
} = loadTs("../utils/validate-installment-schedule.ts", {
  "./build-installment-schedule": { buildInstallmentScheduleRows },
});

test("CC-F11: principal below term is rejected before persistence", () => {
  assert.equal(isInstallmentScheduleSupported(2, 3), false);
  assert.match(getInstallmentScheduleSupportError(2, 3), /too small/);
  assert.throws(
    () => assertInstallmentScheduleSupported(2, 3),
    /too small/,
  );
});

test("CC-F11: principal equal to term is supported", () => {
  assert.equal(isInstallmentScheduleSupported(3, 3), true);
  assert.equal(getInstallmentScheduleSupportError(3, 3), null);
});

test("CC-F11: max supported term follows principal minor units", () => {
  assert.equal(maxSupportedInstallmentTermMonths(50), 50);
  assert.equal(maxSupportedInstallmentTermMonths(500), 120);
});