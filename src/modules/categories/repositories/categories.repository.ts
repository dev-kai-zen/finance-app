import { eq, sql } from "drizzle-orm";
import type { DbContext } from "@/infrastructure/database/client";
import { categories } from "@/infrastructure/database/schema/categories";
import { DEFAULT_SEED_CATEGORIES } from "../constants/categories.constants";
import type { Category, CategoryInput, CategoryType } from "../types/category.types";

function mapCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CategoryType,
    color: row.color,
    icon: row.icon,
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCategories(db: DbContext): Promise<Category[]> {
  // Ensure default categories exist if database is fresh
  await seedDefaultCategoriesIfEmpty(db);

  const rows = await db
    .select()
    .from(categories)
    .orderBy(categories.type, categories.name);

  return rows.map(mapCategory);
}

export async function getCategoryById(
  db: DbContext,
  id: string,
): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return row ? mapCategory(row) : null;
}

export async function getCategoryByNameAndType(
  db: DbContext,
  name: string,
  type: CategoryType,
): Promise<Category | null> {
  const trimmedLower = name.trim().toLowerCase();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.type, type));

  const found = rows.find((r) => r.name.trim().toLowerCase() === trimmedLower);
  return found ? mapCategory(found) : null;
}

export async function insertCategory(
  db: DbContext,
  input: CategoryInput & { id: string; isSystem?: boolean },
): Promise<Category> {
  const now = new Date();
  const record = {
    id: input.id,
    name: input.name.trim(),
    type: input.type,
    color: input.color ?? "slate",
    icon: input.icon ?? "tag",
    isSystem: input.isSystem ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(categories).values(record);
  return mapCategory(record);
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
  if (input.color !== undefined) {
    updates.color = input.color;
  }
  if (input.icon !== undefined) {
    updates.icon = input.icon;
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
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories);

  if (result && result.count > 0) {
    return;
  }

  const now = new Date();
  const seedRecords = DEFAULT_SEED_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    color: cat.color ?? "slate",
    icon: cat.icon ?? "tag",
    isSystem: cat.isSystem,
    createdAt: now,
    updatedAt: now,
  }));

  for (const record of seedRecords) {
    await db.insert(categories).values(record).onConflictDoNothing();
  }
}
