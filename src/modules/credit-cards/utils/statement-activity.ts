import type { TranslationKey } from "@/infrastructure/localization/translations";
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
  labelKey: TranslationKey;
  badgeKind: StatementPaymentBadgeKind;
}

export interface StatementActivityLabels {
  installment: string;
  openingBalance: string;
  payment: string;
  refund: string;
  adjustment: string;
  cardPurchase: string;
  cardPayment: string;
  cardCharge: string;
  openingBill: string;
  billWithDate: (formattedDate: string) => string;
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
  labels: Pick<StatementActivityLabels, "openingBill" | "billWithDate">,
): string {
  if (statement.kind === "opening") {
    return labels.openingBill;
  }
  return labels.billWithDate(formatBillPillDate(statement.statementOn));
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
      return {
        status,
        labelKey: "creditCardMonitoring.status.paidInFull",
        badgeKind: "paid",
      };
    case "partial":
      return {
        status,
        labelKey: "creditCardMonitoring.status.partiallyPaid",
        badgeKind: "partial",
      };
    case "overdue":
      return {
        status,
        labelKey: "creditCardMonitoring.status.pastDue",
        badgeKind: "overdue",
      };
    case "overdue_partial":
      return {
        status,
        labelKey: "creditCardMonitoring.status.pastDuePartial",
        badgeKind: "overdue",
      };
    default:
      return {
        status,
        labelKey: "creditCardMonitoring.status.remainingBalance",
        badgeKind: "none",
      };
  }
}

export function getStatementDisplayItems(
  statement: CreditCardStatementSummary,
  labels: StatementActivityLabels,
): StatementDisplayItem[] {
  return statement.entries
    .map((entry) => {
      const isCredit =
        entry.entryType === "payment" ||
        entry.entryType === "refund" ||
        (entry.entryType === "adjustment" && entry.amountMinorUnits < 0);

      let detail: string | null = null;
      if (entry.entryType === "installment") {
        detail = labels.installment;
      } else if (entry.entryType === "opening_balance") {
        detail = labels.openingBalance;
      } else if (entry.entryType === "payment") {
        detail = labels.payment;
      } else if (entry.entryType === "refund") {
        detail = labels.refund;
      } else if (entry.entryType === "adjustment") {
        detail = labels.adjustment;
      } else {
        detail = labels.cardPurchase;
      }

      const description =
        entry.descriptionSnapshot ??
        (isCredit ? labels.cardPayment : labels.cardCharge);

      return {
        id: entry.id,
        description,
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
