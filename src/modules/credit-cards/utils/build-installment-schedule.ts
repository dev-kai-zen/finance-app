import type { creditCardInstallments } from "@/infrastructure/database/schema";
import { addBillingMonths } from "./billing-dates";

type InstallmentInsert = typeof creditCardInstallments.$inferInsert;

export function buildInstallmentScheduleRows(input: {
  planId: string;
  termMonths: number;
  principalMinorUnits: number;
  firstStatementOn: string;
  statementDay: number;
  createdAt: Date;
  newInstallmentId: () => string;
}): InstallmentInsert[] {
  const baseAmount = Math.floor(input.principalMinorUnits / input.termMonths);
  let remainder = input.principalMinorUnits % input.termMonths;
  return Array.from({ length: input.termMonths }, (_, index) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return {
      id: input.newInstallmentId(),
      planId: input.planId,
      installmentNumber: index + 1,
      scheduledStatementOn: addBillingMonths(
        input.firstStatementOn,
        index,
        input.statementDay,
      ),
      principalMinorUnits: baseAmount + extra,
      interestMinorUnits: 0,
      feeMinorUnits: 0,
      createdAt: input.createdAt,
    };
  });
}
