import type { TranslationKey } from "@/infrastructure/localization/translations";
import { buildInstallmentScheduleRows } from "./build-installment-schedule";

type TranslateFn = (
  key: TranslationKey,
  options?: Record<string, string | number | boolean | null | undefined>,
) => string;

export type InstallmentScheduleSupportIssue =
  | { code: "too_small_one_time" }
  | { code: "too_small_term"; termMonths: number; maxTerm: number }
  | { code: "zero_principal_row"; termMonths: number };

export function isInstallmentScheduleSupported(
  principalMinorUnits: number,
  termMonths: number,
): boolean {
  return (
    getInstallmentScheduleSupportIssue(principalMinorUnits, termMonths) ===
    null
  );
}

export function maxSupportedInstallmentTermMonths(
  principalMinorUnits: number,
): number {
  const principal = Math.max(0, Math.abs(principalMinorUnits));
  return Math.min(120, principal);
}

export function getInstallmentScheduleSupportIssue(
  principalMinorUnits: number,
  termMonths: number,
): InstallmentScheduleSupportIssue | null {
  if (!Number.isInteger(termMonths) || termMonths < 2 || termMonths > 120) {
    return null;
  }
  const principal = Math.max(0, Math.abs(principalMinorUnits));
  if (principal < 2) {
    return { code: "too_small_one_time" };
  }
  if (principal < termMonths) {
    const maxTerm = maxSupportedInstallmentTermMonths(principal);
    return { code: "too_small_term", termMonths, maxTerm };
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
    return { code: "zero_principal_row", termMonths };
  }
  return null;
}

function formatInstallmentScheduleSupportIssueEnglish(
  issue: InstallmentScheduleSupportIssue,
): string {
  switch (issue.code) {
    case "too_small_one_time":
      return "Purchase amount is too small for installments. Enter a larger amount or save as a one-time charge.";
    case "too_small_term":
      return `Purchase amount is too small for a ${issue.termMonths}-month plan. Use at most ${issue.maxTerm} months or increase the purchase amount.`;
    case "zero_principal_row":
      return `Purchase amount is too small for a ${issue.termMonths}-month plan. Shorten the term or increase the purchase amount.`;
    default:
      return "Installment schedule is not supported.";
  }
}

export function getInstallmentScheduleSupportError(
  principalMinorUnits: number,
  termMonths: number,
): string | null {
  const issue = getInstallmentScheduleSupportIssue(
    principalMinorUnits,
    termMonths,
  );
  if (!issue) {
    return null;
  }
  return formatInstallmentScheduleSupportIssueEnglish(issue);
}

export function assertInstallmentScheduleSupported(
  principalMinorUnits: number,
  termMonths: number,
): void {
  const issue = getInstallmentScheduleSupportIssue(
    principalMinorUnits,
    termMonths,
  );
  if (issue) {
    throw new Error(formatInstallmentScheduleSupportIssueEnglish(issue));
  }
}

export function translateInstallmentScheduleSupportIssue(
  issue: InstallmentScheduleSupportIssue,
  translate: TranslateFn,
): string {
  switch (issue.code) {
    case "too_small_one_time":
      return translate("creditCardMonitoring.installment.tooSmallOneTime");
    case "too_small_term":
      return translate("creditCardMonitoring.installment.tooSmallTerm", {
        termMonths: issue.termMonths,
        maxTerm: issue.maxTerm,
      });
    case "zero_principal_row":
      return translate("creditCardMonitoring.installment.zeroPrincipalRow", {
        termMonths: issue.termMonths,
      });
    default:
      return translate("creditCardMonitoring.installment.unsupported");
  }
}