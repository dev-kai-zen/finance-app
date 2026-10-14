import { DEFAULT_OTHERS_CATEGORY_IDS } from "../constants/categories.constants";
import type { Category, CategoryType } from "../types/category.types";

export function resolveDefaultTransactionCategoryId(
  categories: readonly Category[],
  type: Exclude<CategoryType, "transfer">,
): string {
  const preferredId = DEFAULT_OTHERS_CATEGORY_IDS[type];
  if (categories.some((category) => category.id === preferredId)) {
    return preferredId;
  }
  for (const category of categories) {
    if (category.subcategories?.some((sub) => sub.id === preferredId)) {
      return preferredId;
    }
  }
  return categories.find((category) => category.type === type)?.id ?? "";
}
