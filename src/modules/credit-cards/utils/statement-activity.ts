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
  | "unpaid";

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
  if (statement.remainingAmountMinorUnits < statement.issuedAmountMinorUnits) {
    return "partial";
  }
  if (statement.dueOn < todayOn) {
    return "overdue";
  }
  return "unpaid";
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
      const byDate = right.occurredOn.localeCompare(left.occurredOn);
      if (byDate !== 0) return byDate;
      return right.id.localeCompare(left.id);
    });
}
