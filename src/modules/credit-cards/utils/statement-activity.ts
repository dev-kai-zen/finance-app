import type {
  CreditCardActivityItem,
  CreditCardStatementSummary,
} from "../types/credit-card.types";

export interface StatementDisplayItem extends CreditCardActivityItem {
  entryType:
    | "opening_balance"
    | "charge"
    | "installment"
    | "payment"
    | "refund"
    | "adjustment"
    | string;
  isCredit: boolean;
}

export type StatementPaymentStatus =
  | "paid"
  | "partial"
  | "overdue"
  | "overdue_partial"
  | "unpaid";

export type StatementPaymentBadgeKind = "paid" | "partial" | "overdue" | "none";

export interface StatementPaymentPresentation {
  status: StatementPaymentStatus;
  label: string;
  badgeKind: StatementPaymentBadgeKind;
}

export function formatBillPillDate(statementOn: string | null): string {
  if (!statementOn) return "Bill";
  const [year, month, day] = statementOn.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatBillPillLabel(
  statement: Pick<CreditCardStatementSummary, "kind" | "statementOn">,
): string {
  if (statement.kind === "opening") {
    return "Opening Bill";
  }
  return `${formatBillPillDate(statement.statementOn)} Bill`;
}

export function getStatementPaymentStatus(
  statement: Pick<
    CreditCardStatementSummary,
    "issuedAmountMinorUnits" | "remainingAmountMinorUnits" | "dueOn"
  >,
  todayOn: string,
): StatementPaymentStatus {
  if (statement.remainingAmountMinorUnits <= 0) {
    return "paid";
  }
  const isPartial =
    statement.remainingAmountMinorUnits < statement.issuedAmountMinorUnits;
  const isOverdue = statement.dueOn < todayOn;
  if (isOverdue) {
    return isPartial ? "overdue_partial" : "overdue";
  }
  if (isPartial) {
    return "partial";
  }
  return "unpaid";
}

export function getStatementPaymentPresentation(
  statement: Pick<
    CreditCardStatementSummary,
    "issuedAmountMinorUnits" | "remainingAmountMinorUnits" | "dueOn"
  >,
  todayOn: string,
): StatementPaymentPresentation {
  const status = getStatementPaymentStatus(statement, todayOn);
  switch (status) {
    case "paid":
      return { status, label: "Paid in full", badgeKind: "paid" };
    case "partial":
      return { status, label: "Partially paid", badgeKind: "partial" };
    case "overdue":
      return { status, label: "Past due", badgeKind: "overdue" };
    case "overdue_partial":
      return {
        status,
        label: "Past due · partially paid",
        badgeKind: "overdue",
      };
    default:
      return { status, label: "Remaining balance", badgeKind: "none" };
  }
}

export function getStatementDisplayItems(
  statement: CreditCardStatementSummary,
): StatementDisplayItem[] {
  return statement.entries
    .map((entry) => {
      const isCredit =
        entry.entryType === "payment" ||
        entry.entryType === "refund" ||
        (entry.entryType === "adjustment" && entry.amountMinorUnits < 0);

      let detail: string | null = null;
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
      if (right.occurredOn !== left.occurredOn) {
        return right.occurredOn > left.occurredOn ? 1 : -1;
      }
      if (right.id !== left.id) {
        return right.id > left.id ? 1 : -1;
      }
      return 0;
    });
}
