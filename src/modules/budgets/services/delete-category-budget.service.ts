import { db, type DbContext } from "@/infrastructure/database/client";
import { deleteCategoryBudgetInContext } from "../repositories/category-budgets.repository";

export function deleteCategoryBudget(
  id: string,
  context: DbContext = db,
): void {
  deleteCategoryBudgetInContext(id, context);
}
