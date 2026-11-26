const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("Calendar: Schedules Total Due (Option A: Gross Bills Payable)", () => {
  // Pure function replica of calculateSchedulesTotalDue
  function calculateSchedulesTotalDue(
    occurrences,
    accountCurrencyMap,
    convertToDefaultCurrency,
  ) {
    let totalDue = 0;

    for (const occ of occurrences) {
      if (occ.status === "due" || occ.status === "upcoming") {
        if (occ.transactionType === "transfer" || occ.transactionType === "income") {
          continue;
        }
        if (occ.transactionType === "expense" || occ.amountMinorUnits < 0) {
          const currency =
            (occ.accountId ? accountCurrencyMap.get(occ.accountId) : undefined) ??
            "PHP";
          const convertedAmount = convertToDefaultCurrency(
            Math.abs(occ.amountMinorUnits),
            currency,
          );
          totalDue += convertedAmount;
        }
      }
    }

    return totalDue;
  }

  const identityConverter = (amount) => amount;
  const currencyMap = new Map([
    ["acc-1", "PHP"],
    ["acc-2", "USD"],
  ]);

  it("calculates gross bills payable for a single scheduled expense as a positive magnitude", () => {
    const schedules = [
      {
        id: "occ-1",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -189900, // ₱1,899.00
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    assert.equal(result, 189900, "Total Due should be positive ₱1,899.00");
  });

  it("sums multiple scheduled expenses into gross total bills payable", () => {
    const schedules = [
      {
        id: "occ-1",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -1500000, // ₱15,000 rent
        accountId: "acc-1",
      },
      {
        id: "occ-2",
        status: "upcoming",
        transactionType: "expense",
        amountMinorUnits: -50000, // ₱500 water
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    assert.equal(result, 1550000, "Total Due should be ₱15,500.00");
  });

  it("excludes scheduled income from Total Due (income is not a debt/bill owed)", () => {
    const schedules = [
      {
        id: "occ-salary",
        status: "due",
        transactionType: "income",
        amountMinorUnits: 5000000, // ₱50,000 salary
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    assert.equal(result, 0, "Total Due should be 0 when only income is scheduled");
  });

  it("does NOT offset scheduled bills with scheduled income (preserves gross bills payable)", () => {
    const schedules = [
      {
        id: "occ-salary",
        status: "upcoming",
        transactionType: "income",
        amountMinorUnits: 5000000, // +₱50,000
        accountId: "acc-1",
      },
      {
        id: "occ-electric",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -300000, // -₱3,000
        accountId: "acc-1",
      },
      {
        id: "occ-gym",
        status: "upcoming",
        transactionType: "expense",
        amountMinorUnits: -150000, // -₱1,500
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    // If netted, 50,000 - 4,500 would be +45,500 under a "Due" badge (confusing).
    // Under Option A, Total Due strictly represents the ₱4,500 in bills owed.
    assert.equal(result, 450000, "Total Due should strictly be ₱4,500.00 gross bills payable");
  });

  it("excludes scheduled transfers from Total Due (internal movements are not external bills)", () => {
    const schedules = [
      {
        id: "occ-transfer",
        status: "due",
        transactionType: "transfer",
        amountMinorUnits: -1000000, // ₱10,000 transfer
        accountId: "acc-1",
      },
      {
        id: "occ-bill",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -250000, // ₱2,500 bill
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    assert.equal(result, 250000, "Total Due should only reflect the ₱2,500 bill, excluding the transfer");
  });

  it("excludes posted, skipped, and failed occurrences from pending bills due", () => {
    const schedules = [
      {
        id: "occ-posted",
        status: "posted",
        transactionType: "expense",
        amountMinorUnits: -200000,
        accountId: "acc-1",
      },
      {
        id: "occ-skipped",
        status: "skipped",
        transactionType: "expense",
        amountMinorUnits: -100000,
        accountId: "acc-1",
      },
      {
        id: "occ-failed",
        status: "failed",
        transactionType: "expense",
        amountMinorUnits: -50000,
        accountId: "acc-1",
      },
      {
        id: "occ-due",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -80000,
        accountId: "acc-1",
      },
    ];

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      identityConverter,
    );

    assert.equal(result, 80000, "Total Due should only include the due item (₱800.00)");
  });

  it("converts multi-currency expenses to default base currency", () => {
    const schedules = [
      {
        id: "occ-usd",
        status: "due",
        transactionType: "expense",
        amountMinorUnits: -10000, // $100.00
        accountId: "acc-2", // USD
      },
    ];

    const rateConverter = (amount, currency) => {
      if (currency === "USD") return amount * 58; // 1 USD = 58 PHP
      return amount;
    };

    const result = calculateSchedulesTotalDue(
      schedules,
      currencyMap,
      rateConverter,
    );

    assert.equal(result, 580000, "Total Due should convert $100.00 USD to ₱5,800.00 PHP");
  });
});
