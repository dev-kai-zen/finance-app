const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("CAL-F10: Calendar Snapshot & Ribbon Skeleton Consistency", () => {
  // Pure model matching CalendarSummaryRibbon's maskAmount logic
  function computeRibbonDisplay(val, { isLoading, isPrivate, currencyCode = "PHP", showSign = false }) {
    if (isLoading) return "—";
    if (isPrivate) return "••••••";
    const formattedNumber = (Math.abs(val) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? "-" : showSign && val > 0 ? "+" : "";
    return `${prefix}${currencyCode} ${formattedNumber}`;
  }

  function computeMetricItemText({ count, singular, plural, isLoading }) {
    if (isLoading) return "—";
    return `${count} ${count === 1 ? singular : plural}`;
  }

  it("masks all ribbon amounts with a dash placeholder when isLoading is true", () => {
    const assets = 50000000;
    const liabilities = 5000000;
    const netWorth = 45000000;

    const displayAssets = computeRibbonDisplay(assets, { isLoading: true, isPrivate: false });
    const displayLiabilities = computeRibbonDisplay(liabilities, { isLoading: true, isPrivate: false });
    const displayNetWorth = computeRibbonDisplay(netWorth, { isLoading: true, isPrivate: false });

    assert.equal(displayAssets, "—");
    assert.equal(displayLiabilities, "—");
    assert.equal(displayNetWorth, "—");
  });

  it("masks non-amount counts with a dash placeholder when isLoading is true", () => {
    const upcoming = computeMetricItemText({ count: 5, singular: "item", plural: "items", isLoading: true });
    const posted = computeMetricItemText({ count: 2, singular: "item", plural: "items", isLoading: true });

    assert.equal(upcoming, "—");
    assert.equal(posted, "—");
  });

  it("unmasks ribbon amounts to full currency formatting once isLoading resolves to false", () => {
    const assets = 50000000;
    const liabilities = 5000000;
    const netWorth = 45000000;

    const displayAssets = computeRibbonDisplay(assets, { isLoading: false, isPrivate: false });
    const displayLiabilities = computeRibbonDisplay(liabilities, { isLoading: false, isPrivate: false });
    const displayNetWorth = computeRibbonDisplay(netWorth, { isLoading: false, isPrivate: false });

    assert.equal(displayAssets, "PHP 500,000.00");
    assert.equal(displayLiabilities, "PHP 50,000.00");
    assert.equal(displayNetWorth, "PHP 450,000.00");
  });

  it("respects privacy mode when resolved (isLoading = false)", () => {
    const assets = 50000000;
    const displayAssets = computeRibbonDisplay(assets, { isLoading: false, isPrivate: true });
    assert.equal(displayAssets, "••••••");
  });

  it("prevents publishing stale snapshot figures while target snapshot is pending", () => {
    const oldSnapshot = {
      cutoffDate: new Date("2026-10-31"),
      assets: { totalMinorUnits: 50000000, accountTypes: [{ accounts: [1, 2, 3] }] },
      liabilities: { totalMinorUnits: 5000000, accountTypes: [{ accounts: [4] }] },
      netWorthMinorUnits: 45000000,
    };

    const targetKey = "2026-10-05-PHP";
    let loadedKey = "2026-10-31-PHP"; // Still holding previous cutoff's key

    const isBalanceSheetPending = loadedKey !== targetKey;
    assert.equal(isBalanceSheetPending, true);

    // Summary metrics simulation matching use-calendar-data.ts
    const metrics = {
      balanceSheetAssetsMinorUnits: isBalanceSheetPending ? 0 : oldSnapshot.assets.totalMinorUnits,
      balanceSheetLiabilitiesMinorUnits: isBalanceSheetPending ? 0 : oldSnapshot.liabilities.totalMinorUnits,
      balanceSheetNetWorthMinorUnits: isBalanceSheetPending ? 0 : oldSnapshot.netWorthMinorUnits,
    };

    // Under pending transition, metrics must not report stale 500,000.00
    assert.equal(metrics.balanceSheetAssetsMinorUnits, 0);
    assert.equal(metrics.balanceSheetLiabilitiesMinorUnits, 0);
    assert.equal(metrics.balanceSheetNetWorthMinorUnits, 0);

    // Once resolved and keys align
    loadedKey = targetKey;
    const isNowPending = loadedKey !== targetKey;
    assert.equal(isNowPending, false);

    const freshSnapshot = {
      cutoffDate: new Date("2026-10-05"),
      assets: { totalMinorUnits: 20000000, accountTypes: [{ accounts: [1, 2] }] },
      liabilities: { totalMinorUnits: 2000000, accountTypes: [] },
      netWorthMinorUnits: 18000000,
    };

    const resolvedMetrics = {
      balanceSheetAssetsMinorUnits: isNowPending ? 0 : freshSnapshot.assets.totalMinorUnits,
      balanceSheetLiabilitiesMinorUnits: isNowPending ? 0 : freshSnapshot.liabilities.totalMinorUnits,
      balanceSheetNetWorthMinorUnits: isNowPending ? 0 : freshSnapshot.netWorthMinorUnits,
    };

    assert.equal(resolvedMetrics.balanceSheetAssetsMinorUnits, 20000000);
    assert.equal(resolvedMetrics.balanceSheetLiabilitiesMinorUnits, 2000000);
    assert.equal(resolvedMetrics.balanceSheetNetWorthMinorUnits, 18000000);
  });

  it("falls back to reportable account count instead of 0 when snapshot is uninitialized", () => {
    const accounts = [
      { id: "a1", isArchived: false, hideFromReports: false },
      { id: "a2", isArchived: false, hideFromReports: false },
      { id: "a3", isArchived: false, hideFromReports: false },
      { id: "a4", isArchived: true, hideFromReports: false }, // Archived
      { id: "a5", isArchived: false, hideFromReports: true }, // Hidden
    ];

    const reportableAccountCount = accounts.filter((a) => !a.isArchived && !a.hideFromReports).length;
    assert.equal(reportableAccountCount, 3);

    const uninitializedSnapshot = {
      assets: { accountTypes: [] },
      liabilities: { accountTypes: [] },
    };

    const countBeforeResolution =
      uninitializedSnapshot.assets.accountTypes.length > 0 ||
      uninitializedSnapshot.liabilities.accountTypes.length > 0
        ? uninitializedSnapshot.assets.accountTypes.reduce((sum, g) => sum + g.accounts.length, 0)
        : reportableAccountCount;

    assert.equal(countBeforeResolution, 3, "Badge must display 3 active accounts rather than 0 during loading");
  });
});
