const test = require("node:test");
const assert = require("node:assert/strict");

function computeMonthlyCashFlow({ transactions, startDate, endDate }) {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  const slots = [];
  let curYear = startYear;
  let curMonth = startMonth;

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
    const key = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
    slots.push({
      periodKey: key,
      inflowMinorUnits: 0,
      outflowMinorUnits: 0,
      netCashFlowMinorUnits: 0,
      savingsRatePercentage: 0,
    });
    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  const slotMap = new Map();
  for (const s of slots) slotMap.set(s.periodKey, s);

  let overallInflow = 0;
  let overallOutflow = 0;

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === "transfer") continue;

    const d = new Date(tx.occurredAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const slot = slotMap.get(key);
    if (!slot) continue;

    if (tx.amountCents > 0) {
      slot.inflowMinorUnits += tx.amountCents;
      overallInflow += tx.amountCents;
    } else if (tx.amountCents < 0) {
      const outflow = Math.abs(tx.amountCents);
      slot.outflowMinorUnits += outflow;
      overallOutflow += outflow;
    }
  }

  for (const slot of slots) {
    slot.netCashFlowMinorUnits = slot.inflowMinorUnits - slot.outflowMinorUnits;
    slot.savingsRatePercentage =
      slot.inflowMinorUnits > 0
        ? Math.round((slot.netCashFlowMinorUnits / slot.inflowMinorUnits) * 100)
        : 0;
  }

  const overallNet = overallInflow - overallOutflow;
  const overallSavingsRate =
    overallInflow > 0 ? Math.round((overallNet / overallInflow) * 100) : 0;

  return {
    slots,
    overallInflow,
    overallOutflow,
    overallNet,
    overallSavingsRate,
  };
}

test("Cash flow aggregates inflow, outflow, and savings rate across monthly periods", () => {
  const transactions = [
    // Aug: Salary ₱50,000, Expense ₱30,000 -> Net ₱20,000 (Savings rate 40%)
    { type: "income", amountCents: 5000000, occurredAt: "2026-08-15T10:00:00Z" },
    { type: "expense", amountCents: -3000000, occurredAt: "2026-08-20T12:00:00Z" },

    // Sep: Salary ₱50,000, Expense ₱60,000 -> Net -₱10,000 (Savings rate -20%)
    { type: "income", amountCents: 5000000, occurredAt: "2026-09-15T10:00:00Z" },
    { type: "expense", amountCents: -6000000, occurredAt: "2026-09-22T14:00:00Z" },

    // Oct: Freelance ₱20,000, Expense ₱10,000 -> Net ₱10,000 (Savings rate 50%)
    { type: "income", amountCents: 2000000, occurredAt: "2026-10-02T09:00:00Z" },
    { type: "expense", amountCents: -1000000, occurredAt: "2026-10-03T18:00:00Z" },

    // Transfer should be excluded
    { type: "transfer", amountCents: 10000000, occurredAt: "2026-10-03T20:00:00Z" },
    // Soft-deleted should be excluded
    { type: "expense", amountCents: -5000000, occurredAt: "2026-10-03T21:00:00Z", deletedAt: "2026-10-03T22:00:00Z" },
  ];

  const result = computeMonthlyCashFlow({
    transactions,
    startDate: new Date(2026, 7, 1, 0, 0, 0, 0),
    endDate: new Date(2026, 9, 31, 23, 59, 59, 999),
  });

  assert.equal(result.slots.length, 3);

  // Aug 2026
  assert.equal(result.slots[0].periodKey, "2026-08");
  assert.equal(result.slots[0].inflowMinorUnits, 5000000);
  assert.equal(result.slots[0].outflowMinorUnits, 3000000);
  assert.equal(result.slots[0].netCashFlowMinorUnits, 2000000);
  assert.equal(result.slots[0].savingsRatePercentage, 40);

  // Sep 2026
  assert.equal(result.slots[1].periodKey, "2026-09");
  assert.equal(result.slots[1].inflowMinorUnits, 5000000);
  assert.equal(result.slots[1].outflowMinorUnits, 6000000);
  assert.equal(result.slots[1].netCashFlowMinorUnits, -1000000);
  assert.equal(result.slots[1].savingsRatePercentage, -20);

  // Oct 2026
  assert.equal(result.slots[2].periodKey, "2026-10");
  assert.equal(result.slots[2].inflowMinorUnits, 2000000);
  assert.equal(result.slots[2].outflowMinorUnits, 1000000);
  assert.equal(result.slots[2].netCashFlowMinorUnits, 1000000);
  assert.equal(result.slots[2].savingsRatePercentage, 50);

  // Overall Totals
  // Inflow: 50k + 50k + 20k = 120k (12,000,000 cents)
  assert.equal(result.overallInflow, 12000000);
  // Outflow: 30k + 60k + 10k = 100k (10,000,000 cents)
  assert.equal(result.overallOutflow, 10000000);
  // Net: 120k - 100k = 20k (2,000,000 cents)
  assert.equal(result.overallNet, 2000000);
  // Overall Savings rate: 20k / 120k = 17%
  assert.equal(result.overallSavingsRate, 17);
});
