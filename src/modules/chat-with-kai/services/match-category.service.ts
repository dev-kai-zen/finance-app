import type { Category } from "@/modules/categories";
import type { TransactionType } from "@/modules/transactions";

export interface MatchedCategoryResult {
  category: Category | null;
  matchedKeyword: string | null;
  confidence: number;
}

function clean(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

/**
 * Resolves the most appropriate category for a transaction prompt by comparing against:
 * 1. Category keywords from SQLite database (the single source of truth for learned & pre-seeded keywords).
 * 2. User's existing category names.
 * 3. Partial word boundaries against category names.
 */
export function matchCategory(
  text: string,
  categories: Category[],
  type: TransactionType,
  categoryKeywordsMap?: Map<string, string>,
): MatchedCategoryResult {
  if (categories.length === 0 || type === "transfer") {
    return { category: null, matchedKeyword: null, confidence: 0 };
  }

  // Filter categories by type ("expense" or "income")
  const targetType = type === "income" ? "income" : "expense";
  const typeCategories = categories.filter((c) => c.type === targetType);
  const candidatePool = typeCategories.length > 0 ? typeCategories : categories;

  const lowerText = text.toLowerCase();
  const words = clean(lowerText).split(/\s+/).filter(Boolean);

  // 1. Dynamic Database Keywords: Check learned and pre-seeded database keywords
  // (Sorted descending by length so longer phrases like "manila water" match before "water")
  if (categoryKeywordsMap && categoryKeywordsMap.size > 0) {
    const sortedKeywords = Array.from(categoryKeywordsMap.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    );

    for (const [kw, catId] of sortedKeywords) {
      const cleanKw = clean(kw);
      if (!cleanKw) continue;
      const kwRegex = new RegExp(`\\b${cleanKw}\\b`, "i");
      if (kwRegex.test(lowerText)) {
        const found =
          candidatePool.find((c) => c.id === catId) ??
          categories.find((c) => c.id === catId);
        if (found) {
          return { category: found, matchedKeyword: kw, confidence: 1.0 };
        }
      }
    }
  }

  // 2. Direct name match: Check if user has a category whose name appears in the prompt
  // Sort descending by name length so "Food & Dining" matches before "Food"
  const sortedCategories = [...candidatePool].sort(
    (a, b) => b.name.length - a.name.length,
  );

  for (const cat of sortedCategories) {
    const normName = clean(cat.name);
    if (!normName) continue;

    const regex = new RegExp(`\\b${normName}\\b`, "i");
    if (regex.test(lowerText)) {
      return { category: cat, matchedKeyword: cat.name, confidence: 1.0 };
    }
  }

  // 3. Partial word matching against category names (e.g. "groceries" vs "grocery")
  for (const cat of sortedCategories) {
    const catWords = clean(cat.name).split(/\s+/).filter(Boolean);
    for (const cw of catWords) {
      if (cw.length < 3) continue;
      for (const w of words) {
        if (w.length < 3) continue;
        if (w.startsWith(cw) || cw.startsWith(w)) {
          return { category: cat, matchedKeyword: w, confidence: 0.75 };
        }
      }
    }
  }

  // Fallback: Pick first category of matching type if nothing matched
  const fallback = candidatePool[0] ?? null;
  return { category: fallback, matchedKeyword: null, confidence: 0.2 };
}
