const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../../..");
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request,
    parent,
    ...rest,
  );
};

Module._load = function (request, parent, ...rest) {
  if (request === "@/modules/settings") {
    return {
      formatPrivacyAmount: (amount, isPrivate) => (isPrivate ? "••••••" : amount),
    };
  }
  return originalLoad.call(this, request, parent, ...rest);
};

require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
  if (filename.includes("node_modules")) {
    return;
  }
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

const { formatReportAxisAmount } = require("../utils/reports-currency.ts");

test("formatReportAxisAmount - zero decimal currencies (e.g. JPY / KRW)", () => {
  // 10,000 minor units in JPY is ¥10,000.
  // In the old buggy implementation, this returned "100" (100x error).
  // With exponent 0, 10,000 major units should format as "10k".
  assert.equal(
    formatReportAxisAmount(10_000, { currencyCode: "JPY" }),
    "10k",
  );

  assert.equal(
    formatReportAxisAmount(500, { currencyCode: "JPY" }),
    "500",
  );

  assert.equal(
    formatReportAxisAmount(1_500_000, { currencyCode: "JPY" }),
    "1.5M",
  );
});

test("formatReportAxisAmount - two decimal currencies (e.g. PHP / USD)", () => {
  // 10,000 minor units in PHP is ₱100.00
  assert.equal(
    formatReportAxisAmount(10_000, { currencyCode: "PHP" }),
    "100",
  );

  // 1,000,000 minor units in PHP is ₱10,000.00 -> "10k"
  assert.equal(
    formatReportAxisAmount(1_000_000, { currencyCode: "PHP" }),
    "10k",
  );

  // 150,000,000 minor units in PHP is ₱1,500,000.00 -> "1.5M"
  assert.equal(
    formatReportAxisAmount(150_000_000, { currencyCode: "PHP" }),
    "1.5M",
  );
});

test("formatReportAxisAmount - three decimal currencies (e.g. KWD / BHD)", () => {
  // 10,000 minor units in KWD is 10 KWD (exponent 3: 10,000 / 1000 = 10)
  // In the old buggy implementation, this returned "100" (10x error).
  assert.equal(
    formatReportAxisAmount(10_000, { currencyCode: "KWD" }),
    "10",
  );

  // 10,000,000 minor units in KWD is 10,000 KWD -> "10k"
  assert.equal(
    formatReportAxisAmount(10_000_000, { currencyCode: "KWD" }),
    "10k",
  );

  // 1,500,000,000 minor units in KWD is 1,500,000 KWD -> "1.5M"
  assert.equal(
    formatReportAxisAmount(1_500_000_000, { currencyCode: "KWD" }),
    "1.5M",
  );
});

test("formatReportAxisAmount - negative values and zero", () => {
  // Zero should format as "0"
  assert.equal(
    formatReportAxisAmount(0, { currencyCode: "PHP" }),
    "0",
  );

  // Negative 5,000 PHP (-500,000 minor units) -> "-5k"
  assert.equal(
    formatReportAxisAmount(-500_000, { currencyCode: "PHP" }),
    "-5k",
  );

  // Negative 1,500,000 PHP (-150,000,000 minor units) -> "-1.5M"
  assert.equal(
    formatReportAxisAmount(-150_000_000, { currencyCode: "PHP" }),
    "-1.5M",
  );

  // Negative small number (-25.00 PHP) -> "-25"
  assert.equal(
    formatReportAxisAmount(-2500, { currencyCode: "PHP" }),
    "-25",
  );
});

test("formatReportAxisAmount - decimal separator preferences", () => {
  // Standard dot separator: "comma-dot" or "automatic"
  assert.equal(
    formatReportAxisAmount(150_000_000, {
      currencyCode: "PHP",
      decimalFormat: "comma-dot",
    }),
    "1.5M",
  );

  // European comma separator: "dot-comma" or "space-comma"
  assert.equal(
    formatReportAxisAmount(150_000_000, {
      currencyCode: "PHP",
      decimalFormat: "dot-comma",
    }),
    "1,5M",
  );

  assert.equal(
    formatReportAxisAmount(-150_000_000, {
      currencyCode: "PHP",
      decimalFormat: "space-comma",
    }),
    "-1,5M",
  );
});

test("formatReportAxisAmount - privacy mode masking", () => {
  // When isPrivate is true, every amount must be masked with "••••••"
  assert.equal(
    formatReportAxisAmount(10_000, {
      currencyCode: "PHP",
      isPrivate: true,
    }),
    "••••••",
  );

  assert.equal(
    formatReportAxisAmount(0, {
      currencyCode: "PHP",
      isPrivate: true,
    }),
    "••••••",
  );

  assert.equal(
    formatReportAxisAmount(-500_000, {
      currencyCode: "JPY",
      isPrivate: true,
    }),
    "••••••",
  );

  assert.equal(
    formatReportAxisAmount(150_000_000, {
      currencyCode: "KWD",
      isPrivate: true,
    }),
    "••••••",
  );
});
