import type { Category } from "@/modules/categories";
import type { TransactionType } from "@/modules/transactions";
import { DEFAULT_CATEGORY_SEED_KEYWORDS } from "../constants/default-seed-keywords";

export interface MatchedCategoryResult {
  category: Category | null;
  matchedKeyword: string | null;
  confidence: number;
}

function clean(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(cat);
    if (cat.subcategories && cat.subcategories.length > 0) {
      result.push(...flattenCategories(cat.subcategories));
    }
  }
  return result;
}

const DEFAULT_FALLBACK_CATEGORY_KEYWORDS_MAP = new Map<string, string>();
for (const item of DEFAULT_CATEGORY_SEED_KEYWORDS) {
  const cleanKw = item.keyword.trim().toLowerCase();
  if (cleanKw && !DEFAULT_FALLBACK_CATEGORY_KEYWORDS_MAP.has(cleanKw)) {
    DEFAULT_FALLBACK_CATEGORY_KEYWORDS_MAP.set(cleanKw, item.categoryId);
  }
}

function findCategoryByCandidateId(
  candidatePool: Category[],
  catId: string,
): Category | null {
  // 1. Direct match by category ID
  const direct = candidatePool.find((c) => c.id === catId);
  if (direct) return direct;

  // 2. Fallback by semantic domain match (supports custom category IDs with standard names)
  if (catId.includes("food")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_food" ||
          /food|dining|kain|comida|restaurant|cafe/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("transport")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_transport" ||
          /transport|byahe|transporte|gas|fuel/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("housing")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_housing" ||
          /housing|bahay|vivienda|rent/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("util")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_utilities" ||
          /utilit|bill|kuryente|tubig|servicios/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("shop")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_shopping" ||
          /shop|bili|compra/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("health")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_health" ||
          /health|med|gamot|salud/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("personal")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_personal" ||
          /personal|care/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("entertainment")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_entertainment" ||
          /entertain|libang|ocio/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("financial")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_exp_financial" ||
          /financial|finance/i.test(c.name),
      ) ?? null
    );
  }
  if (catId.includes("salary")) {
    return (
      candidatePool.find(
        (c) =>
          c.id === "cat_inc_salary" ||
          /salary|sahod|sweldo|sueldo/i.test(c.name),
      ) ?? null
    );
  }

  return null;
}

/**
 * Resolves the most appropriate category for a transaction prompt by comparing against:
 * 1. Category keywords from SQLite database (the single source of truth for learned & pre-seeded keywords).
 * 2. User's existing category names (including subcategories).
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

  // Flatten categories so subcategories are included in resolution pool
  const flattened = flattenCategories(categories);

  // Filter categories by type ("expense" or "income")
  const targetType = type === "income" ? "income" : "expense";
  const typeCategories = flattened.filter((c) => c.type === targetType);
  const candidatePool = typeCategories.length > 0 ? typeCategories : flattened;

  const lowerText = text.toLowerCase();
  const words = clean(lowerText).split(/\s+/).filter(Boolean);

  // 1. Dynamic or Default Fallback Database Keywords:
  // Check learned keywords (or default pre-seeded keywords if map is empty)
  const effectiveKeywordsMap =
    categoryKeywordsMap && categoryKeywordsMap.size > 0
      ? categoryKeywordsMap
      : DEFAULT_FALLBACK_CATEGORY_KEYWORDS_MAP;

  if (effectiveKeywordsMap.size > 0) {
    const sortedKeywords = Array.from(effectiveKeywordsMap.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    );

    for (const [kw, catId] of sortedKeywords) {
      const cleanKw = clean(kw);
      if (!cleanKw) continue;
      const kwRegex = new RegExp(`\\b${cleanKw}\\b`, "i");
      if (kwRegex.test(lowerText)) {
        const found = findCategoryByCandidateId(candidatePool, catId);
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

  // No blind fallback to Housing or first category - return null if unresolved
  return { category: null, matchedKeyword: null, confidence: 0 };
}
