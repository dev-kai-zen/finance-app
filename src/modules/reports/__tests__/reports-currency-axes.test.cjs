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
  if (request === "@/infrastructure/database/client") {
    return { db: {} };
  }
  if (request === "@/modules/currencies") {
    return {
      getCurrencyPreferences: () => ({ defaultCurrency: "PHP" }),
    };
  }
  if (request === "@/modules/accounts") {
    return {
      getBalanceSheet: () => ({
        assets: { accountTypes: [] },
        liabilities: { accountTypes: [] },
        netWorthMinorUnits: 0,
      }),
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
      jsx: ts.JsxEmit.React,
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

test("REP-F10: Balance Sheet Group and Account Type accessibilityLabels respect privacy mode", () => {
  const currency = require("../../../utils/currency.ts");
  const { formatPrivacyAmount } = require("@/modules/settings");

  const buildGroupLabel = (title, currentMinorUnits, currencyCode, isPrivate, expanded) =>
    `${title}, Total Current: ${formatPrivacyAmount(
      currency.formatCurrency(currentMinorUnits, currencyCode),
      isPrivate,
    )}. Tap to ${expanded ? "collapse" : "expand"}.`;

  const buildTypeLabel = (name, currentMinorUnits, currencyCode, isPrivate, expanded) =>
    `${name}, Current: ${formatPrivacyAmount(
      currency.formatCurrency(currentMinorUnits, currencyCode),
      isPrivate,
    )}. Tap to ${expanded ? "collapse" : "expand"}.`;

  // Privacy OFF: announces actual currency amount
  assert.equal(
    buildGroupLabel("ASSETS", 125_000_000, "PHP", false, true),
    "ASSETS, Total Current: ₱1,250,000.00. Tap to collapse.",
  );
  assert.equal(
    buildTypeLabel("Bank Accounts", 45_000_000, "PHP", false, false),
    "Bank Accounts, Current: ₱450,000.00. Tap to expand.",
  );

  // Privacy ON: MUST announce masked amounts (••••••)
  assert.equal(
    buildGroupLabel("ASSETS", 125_000_000, "PHP", true, true),
    "ASSETS, Total Current: ••••••. Tap to collapse.",
  );
  assert.equal(
    buildTypeLabel("Bank Accounts", 45_000_000, "PHP", true, false),
    "Bank Accounts, Current: ••••••. Tap to expand.",
  );

  // Verify source code of balance-sheet-table.tsx contains formatPrivacyAmount in both accessibilityLabels
  const tableSource = fs.readFileSync(
    path.resolve(__dirname, "../components/balance-sheet/balance-sheet-table.tsx"),
    "utf8",
  );
  assert.match(
    tableSource,
    /accessibilityLabel=\{`\$\{groupNode\.title\}, Total Current: \$\{formatPrivacyAmount\(/,
    "GroupSection accessibilityLabel must wrap formatCurrency with formatPrivacyAmount",
  );
  assert.match(
    tableSource,
    /accessibilityLabel=\{`\$\{typeNode\.name\}, Current: \$\{formatPrivacyAmount\(/,
    "AccountTypeSection accessibilityLabel must wrap formatCurrency with formatPrivacyAmount",
  );
});

test("REP-F11: Complete localization across en, fil, es and touch ergonomics hitSlop", () => {
  const enTranslations = require("../../../infrastructure/localization/translations/en.ts").en;
  const filTranslations = require("../../../infrastructure/localization/translations/fil.ts").fil;
  const esTranslations = require("../../../infrastructure/localization/translations/es.ts").es;

  // Assert reports catalog exists in all 3 languages
  assert.ok(enTranslations.reports, "English must have reports catalog");
  assert.ok(filTranslations.reports, "Filipino must have reports catalog");
  assert.ok(esTranslations.reports, "Spanish must have reports catalog");

  // Assert tabs exist and are translated
  const expectedTabs = ["incomeExpense", "balanceSheet", "cashFlow", "netWorth", "labelsSummary"];
  for (const tabKey of expectedTabs) {
    assert.ok(enTranslations.reports.tabs[tabKey], `en.reports.tabs.${tabKey} must exist`);
    assert.ok(filTranslations.reports.tabs[tabKey], `fil.reports.tabs.${tabKey} must exist`);
    assert.ok(esTranslations.reports.tabs[tabKey], `es.reports.tabs.${tabKey} must exist`);
  }

  // Assert presets exist and are translated
  const expectedPresets = ["prevVsToday", "mom", "ytd", "custom", "last6m", "last12m", "thisMonth", "lastMonth", "last3m", "last2y"];
  for (const pKey of expectedPresets) {
    assert.ok(enTranslations.reports.presets[pKey], `en.reports.presets.${pKey} must exist`);
    assert.ok(filTranslations.reports.presets[pKey], `fil.reports.presets.${pKey} must exist`);
    assert.ok(esTranslations.reports.presets[pKey], `es.reports.presets.${pKey} must exist`);
  }

  // Assert common and empty messages exist
  assert.ok(filTranslations.reports.common.close, "fil.reports.common.close must exist");
  assert.ok(esTranslations.reports.common.close, "es.reports.common.close must exist");
  assert.ok(filTranslations.reports.empty.noCashFlow, "fil.reports.empty.noCashFlow must exist");
  assert.ok(esTranslations.reports.empty.noCashFlow, "es.reports.empty.noCashFlow must exist");

  // Verify date helpers support custom locale
  const { formatShortDate, formatMonthYear } = require("../utils/reports-dates.ts");
  const sampleDate = new Date(2026, 10, 27); // Nov 27, 2026
  assert.ok(formatShortDate(sampleDate, "es-ES"), "formatShortDate should format in Spanish");
  assert.ok(formatMonthYear(2026, 10, "es-ES"), "formatMonthYear should format in Spanish");

  // Verify touch ergonomics: hitSlop present on close buttons and nav chevrons
  const presetModalSource = fs.readFileSync(
    path.resolve(__dirname, "../components/balance-sheet/preset-picker-modal.tsx"),
    "utf8",
  );
  assert.match(
    presetModalSource,
    /hitSlop=\{\{\s*top:\s*8,\s*bottom:\s*8,\s*left:\s*8,\s*right:\s*8\s*\}\}/,
    "PresetPickerModal must provide hitSlop for touch ergonomics",
  );

  const expandModalSource = fs.readFileSync(
    path.resolve(__dirname, "../components/balance-sheet/expand-collapse-modal.tsx"),
    "utf8",
  );
  assert.match(
    expandModalSource,
    /hitSlop=\{\{\s*top:\s*8,\s*bottom:\s*8,\s*left:\s*8,\s*right:\s*8\s*\}\}/,
    "ExpandCollapseModal must provide hitSlop on close button",
  );

  const incomeFilterSource = fs.readFileSync(
    path.resolve(__dirname, "../components/income-expense/income-expense-filter-bar.tsx"),
    "utf8",
  );
  assert.match(
    incomeFilterSource,
    /hitSlop=\{\{\s*top:\s*8,\s*bottom:\s*8,\s*left:\s*8,\s*right:\s*8\s*\}\}/,
    "IncomeExpenseFilterBar must provide hitSlop on close button",
  );
});

test("REP-F12 - Essential text containment and modal responsiveness", () => {
  // Surface 1: Summary cards have numberOfLines={2} for amounts
  const cashFlowSummarySource = fs.readFileSync(
    path.resolve(__dirname, "../components/cash-flow/cash-flow-summary-cards.tsx"),
    "utf8",
  );
  assert.equal(
    cashFlowSummarySource.includes("numberOfLines={1}"),
    false,
    "CashFlowSummaryCards should not restrict amounts to 1 line",
  );
  assert.equal(
    (cashFlowSummarySource.match(/numberOfLines=\{2\}/g) || []).length,
    4,
    "All 4 cards in CashFlowSummaryCards should have numberOfLines={2}",
  );

  const netWorthSummarySource = fs.readFileSync(
    path.resolve(__dirname, "../components/net-worth/net-worth-summary-cards.tsx"),
    "utf8",
  );
  assert.equal(
    netWorthSummarySource.includes("numberOfLines={1}"),
    false,
    "NetWorthSummaryCards should not restrict amounts to 1 line",
  );
  assert.equal(
    (netWorthSummarySource.match(/numberOfLines=\{2\}/g) || []).length,
    4,
    "All 4 cards in NetWorthSummaryCards should have numberOfLines={2}",
  );

  // Surface 2: Donut charts center overlay handles long text & shrinking
  const categoryDonutSource = fs.readFileSync(
    path.resolve(__dirname, "../components/income-expense/category-donut-chart.tsx"),
    "utf8",
  );
  assert.match(
    categoryDonutSource,
    /<Text\s+numberOfLines=\{2\}\s+style=\{styles\.centerCategoryName\}>/,
    "CategoryDonutChart centerCategoryName must support 2 lines",
  );
  assert.match(
    categoryDonutSource,
    /adjustsFontSizeToFit\s+minimumFontScale=\{0\.75\}\s+style=\{styles\.centerAmount\}/,
    "CategoryDonutChart centerAmount must adjust font size to fit with minimumFontScale 0.75",
  );

  const labelsDonutSource = fs.readFileSync(
    path.resolve(__dirname, "../components/labels-summary/labels-summary-donut-chart.tsx"),
    "utf8",
  );
  assert.match(
    labelsDonutSource,
    /<Text\s+numberOfLines=\{2\}\s+style=\{styles\.centerLabelName\}>/,
    "LabelsSummaryDonutChart centerLabelName must support 2 lines",
  );
  assert.match(
    labelsDonutSource,
    /adjustsFontSizeToFit\s+minimumFontScale=\{0\.75\}\s+style=\{styles\.centerAmount\}/,
    "LabelsSummaryDonutChart centerAmount must adjust font size to fit with minimumFontScale 0.75",
  );

  // Surface 3: Category and label breakdown tables support 2-line item titles
  const categoryTableSource = fs.readFileSync(
    path.resolve(__dirname, "../components/income-expense/category-breakdown-table.tsx"),
    "utf8",
  );
  assert.match(
    categoryTableSource,
    /<Text\s+numberOfLines=\{2\}\s+style=\{styles\.categoryName\}>/,
    "CategoryBreakdownTable categoryName must support 2 lines",
  );

  const labelsTableSource = fs.readFileSync(
    path.resolve(__dirname, "../components/labels-summary/labels-summary-table.tsx"),
    "utf8",
  );
  assert.match(
    labelsTableSource,
    /<Text\s+numberOfLines=\{2\}\s+style=\{styles\.labelName\}>/,
    "LabelsSummaryTable labelName must support 2 lines",
  );

  // Surface 4: Balance sheet numeric columns & table width
  const balanceSheetTableSource = fs.readFileSync(
    path.resolve(__dirname, "../components/balance-sheet/balance-sheet-table.tsx"),
    "utf8",
  );
  assert.match(
    balanceSheetTableSource,
    /tableWrapper:\s*\{\s*minWidth:\s*570,/,
    "BalanceSheetTable tableWrapper minWidth must be at least 570",
  );
  assert.match(
    balanceSheetTableSource,
    /colNumeric:\s*\{\s*flex:\s*1,\s*minWidth:\s*125,/,
    "BalanceSheetTable colNumeric minWidth must be at least 125",
  );

  // Surface 5: Modal sheets have maxHeight and ScrollView
  const modalSources = [
    { name: "PresetPickerModal", path: "../components/balance-sheet/preset-picker-modal.tsx" },
    { name: "ExpandCollapseModal", path: "../components/balance-sheet/expand-collapse-modal.tsx" },
    { name: "IncomeExpenseFilterBar", path: "../components/income-expense/income-expense-filter-bar.tsx" },
    { name: "CashFlowFilterBar", path: "../components/cash-flow/cash-flow-filter-bar.tsx" },
    { name: "NetWorthFilterBar", path: "../components/net-worth/net-worth-filter-bar.tsx" },
  ];

  for (const modal of modalSources) {
    const code = fs.readFileSync(path.resolve(__dirname, modal.path), "utf8");
    assert.match(
      code,
      /maxHeight:\s*["']85%["']/,
      `${modal.name} sheet must have maxHeight: "85%" for responsiveness`,
    );
    assert.match(
      code,
      /<ScrollView/,
      `${modal.name} must wrap scrollable options in a ScrollView`,
    );
  }
});

test("REP-F13 - State-aware liability variance (positive credit & zero crossings)", () => {
  const { calculateVariance } = require("../services/get-balance-sheet-comparison.service.ts");

  // 1. Pure debt decrease: -25k -> -20k (-5k ▼ Green)
  const debtDecrease = calculateVariance({
    prevMinorUnits: -2_500_000,
    currentMinorUnits: -2_000_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(debtDecrease.diffMinorUnits, -500_000);
  assert.equal(debtDecrease.symbol, "▼");
  assert.equal(debtDecrease.color, "#10B981");
  assert.equal(debtDecrease.isFavorable, true);
  assert.match(debtDecrease.formattedDiff, /-\u20b15,000\.00|-₱5,000\.00/);

  // 2. Pure debt increase: -20k -> -25k (+5k ▲ Red)
  const debtIncrease = calculateVariance({
    prevMinorUnits: -2_000_000,
    currentMinorUnits: -2_500_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(debtIncrease.diffMinorUnits, 500_000);
  assert.equal(debtIncrease.symbol, "▲");
  assert.equal(debtIncrease.color, "#EF4444");
  assert.equal(debtIncrease.isFavorable, false);
  assert.match(debtIncrease.formattedDiff, /\+\u20b15,000\.00|\+₱5,000\.00/);

  // 3. Pure credit increase: +5k -> +10k (+5k ▲ Green, favorable)
  const creditIncrease = calculateVariance({
    prevMinorUnits: 500_000,
    currentMinorUnits: 1_000_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(creditIncrease.diffMinorUnits, 500_000);
  assert.equal(creditIncrease.symbol, "▲");
  assert.equal(creditIncrease.color, "#10B981");
  assert.equal(creditIncrease.isFavorable, true);
  assert.match(creditIncrease.formattedDiff, /\+\u20b15,000\.00|\+₱5,000\.00/);

  // 4. Pure credit decrease: +10k -> +2k (-8k ▼ Red, unfavorable)
  const creditDecrease = calculateVariance({
    prevMinorUnits: 1_000_000,
    currentMinorUnits: 200_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(creditDecrease.diffMinorUnits, -800_000);
  assert.equal(creditDecrease.symbol, "▼");
  assert.equal(creditDecrease.color, "#EF4444");
  assert.equal(creditDecrease.isFavorable, false);
  assert.match(creditDecrease.formattedDiff, /-\u20b18,000\.00|-₱8,000\.00/);

  // 5. Debt to credit sign crossing: -10k -> +5k (+15k ▲ Green)
  const debtToCredit = calculateVariance({
    prevMinorUnits: -1_000_000,
    currentMinorUnits: 500_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(debtToCredit.diffMinorUnits, 1_500_000);
  assert.equal(debtToCredit.symbol, "▲");
  assert.equal(debtToCredit.color, "#10B981");
  assert.equal(debtToCredit.isFavorable, true);
  assert.match(debtToCredit.formattedDiff, /\+\u20b115,000\.00|\+₱15,000\.00/);

  // 6. Credit to debt sign crossing: +5k -> -10k (-15k ▼ Red)
  const creditToDebt = calculateVariance({
    prevMinorUnits: 500_000,
    currentMinorUnits: -1_000_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(creditToDebt.diffMinorUnits, -1_500_000);
  assert.equal(creditToDebt.symbol, "▼");
  assert.equal(creditToDebt.color, "#EF4444");
  assert.equal(creditToDebt.isFavorable, false);
  assert.match(creditToDebt.formattedDiff, /-\u20b115,000\.00|-₱15,000\.00/);

  // 7. Debt to zero: -10k -> 0 (-10k ▼ Green)
  const debtToZero = calculateVariance({
    prevMinorUnits: -1_000_000,
    currentMinorUnits: 0,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(debtToZero.diffMinorUnits, -1_000_000);
  assert.equal(debtToZero.symbol, "▼");
  assert.equal(debtToZero.color, "#10B981");
  assert.equal(debtToZero.isFavorable, true);

  // 8. Credit to zero: +5k -> 0 (-5k ▼ Red)
  const creditToZero = calculateVariance({
    prevMinorUnits: 500_000,
    currentMinorUnits: 0,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(creditToZero.diffMinorUnits, -500_000);
  assert.equal(creditToZero.symbol, "▼");
  assert.equal(creditToZero.color, "#EF4444");
  assert.equal(creditToZero.isFavorable, false);

  // 9. Zero to debt: 0 -> -10k (+10k ▲ Red)
  const zeroToDebt = calculateVariance({
    prevMinorUnits: 0,
    currentMinorUnits: -1_000_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(zeroToDebt.diffMinorUnits, 1_000_000);
  assert.equal(zeroToDebt.symbol, "▲");
  assert.equal(zeroToDebt.color, "#EF4444");
  assert.equal(zeroToDebt.isFavorable, false);

  // 10. Zero to credit: 0 -> +5k (+5k ▲ Green)
  const zeroToCredit = calculateVariance({
    prevMinorUnits: 0,
    currentMinorUnits: 500_000,
    isLiability: true,
    currencyCode: "PHP",
  });
  assert.equal(zeroToCredit.diffMinorUnits, 500_000);
  assert.equal(zeroToCredit.symbol, "▲");
  assert.equal(zeroToCredit.color, "#10B981");
  assert.equal(zeroToCredit.isFavorable, true);
});
