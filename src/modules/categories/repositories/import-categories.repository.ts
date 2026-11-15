import type { DbContext } from "@/infrastructure/database/client";
import { categories } from "@/infrastructure/database/schema";
import type { CategoryInput } from "../types/category.types";

export function insertImportedCategory(input: CategoryInput & { id: string }, context: DbContext): string {
  const now = new Date();
  context.insert(categories).values({
    id: input.id, name: input.name, type: input.type, parentId: input.parentId ?? null,
    hexColorsId: null, icon: "tag", isSystem: false, sortOrder: input.sortOrder ?? 0, createdAt: now, updatedAt: now,
  }).run();
  return input.id;
}
