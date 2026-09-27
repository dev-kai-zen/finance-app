import type { InferSelectModel } from "drizzle-orm";
import type {
  creditCardInstallmentPlans,
  creditCardInstallments,
  creditCardStatementEntries,
  creditCardStatements,
} from "@/infrastructure/database/schema";

export type CreditCardStatement = InferSelectModel<typeof creditCardStatements>;
export type CreditCardStatementEntry = InferSelectModel<
  typeof creditCardStatementEntries
>;
export type CreditCardInstallmentPlan = InferSelectModel<
  typeof creditCardInstallmentPlans
>;
export type CreditCardInstallment = InferSelectModel<
  typeof creditCardInstallments
>;

export interface InstallmentInput {
  termMonths: number;
}

export interface CreditCardStatementSummary extends CreditCardStatement {
  remainingAmountMinorUnits: number;
  entries: CreditCardStatementEntry[];
}

export interface CreditCardActivityItem {
  id: string;
  description: string;
  amountMinorUnits: number;
  occurredOn: string;
  detail: string | null;
}

export interface CreditCardMonitoringItem {
  accountId: string;
  accountName: string;
  currencyCode: string;
  creditLimitMinorUnits: number;
  billedMinorUnits: number;
  unbilledMinorUnits: number;
  outstandingMinorUnits: number;
  availableCreditMinorUnits: number;
  utilizationPercent: number;
  dueThisMonthMinorUnits: number;
  overdueMinorUnits: number;
  nextDueOn: string | null;
  activeInstallmentCount: number;
  billedItems: CreditCardActivityItem[];
  unbilledItems: CreditCardActivityItem[];
  statements: CreditCardStatementSummary[];
}

export interface CreditCardMonitoringSummary {
  cards: CreditCardMonitoringItem[];
  dueThisMonthMinorUnits: number;
  overdueMinorUnits: number;
}
