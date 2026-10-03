import { db, type DbContext } from "@/infrastructure/database/client";
import { toggleCategoryBudgetInContext } from "../repositories/category-budgets.repository";

export function toggleCategoryBudget(
  id: string,
  isEnabled: boolean,
  context: DbContext = db,
): void {
  toggleCategoryBudgetInContext(id, isEnabled, context);
}
