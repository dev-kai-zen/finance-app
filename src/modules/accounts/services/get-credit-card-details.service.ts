import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { findCreditCardDetailsByAccountId } from "../repositories/credit-card-details.repository";

export function getCreditCardDetails(
  accountId: string,
  context: DbContext = db,
) {
  return findCreditCardDetailsByAccountId(accountId, context);
}
