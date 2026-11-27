const test = require("node:test");
const assert = require("node:assert/strict");

function aggregateCategoryBreakdown({
  type,
  startDate,
  endDate,
  transactions,
  categories,
}) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const catMap = new Map();
  for (const c of categories) {
    catMap.set(c.id, c);
  }

  const map = new Map();
  let overallTotal = 0;
  let overallTxCount = 0;

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type !== type) continue;

    const txTime = new Date(tx.occurredAt).getTime();
    if (txTime < startTime || txTime > endTime) continue;

    const catId = tx.categoryId || "uncategorized";
    const cat = catMap.get(catId);
    const catName = cat ? cat.name : "Uncategorized";
    const catColor = cat ? cat.hexColorsId : null;
    const catIcon = cat ? cat.icon : (type === "income" ? "wallet" : "tag");
    const amount =
      type === "expense" ? -tx.amountMinorUnits : tx.amountMinorUnits;

    const existing = map.get(catId);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      map.set(catId, {
        name: catName,
        color: catColor,
        icon: catIcon,
        total: amount,
        count: 1,
      });
    }

    overallTotal += amount;
    overallTxCount += 1;
  }

  const positiveTotal = Array.from(map.values())
    .filter((c) => c.total > 0)
    .reduce((sum, c) => sum + c.total, 0);

  const items = [];
  for (const [id, data] of map.entries()) {
    const percentage =
      positiveTotal > 0 && data.total > 0
        ? (data.total / positiveTotal) * 100
        : 0;
    items.push({
      categoryId: id,
      categoryName: data.name,
      categoryColor: data.color,
      categoryIcon: data.icon,
      totalMinorUnits: data.total,
      percentage: Number(percentage.toFixed(1)),
      transactionCount: data.count,
    });
  }

  items.sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);

  return {
    type,
    totalMinorUnits: overallTotal,
    transactionCount: overallTxCount,
    items,
  };
}

test("Category breakdown aggregates expenses, calculates percentage, and sorts descending", () => {
  const categories = [
    { id: "cat-dining", name: "Dining Out", hexColorsId: "coral", icon: "utensils" },
    { id: "cat-groceries", name: "Groceries", hexColorsId: "emerald", icon: "shopping-cart" },
    { id: "cat-rent", name: "Rent", hexColorsId: "blue", icon: "home" },
  ];

  const transactions = [
    // Oct 1: Dinner ₱1,500
    { id: "tx-1", type: "expense", categoryId: "cat-dining", amountMinorUnits: -150000, occurredAt: "2026-10-01T19:00:00Z" },
    // Oct 2: Groceries ₱3,000
    { id: "tx-2", type: "expense", categoryId: "cat-groceries", amountMinorUnits: -300000, occurredAt: "2026-10-02T10:00:00Z" },
    // Oct 3: Lunch ₱500
    { id: "tx-3", type: "expense", categoryId: "cat-dining", amountMinorUnits: -50000, occurredAt: "2026-10-03T12:00:00Z" },
    // Oct 4: Rent ₱10,000
    { id: "tx-4", type: "expense", categoryId: "cat-rent", amountMinorUnits: -1000000, occurredAt: "2026-10-04T08:00:00Z" },
    // Soft-deleted expense should be ignored
    { id: "tx-5", type: "expense", categoryId: "cat-dining", amountMinorUnits: -50000, occurredAt: "2026-10-04T12:00:00Z", deletedAt: "2026-10-04T13:00:00Z" },
    // Income transaction should be ignored for expense breakdown
    { id: "tx-6", type: "income", categoryId: "cat-dining", amountMinorUnits: 5000000, occurredAt: "2026-10-04T15:00:00Z" },
  ];

  const result = aggregateCategoryBreakdown({
    type: "expense",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    transactions,
    categories,
  });

  // Total expense: 1,500 + 3,000 + 500 + 10,000 = 15,000 (1,500,000 cents)
  assert.equal(result.totalMinorUnits, 1500000);
  assert.equal(result.transactionCount, 4);
  assert.equal(result.items.length, 3);

  // #1: Rent (₱10,000 / 66.7%)
  assert.equal(result.items[0].categoryId, "cat-rent");
  assert.equal(result.items[0].totalMinorUnits, 1000000);
  assert.equal(result.items[0].percentage, 66.7);
  assert.equal(result.items[0].transactionCount, 1);

  // #2: Groceries (₱3,000 / 20.0%)
  assert.equal(result.items[1].categoryId, "cat-groceries");
  assert.equal(result.items[1].totalMinorUnits, 300000);
  assert.equal(result.items[1].percentage, 20.0);
  assert.equal(result.items[1].transactionCount, 1);

  // #3: Dining Out (₱2,000 / 13.3%, 2 tx)
  assert.equal(result.items[2].categoryId, "cat-dining");
  assert.equal(result.items[2].totalMinorUnits, 200000);
  assert.equal(result.items[2].percentage, 13.3);
  assert.equal(result.items[2].transactionCount, 2);
});

test("Category breakdown returns empty result when no transactions exist in range", () => {
  const result = aggregateCategoryBreakdown({
    type: "expense",
    startDate: new Date("2026-09-01T00:00:00Z"),
    endDate: new Date("2026-09-30T23:59:59Z"),
    transactions: [],
    categories: [],
  });

  assert.equal(result.totalMinorUnits, 0);
  assert.equal(result.transactionCount, 0);
  assert.equal(result.items.length, 0);
});

test("REP-F03: Category breakdown handles mixed positive expenses and refunds without exceeding 100%", () => {
  const categories = [
    { id: "cat-dining", name: "Dining", hexColorsId: "coral", icon: "utensils" },
    { id: "cat-groceries", name: "Groceries", hexColorsId: "emerald", icon: "shopping-cart" },
    { id: "cat-electronics", name: "Electronics", hexColorsId: "blue", icon: "tv" },
  ];

  const transactions = [
    // Dining: ₱100 expense
    { id: "tx-1", type: "expense", categoryId: "cat-dining", amountMinorUnits: -10000, occurredAt: "2026-10-01T12:00:00Z" },
    // Groceries: ₱50 expense
    { id: "tx-2", type: "expense", categoryId: "cat-groceries", amountMinorUnits: -5000, occurredAt: "2026-10-02T12:00:00Z" },
    // Electronics: ₱30 refund
    { id: "tx-3", type: "expense", categoryId: "cat-electronics", amountMinorUnits: 3000, occurredAt: "2026-10-03T12:00:00Z" },
  ];

  const result = aggregateCategoryBreakdown({
    type: "expense",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    transactions,
    categories,
  });

  // Net total: 100 + 50 - 30 = 120 (12,000 minor units)
  assert.equal(result.totalMinorUnits, 12000);
  assert.equal(result.transactionCount, 3);
  assert.equal(result.items.length, 3);

  // Positive total is 100 + 50 = 150
  // Dining: 100 / 150 = 66.7% (NOT 100 / 120 = 83.3%)
  const dining = result.items.find((i) => i.categoryId === "cat-dining");
  assert.ok(dining);
  assert.equal(dining.totalMinorUnits, 10000);
  assert.equal(dining.percentage, 66.7);

  // Groceries: 50 / 150 = 33.3% (NOT 50 / 120 = 41.7%)
  const groceries = result.items.find((i) => i.categoryId === "cat-groceries");
  assert.ok(groceries);
  assert.equal(groceries.totalMinorUnits, 5000);
  assert.equal(groceries.percentage, 33.3);

  // Sum of positive percentages is exactly 100% (66.7 + 33.3 = 100)
  assert.equal(Number((dining.percentage + groceries.percentage).toFixed(1)), 100);

  // Electronics: Net refund -30, percentage 0%
  const electronics = result.items.find((i) => i.categoryId === "cat-electronics");
  assert.ok(electronics);
  assert.equal(electronics.totalMinorUnits, -3000);
  assert.equal(electronics.percentage, 0);
});

test("REP-F03: Category breakdown handles net-zero activity with transactions", () => {
  const categories = [
    { id: "cat-clothing", name: "Clothing", hexColorsId: "purple", icon: "tag" },
  ];

  const transactions = [
    // Purchase: ₱2,500 expense
    { id: "tx-1", type: "expense", categoryId: "cat-clothing", amountMinorUnits: -250000, occurredAt: "2026-10-01T12:00:00Z" },
    // Return: ₱2,500 refund
    { id: "tx-2", type: "expense", categoryId: "cat-clothing", amountMinorUnits: 250000, occurredAt: "2026-10-05T12:00:00Z" },
  ];

  const result = aggregateCategoryBreakdown({
    type: "expense",
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    transactions,
    categories,
  });

  // Net total is 0, but transaction count is 2
  assert.equal(result.totalMinorUnits, 0);
  assert.equal(result.transactionCount, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].totalMinorUnits, 0);
  assert.equal(result.items[0].transactionCount, 2);
  assert.equal(result.items[0].percentage, 0);
});
