import {
  addBillingMonths,
  dueDateForStatement,
  statementDateForTransaction,
} from "../utils/billing-dates";
import {
  getInstallmentScheduleSupportIssue,
  isInstallmentScheduleSupported,
  type InstallmentScheduleSupportIssue,
} from "../utils/validate-installment-schedule";

export interface PreviewInstallmentPlanInput {
  amountMinorUnits: number;
  termMonths: number;
  occurredAt?: Date;
  statementDay: number;
  paymentDueDay: number;
  deferredMonths?: number;
}

export interface InstallmentPlanPreview {
  monthlyAmountMinorUnits: number;
  smallestMonthlyMinorUnits: number;
  paymentsVaryByMinorUnit: boolean;
  scheduleSupported: boolean;
  supportIssue: InstallmentScheduleSupportIssue | null;
  firstStatementOn: string;
  firstDueOn: string;
  deferredMonths: number;
  totalAmountMinorUnits: number;
}

export function previewInstallmentPlan(
  input: PreviewInstallmentPlanInput,
): InstallmentPlanPreview {
  const principal = Math.max(0, Math.abs(input.amountMinorUnits));
  const termMonths = Math.max(1, Math.floor(input.termMonths));
  const deferredMonths = Math.max(0, Math.floor(input.deferredMonths ?? 0));
  const occurredAt = input.occurredAt ?? new Date();

  const baseStatementOn = statementDateForTransaction(
    occurredAt,
    input.statementDay,
  );
  const firstStatementOn =
    deferredMonths > 0
      ? addBillingMonths(baseStatementOn, deferredMonths, input.statementDay)
      : baseStatementOn;

  const firstDueOn = dueDateForStatement(firstStatementOn, input.paymentDueDay);
  const baseMonthly =
    termMonths > 0 ? Math.floor(principal / termMonths) : principal;
  const remainder = termMonths > 0 ? principal % termMonths : 0;
  const smallestMonthlyMinorUnits = baseMonthly;
  const monthlyAmountMinorUnits =
    remainder > 0 ? baseMonthly + 1 : baseMonthly;
  const scheduleSupported = isInstallmentScheduleSupported(principal, termMonths);

  return {
    monthlyAmountMinorUnits,
    smallestMonthlyMinorUnits,
    paymentsVaryByMinorUnit: monthlyAmountMinorUnits !== smallestMonthlyMinorUnits,
    scheduleSupported,
    supportIssue: getInstallmentScheduleSupportIssue(principal, termMonths),
    firstStatementOn,
    firstDueOn,
    deferredMonths,
    totalAmountMinorUnits: principal,
  };
}
