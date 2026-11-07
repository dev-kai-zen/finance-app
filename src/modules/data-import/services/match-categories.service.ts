import { DEFAULT_OTHERS_CATEGORY_IDS } from "@/modules/categories";
import type { Category } from "@/modules/categories";
import type { Label } from "@/modules/labels";
import type {
  CategoryMatchDecision,
  ColumnMappingConfig,
} from "../types/data-import.types";

export interface CategoryCandidate {
  key: string;
  type: "income" | "expense";
  categoryName: string;
  subcategoryName?: string;
  hasPipeChar: boolean;
}

export function buildCategoryKey(
  type: "income" | "expense",
  categoryName: string,
  subcategoryName?: string,
): string {
  const c = categoryName.trim().toLowerCase();
  const s = subcategoryName?.trim().toLowerCase();
  return s ? `${type}:${c} > ${s}` : `${type}:${c}`;
}

/**
 * Extracts unique categories and subcategories from the income and expense rows.
 */
export function extractCategoryCandidates(
  headers: string[],
  rows: string[][],
  config: ColumnMappingConfig,
  rowTypes: Array<"income" | "expense" | "transfer" | "leave_out">,
): CategoryCandidate[] {
  const catColIdx = config.categoryColumn ? headers.indexOf(config.categoryColumn) : -1;
  const subColIdx = config.subcategoryColumn ? headers.indexOf(config.subcategoryColumn) : -1;

  if (catColIdx === -1) return [];

  const candidateMap = new Map<string, CategoryCandidate>();

  for (let i = 0; i < rows.length; i++) {
    const type = rowTypes[i];
    if (type !== "income" && type !== "expense") continue;

    const row = rows[i];
    const rawCat = row[catColIdx]?.trim() || "";
    if (!rawCat) continue;

    const hasPipeChar = rawCat.includes("|") || (subColIdx >= 0 && (row[subColIdx]?.includes("|") ?? false));
    const rawSub = subColIdx >= 0 ? row[subColIdx]?.trim() : undefined;

    const key = buildCategoryKey(type, rawCat, rawSub);
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        key,
        type,
        categoryName: rawCat,
        subcategoryName: rawSub,
        hasPipeChar,
      });
    }
  }

  return Array.from(candidateMap.values());
}

/**
 * Builds initial category matches.
 * Matches by type, category name, and parent.
 * If exactly one match exists, select it.
 * Otherwise selects Other Expense or Other Income.
 */
export function buildInitialCategoryMatches(
  candidates: CategoryCandidate[],
  existingCategories: Category[],
): Record<string, CategoryMatchDecision> {
  const result: Record<string, CategoryMatchDecision> = {};

  const categoriesById = new Map<string, Category>();
  for (const c of existingCategories) {
    categoriesById.set(c.id, c);
  }

  for (const cand of candidates) {
    const targetType = cand.type;
    const catNameLower = cand.categoryName.trim().toLowerCase();
    const subNameLower = cand.subcategoryName?.trim().toLowerCase();

    const matches = existingCategories.filter((c) => {
      if (c.type !== targetType) return false;

      if (subNameLower) {
        // Looking for a subcategory whose parent matches categoryName
        if (c.name.trim().toLowerCase() !== subNameLower) return false;
        if (!c.parentId) return false;
        const parent = categoriesById.get(c.parentId);
        return parent?.name.trim().toLowerCase() === catNameLower;
      } else {
        // Top-level category
        return c.name.trim().toLowerCase() === catNameLower && !c.parentId;
      }
    });

    if (matches.length === 1) {
      result[cand.key] = {
        sourceKey: cand.key,
        type: targetType,
        mode: "existing",
        existingCategoryId: matches[0].id,
      };
    } else {
      // Default to Other Expense / Other Income
      const defaultId = DEFAULT_OTHERS_CATEGORY_IDS[targetType];
      result[cand.key] = {
        sourceKey: cand.key,
        type: targetType,
        mode: "default_other",
        existingCategoryId: defaultId,
      };
    }
  }

  return result;
}

export interface LabelResolution {
  labelMap: Map<string, string>; // normalized label name -> existing label id or "new:<name>"
}

/**
 * Resolves semicolon-separated labels against existing labels.
 */
export function resolveRowLabels(
  rawLabelsStr: string | undefined,
  existingLabels: Label[] = [],
): { labelIds: string[]; labelsToCreate: string[] } {
  if (!rawLabelsStr?.trim()) {
    return { labelIds: [], labelsToCreate: [] };
  }

  const existingByName = new Map<string, Label>();
  for (const lbl of existingLabels) {
    existingByName.set(lbl.name.trim().toLowerCase(), lbl);
  }

  const parts = rawLabelsStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const labelIds: string[] = [];
  const labelsToCreate: string[] = [];
  const seenInRow = new Set<string>();

  for (const rawName of parts) {
    const trimmed = rawName.slice(0, 100);
    const lower = trimmed.toLowerCase();
    if (seenInRow.has(lower)) continue;
    seenInRow.add(lower);

    const existing = existingByName.get(lower);
    if (existing) {
      labelIds.push(existing.id);
    } else {
      labelsToCreate.push(trimmed);
    }
  }

  return { labelIds, labelsToCreate };
}

