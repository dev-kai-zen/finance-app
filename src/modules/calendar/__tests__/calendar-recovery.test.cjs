const test = require("node:test");
const assert = require("node:assert/strict");

// Pure simulation of useCalendarData failure tracking and recovery logic
function createCalendarRecoveryHarness({
  initialMonthTxsThrow = false,
  monthNavigationThrow = false,
  balanceSheetThrow = false,
  accountsError = null,
  categoriesError = null,
  schedulesError = null,
} = {}) {
  let flags = {
    initialMonthTxsThrow,
    monthNavigationThrow,
    balanceSheetThrow,
  };

  const monthCache = new Map();
  let loadedMonthKey = "";
  let loadedBalanceSheetKey = null;

  let transactions = [];
  let monthError = null;
  let isMonthLoading = false;

  let balanceSheetData = { assets: 0, liabilities: 0, netWorth: 0 };
  let balanceSheetError = null;
  let isBalanceSheetLoading = false;

  const currentMonthKey = "2026-11";

  // 1. Initial Synchronous Read
  try {
    if (flags.initialMonthTxsThrow) {
      throw new Error("SQLite disk I/O error on initial read");
    }
    const initial = [{ id: "tx-1", amountMinorUnits: 10000 }];
    monthCache.set(currentMonthKey, initial);
    transactions = initial;
    loadedMonthKey = currentMonthKey;
    monthError = null;
  } catch (err) {
    transactions = [];
    monthError = err.message;
    loadedMonthKey = ""; // Must NOT mark loaded on failure
  }

  // 2. Month Navigation
  function navigateMonth(targetKey) {
    isMonthLoading = true;
    try {
      if (flags.monthNavigationThrow) {
        throw new Error("Database lock on month navigation");
      }
      const fresh = [{ id: `tx-${targetKey}`, amountMinorUnits: 20000 }];
      monthCache.set(targetKey, fresh);
      loadedMonthKey = targetKey;
      monthError = null;
      transactions = fresh;
    } catch (err) {
      monthError = err.message;
      // Must NOT set loadedMonthKey = targetKey on failure
    } finally {
      isMonthLoading = false;
    }
  }

  // 3. Balance Sheet Read
  function computeBalanceSheet(cutoffKey) {
    isBalanceSheetLoading = true;
    try {
      if (flags.balanceSheetThrow) {
        throw new Error("Failed to compute balance sheet for cutoff");
      }
      balanceSheetData = { assets: 500000, liabilities: 100000, netWorth: 400000 };
      loadedBalanceSheetKey = cutoffKey;
      balanceSheetError = null;
    } catch (err) {
      balanceSheetError = err.message;
      // Must NOT set loadedBalanceSheetKey = cutoffKey on failure
    } finally {
      isBalanceSheetLoading = false;
    }
  }

  // 4. Retry / refreshAll
  function refreshAll() {
    monthError = null;
    balanceSheetError = null;
    loadedMonthKey = "";
    loadedBalanceSheetKey = null;
    monthCache.clear();

    // Reload with current flags
    try {
      if (flags.initialMonthTxsThrow) {
        throw new Error("SQLite disk I/O error on initial read");
      }
      const fresh = [{ id: "tx-1-fresh", amountMinorUnits: 10000 }];
      monthCache.set(currentMonthKey, fresh);
      transactions = fresh;
      loadedMonthKey = currentMonthKey;
    } catch (err) {
      monthError = err.message;
    }
  }

  function retryBalanceSheet(cutoffKey) {
    loadedBalanceSheetKey = null;
    balanceSheetError = null;
    computeBalanceSheet(cutoffKey);
  }

  return {
    get transactions() { return transactions; },
    get monthError() { return monthError; },
    get isMonthLoading() { return isMonthLoading; },
    get loadedMonthKey() { return loadedMonthKey; },
    get balanceSheetData() { return balanceSheetData; },
    get balanceSheetError() { return balanceSheetError; },
    get isBalanceSheetLoading() { return isBalanceSheetLoading; },
    get loadedBalanceSheetKey() { return loadedBalanceSheetKey; },
    get overallError() {
      return monthError || accountsError || categoriesError || schedulesError || null;
    },
    navigateMonth,
    computeBalanceSheet,
    refreshAll,
    retryBalanceSheet,
    setFlags: (newFlags) => { Object.assign(flags, newFlags); },
  };
}

test("CAL-F03: Initial month read failure is captured, exposed, and not marked loaded", () => {
  const harness = createCalendarRecoveryHarness({ initialMonthTxsThrow: true });

  // Initial read failed: must expose error, not silent success
  assert.equal(harness.transactions.length, 0);
  assert.ok(harness.monthError.includes("SQLite disk I/O error"));
  assert.equal(harness.overallError, harness.monthError);
  assert.equal(harness.loadedMonthKey, "", "Failed month key must NOT be marked loaded");

  // Fix DB and invoke refreshAll (retry)
  harness.setFlags({ initialMonthTxsThrow: false });
  harness.refreshAll();

  assert.equal(harness.monthError, null);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.loadedMonthKey, "2026-11");
});

test("CAL-F03: Month navigation failure sets error and preserves retry capability", () => {
  const harness = createCalendarRecoveryHarness({ initialMonthTxsThrow: false, monthNavigationThrow: true });

  assert.equal(harness.loadedMonthKey, "2026-11");

  // Navigate to December with a failure
  harness.navigateMonth("2026-12");

  assert.ok(harness.monthError.includes("Database lock"));
  assert.notEqual(harness.loadedMonthKey, "2026-12", "Failed key must not be marked loaded");
  assert.equal(harness.isMonthLoading, false);

  // Fix error and retry navigation
  harness.setFlags({ monthNavigationThrow: false });
  harness.navigateMonth("2026-12");

  assert.equal(harness.monthError, null);
  assert.equal(harness.loadedMonthKey, "2026-12");
  assert.equal(harness.transactions[0].id, "tx-2026-12");
});

test("CAL-F03: Balance sheet computation failure sets error and does not mark target key loaded", () => {
  const harness = createCalendarRecoveryHarness({ balanceSheetThrow: true });

  harness.computeBalanceSheet("cutoff-nov");

  assert.ok(harness.balanceSheetError.includes("Failed to compute balance sheet"));
  assert.equal(harness.loadedBalanceSheetKey, null, "Failed balance sheet key must NOT be marked loaded");
  assert.equal(harness.isBalanceSheetLoading, false);

  // Retry balance sheet
  harness.setFlags({ balanceSheetThrow: false });
  harness.retryBalanceSheet("cutoff-nov");

  assert.equal(harness.balanceSheetError, null);
  assert.equal(harness.loadedBalanceSheetKey, "cutoff-nov");
  assert.equal(harness.balanceSheetData.netWorth, 400000);
});

test("CAL-F03: Upstream hook errors (accounts, categories, schedules) are forwarded to overall error", () => {
  const harnessAccounts = createCalendarRecoveryHarness({ accountsError: "Failed to load accounts" });
  assert.equal(harnessAccounts.overallError, "Failed to load accounts");

  const harnessCategories = createCalendarRecoveryHarness({ categoriesError: "Category catalog corrupt" });
  assert.equal(harnessCategories.overallError, "Category catalog corrupt");

  const harnessSchedules = createCalendarRecoveryHarness({ schedulesError: "Schedule sync failed" });
  assert.equal(harnessSchedules.overallError, "Schedule sync failed");
});
