import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accountKeywords,
  accounts,
  categories,
  categoryKeywords,
} from "@/infrastructure/database/schema";
import { DEFAULT_CATEGORY_SEED_KEYWORDS } from "../constants/default-seed-keywords";
import type {
  AccountKeywordItem,
  CategoryKeywordItem,
} from "../types/chat-with-kai.types";

/**
 * Fetches all category keywords stored in the database.
 */
export async function listCategoryKeywords(
  client: DbContext = db,
): Promise<CategoryKeywordItem[]> {
  await seedDefaultChatKnowledgeIfEmpty(client);

  const rows = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
      language: categoryKeywords.language,
      createdAt: categoryKeywords.createdAt,
    })
    .from(categoryKeywords)
    .orderBy(categoryKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    keyword: r.keyword,
    language: r.language,
    createdAt: r.createdAt,
  }));
}

/**
 * Fetches all keywords assigned to a specific category.
 */
export async function getCategoryKeywordsByCategoryId(
  categoryId: string,
  client: DbContext = db,
): Promise<CategoryKeywordItem[]> {
  await seedDefaultChatKnowledgeIfEmpty(client);

  const rows = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
      language: categoryKeywords.language,
      createdAt: categoryKeywords.createdAt,
    })
    .from(categoryKeywords)
    .where(eq(categoryKeywords.categoryId, categoryId))
    .orderBy(categoryKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    keyword: r.keyword,
    language: r.language,
    createdAt: r.createdAt,
  }));
}

/**
 * Loads a fast in-memory lookup map of lowercase keywords to category IDs.
 */
export async function getCategoryKeywordMap(
  client: DbContext = db,
): Promise<Map<string, string>> {
  await seedDefaultChatKnowledgeIfEmpty(client);

  const rows = await client
    .select({
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
    })
    .from(categoryKeywords);

  const map = new Map<string, string>();
  for (const r of rows) {
    const cleanKw = r.keyword.trim().toLowerCase();
    if (cleanKw) {
      map.set(cleanKw, r.categoryId);
    }
  }
  return map;
}

export class DuplicateKeywordError extends Error {
  existingEntityName: string;
  constructor(keyword: string, existingEntityName: string) {
    super(
      `The keyword "${keyword}" is already assigned to "${existingEntityName}". Each keyword must be unique.`,
    );
    this.name = "DuplicateKeywordError";
    this.existingEntityName = existingEntityName;
  }
}

/**
 * Adds a new keyword to a category with case-insensitive uniqueness validation.
 */
export async function addCategoryKeyword(
  categoryId: string,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<CategoryKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  // 1. Check uniqueness across all category keywords (case-insensitive)
  const existing = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
    })
    .from(categoryKeywords)
    .where(sql`lower(${categoryKeywords.keyword}) = ${cleanKeyword}`)
    .limit(1);

  if (existing.length > 0) {
    const existingCat = await client
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, existing[0].categoryId))
      .limit(1);

    const catName = existingCat[0]?.name ?? "another category";
    throw new DuplicateKeywordError(keyword.trim(), catName);
  }

  // 2. Insert new keyword
  const id = `ckw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = new Date();

  await client.insert(categoryKeywords).values({
    id,
    categoryId,
    keyword: cleanKeyword,
    language,
    createdAt,
  });

  return {
    id,
    categoryId,
    keyword: cleanKeyword,
    language,
    createdAt,
  };
}

/**
 * Removes a category keyword by ID.
 */
export async function deleteCategoryKeyword(
  id: string,
  client: DbContext = db,
): Promise<void> {
  await client.delete(categoryKeywords).where(eq(categoryKeywords.id, id));
}

/**
 * Updates a category keyword text and/or language.
 */
export async function updateCategoryKeyword(
  id: string,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<CategoryKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  const existing = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
    })
    .from(categoryKeywords)
    .where(and(sql`lower(${categoryKeywords.keyword}) = ${cleanKeyword}`, ne(categoryKeywords.id, id)))
    .limit(1);

  if (existing.length > 0) {
    const existingCat = await client
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, existing[0].categoryId))
      .limit(1);

    const catName = existingCat[0]?.name ?? "another category";
    throw new DuplicateKeywordError(keyword.trim(), catName);
  }

  await client
    .update(categoryKeywords)
    .set({
      keyword: cleanKeyword,
      language,
    })
    .where(eq(categoryKeywords.id, id));

  const updated = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
      keyword: categoryKeywords.keyword,
      language: categoryKeywords.language,
      createdAt: categoryKeywords.createdAt,
    })
    .from(categoryKeywords)
    .where(eq(categoryKeywords.id, id))
    .limit(1);

  return {
    id: updated[0].id,
    categoryId: updated[0].categoryId,
    keyword: updated[0].keyword,
    language: updated[0].language,
    createdAt: updated[0].createdAt,
  };
}

/**
 * Reassigns an existing keyword to a new category ID, or inserts it if not found.
 */
export async function reassignCategoryKeyword(
  keyword: string,
  newCategoryId: string,
  client: DbContext = db,
): Promise<void> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return;

  const existing = await client
    .select({ id: categoryKeywords.id })
    .from(categoryKeywords)
    .where(sql`lower(${categoryKeywords.keyword}) = ${cleanKeyword}`)
    .limit(1);

  if (existing.length > 0) {
    await client
      .update(categoryKeywords)
      .set({ categoryId: newCategoryId })
      .where(eq(categoryKeywords.id, existing[0].id));
  } else {
    const id = `ckw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await client.insert(categoryKeywords).values({
      id,
      categoryId: newCategoryId,
      keyword: cleanKeyword,
      language: "any",
      createdAt: new Date(),
    });
  }
}

/**
 * Fetches all account keywords stored in the database.
 */
export async function listAccountKeywords(
  client: DbContext = db,
): Promise<AccountKeywordItem[]> {
  const rows = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
      keyword: accountKeywords.keyword,
      language: accountKeywords.language,
      createdAt: accountKeywords.createdAt,
    })
    .from(accountKeywords)
    .orderBy(accountKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    keyword: r.keyword,
    language: r.language ?? "any",
    createdAt: r.createdAt,
  }));
}

/**
 * Fetches all keywords assigned to a specific account.
 */
export async function getAccountKeywordsByAccountId(
  accountId: string,
  client: DbContext = db,
): Promise<AccountKeywordItem[]> {
  const rows = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
      keyword: accountKeywords.keyword,
      language: accountKeywords.language,
      createdAt: accountKeywords.createdAt,
    })
    .from(accountKeywords)
    .where(eq(accountKeywords.accountId, accountId))
    .orderBy(accountKeywords.keyword);

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    keyword: r.keyword,
    language: r.language ?? "any",
    createdAt: r.createdAt,
  }));
}

/**
 * Loads a fast in-memory lookup map of lowercase keywords to account IDs.
 */
export async function getAccountKeywordMap(
  client: DbContext = db,
): Promise<Map<string, string>> {
  const rows = await client
    .select({
      accountId: accountKeywords.accountId,
      keyword: accountKeywords.keyword,
    })
    .from(accountKeywords);

  const map = new Map<string, string>();
  for (const r of rows) {
    const cleanKw = r.keyword.trim().toLowerCase();
    if (cleanKw) {
      map.set(cleanKw, r.accountId);
    }
  }
  return map;
}

/**
 * Adds a new keyword to an account with case-insensitive uniqueness validation.
 */
export async function addAccountKeyword(
  accountId: string,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<AccountKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  // Check uniqueness across account keywords
  const existing = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
      keyword: accountKeywords.keyword,
    })
    .from(accountKeywords)
    .where(sql`lower(${accountKeywords.keyword}) = ${cleanKeyword}`)
    .limit(1);

  if (existing.length > 0) {
    const existingAcc = await client
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, existing[0].accountId))
      .limit(1);

    const accName = existingAcc[0]?.name ?? "another account";
    throw new DuplicateKeywordError(cleanKeyword, accName);
  }

  const id = `akw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = new Date();

  await client.insert(accountKeywords).values({
    id,
    accountId,
    keyword: cleanKeyword,
    language,
    createdAt,
  });

  return {
    id,
    accountId,
    keyword: cleanKeyword,
    language,
    createdAt,
  };
}

/**
 * Updates an account keyword text and/or language.
 */
export async function updateAccountKeyword(
  id: string,
  keyword: string,
  language = "any",
  client: DbContext = db,
): Promise<AccountKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  const existing = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
    })
    .from(accountKeywords)
    .where(and(sql`lower(${accountKeywords.keyword}) = ${cleanKeyword}`, ne(accountKeywords.id, id)))
    .limit(1);

  if (existing.length > 0) {
    const existingAcc = await client
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, existing[0].accountId))
      .limit(1);

    const accName = existingAcc[0]?.name ?? "another account";
    throw new DuplicateKeywordError(cleanKeyword, accName);
  }

  await client
    .update(accountKeywords)
    .set({
      keyword: cleanKeyword,
      language,
    })
    .where(eq(accountKeywords.id, id));

  const updated = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
      keyword: accountKeywords.keyword,
      language: accountKeywords.language,
      createdAt: accountKeywords.createdAt,
    })
    .from(accountKeywords)
    .where(eq(accountKeywords.id, id))
    .limit(1);

  return {
    id: updated[0].id,
    accountId: updated[0].accountId,
    keyword: updated[0].keyword,
    language: updated[0].language ?? "any",
    createdAt: updated[0].createdAt,
  };
}

/**
 * Removes an account keyword by ID.
 */
export async function deleteAccountKeyword(
  id: string,
  client: DbContext = db,
): Promise<void> {
  await client.delete(accountKeywords).where(eq(accountKeywords.id, id));
}

/**
 * Checks whether a keyword is available for a category (not assigned to another category).
 */
export async function checkCategoryKeywordAvailable(
  keyword: string,
  excludeCategoryId?: string | null,
  client: DbContext = db,
): Promise<{ available: boolean; conflictEntityName?: string }> {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return { available: true };

  const existing = await client
    .select({
      id: categoryKeywords.id,
      categoryId: categoryKeywords.categoryId,
    })
    .from(categoryKeywords)
    .where(sql`lower(${categoryKeywords.keyword}) = ${clean}`)
    .limit(1);

  if (existing.length === 0) return { available: true };
  if (excludeCategoryId && existing[0].categoryId === excludeCategoryId) {
    return { available: true };
  }

  const existingCat = await client
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.id, existing[0].categoryId))
    .limit(1);

  return {
    available: false,
    conflictEntityName: existingCat[0]?.name ?? "another category",
  };
}

/**
 * Checks whether a keyword is available for an account (not assigned to another account).
 */
export async function checkAccountKeywordAvailable(
  keyword: string,
  excludeAccountId?: string | null,
  client: DbContext = db,
): Promise<{ available: boolean; conflictEntityName?: string }> {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return { available: true };

  const existing = await client
    .select({
      id: accountKeywords.id,
      accountId: accountKeywords.accountId,
    })
    .from(accountKeywords)
    .where(sql`lower(${accountKeywords.keyword}) = ${clean}`)
    .limit(1);

  if (existing.length === 0) return { available: true };
  if (excludeAccountId && existing[0].accountId === excludeAccountId) {
    return { available: true };
  }

  const existingAcc = await client
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, existing[0].accountId))
    .limit(1);

  return {
    available: false,
    conflictEntityName: existingAcc[0]?.name ?? "another account",
  };
}

/**
 * Synchronizes keywords for a category by deleting removed keywords and inserting new ones.
 */
export async function syncCategoryKeywords(
  categoryId: string,
  targetKeywords: string[],
  language = "any",
  client: DbContext = db,
): Promise<void> {
  const existingRows = await getCategoryKeywordsByCategoryId(categoryId, client);
  const existingMap = new Map<string, string>();
  for (const row of existingRows) {
    existingMap.set(row.keyword.toLowerCase(), row.id);
  }

  const normalizedTargets = Array.from(
    new Set(
      targetKeywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    ),
  );

  const targetSet = new Set(normalizedTargets.map((k) => k.toLowerCase()));

  // 1. Delete keywords no longer in target list
  for (const [lowerKw, id] of existingMap.entries()) {
    if (!targetSet.has(lowerKw)) {
      await deleteCategoryKeyword(id, client);
    }
  }

  // 2. Insert new keywords
  for (const kw of normalizedTargets) {
    if (!existingMap.has(kw.toLowerCase())) {
      await addCategoryKeyword(categoryId, kw, language, client);
    }
  }
}

/**
 * Synchronizes keywords for an account by deleting removed keywords and inserting new ones.
 */
export async function syncAccountKeywords(
  accountId: string,
  targetKeywords: string[],
  language = "any",
  client: DbContext = db,
): Promise<void> {
  const existingRows = await getAccountKeywordsByAccountId(accountId, client);
  const existingMap = new Map<string, string>();
  for (const row of existingRows) {
    existingMap.set(row.keyword.toLowerCase(), row.id);
  }

  const normalizedTargets = Array.from(
    new Set(
      targetKeywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    ),
  );

  const targetSet = new Set(normalizedTargets.map((k) => k.toLowerCase()));

  // 1. Delete keywords no longer in target list
  for (const [lowerKw, id] of existingMap.entries()) {
    if (!targetSet.has(lowerKw)) {
      await deleteAccountKeyword(id, client);
    }
  }

  // 2. Insert new keywords
  for (const kw of normalizedTargets) {
    if (!existingMap.has(kw.toLowerCase())) {
      await addAccountKeyword(accountId, kw, language, client);
    }
  }
}


/**
 * Seeds default category and account keywords if the knowledge table is currently empty.
 * Returns the count of seeded keywords.
 */
export async function seedDefaultChatKnowledgeIfEmpty(
  client: DbContext = db,
): Promise<number> {
  const existingRows = await client
    .select({ id: categoryKeywords.id })
    .from(categoryKeywords)
    .limit(1);

  if (existingRows.length > 0) {
    return 0;
  }

  // 1. Get all currently existing category IDs in the database
  const activeCategories = await client
    .select({ id: categories.id })
    .from(categories);
  const activeCategoryIds = new Set(activeCategories.map((c) => c.id));

  // 2. Filter seed items to only those whose category exists
  const now = new Date();
  const seenKeywords = new Set<string>();
  const valuesToInsert: Array<{
    id: string;
    categoryId: string;
    keyword: string;
    language: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < DEFAULT_CATEGORY_SEED_KEYWORDS.length; i++) {
    const item = DEFAULT_CATEGORY_SEED_KEYWORDS[i];
    const lowerKw = item.keyword.trim().toLowerCase();

    if (!activeCategoryIds.has(item.categoryId)) {
      continue;
    }

    if (seenKeywords.has(lowerKw)) {
      continue;
    }

    seenKeywords.add(lowerKw);
    valuesToInsert.push({
      id: `ckw_seed_${i}_${Date.now()}`,
      categoryId: item.categoryId,
      keyword: lowerKw,
      language: item.language,
      createdAt: now,
    });
  }

  if (valuesToInsert.length > 0) {
    // Insert in batches of 50 to stay within SQLite variable bounds
    const batchSize = 50;
    for (let i = 0; i < valuesToInsert.length; i += batchSize) {
      const batch = valuesToInsert.slice(i, i + batchSize);
      await client.insert(categoryKeywords).values(batch);
    }
  }

  return valuesToInsert.length;
}

/**
 * Resets category keywords back to the default seed list.
 */
export async function resetToDefaultCategoryKeywords(
  client: DbContext = db,
): Promise<number> {
  await client.delete(categoryKeywords);
  return seedDefaultChatKnowledgeIfEmpty(client);
}
