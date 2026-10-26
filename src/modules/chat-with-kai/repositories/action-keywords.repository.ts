import { and, eq, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { actionKeywords } from "@/infrastructure/database/schema";
import type { TransactionType } from "@/modules/transactions";
import { DEFAULT_ACTION_SEED_KEYWORDS } from "../constants/default-action-seed-keywords";
import type { ActionKeywordItem } from "../types/chat-with-kai.types";
import { DuplicateKeywordError } from "./chat-knowledge.repository";

/**
 * Fetches all action keywords stored in SQLite.
 */
export async function listActionKeywords(
  client: DbContext = db,
): Promise<ActionKeywordItem[]> {
  await seedDefaultActionKeywordsIfEmpty(client);

  const rows = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
      language: actionKeywords.language,
      createdAt: actionKeywords.createdAt,
    })
    .from(actionKeywords)
    .orderBy(actionKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    actionType: r.actionType as TransactionType,
    keyword: r.keyword,
    language: r.language ?? "any",
    createdAt: r.createdAt,
  }));
}

/**
 * Fetches action keywords belonging to a specific transaction type ("expense" | "income" | "transfer").
 */
export async function getActionKeywordsByType(
  actionType: TransactionType,
  client: DbContext = db,
): Promise<ActionKeywordItem[]> {
  await seedDefaultActionKeywordsIfEmpty(client);

  const rows = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
      language: actionKeywords.language,
      createdAt: actionKeywords.createdAt,
    })
    .from(actionKeywords)
    .where(eq(actionKeywords.actionType, actionType))
    .orderBy(actionKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    actionType: r.actionType as TransactionType,
    keyword: r.keyword,
    language: r.language ?? "any",
    createdAt: r.createdAt,
  }));
}

/**
 * Loads a fast in-memory lookup map of lowercase keywords to their Action/Transaction Type.
 */
export async function getActionKeywordMap(
  client: DbContext = db,
): Promise<Map<string, TransactionType>> {
  await seedDefaultActionKeywordsIfEmpty(client);

  const rows = await client
    .select({
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
    })
    .from(actionKeywords);

  const map = new Map<string, TransactionType>();
  for (const r of rows) {
    const cleanKw = r.keyword.trim().toLowerCase();
    if (cleanKw) {
      map.set(cleanKw, r.actionType as TransactionType);
    }
  }
  return map;
}

/**
 * Checks whether an action keyword is available (case-insensitive across all action types).
 */
export async function checkActionKeywordAvailable(
  keyword: string,
  excludeId?: string | null,
  client: DbContext = db,
): Promise<{ available: boolean; conflictActionType?: string }> {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return { available: true };

  const existing = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
    })
    .from(actionKeywords)
    .where(sql`lower(${actionKeywords.keyword}) = ${clean}`)
    .limit(1);

  if (existing.length === 0) return { available: true };
  if (excludeId && existing[0].id === excludeId) return { available: true };

  return {
    available: false,
    conflictActionType: existing[0].actionType,
  };
}

/**
 * Adds a new action keyword with case-insensitive uniqueness validation.
 */
export async function addActionKeyword(
  actionType: TransactionType,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<ActionKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  // Check uniqueness across all action keywords
  const existing = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
    })
    .from(actionKeywords)
    .where(sql`lower(${actionKeywords.keyword}) = ${cleanKeyword}`)
    .limit(1);

  if (existing.length > 0) {
    throw new DuplicateKeywordError(keyword.trim(), `${existing[0].actionType} action`);
  }

  const id = `actkw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = new Date();

  await client.insert(actionKeywords).values({
    id,
    actionType,
    keyword: keyword.trim(),
    language,
    createdAt,
  });

  return {
    id,
    actionType,
    keyword: keyword.trim(),
    language,
    createdAt,
  };
}

/**
 * Deletes an action keyword by ID.
 */
export async function deleteActionKeyword(
  id: string,
  client: DbContext = db,
): Promise<void> {
  await client.delete(actionKeywords).where(eq(actionKeywords.id, id));
}

/**
 * Updates an action keyword text and/or language.
 */
export async function updateActionKeyword(
  id: string,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<ActionKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  // Check uniqueness across other action keywords
  const existing = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
    })
    .from(actionKeywords)
    .where(and(sql`lower(${actionKeywords.keyword}) = ${cleanKeyword}`, ne(actionKeywords.id, id)))
    .limit(1);

  if (existing.length > 0) {
    throw new DuplicateKeywordError(keyword.trim(), `${existing[0].actionType} action`);
  }

  await client
    .update(actionKeywords)
    .set({
      keyword: keyword.trim(),
      language,
    })
    .where(eq(actionKeywords.id, id));

  const updated = await client
    .select({
      id: actionKeywords.id,
      actionType: actionKeywords.actionType,
      keyword: actionKeywords.keyword,
      language: actionKeywords.language,
      createdAt: actionKeywords.createdAt,
    })
    .from(actionKeywords)
    .where(eq(actionKeywords.id, id))
    .limit(1);

  return {
    id: updated[0].id,
    actionType: updated[0].actionType as TransactionType,
    keyword: updated[0].keyword,
    language: updated[0].language ?? "any",
    createdAt: updated[0].createdAt,
  };
}

/**
 * Seeds default action keywords if the action_keywords table is currently empty.
 */
export async function seedDefaultActionKeywordsIfEmpty(
  client: DbContext = db,
): Promise<number> {
  const existingRows = await client
    .select({ id: actionKeywords.id })
    .from(actionKeywords)
    .limit(1);

  if (existingRows.length > 0) {
    return 0;
  }

  const now = new Date();
  const seenKeywords = new Set<string>();
  const valuesToInsert: Array<{
    id: string;
    actionType: string;
    keyword: string;
    language: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < DEFAULT_ACTION_SEED_KEYWORDS.length; i++) {
    const item = DEFAULT_ACTION_SEED_KEYWORDS[i];
    const lowerKw = item.keyword.trim().toLowerCase();

    if (seenKeywords.has(lowerKw)) {
      continue;
    }

    seenKeywords.add(lowerKw);
    valuesToInsert.push({
      id: `actkw_seed_${i}_${Date.now()}`,
      actionType: item.actionType,
      keyword: item.keyword.trim(),
      language: item.language,
      createdAt: now,
    });
  }

  if (valuesToInsert.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < valuesToInsert.length; i += batchSize) {
      const batch = valuesToInsert.slice(i, i + batchSize);
      await client.insert(actionKeywords).values(batch);
    }
  }

  return valuesToInsert.length;
}

/**
 * Resets action keywords back to the default seed list.
 */
export async function resetToDefaultActionKeywords(
  client: DbContext = db,
): Promise<number> {
  await client.delete(actionKeywords);
  return seedDefaultActionKeywordsIfEmpty(client);
}
