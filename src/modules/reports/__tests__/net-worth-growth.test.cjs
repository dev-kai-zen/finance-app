const test = require("node:test");
const assert = require("node:assert/strict");

function getHistoricalCutoffDates(startDate, endDate) {
  const cutoffs = [];
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  let curYear = startYear;
  let curMonth = startMonth;

  while (curYear < endYear || (curYear === endYear && curMonth < endMonth)) {
    cutoffs.push(new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999));
    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  cutoffs.push(new Date(endDate));
  return cutoffs;
}

function computeNetWorthGrowthPoints({ accounts, deltasAtCutoffs, cutoffDates }) {
  const activeAccounts = accounts.filter(
    (a) => !a.isArchived && !a.hideFromReports,
  );

  const rawPoints = cutoffDates.map((date, index) => {
    const deltas = deltasAtCutoffs[index] ?? {};
    const cutoffTime = date.getTime();

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of activeAccounts) {
      if (acc.openingBalanceAt.getTime() > cutoffTime) continue;

      const delta = deltas[acc.id] ?? 0;
      const balance = acc.openingBalanceMinorUnits + delta;

      if (acc.accountType?.accountGroup === "liability") {
        totalLiabilities += balance;
      } else {
        totalAssets += balance;
      }
    }

    const netWorth = totalAssets + totalLiabilities;
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      date,
      label,
      totalAssets,
      totalLiabilities,
      netWorth,
    };
  });

  const points = [];
  let peak = rawPoints.length > 0 ? rawPoints[0].netWorth : 0;
  let lowest = rawPoints.length > 0 ? rawPoints[0].netWorth : 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const prevPt = i > 0 ? rawPoints[i - 1] : null;

    if (pt.netWorth > peak) peak = pt.netWorth;
    if (pt.netWorth < lowest) lowest = pt.netWorth;

    const diff = prevPt ? pt.netWorth - prevPt.netWorth : 0;

    let symbol = "";
    let color = "#64748B";

    if (diff > 0) {
      symbol = "▲";
      color = "#10B981";
    } else if (diff < 0) {
      symbol = "▼";
      color = "#EF4444";
    }

    points.push({
      date: pt.date,
      label: pt.label,
      netWorthMinorUnits: pt.netWorth,
      totalAssetsMinorUnits: pt.totalAssets,
      totalLiabilitiesMinorUnits: pt.totalLiabilities,
      diffFromPriorMinorUnits: diff,
      symbol,
      color,
    });
  }

  const startingPoint = points[0];
  const currentPoint = points[points.length - 1];

  const currentNetWorth = currentPoint ? currentPoint.netWorthMinorUnits : 0;
  const startingNetWorth = startingPoint ? startingPoint.netWorthMinorUnits : 0;
  const periodChange = currentNetWorth - startingNetWorth;
  const periodChangePercentage =
    startingNetWorth !== 0
      ? Math.round((periodChange / Math.abs(startingNetWorth)) * 100)
      : null;

  return {
    currentNetWorthMinorUnits: currentNetWorth,
    startingNetWorthMinorUnits: startingNetWorth,
    periodChangeMinorUnits: periodChange,
    periodChangePercentage,
    peakNetWorthMinorUnits: peak,
    lowestNetWorthMinorUnits: lowest,
    points,
  };
}

test("getHistoricalCutoffDates correctly generates sequential monthly ends plus current date", () => {
  const startDate = new Date(2026, 4, 1, 0, 0, 0, 0); // May 1, 2026
  const endDate = new Date(2026, 9, 4, 15, 30, 0, 0);  // Oct 4, 2026

  const cutoffs = getHistoricalCutoffDates(startDate, endDate);

  // Should have May 31, Jun 30, Jul 31, Aug 31, Sep 30, Oct 4 = 6 points
  assert.equal(cutoffs.length, 6);

  assert.equal(cutoffs[0].getFullYear(), 2026);
  assert.equal(cutoffs[0].getMonth(), 4); // May
  assert.equal(cutoffs[0].getDate(), 31);

  assert.equal(cutoffs[1].getMonth(), 5); // June
  assert.equal(cutoffs[1].getDate(), 30);

  assert.equal(cutoffs[4].getMonth(), 8); // Sep
  assert.equal(cutoffs[4].getDate(), 30);

  assert.equal(cutoffs[5].getMonth(), 9); // Oct
  assert.equal(cutoffs[5].getDate(), 4);
});

test("computeNetWorthGrowthPoints computes assets, liabilities, net worth trajectory and peaks", () => {
  const accounts = [
    {
      id: "acc_bank",
      isArchived: false,
      hideFromReports: false,
      openingBalanceMinorUnits: 10000000, // ₱100,000
      openingBalanceAt: new Date(2026, 0, 1),
      accountType: { accountGroup: "asset" },
    },
    {
      id: "acc_credit_card",
      isArchived: false,
      hideFromReports: false,
      openingBalanceMinorUnits: -2000000, // -₱20,000 (liability)
      openingBalanceAt: new Date(2026, 0, 1),
      accountType: { accountGroup: "liability" },
    },
  ];

  const cutoffDates = [
    new Date(2026, 7, 31, 23, 59, 59), // Aug 31
    new Date(2026, 8, 30, 23, 59, 59), // Sep 30
    new Date(2026, 9, 4, 12, 0, 0),    // Oct 4
  ];

  // Month 1 (Aug 31):
  // Bank delta = +₱10k -> ₱110,000
  // Card delta = -₱5k (spent 5k) -> -₱25,000
  // Net worth = 110k - 25k = ₱85,000 (8,500,000 minor units)
  //
  // Month 2 (Sep 30):
  // Bank delta = +₱30k -> ₱130,000
  // Card delta = +₱10k (paid down debt) -> -₱10,000
  // Net worth = 130k - 10k = ₱120,000 (12,000,000 minor units)
  //
  // Month 3 (Oct 4):
  // Bank delta = +₱15k -> ₱115,000
  // Card delta = -₱5k -> -₱25,000
  // Net worth = 115k - 25k = ₱90,000 (9,000,000 minor units)
  const deltasAtCutoffs = [
    { acc_bank: 1000000, acc_credit_card: -500000 },
    { acc_bank: 3000000, acc_credit_card: 1000000 },
    { acc_bank: 1500000, acc_credit_card: -500000 },
  ];

  const res = computeNetWorthGrowthPoints({
    accounts,
    deltasAtCutoffs,
    cutoffDates,
  });

  assert.equal(res.points.length, 3);

  // Aug 31
  assert.equal(res.points[0].totalAssetsMinorUnits, 11000000);
  assert.equal(res.points[0].totalLiabilitiesMinorUnits, -2500000);
  assert.equal(res.points[0].netWorthMinorUnits, 8500000);
  assert.equal(res.points[0].symbol, ""); // baseline

  // Sep 30: +₱35,000 increase
  assert.equal(res.points[1].totalAssetsMinorUnits, 13000000);
  assert.equal(res.points[1].totalLiabilitiesMinorUnits, -1000000);
  assert.equal(res.points[1].netWorthMinorUnits, 12000000);
  assert.equal(res.points[1].diffFromPriorMinorUnits, 3500000);
  assert.equal(res.points[1].symbol, "▲");
  assert.equal(res.points[1].color, "#10B981");

  // Oct 4: -₱30,000 decrease
  assert.equal(res.points[2].totalAssetsMinorUnits, 11500000);
  assert.equal(res.points[2].totalLiabilitiesMinorUnits, -2500000);
  assert.equal(res.points[2].netWorthMinorUnits, 9000000);
  assert.equal(res.points[2].diffFromPriorMinorUnits, -3000000);
  assert.equal(res.points[2].symbol, "▼");
  assert.equal(res.points[2].color, "#EF4444");

  // Peaks and Lows
  assert.equal(res.peakNetWorthMinorUnits, 12000000); // ₱120k peak
  assert.equal(res.lowestNetWorthMinorUnits, 8500000); // ₱85k lowest

  // Overall Period Change: 90k - 85k = +5k (+6%)
  assert.equal(res.startingNetWorthMinorUnits, 8500000);
  assert.equal(res.currentNetWorthMinorUnits, 9000000);
  assert.equal(res.periodChangeMinorUnits, 500000);
  assert.equal(res.periodChangePercentage, 6);
});
