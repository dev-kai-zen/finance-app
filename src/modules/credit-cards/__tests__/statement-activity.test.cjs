const test = require("node:test");
const assert = require("node:assert/strict");

// Pure functions can be tested directly
function formatBillPillDate(statementOn) {
  if (!statementOn) return "Bill";
  const [year, month, day] = statementOn.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatBillPillLabel(statement) {
  if (statement.kind === "opening") {
    return "Opening Bill";
  }
  return `${formatBillPillDate(statement.statementOn)} Bill`;
}

function getStatementPaymentStatus(statement, todayOn) {
  if (statement.remainingAmountMinorUnits <= 0) {
    return "paid";
  }
  if (statement.remainingAmountMinorUnits < statement.issuedAmountMinorUnits) {
    return "partial";
  }
  if (statement.dueOn < todayOn) {
    return "overdue";
  }
  return "unpaid";
}

function getStatementDisplayItems(statement) {
  return statement.entries
    .map((entry) => {
      const isCredit =
        entry.entryType === "payment" ||
        entry.entryType === "refund" ||
        (entry.entryType === "adjustment" && entry.amountMinorUnits < 0);

      let detail = null;
      if (entry.entryType === "installment") {
        detail = "Installment";
      } else if (entry.entryType === "opening_balance") {
        detail = "Opening balance";
      } else if (entry.entryType === "payment") {
        detail = "Payment";
      } else if (entry.entryType === "refund") {
        detail = "Refund";
      } else if (entry.entryType === "adjustment") {
        detail = "Adjustment";
      } else {
        detail = "Card purchase";
      }

      return {
        id: entry.id,
        description:
          entry.descriptionSnapshot ??
          (isCredit ? "Card payment" : "Card charge"),
        amountMinorUnits: Math.abs(entry.amountMinorUnits),
        occurredOn: entry.occurredOnSnapshot,
        detail,
        entryType: entry.entryType,
        isCredit,
      };
    })
    .sort((left, right) => {
      const byDate = right.occurredOn.localeCompare(left.occurredOn);
      if (byDate !== 0) return byDate;
      return right.id.localeCompare(left.id);
    });
}

test("statement-activity: formatBillPillLabel formats opening and regular billing cycles properly", () => {
  const opening = { kind: "opening", statementOn: "2026-10-01" };
  assert.equal(formatBillPillLabel(opening), "Opening Bill");

  const cycle = { kind: "billing_cycle", statementOn: "2026-11-25" };
  const label = formatBillPillLabel(cycle);
  assert.match(label, /Nov 25 Bill/);
});

test("statement-activity: getStatementPaymentStatus determines status accurately", () => {
  const today = "2026-11-10";

  // Paid
  assert.equal(
    getStatementPaymentStatus(
      {
        issuedAmountMinorUnits: 100000,
        remainingAmountMinorUnits: 0,
        dueOn: "2026-11-15",
      },
      today,
    ),
    "paid",
  );

  // Partially paid
  assert.equal(
    getStatementPaymentStatus(
      {
        issuedAmountMinorUnits: 100000,
        remainingAmountMinorUnits: 40000,
        dueOn: "2026-11-15",
      },
      today,
    ),
    "partial",
  );

  // Past due / Overdue
  assert.equal(
    getStatementPaymentStatus(
      {
        issuedAmountMinorUnits: 100000,
        remainingAmountMinorUnits: 100000,
        dueOn: "2026-11-05",
      },
      today,
    ),
    "overdue",
  );

  // Unpaid, not overdue
  assert.equal(
    getStatementPaymentStatus(
      {
        issuedAmountMinorUnits: 100000,
        remainingAmountMinorUnits: 100000,
        dueOn: "2026-11-20",
      },
      today,
    ),
    "unpaid",
  );
});

test("statement-activity: getStatementDisplayItems maps entries and sorts newest first", () => {
  const statement = {
    id: "stmt_1",
    entries: [
      {
        id: "entry_1",
        entryType: "charge",
        amountMinorUnits: 25000,
        descriptionSnapshot: "Groceries",
        occurredOnSnapshot: "2026-10-20",
      },
      {
        id: "entry_2",
        entryType: "payment",
        amountMinorUnits: -25000,
        descriptionSnapshot: "Bank Transfer Payment",
        occurredOnSnapshot: "2026-11-02",
      },
      {
        id: "entry_3",
        entryType: "installment",
        amountMinorUnits: 50000,
        descriptionSnapshot: "Smartphone - 1 of 6",
        occurredOnSnapshot: "2026-10-25",
      },
    ],
  };

  const items = getStatementDisplayItems(statement);
  assert.equal(items.length, 3);
  // Newest first: entry_2 (Nov 02), entry_3 (Oct 25), entry_1 (Oct 20)
  assert.equal(items[0].id, "entry_2");
  assert.equal(items[0].isCredit, true);
  assert.equal(items[0].detail, "Payment");
  assert.equal(items[0].amountMinorUnits, 25000);

  assert.equal(items[1].id, "entry_3");
  assert.equal(items[1].isCredit, false);
  assert.equal(items[1].detail, "Installment");

  assert.equal(items[2].id, "entry_1");
  assert.equal(items[2].isCredit, false);
  assert.equal(items[2].detail, "Card purchase");
});

