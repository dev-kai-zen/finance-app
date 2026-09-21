import { eq } from "drizzle-orm";

import { db, type DbContext } from "@/infrastructure/database/client";
import { creditCardDetails } from "@/infrastructure/database/schema";
import type {
  CreditCardDetails,
  NewCreditCardDetails,
} from "@/modules/accounts/types/account.types";

export function findCreditCardDetailsByAccountId(
  accountId: string,
  context: DbContext = db,
): CreditCardDetails | null {
  return (
    context
      .select()
      .from(creditCardDetails)
      .where(eq(creditCardDetails.accountId, accountId))
      .get() ?? null
  );
}

export function upsertCreditCardDetails(
  value: NewCreditCardDetails,
  context: DbContext = db,
): void {
  context
    .insert(creditCardDetails)
    .values(value)
    .onConflictDoUpdate({
      target: creditCardDetails.accountId,
      set: {
        creditLimitMinorUnits: value.creditLimitMinorUnits,
        statementDay: value.statementDay,
        paymentDueDay: value.paymentDueDay,
      },
    })
    .run();
}

export function deleteCreditCardDetails(
  accountId: string,
  context: DbContext = db,
): void {
  context
    .delete(creditCardDetails)
    .where(eq(creditCardDetails.accountId, accountId))
    .run();
}
