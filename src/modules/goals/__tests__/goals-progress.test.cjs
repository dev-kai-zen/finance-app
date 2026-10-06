const test = require("node:test");
const assert = require("node:assert/strict");

function calculateGoalProgress({
  goal,
  currentAmountMinorUnits,
  linkedAccounts = [],
  linkedPockets = [],
  now = new Date(),
}) {
  const current = Math.max(0, currentAmountMinorUnits);
  const target = Math.max(1, goal.targetAmountMinorUnits);
  const progressRatio = current / target;
  const rawPercentage = Math.round(progressRatio * 100);

  const remainingMinorUnits = Math.max(0, target - current);
  const isCompleted = goal.status === "completed" || current >= target;
  const isExceeded = current > target;

  let daysRemaining = null;
  let monthsRemaining = null;
  let pacePerMonthMinorUnits = null;
  let isPastDeadline = false;

  if (goal.targetDate) {
    const targetMs = goal.targetDate.getTime();
    const nowMs = now.getTime();
    const diffMs = targetMs - nowMs;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      isPastDeadline = true;
      daysRemaining = 0;
      monthsRemaining = 0;
      pacePerMonthMinorUnits = remainingMinorUnits > 0 ? remainingMinorUnits : 0;
    } else {
      isPastDeadline = false;
      daysRemaining = diffDays;
      const yearDiff = goal.targetDate.getFullYear() - now.getFullYear();
      const monthDiff = goal.targetDate.getMonth() - now.getMonth();
      const totalMonths = yearDiff * 12 + monthDiff;
      monthsRemaining = Math.max(1, totalMonths <= 0 ? 1 : totalMonths);

      if (remainingMinorUnits > 0) {
        pacePerMonthMinorUnits = Math.ceil(remainingMinorUnits / monthsRemaining);
      } else {
        pacePerMonthMinorUnits = 0;
      }
    }
  }

  return {
    ...goal,
    currentAmountMinorUnits: current,
    progressPercentage: rawPercentage,
    remainingMinorUnits,
    isCompleted,
    isExceeded,
    linkedAccounts,
    linkedPockets,
    daysRemaining,
    monthsRemaining,
    pacePerMonthMinorUnits,
    isPastDeadline,
  };
}

test("goals: calculates 50% progress accurately", () => {
  const baseGoal = {
    id: "g1",
    name: "Emergency Fund",
    targetAmountMinorUnits: 1000000, // ₱10,000.00
    currencyCode: "PHP",
    status: "in_progress",
    targetDate: null,
  };

  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: 500000, // ₱5,000.00
  });

  assert.equal(result.progressPercentage, 50);
  assert.equal(result.remainingMinorUnits, 500000);
  assert.equal(result.isCompleted, false);
  assert.equal(result.isExceeded, false);
});

test("goals: handles 0 and negative current balance safely", () => {
  const baseGoal = {
    id: "g2",
    name: "Vacation",
    targetAmountMinorUnits: 5000000,
    currencyCode: "PHP",
    status: "in_progress",
    targetDate: null,
  };

  const resultNegative = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: -250000,
  });

  assert.equal(resultNegative.currentAmountMinorUnits, 0);
  assert.equal(resultNegative.progressPercentage, 0);
  assert.equal(resultNegative.remainingMinorUnits, 5000000);
  assert.equal(resultNegative.isCompleted, false);
});

test("goals: detects completion and overflow when exceeding target", () => {
  const baseGoal = {
    id: "g3",
    name: "New Laptop",
    targetAmountMinorUnits: 6000000, // ₱60,000.00
    currencyCode: "PHP",
    status: "in_progress",
    targetDate: null,
  };

  const resultCompleted = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: 6000000,
  });
  assert.equal(resultCompleted.progressPercentage, 100);
  assert.equal(resultCompleted.remainingMinorUnits, 0);
  assert.equal(resultCompleted.isCompleted, true);
  assert.equal(resultCompleted.isExceeded, false);

  const resultExceeded = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: 7500000,
  });
  assert.equal(resultExceeded.progressPercentage, 125);
  assert.equal(resultExceeded.remainingMinorUnits, 0);
  assert.equal(resultExceeded.isCompleted, true);
  assert.equal(resultExceeded.isExceeded, true);
});

test("goals: calculates monthly savings pace towards deadline", () => {
  const now = new Date(2026, 0, 1); // Jan 1, 2026
  const targetDate = new Date(2026, 5, 1); // June 1, 2026 (5 months ahead)

  const baseGoal = {
    id: "g4",
    name: "Home Downpayment",
    targetAmountMinorUnits: 10000000, // ₱100,000.00
    currencyCode: "PHP",
    status: "in_progress",
    targetDate,
  };

  // ₱50,000 saved, ₱50,000 remaining across 5 months -> ₱10,000 / month
  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: 5000000,
    now,
  });

  assert.equal(result.monthsRemaining, 5);
  assert.equal(result.remainingMinorUnits, 5000000);
  assert.equal(result.pacePerMonthMinorUnits, 1000000);
  assert.equal(result.isPastDeadline, false);
});

test("goals: flags past deadlines accurately", () => {
  const now = new Date(2026, 5, 1); // June 1, 2026
  const targetDate = new Date(2026, 0, 1); // Jan 1, 2026 (in the past)

  const baseGoal = {
    id: "g5",
    name: "Old Goal",
    targetAmountMinorUnits: 1000000,
    currencyCode: "PHP",
    status: "in_progress",
    targetDate,
  };

  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: 200000,
    now,
  });

  assert.equal(result.isPastDeadline, true);
  assert.equal(result.daysRemaining, 0);
});

test("goals: aggregates progress across multiple linked accounts", () => {
  const linkedAccounts = [
    { id: "acc1", name: "Maya Bank", iconKey: "landmark", currentBalanceMinorUnits: 4000000 }, // ₱40k
    { id: "acc2", name: "BPI Checking", iconKey: "wallet", currentBalanceMinorUnits: 3000000 }, // ₱30k
  ];

  const totalBalance = linkedAccounts.reduce((sum, a) => sum + a.currentBalanceMinorUnits, 0); // ₱70k

  const baseGoal = {
    id: "g6",
    name: "Emergency Fund",
    targetAmountMinorUnits: 10000000, // ₱100k target
    currencyCode: "PHP",
    status: "in_progress",
    accountIds: ["acc1", "acc2"],
    targetDate: null,
  };

  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: totalBalance,
    linkedAccounts,
  });

  assert.equal(result.currentAmountMinorUnits, 7000000); // ₱70,000.00
  assert.equal(result.progressPercentage, 70); // 70%
  assert.equal(result.remainingMinorUnits, 3000000); // ₱30,000.00
  assert.equal(result.linkedAccounts.length, 2);
  assert.equal(result.linkedAccounts[0].name, "Maya Bank");
  assert.equal(result.linkedAccounts[1].name, "BPI Checking");
});

test("goals: aggregates progress from linked pockets", () => {
  const linkedPockets = [
    { id: "pock1", accountId: "acc1", name: "Travel Pocket", currentBalanceMinorUnits: 1500000 }, // ₱15,000
    { id: "pock2", accountId: "acc2", name: "Gadget Pocket", currentBalanceMinorUnits: 2500000 }, // ₱25,000
  ];

  const totalPocketBalance = linkedPockets.reduce((sum, p) => sum + p.currentBalanceMinorUnits, 0); // ₱40,000

  const baseGoal = {
    id: "g7",
    name: "Summer Trip",
    targetAmountMinorUnits: 5000000, // ₱50,000 target
    currencyCode: "PHP",
    status: "in_progress",
    pocketIds: ["pock1", "pock2"],
    targetDate: null,
  };

  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: totalPocketBalance,
    linkedPockets,
  });

  assert.equal(result.currentAmountMinorUnits, 4000000); // ₱40,000.00
  assert.equal(result.progressPercentage, 80); // 80%
  assert.equal(result.remainingMinorUnits, 1000000); // ₱10,000.00
  assert.equal(result.linkedPockets.length, 2);
  assert.equal(result.linkedPockets[0].name, "Travel Pocket");
  assert.equal(result.linkedPockets[1].name, "Gadget Pocket");
});

test("goals: aggregates mix of accounts and non-parent pockets without double counting", () => {
  const linkedAccounts = [
    { id: "acc1", name: "Main Bank", iconKey: "landmark", currentBalanceMinorUnits: 5000000 }, // ₱50,000
  ];

  // pockA belongs to acc1 (parent account already linked, should NOT be double counted)
  // pockB belongs to acc2 (independent account, SHOULD be included)
  const allPockets = [
    { id: "pockA", accountId: "acc1", name: "Emergency Sub", currentBalanceMinorUnits: 2000000 },
    { id: "pockB", accountId: "acc2", name: "Side Hustle Pocket", currentBalanceMinorUnits: 3000000 },
  ];

  const linkedAccountIdsSet = new Set(linkedAccounts.map((a) => a.id));
  const effectivePockets = allPockets.filter((p) => !linkedAccountIdsSet.has(p.accountId));

  const accountsSum = linkedAccounts.reduce((sum, a) => sum + a.currentBalanceMinorUnits, 0);
  const pocketsSum = effectivePockets.reduce((sum, p) => sum + p.currentBalanceMinorUnits, 0);
  const currentTotal = accountsSum + pocketsSum; // 50k + 30k = 80k (not 100k)

  const baseGoal = {
    id: "g8",
    name: "Business Expansion",
    targetAmountMinorUnits: 10000000, // ₱100k
    currencyCode: "PHP",
    status: "in_progress",
    accountIds: ["acc1"],
    pocketIds: ["pockA", "pockB"],
    targetDate: null,
  };

  const result = calculateGoalProgress({
    goal: baseGoal,
    currentAmountMinorUnits: currentTotal,
    linkedAccounts,
    linkedPockets: allPockets,
  });

  assert.equal(result.currentAmountMinorUnits, 8000000); // ₱80,000.00
  assert.equal(result.progressPercentage, 80);
  assert.equal(result.remainingMinorUnits, 2000000);
});

