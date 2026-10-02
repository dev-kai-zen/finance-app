import {
  addBillingMonths,
  dueDateForStatement,
  statementDateForTransaction,
} from "../utils/billing-dates";

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
  const monthlyAmountMinorUnits =
    termMonths > 0 ? Math.floor(principal / termMonths) : principal;

  return {
    monthlyAmountMinorUnits,
    firstStatementOn,
    firstDueOn,
    deferredMonths,
    totalAmountMinorUnits: principal,
  };
}
