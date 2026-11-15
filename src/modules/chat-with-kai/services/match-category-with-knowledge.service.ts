import type { Category } from "@/modules/categories";
import type { TransactionType } from "@/modules/transactions";
import { matchCategory, type MatchedCategoryResult } from "./match-category.service";

/**
 * Matches text (e.g. category name from imported files or user input) to Kaizen categories
 * using Kai's knowledge base (custom keywords, seed keywords, category names, and partial matches).
 */
export function matchCategoryWithKnowledge(
  text: string,
  categories: Category[],
  type: TransactionType,
  categoryKeywordsMap?: Map<string, string>,
): MatchedCategoryResult {
  return matchCategory(text, categories, type, categoryKeywordsMap);
}
