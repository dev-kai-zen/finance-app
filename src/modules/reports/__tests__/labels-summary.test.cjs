const test = require("node:test");
const assert = require("node:assert/strict");

function aggregateLabelBreakdown({
  type,
  startDate,
  endDate,
  transactions,
  transactionLabels,
  labels,
}) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const labelMap = new Map();
  for (const l of labels) {
    labelMap.set(l.id, l);
  }

  // Build map of txId -> labelIds
  const txLabelsMap = new Map();
  for (const tl of transactionLabels) {
    const list = txLabelsMap.get(tl.transactionId) ?? [];
    list.push(tl.labelId);
    txLabelsMap.set(tl.transactionId, list);
  }

  const map = new Map();
  let overallTotal = 0;
  let overallTxCount = 0;
  let labeledTotal = 0;
  let labeledTxCount = 0;
  let unlabeledTotal = 0;
  let unlabeledTxCount = 0;

  const addToMap = (id, name, color, amount, countDelta) => {
    const existing = map.get(id);
    if (existing) {
      existing.total += amount;
      existing.count += countDelta;
    } else {
      map.set(id, {
        id,
        name,
        color,
        total: amount,
        count: countDelta,
      });
    }
  };

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type !== type) continue;

    const txTime = new Date(tx.occurredAt).getTime();
    if (txTime < startTime || txTime > endTime) continue;

    const amount = Math.abs(tx.amountMinorUnits);
    overallTotal += amount;
    overallTxCount += 1;

    const labelIds = txLabelsMap.get(tx.id) ?? [];
    if (labelIds.length === 0) {
      unlabeledTotal += amount;
      unlabeledTxCount += 1;
      addToMap("unlabeled", "Unlabeled", null, amount, 1);
    } else {
      labeledTotal += amount;
      labeledTxCount += 1;
      for (const labelId of labelIds) {
        const lbl = labelMap.get(labelId);
        const name = lbl ? lbl.name : "Unknown";
        const color = lbl ? lbl.color : null;
        addToMap(labelId, name, color, amount, 1);
      }
    }
  }

  const items = [];
  for (const [, data] of map.entries()) {
    const percentage = overallTotal > 0 ? (data.total / overallTotal) * 100 : 0;
    items.push({
      labelId: data.id,
      labelName: data.name,
      labelColor: data.color,
      totalMinorUnits: data.total,
      percentage: Number(percentage.toFixed(1)),
      transactionCount: data.count,
    });
  }

  items.sort((a, b) => {
    if (b.totalMinorUnits !== a.totalMinorUnits) {
      return b.totalMinorUnits - a.totalMinorUnits;
    }
    return b.transactionCount - a.transactionCount;
  });

  return {
    type,
    totalMinorUnits: overallTotal,
    labeledMinorUnits: labeledTotal,
    unlabeledMinorUnits: unlabeledTotal,
    transactionCount: overallTxCount,
    labeledTransactionCount: labeledTxCount,
    unlabeledTransactionCount: unlabeledTxCount,
    items,
  };
}

test("Labels summary aggregates expenses, calculates percentage, and sorts descending", () => {
  const labels = [
    { id: "lbl-travel", name: "Travel", color: "#3B82F6" },
    { id: "lbl-work", name: "Work", color: "#10B981" },
    { id: "lbl-personal", name: "Personal", color: "#F59E0B" },
  ];

  const transactions = [
    // Oct 1: Flight ticket ₱5,000 (Travel, Work)
    { id: "tx-1", type: "expense", amountMinorUnits: -500000, occurredAt: "2026-10-01T10:00:00Z" },
    // Oct 2: Dinner ₱1,500 (Personal)
    { id: "tx-2", type: "expense", amountMinorUnits: -150000, occurredAt: "2026-10-02T19:00:00Z" },
    // Oct 3: Coffee ₱200 (No label)
    { id: "tx-3", type: "expense", amountMinorUnits: -20000, occurredAt: "2026-10-03T08:00:00Z" },
    // Oct 4: Hotel ₱3,500 (Travel)
    { id: "tx-4", type: "expense", amountMinorUnits: -350000, occurredAt: "2026-10-04T12:00:00Z" },
    // Deleted transaction - should be ignored
    { id: "tx-5", type: "expense", amountMinorUnits: -100000, occurredAt: "2026-10-04T13:00:00Z", deletedAt: "2026-10-04T14:00:00Z" },
    // Income transaction - should be ignored for expense breakdown
    { id: "tx-6", type: "income", amountMinorUnits: 2000000, occurredAt: "2026-10-04T15:00:00Z" },
  ];

  const transactionLabels = [
    { transactionId: "tx-1", labelId: "lbl-travel" },
    { transactionId: "tx-1", labelId: "lbl-work" },
    { transactionId: "tx-2", labelId: "lbl-personal" },
    { transactionId: "tx-4", labelId: "lbl-travel" },
  ];

  const result = aggregateLabelBreakdown({
    type: "expense",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    transactions,
    transactionLabels,
    labels,
  });

  // Total expenses: 5,000 + 1,500 + 200 + 3,500 = 10,200 (1,020,000 cents)
  assert.equal(result.totalMinorUnits, 1020000);
  assert.equal(result.transactionCount, 4);

  // Labeled: 5,000 + 1,500 + 3,500 = 10,000 (1,000,000 cents), 3 txs
  assert.equal(result.labeledMinorUnits, 1000000);
  assert.equal(result.labeledTransactionCount, 3);

  // Unlabeled: 200 (20,000 cents), 1 tx
  assert.equal(result.unlabeledMinorUnits, 20000);
  assert.equal(result.unlabeledTransactionCount, 1);

  // Check items list
  // #1: Travel (5,000 + 3,500 = 8,500 = 850,000 cents, 2 tx)
  assert.equal(result.items[0].labelId, "lbl-travel");
  assert.equal(result.items[0].labelName, "Travel");
  assert.equal(result.items[0].totalMinorUnits, 850000);
  assert.equal(result.items[0].percentage, 83.3);
  assert.equal(result.items[0].transactionCount, 2);

  // #2: Work (5,000 = 500,000 cents, 1 tx)
  assert.equal(result.items[1].labelId, "lbl-work");
  assert.equal(result.items[1].labelName, "Work");
  assert.equal(result.items[1].totalMinorUnits, 500000);
  assert.equal(result.items[1].percentage, 49.0);
  assert.equal(result.items[1].transactionCount, 1);

  // #3: Personal (1,500 = 150,000 cents, 1 tx)
  assert.equal(result.items[2].labelId, "lbl-personal");
  assert.equal(result.items[2].totalMinorUnits, 150000);
  assert.equal(result.items[2].percentage, 14.7);
  assert.equal(result.items[2].transactionCount, 1);

  // #4: Unlabeled (200 = 20,000 cents, 1 tx)
  assert.equal(result.items[3].labelId, "unlabeled");
  assert.equal(result.items[3].labelName, "Unlabeled");
  assert.equal(result.items[3].totalMinorUnits, 20000);
  assert.equal(result.items[3].percentage, 2.0);
  assert.equal(result.items[3].transactionCount, 1);
});

test("Labels summary aggregates income correctly", () => {
  const labels = [
    { id: "lbl-freelance", name: "Freelance", color: "#10B981" },
    { id: "lbl-bonus", name: "Bonus", color: "#8B5CF6" },
  ];

  const transactions = [
    { id: "tx-1", type: "income", amountMinorUnits: 2500000, occurredAt: "2026-10-05T09:00:00Z" },
    { id: "tx-2", type: "income", amountMinorUnits: 500000, occurredAt: "2026-10-10T14:00:00Z" },
  ];

  const transactionLabels = [
    { transactionId: "tx-1", labelId: "lbl-freelance" },
    { transactionId: "tx-2", labelId: "lbl-bonus" },
  ];

  const result = aggregateLabelBreakdown({
    type: "income",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    transactions,
    transactionLabels,
    labels,
  });

  assert.equal(result.type, "income");
  assert.equal(result.totalMinorUnits, 3000000);
  assert.equal(result.labeledMinorUnits, 3000000);
  assert.equal(result.unlabeledMinorUnits, 0);
  assert.equal(result.transactionCount, 2);
  assert.equal(result.labeledTransactionCount, 2);
  assert.equal(result.unlabeledTransactionCount, 0);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].labelName, "Freelance");
  assert.equal(result.items[0].percentage, 83.3);
  assert.equal(result.items[1].labelName, "Bonus");
  assert.equal(result.items[1].percentage, 16.7);
});

test("Labels summary returns empty result when no transactions exist in range", () => {
  const result = aggregateLabelBreakdown({
    type: "expense",
    startDate: new Date("2026-09-01T00:00:00Z"),
    endDate: new Date("2026-09-30T23:59:59Z"),
    transactions: [],
    transactionLabels: [],
    labels: [],
  });

  assert.equal(result.totalMinorUnits, 0);
  assert.equal(result.labeledMinorUnits, 0);
  assert.equal(result.unlabeledMinorUnits, 0);
  assert.equal(result.transactionCount, 0);
  assert.equal(result.labeledTransactionCount, 0);
  assert.equal(result.unlabeledTransactionCount, 0);
  assert.equal(result.items.length, 0);
});
