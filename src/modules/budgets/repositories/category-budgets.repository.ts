import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { getCurrencyPreferences } from "@/modules/currencies";
import {
  budgetMonthlyTargets,
  categoryBudgets,
} from "@/infrastructure/database/schema";
import type {
  BudgetMonthlyTarget,
  CategoryBudget,
  CategoryBudgetInput,
} from "../types/budget.types";

export function generateBudgetId(context: DbContext = db): string {
  const row = context.get<{ id: string }>(
    sql`SELECT lower(hex(randomblob(16))) AS id`,
  );
  return row ? row.id : `bgt_${Date.now()}`;
}

function mapBudgetRow(
  row: typeof categoryBudgets.$inferSelect,
  targets?: Array<typeof budgetMonthlyTargets.$inferSelect>,
): CategoryBudget {
  return {
    id: row.id,
    categoryId: row.categoryId,
    isEnabled: Boolean(row.isEnabled),
    amountMinorUnits: row.amountMinorUnits,
    currencyCode: row.currencyCode,
    frequency: row.frequency as any,
    startDate: row.startDate,
    allowRollover: Boolean(row.allowRollover),
    rolloverMode: row.rolloverMode as any,
    notifyOnExceeded: Boolean(row.notifyOnExceeded),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    monthlyTargets: targets?.map((t) => ({
      id: t.id,
      budgetId: t.budgetId,
      year: t.year,
      month: t.month,
      amountMinorUnits: t.amountMinorUnits,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  };
}

export async function listCategoryBudgets(
  context: DbContext = db,
): Promise<CategoryBudget[]> {
  const budgetRows = await context.select().from(categoryBudgets);
  if (!budgetRows.length) return [];

  const targetRows = await context.select().from(budgetMonthlyTargets);
  const targetsByBudgetId = new Map<
    string,
    Array<typeof budgetMonthlyTargets.$inferSelect>
  >();

  for (const t of targetRows) {
    const list = targetsByBudgetId.get(t.budgetId) || [];
    list.push(t);
    targetsByBudgetId.set(t.budgetId, list);
  }

  return budgetRows.map((b) =>
    mapBudgetRow(b, targetsByBudgetId.get(b.id) || []),
  );
}

export function findCategoryBudgetByCategoryId(
  categoryId: string,
  context: DbContext = db,
): CategoryBudget | null {
  const row = context
    .select()
    .from(categoryBudgets)
    .where(eq(categoryBudgets.categoryId, categoryId))
    .get();

  if (!row) return null;

  const targets = context
    .select()
    .from(budgetMonthlyTargets)
    .where(eq(budgetMonthlyTargets.budgetId, row.id))
    .all();

  return mapBudgetRow(row, targets);
}

export function findCategoryBudgetsByCategoryIds(
  categoryIds: string[],
  context: DbContext = db,
): CategoryBudget[] {
  if (!categoryIds.length) return [];

  const rows = context
    .select()
    .from(categoryBudgets)
    .where(inArray(categoryBudgets.categoryId, categoryIds))
    .all();

  if (!rows.length) return [];

  const budgetIds = rows.map((r) => r.id);
  const targets = context
    .select()
    .from(budgetMonthlyTargets)
    .where(inArray(budgetMonthlyTargets.budgetId, budgetIds))
    .all();

  const targetsByBudgetId = new Map<
    string,
    Array<typeof budgetMonthlyTargets.$inferSelect>
  >();

  for (const t of targets) {
    const list = targetsByBudgetId.get(t.budgetId) || [];
    list.push(t);
    targetsByBudgetId.set(t.budgetId, list);
  }

  return rows.map((r) => mapBudgetRow(r, targetsByBudgetId.get(r.id) || []));
}

export function upsertCategoryBudgetInContext(
  input: CategoryBudgetInput,
  context: DbContext,
): CategoryBudget {
  const now = new Date();
  const existing = context
    .select()
    .from(categoryBudgets)
    .where(eq(categoryBudgets.categoryId, input.categoryId))
    .get();

  const id = existing ? existing.id : input.id ?? generateBudgetId(context);
  const startDate = input.startDate ?? (existing ? existing.startDate : now);
  const currencyCode =
    input.currencyCode?.trim().toUpperCase() ??
    existing?.currencyCode ??
    getCurrencyPreferences(context).defaultCurrency;

  if (existing) {
    context
      .update(categoryBudgets)
      .set({
        isEnabled:
          input.isEnabled !== undefined ? input.isEnabled : existing.isEnabled,
        amountMinorUnits: input.amountMinorUnits,
        currencyCode,
        frequency: input.frequency,
        startDate,
        allowRollover:
          input.allowRollover !== undefined
            ? input.allowRollover
            : existing.allowRollover,
        rolloverMode: input.rolloverMode ?? existing.rolloverMode,
        notifyOnExceeded:
          input.notifyOnExceeded !== undefined
            ? input.notifyOnExceeded
            : existing.notifyOnExceeded,
        updatedAt: now,
      })
      .where(eq(categoryBudgets.id, id))
      .run();
  } else {
    context
      .insert(categoryBudgets)
      .values({
        id,
        categoryId: input.categoryId,
        isEnabled: input.isEnabled ?? true,
        amountMinorUnits: input.amountMinorUnits,
        currencyCode,
        frequency: input.frequency,
        startDate,
        allowRollover: input.allowRollover ?? false,
        rolloverMode: input.rolloverMode ?? "positive_only",
        notifyOnExceeded: input.notifyOnExceeded ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  if (input.monthlyTargets) {
    context
      .delete(budgetMonthlyTargets)
      .where(eq(budgetMonthlyTargets.budgetId, id))
      .run();

    for (const mt of input.monthlyTargets) {
      context
        .insert(budgetMonthlyTargets)
        .values({
          id: generateBudgetId(context),
          budgetId: id,
          year: mt.year,
          month: mt.month,
          amountMinorUnits: mt.amountMinorUnits,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }

  return findCategoryBudgetByCategoryId(input.categoryId, context)!;
}

export function deleteCategoryBudgetInContext(
  id: string,
  context: DbContext,
): void {
  context.delete(categoryBudgets).where(eq(categoryBudgets.id, id)).run();
}

export function toggleCategoryBudgetInContext(
  id: string,
  isEnabled: boolean,
  context: DbContext,
): void {
  context
    .update(categoryBudgets)
    .set({
      isEnabled,
      updatedAt: new Date(),
    })
    .where(eq(categoryBudgets.id, id))
    .run();
}
