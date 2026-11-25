import { buildInstallmentScheduleRows } from "./build-installment-schedule";

export function isInstallmentScheduleSupported(
  principalMinorUnits: number,
  termMonths: number,
): boolean {
  return getInstallmentScheduleSupportError(principalMinorUnits, termMonths) === null;
}

export function maxSupportedInstallmentTermMonths(
  principalMinorUnits: number,
): number {
  const principal = Math.max(0, Math.abs(principalMinorUnits));
  return Math.min(120, principal);
}

export function getInstallmentScheduleSupportError(
  principalMinorUnits: number,
  termMonths: number,
): string | null {
  if (!Number.isInteger(termMonths) || termMonths < 2 || termMonths > 120) {
    return null;
  }
  const principal = Math.max(0, Math.abs(principalMinorUnits));
  if (principal < 2) {
    return "Purchase amount is too small for installments. Enter a larger amount or save as a one-time charge.";
  }
  if (principal < termMonths) {
    const maxTerm = maxSupportedInstallmentTermMonths(principal);
    return `Purchase amount is too small for a ${termMonths}-month plan. Use at most ${maxTerm} months or increase the purchase amount.`;
  }
  const rows = buildInstallmentScheduleRows({
    planId: "validation_probe",
    termMonths,
    principalMinorUnits: principal,
    firstStatementOn: "2026-01-01",
    statementDay: 1,
    createdAt: new Date(0),
    newInstallmentId: () => "installment_probe",
  });
  if (rows.some((row) => row.principalMinorUnits <= 0)) {
    return `Purchase amount is too small for a ${termMonths}-month plan. Shorten the term or increase the purchase amount.`;
  }
  return null;
}

export function assertInstallmentScheduleSupported(
  principalMinorUnits: number,
  termMonths: number,
): void {
  const message = getInstallmentScheduleSupportError(
    principalMinorUnits,
    termMonths,
  );
  if (message) {
    throw new Error(message);
  }
}