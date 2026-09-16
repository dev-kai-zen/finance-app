import { asc, eq, sql } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { categories, hexColors } from "@/infrastructure/database/schema";
import { DEFAULT_SEED_CATEGORIES } from "../constants/categories.constants";
import type { Category, CategoryInput, CategoryType } from "../types/category.types";

function mapCategory(
  category: typeof categories.$inferSelect,
  hexColor?: typeof hexColors.$inferSelect | null,
): Category {
  return {
    id: category.id,
    name: category.name,
    type: category.type as CategoryType,
    hexColorsId: category.hexColorsId,
    color:
      hexColor?.hex ??
      (category.hexColorsId?.startsWith("color_")
        ? category.hexColorsId.replace("color_", "")
        : category.hexColorsId),
    icon: category.icon,
    parentId: category.parentId,
    isSystem: Boolean(category.isSystem),
    sortOrder: category.sortOrder ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function selectCategoryWithHex(context: DbContext, id: string) {
  return context
    .select({
      category: categories,
      hexColor: hexColors,
    })
    .from(categories)
    .leftJoin(hexColors, eq(categories.hexColorsId, hexColors.id))
    .where(eq(categories.id, id))
    .get();
}

export async function listCategories(
  db: DbContext,
  options?: { flat?: boolean },
): Promise<Category[]> {
  // Ensure default categories exist if database is fresh
  await seedDefaultCategoriesIfEmpty(db);

  const rows = await db
    .select({
      category: categories,
      hexColor: hexColors,
    })
    .from(categories)
    .leftJoin(hexColors, eq(categories.hexColorsId, hexColors.id))
    .orderBy(categories.type, asc(categories.sortOrder), categories.name);

  const allCategories: Category[] = rows.map(({ category, hexColor }) =>
    mapCategory(category, hexColor),
  );

  if (options?.flat) {
    return allCategories;
  }

  // Nest subcategories into parent categories
  const parentCategories: Category[] = [];
  const subcategoryMap = new Map<string, Category[]>();

  for (const cat of allCategories) {
    if (cat.parentId) {
      const list = subcategoryMap.get(cat.parentId) || [];
      list.push(cat);
      subcategoryMap.set(cat.parentId, list);
    } else {
      parentCategories.push(cat);
    }
  }

  for (const parent of parentCategories) {
    const subs = subcategoryMap.get(parent.id) || [];
    subs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    parent.subcategories = subs;
  }

  parentCategories.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );

  return parentCategories;
}

export function findCategoryById(
  id: string,
  context: DbContext,
): Category | null {
  const row = selectCategoryWithHex(context, id);
  return row ? mapCategory(row.category, row.hexColor) : null;
}

export async function getCategoryById(
  db: DbContext,
  id: string,
): Promise<Category | null> {
  const row = selectCategoryWithHex(db, id);
  return row ? mapCategory(row.category, row.hexColor) : null;
}

export async function getCategoryByNameAndType(
  db: DbContext,
  name: string,
  type: CategoryType,
): Promise<Category | null> {
  const trimmedLower = name.trim().toLowerCase();
  const rows = await db
    .select({
      category: categories,
      hexColor: hexColors,
    })
    .from(categories)
    .leftJoin(hexColors, eq(categories.hexColorsId, hexColors.id))
    .where(eq(categories.type, type));

  const found = rows.find(
    (row) => row.category.name.trim().toLowerCase() === trimmedLower,
  );
  return found ? mapCategory(found.category, found.hexColor) : null;
}

export async function insertCategory(
  db: DbContext,
  input: CategoryInput & { id: string; isSystem?: boolean },
): Promise<Category> {
  const now = new Date();
  const resolvedHexColorsId =
    input.hexColorsId ??
    (input.color
      ? input.color.startsWith("color_")
        ? input.color
        : `color_${input.color}`
      : "color_slate");

  const record: typeof categories.$inferInsert = {
    id: input.id,
    name: input.name.trim(),
    type: input.type,
    hexColorsId: resolvedHexColorsId,
    icon: input.icon ?? "tag",
    parentId: input.parentId ?? null,
    isSystem: input.isSystem ?? false,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(categories).values(record);
  const created = selectCategoryWithHex(db, input.id);
  return created
    ? mapCategory(created.category, created.hexColor)
    : mapCategory(record as typeof categories.$inferSelect);
}

export async function updateCategory(
  db: DbContext,
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category | null> {
  const existing = await getCategoryById(db, id);
  if (!existing) return null;

  const now = new Date();
  const updates: Partial<typeof categories.$inferInsert> = {
    updatedAt: now,
  };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }
  if (input.type !== undefined) {
    updates.type = input.type;
  }
  if (input.hexColorsId !== undefined) {
    updates.hexColorsId = input.hexColorsId;
  } else if (input.color !== undefined) {
    updates.hexColorsId = input.color
      ? input.color.startsWith("color_")
        ? input.color
        : `color_${input.color}`
      : null;
  }
  if (input.icon !== undefined) {
    updates.icon = input.icon;
  }
  if (input.parentId !== undefined) {
    updates.parentId = input.parentId;
  }
  if (input.sortOrder !== undefined) {
    updates.sortOrder = input.sortOrder;
  }

  await db.update(categories).set(updates).where(eq(categories.id, id));
  return getCategoryById(db, id);
}

export async function deleteCategory(
  db: DbContext,
  id: string,
): Promise<boolean> {
  const existing = await getCategoryById(db, id);
  if (!existing || existing.isSystem) {
    return false;
  }

  await db.delete(categories).where(eq(categories.id, id));
  return true;
}

export async function seedDefaultCategoriesIfEmpty(db: DbContext): Promise<void> {
  const now = new Date();
  const seedRecords = DEFAULT_SEED_CATEGORIES.map((cat, idx) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    hexColorsId: cat.hexColorsId ?? (cat.color ? `color_${cat.color}` : "color_slate"),
    icon: cat.icon ?? "tag",
    parentId: cat.parentId ?? null,
    isSystem: cat.isSystem,
    sortOrder: idx,
    createdAt: now,
    updatedAt: now,
  }));

  for (const record of seedRecords) {
    await db.insert(categories).values(record).onConflictDoNothing();
  }
}

export async function reorderCategoriesInDb(
  db: DbContext,
  orderedIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    const now = new Date();
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      await tx
        .update(categories)
        .set({ sortOrder: i, updatedAt: now })
        .where(eq(categories.id, id));
    }
  });
}
