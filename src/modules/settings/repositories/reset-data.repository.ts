import { eq } from "drizzle-orm";

import type { DbContext } from "@/infrastructure/database/client";
import {
  accountTypes,
  accounts,
  budgetMonthlyTargets,
  categories,
  categoryBudgets,
  creditCardDetails,
  creditCardInstallmentPlans,
  creditCardInstallments,
  creditCardStatementEntries,
  creditCardStatements,
  exchangeRates,
  fundGroupAccounts,
  fundGroupPockets,
  fundGroups,
  goalAccounts,
  goalPockets,
  goals,
  hexColors,
  labels,
  noteAttachments,
  notes,
  pockets,
  settings,
  syncOperations,
  transactionAttachments,
  transactionLabels,
  transactionPresets,
  transactionScheduleOccurrences,
  transactionSchedulePostings,
  transactionSchedules,
  transactions,
} from "@/infrastructure/database/schema";

export function deleteAllUserData(context: DbContext): void {
  context.delete(syncOperations).run();

  context.delete(transactionSchedulePostings).run();
  context.delete(transactionScheduleOccurrences).run();
  context.delete(transactionSchedules).run();

  context.delete(transactionAttachments).run();
  context.delete(transactionLabels).run();

  context.delete(creditCardStatementEntries).run();
  context.delete(creditCardInstallments).run();
  context.delete(creditCardInstallmentPlans).run();
  context.delete(creditCardStatements).run();

  context.delete(transactionPresets).run();
  context.delete(transactions).run();

  context.delete(goalAccounts).run();
  context.delete(goalPockets).run();
  context.delete(goals).run();

  context.delete(budgetMonthlyTargets).run();
  context.delete(categoryBudgets).run();

  context.delete(fundGroupAccounts).run();
  context.delete(fundGroupPockets).run();
  context.delete(fundGroups).run();

  context.delete(creditCardDetails).run();
  context.delete(pockets).run();
  context.delete(accounts).run();

  context.delete(noteAttachments).run();
  context.delete(notes).run();
  context.delete(labels).run();
  context.delete(exchangeRates).run();
  context.delete(settings).run();

  context.delete(accountTypes).where(eq(accountTypes.isSystem, false)).run();
  context.delete(categories).where(eq(categories.isSystem, false)).run();
  context.delete(hexColors).where(eq(hexColors.isSystem, false)).run();
}
