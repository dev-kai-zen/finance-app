const test = require("node:test");
const assert = require("node:assert/strict");

function formatPhpNumber(amountMinorUnits) {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;
  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";
  return `${sign}₱${majorFormatted}.${minorFormatted}`;
}

function calculateBalanceSheet({
  accounts,
  pockets,
  transactions,
  cutoffDate,
}) {
  const cutoffTime = cutoffDate.getTime();

  // Aggregate account deltas
  const accountDeltas = {};
  const pocketDeltas = {};

  for (const tx of transactions) {
    if (new Date(tx.occurredAt).getTime() > cutoffTime) continue;
    if (tx.accountId) {
      accountDeltas[tx.accountId] =
        (accountDeltas[tx.accountId] || 0) + tx.amountCents;
    }
    if (tx.pocketId) {
      pocketDeltas[tx.pocketId] =
        (pocketDeltas[tx.pocketId] || 0) + tx.amountCents;
    }
  }

  let totalAssets = 0;
  let totalLiabilities = 0;

  const assetsByType = {};
  const liabilitiesByType = {};

  for (const account of accounts) {
    if (account.isArchived || account.hideFromReports) continue;

    const openingBalance =
      new Date(account.openingBalanceAt).getTime() <= cutoffTime
        ? account.openingBalanceMinorUnits
        : 0;
    const delta = accountDeltas[account.id] || 0;
    const balance = openingBalance + delta;

    const accountPockets = pockets
      .filter((p) => p.accountId === account.id && !p.isArchived)
      .map((p) => ({
        id: p.id,
        name: p.name,
        balanceMinorUnits: pocketDeltas[p.id] || 0,
      }));

    const totalPocketBalance = accountPockets.reduce(
      (sum, p) => sum + p.balanceMinorUnits,
      0,
    );
    const availableMinorUnits = balance - totalPocketBalance;

    const isLiability = account.accountGroup === "liability";
    const targetMap = isLiability ? liabilitiesByType : assetsByType;

    if (isLiability) {
      totalLiabilities += balance;
    } else {
      totalAssets += balance;
    }

    const typeId = account.accountTypeId;
    if (!targetMap[typeId]) {
      targetMap[typeId] = {
        name: account.accountTypeName,
        totalBalance: 0,
        accounts: [],
      };
    }

    targetMap[typeId].totalBalance += balance;
    targetMap[typeId].accounts.push({
      id: account.id,
      name: account.name,
      balance,
      availableMinorUnits,
      pockets: accountPockets,
    });
  }

  const netWorth = totalAssets + totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    assetsByType,
    liabilitiesByType,
  };
}

test("balance sheet calculates correct assets, liabilities, and pockets as of cutoff date", () => {
  const accounts = [
    {
      id: "acc-1",
      name: "BPI Savings",
      accountTypeId: "type-bank",
      accountTypeName: "Bank Account",
      accountGroup: "asset",
      openingBalanceMinorUnits: 5000000, // ₱50,000.00
      openingBalanceAt: "2026-09-01T00:00:00Z",
      isArchived: false,
      hideFromReports: false,
    },
    {
      id: "acc-2",
      name: "GCash Wallet",
      accountTypeId: "type-ewallet",
      accountTypeName: "E-Wallet",
      accountGroup: "asset",
      openingBalanceMinorUnits: 1000000, // ₱10,000.00
      openingBalanceAt: "2026-09-01T00:00:00Z",
      isArchived: false,
      hideFromReports: false,
    },
    {
      id: "acc-3",
      name: "BDO Platinum Card",
      accountTypeId: "type-cc",
      accountTypeName: "Credit Card",
      accountGroup: "liability",
      openingBalanceMinorUnits: 0,
      openingBalanceAt: "2026-09-01T00:00:00Z",
      isArchived: false,
      hideFromReports: false,
    },
  ];

  const pockets = [
    {
      id: "pkt-1",
      accountId: "acc-1",
      name: "Emergency Fund",
      isArchived: false,
    },
    {
      id: "pkt-2",
      accountId: "acc-1",
      name: "Vacation",
      isArchived: false,
    },
  ];

  const transactions = [
    // Sept 15: Salary into BPI
    {
      accountId: "acc-1",
      amountCents: 2000000, // +₱20,000
      occurredAt: "2026-09-15T10:00:00Z",
    },
    // Sept 15: Allocation to Emergency Fund pocket
    {
      accountId: "acc-1",
      pocketId: "pkt-1",
      amountCents: 1500000, // +₱15,000 into pocket
      occurredAt: "2026-09-15T11:00:00Z",
    },
    // Oct 2: Credit Card expense
    {
      accountId: "acc-3",
      amountCents: -500000, // -₱5,000 debt
      occurredAt: "2026-10-02T14:00:00Z",
    },
    // Oct 10: Late October expense (should not be included when cutoff is Oct 5)
    {
      accountId: "acc-1",
      amountCents: -300000, // -₱3,000
      occurredAt: "2026-10-10T12:00:00Z",
    },
  ];

  // Test cutoff as of Oct 5, 2026
  const bsAsOfOct5 = calculateBalanceSheet({
    accounts,
    pockets,
    transactions,
    cutoffDate: new Date("2026-10-05T23:59:59.999Z"),
  });

  // BPI balance: 50,000 + 20,000 + 15,000 = 85,000 (8,500,000 cents)
  // GCash balance: 10,000 (1,000,000 cents)
  // Total Assets: 85,000 + 10,000 = 95,000 (9,500,000 cents)
  assert.equal(bsAsOfOct5.totalAssets, 9500000);

  // Credit Card balance: -5,000 (-500,000 cents)
  // Total Liabilities: -500,000
  assert.equal(bsAsOfOct5.totalLiabilities, -500000);

  // Net Worth: 9,500,000 + (-500,000) = 9,000,000 (₱90,000.00)
  assert.equal(bsAsOfOct5.netWorth, 9000000);

  // Check BPI pockets as of Oct 5:
  const bpi = bsAsOfOct5.assetsByType["type-bank"].accounts[0];
  assert.equal(bpi.balance, 8500000);
  assert.equal(bpi.pockets.length, 2);
  assert.equal(bpi.pockets[0].balanceMinorUnits, 1500000);
  assert.equal(bpi.pockets[1].balanceMinorUnits, 0);
  // Available: 8,500,000 - 1,500,000 = 7,000,000
  assert.equal(bpi.availableMinorUnits, 7000000);

  // Test cutoff as of Oct 31, 2026 (Month-End)
  const bsMonthEnd = calculateBalanceSheet({
    accounts,
    pockets,
    transactions,
    cutoffDate: new Date("2026-10-31T23:59:59.999Z"),
  });

  // Oct 10 expense (-3,000) is now included in BPI:
  // BPI: 85,000 - 3,000 = 82,000 (8,200,000 cents)
  // Total Assets: 8,200,000 + 1,000,000 = 9,200,000
  assert.equal(bsMonthEnd.totalAssets, 9200000);
  assert.equal(bsMonthEnd.netWorth, 8700000);
});

test("formatPhpNumber handles positive and negative amounts correctly", () => {
  assert.equal(formatPhpNumber(100000), "₱1,000.00");
  assert.equal(formatPhpNumber(-100000), "-₱1,000.00");
  assert.equal(formatPhpNumber(0), "₱0.00");
  assert.equal(formatPhpNumber(-250000), "-₱2,500.00");
});

test("inflow, outflow and net summation correctly preserves negative amounts for expenses and fees", () => {
  const transactions = [
    { type: "expense", amountCents: -1000 }, // -₱10.00 bank transaction fee
  ];

  let inflow = 0;
  let outflow = 0;

  for (const tx of transactions) {
    if (tx.type === "transfer") continue;
    if (tx.amountCents > 0 || tx.type === "income") {
      inflow += tx.amountCents;
    } else if (tx.amountCents < 0 || tx.type === "expense") {
      outflow += tx.amountCents;
    }
  }

  const net = inflow + outflow;

  assert.equal(inflow, 0);
  assert.equal(outflow, -1000);
  assert.equal(net, -1000);

  const isOutflowPositive = outflow >= 0;
  assert.equal(isOutflowPositive, false); // must be false so it colors red!
  assert.equal(formatPhpNumber(outflow), "-₱10.00");
  assert.equal(formatPhpNumber(net), "-₱10.00");
});
