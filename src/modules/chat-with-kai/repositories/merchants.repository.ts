import { eq, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  categories,
  merchantKeywords,
  merchants,
} from "@/infrastructure/database/schema";

export interface MerchantItem {
  id: string;
  name: string;
  defaultCategoryId: string | null;
  defaultAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantKeywordItem {
  id: string;
  merchantId: string;
  keyword: string;
  createdAt: Date;
}

export interface MerchantLookupResult {
  merchantId: string;
  name: string;
  defaultCategoryId: string | null;
  defaultAccountId: string | null;
}

interface DefaultSeedMerchant {
  name: string;
  defaultCategoryId: string | null;
  keywords: string[];
}

const DEFAULT_SEED_MERCHANTS: DefaultSeedMerchant[] = [
  // Fast food / Restaurants
  {
    name: "McDonald's",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["mcdonalds", "mcdo", "mcdonald's"],
  },
  {
    name: "Jollibee",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["jollibee", "jolibee"],
  },
  {
    name: "KFC",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["kfc"],
  },
  {
    name: "Chowking",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["chowking"],
  },
  {
    name: "Wendy's",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["wendys", "wendy's"],
  },
  {
    name: "Subway",
    defaultCategoryId: "cat_sub_food_restaurants",
    keywords: ["subway"],
  },
  // Cafes
  {
    name: "Starbucks",
    defaultCategoryId: "cat_sub_food_coffee",
    keywords: ["starbucks", "sbux"],
  },
  // Utilities
  {
    name: "Meralco",
    defaultCategoryId: "cat_sub_housing_electricity",
    keywords: ["meralco"],
  },
  {
    name: "Maynilad",
    defaultCategoryId: "cat_sub_housing_water",
    keywords: ["maynilad"],
  },
  {
    name: "Manila Water",
    defaultCategoryId: "cat_sub_housing_water",
    keywords: ["manila water"],
  },
  {
    name: "PLDT",
    defaultCategoryId: "cat_sub_housing_internet",
    keywords: ["pldt"],
  },
  {
    name: "Globe Telecom",
    defaultCategoryId: "cat_sub_housing_internet",
    keywords: ["globe", "globe telecom"],
  },
  {
    name: "Smart Communications",
    defaultCategoryId: "cat_sub_housing_internet",
    keywords: ["smart", "smart communications"],
  },
  {
    name: "Converge",
    defaultCategoryId: "cat_sub_housing_internet",
    keywords: ["converge", "converge ict"],
  },
  // Fuel & Gas
  {
    name: "Shell",
    defaultCategoryId: "cat_sub_transport_fuel",
    keywords: ["shell"],
  },
  {
    name: "Petron",
    defaultCategoryId: "cat_sub_transport_fuel",
    keywords: ["petron"],
  },
  {
    name: "Caltex",
    defaultCategoryId: "cat_sub_transport_fuel",
    keywords: ["caltex"],
  },
  {
    name: "Seaoil",
    defaultCategoryId: "cat_sub_transport_fuel",
    keywords: ["seaoil"],
  },
  // Ride / Delivery
  {
    name: "Grab",
    defaultCategoryId: "cat_sub_transport_taxi",
    keywords: ["grab", "grabcar", "grabfood"],
  },
  {
    name: "Uber",
    defaultCategoryId: "cat_sub_transport_taxi",
    keywords: ["uber"],
  },
  // Shopping / Groceries
  {
    name: "Shopee",
    defaultCategoryId: "cat_sub_food_groceries",
    keywords: ["shopee"],
  },
  {
    name: "Lazada",
    defaultCategoryId: "cat_sub_food_groceries",
    keywords: ["lazada"],
  },
  {
    name: "Amazon",
    defaultCategoryId: "cat_sub_food_groceries",
    keywords: ["amazon"],
  },
  {
    name: "Watsons",
    defaultCategoryId: "cat_sub_health_medication",
    keywords: ["watsons"],
  },
  {
    name: "Puregold",
    defaultCategoryId: "cat_sub_food_groceries",
    keywords: ["puregold"],
  },
  {
    name: "7-Eleven",
    defaultCategoryId: "cat_sub_food_convenience",
    keywords: ["7-eleven", "711", "seven eleven"],
  },
];

/**
 * Fetches all merchants.
 */
export async function listMerchants(
  client: DbContext = db,
): Promise<MerchantItem[]> {
  await seedDefaultMerchantsIfEmpty(client);

  const rows = await client
    .select({
      id: merchants.id,
      name: merchants.name,
      defaultCategoryId: merchants.defaultCategoryId,
      defaultAccountId: merchants.defaultAccountId,
      createdAt: merchants.createdAt,
      updatedAt: merchants.updatedAt,
    })
    .from(merchants)
    .orderBy(merchants.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    defaultCategoryId: r.defaultCategoryId,
    defaultAccountId: r.defaultAccountId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Loads a fast in-memory lookup map of lowercase keyword/name -> MerchantLookupResult.
 */
export async function getMerchantKeywordMap(
  client: DbContext = db,
): Promise<Map<string, MerchantLookupResult>> {
  await seedDefaultMerchantsIfEmpty(client);

  const [allMerchants, allKeywords] = await Promise.all([
    client
      .select({
        id: merchants.id,
        name: merchants.name,
        defaultCategoryId: merchants.defaultCategoryId,
        defaultAccountId: merchants.defaultAccountId,
      })
      .from(merchants),
    client
      .select({
        merchantId: merchantKeywords.merchantId,
        keyword: merchantKeywords.keyword,
      })
      .from(merchantKeywords),
  ]);

  const merchantById = new Map<string, MerchantLookupResult>();
  const lookupMap = new Map<string, MerchantLookupResult>();

  for (const m of allMerchants) {
    const res: MerchantLookupResult = {
      merchantId: m.id,
      name: m.name,
      defaultCategoryId: m.defaultCategoryId,
      defaultAccountId: m.defaultAccountId,
    };
    merchantById.set(m.id, res);
    lookupMap.set(m.name.trim().toLowerCase(), res);
  }

  for (const kw of allKeywords) {
    const m = merchantById.get(kw.merchantId);
    if (m) {
      lookupMap.set(kw.keyword.trim().toLowerCase(), m);
    }
  }

  return lookupMap;
}

/**
 * Upserts a merchant by name. If it exists, updates defaultCategoryId/defaultAccountId if provided.
 */
export async function upsertMerchant(
  name: string,
  defaultCategoryId?: string | null,
  defaultAccountId?: string | null,
  client: DbContext = db,
): Promise<MerchantItem> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Merchant name cannot be empty.");
  }

  const existing = await client
    .select({
      id: merchants.id,
      name: merchants.name,
      defaultCategoryId: merchants.defaultCategoryId,
      defaultAccountId: merchants.defaultAccountId,
      createdAt: merchants.createdAt,
      updatedAt: merchants.updatedAt,
    })
    .from(merchants)
    .where(sql`lower(${merchants.name}) = ${cleanName.toLowerCase()}`)
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const row = existing[0];
    const newCatId =
      defaultCategoryId !== undefined ? defaultCategoryId : row.defaultCategoryId;
    const newAccId =
      defaultAccountId !== undefined ? defaultAccountId : row.defaultAccountId;

    await client
      .update(merchants)
      .set({
        defaultCategoryId: newCatId,
        defaultAccountId: newAccId,
        updatedAt: now,
      })
      .where(eq(merchants.id, row.id));

    return {
      id: row.id,
      name: row.name,
      defaultCategoryId: newCatId,
      defaultAccountId: newAccId,
      createdAt: row.createdAt,
      updatedAt: now,
    };
  }

  const id = `merch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await client.insert(merchants).values({
    id,
    name: cleanName,
    defaultCategoryId: defaultCategoryId ?? null,
    defaultAccountId: defaultAccountId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Also auto-add the name as its first keyword
  try {
    await addMerchantKeyword(id, cleanName.toLowerCase(), client);
  } catch {
    // Ignore duplicate keyword
  }

  return {
    id,
    name: cleanName,
    defaultCategoryId: defaultCategoryId ?? null,
    defaultAccountId: defaultAccountId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Updates default category for a merchant.
 */
export async function updateMerchantDefaultCategory(
  merchantId: string,
  defaultCategoryId: string | null,
  client: DbContext = db,
): Promise<void> {
  await client
    .update(merchants)
    .set({
      defaultCategoryId,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, merchantId));
}

/**
 * Adds an alias/keyword to a merchant.
 */
export async function addMerchantKeyword(
  merchantId: string,
  keyword: string,
  client: DbContext = db,
): Promise<MerchantKeywordItem> {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) {
    throw new Error("Keyword cannot be empty.");
  }

  const existing = await client
    .select({ id: merchantKeywords.id })
    .from(merchantKeywords)
    .where(sql`lower(${merchantKeywords.keyword}) = ${cleanKeyword}`)
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      merchantId,
      keyword: cleanKeyword,
      createdAt: new Date(),
    };
  }

  const id = `mkw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  await client.insert(merchantKeywords).values({
    id,
    merchantId,
    keyword: cleanKeyword,
    createdAt: now,
  });

  return {
    id,
    merchantId,
    keyword: cleanKeyword,
    createdAt: now,
  };
}

/**
 * Seeds default merchants if the table is currently empty.
 */
export async function seedDefaultMerchantsIfEmpty(
  client: DbContext = db,
): Promise<number> {
  const existingRows = await client
    .select({ id: merchants.id })
    .from(merchants)
    .limit(1);

  if (existingRows.length > 0) {
    return 0;
  }

  // Get active category IDs to only assign valid foreign keys
  const activeCategories = await client
    .select({ id: categories.id })
    .from(categories);
  const activeCategoryIds = new Set(activeCategories.map((c) => c.id));

  const now = new Date();
  let count = 0;

  for (let i = 0; i < DEFAULT_SEED_MERCHANTS.length; i++) {
    const item = DEFAULT_SEED_MERCHANTS[i];
    const merchId = `merch_seed_${i}_${Date.now()}`;
    const validCatId =
      item.defaultCategoryId && activeCategoryIds.has(item.defaultCategoryId)
        ? item.defaultCategoryId
        : null;

    await client.insert(merchants).values({
      id: merchId,
      name: item.name,
      defaultCategoryId: validCatId,
      defaultAccountId: null,
      createdAt: now,
      updatedAt: now,
    });

    count++;

    for (const kw of item.keywords) {
      const cleanKw = kw.trim().toLowerCase();
      const kwId = `mkw_seed_${count}_${Math.random().toString(36).substring(2, 6)}`;
      try {
        await client.insert(merchantKeywords).values({
          id: kwId,
          merchantId: merchId,
          keyword: cleanKw,
          createdAt: now,
        });
      } catch {
        // Ignore duplicate keyword
      }
    }
  }

  return count;
}
