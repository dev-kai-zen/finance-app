export interface MerchantLookupInfo {
  merchantId: string;
  name: string;
  defaultCategoryId: string | null;
  defaultAccountId: string | null;
}

export interface ExtractMerchantNoteInput {
  rawText: string;
  matchedAmountText?: string;
  matchedAccountTexts?: string[];
  matchedCategoryKeyword?: string | null;
  intentMatchedWords?: string[];
  merchantLookupMap?: Map<string, MerchantLookupInfo>;
}

export interface ExtractedMerchantNote {
  name: string | null;
  note: string | null;
  matchedMerchant?: MerchantLookupInfo | null;
}

// Built-in fallback map for unit tests or offline cold start
const DEFAULT_FALLBACK_MERCHANTS = new Map<string, MerchantLookupInfo>([
  ["mcdonalds", { merchantId: "m_mcdo", name: "McDonald's", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["mcdo", { merchantId: "m_mcdo", name: "McDonald's", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["jollibee", { merchantId: "m_jollibee", name: "Jollibee", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["starbucks", { merchantId: "m_sbux", name: "Starbucks", defaultCategoryId: "cat_sub_food_coffee", defaultAccountId: null }],
  ["kfc", { merchantId: "m_kfc", name: "KFC", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["chowking", { merchantId: "m_chowking", name: "Chowking", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["wendys", { merchantId: "m_wendys", name: "Wendy's", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["subway", { merchantId: "m_subway", name: "Subway", defaultCategoryId: "cat_sub_food_restaurants", defaultAccountId: null }],
  ["meralco", { merchantId: "m_meralco", name: "Meralco", defaultCategoryId: "cat_sub_housing_electricity", defaultAccountId: null }],
  ["maynilad", { merchantId: "m_maynilad", name: "Maynilad", defaultCategoryId: "cat_sub_housing_water", defaultAccountId: null }],
  ["pldt", { merchantId: "m_pldt", name: "PLDT", defaultCategoryId: "cat_sub_housing_internet", defaultAccountId: null }],
  ["globe", { merchantId: "m_globe", name: "Globe Telecom", defaultCategoryId: "cat_sub_housing_internet", defaultAccountId: null }],
  ["smart", { merchantId: "m_smart", name: "Smart Communications", defaultCategoryId: "cat_sub_housing_internet", defaultAccountId: null }],
  ["converge", { merchantId: "m_converge", name: "Converge", defaultCategoryId: "cat_sub_housing_internet", defaultAccountId: null }],
  ["shell", { merchantId: "m_shell", name: "Shell", defaultCategoryId: "cat_sub_transport_fuel", defaultAccountId: null }],
  ["petron", { merchantId: "m_petron", name: "Petron", defaultCategoryId: "cat_sub_transport_fuel", defaultAccountId: null }],
  ["caltex", { merchantId: "m_caltex", name: "Caltex", defaultCategoryId: "cat_sub_transport_fuel", defaultAccountId: null }],
  ["seaoil", { merchantId: "m_seaoil", name: "Seaoil", defaultCategoryId: "cat_sub_transport_fuel", defaultAccountId: null }],
  ["grab", { merchantId: "m_grab", name: "Grab", defaultCategoryId: "cat_sub_transport_taxi", defaultAccountId: null }],
  ["uber", { merchantId: "m_uber", name: "Uber", defaultCategoryId: "cat_sub_transport_taxi", defaultAccountId: null }],
  ["shopee", { merchantId: "m_shopee", name: "Shopee", defaultCategoryId: "cat_sub_food_groceries", defaultAccountId: null }],
  ["lazada", { merchantId: "m_lazada", name: "Lazada", defaultCategoryId: "cat_sub_food_groceries", defaultAccountId: null }],
  ["amazon", { merchantId: "m_amazon", name: "Amazon", defaultCategoryId: "cat_sub_food_groceries", defaultAccountId: null }],
  ["watsons", { merchantId: "m_watsons", name: "Watsons", defaultCategoryId: "cat_sub_health_medication", defaultAccountId: null }],
  ["puregold", { merchantId: "m_puregold", name: "Puregold", defaultCategoryId: "cat_sub_food_groceries", defaultAccountId: null }],
  ["7-eleven", { merchantId: "m_711", name: "7-Eleven", defaultCategoryId: "cat_sub_food_convenience", defaultAccountId: null }],
]);

/**
 * Extracts the merchant/payee name and explicit note from chat prompt text.
 * Notes are now strictly explicit (e.g. "note: ...") to prevent residual sentence junk.
 */
export function extractMerchantNote(
  input: ExtractMerchantNoteInput,
): ExtractedMerchantNote {
  let text = input.rawText;

  // 1. Extract explicit note if present (e.g. "note: split with John" or "memo: dinner")
  let explicitNote: string | null = null;
  const noteMatch = text.match(
    /\b(?:note|memo|tanda|nota)\s*[:=-]?\s*([^,\.]+)/i,
  );
  if (noteMatch && noteMatch[1]?.trim()) {
    explicitNote = capitalize(noteMatch[1].trim());
    text = text.replace(noteMatch[0], " ");
  }

  // 2. Remove matched amount text
  if (input.matchedAmountText) {
    text = text.replace(input.matchedAmountText, " ");
  }

  // 3. Remove matched account texts
  if (input.matchedAccountTexts) {
    for (const accText of input.matchedAccountTexts) {
      const reg = new RegExp(
        `\\b(from|to|using|with|via|galing|mula|gamit|de|con|a|el|la|my|sa|ang|aking)?\\s*${escapeRegExp(accText)}\\b`,
        "gi",
      );
      text = text.replace(reg, " ");
    }
  }

  // 4. Remove generic intent starter phrases
  const genericStarters = [
    /\b(?:i\s+)?(spend|spent|spends|pay|paid|pays|bought|buy|buys|received|receive|receives|got|transferred|transfer|transfers)\b/gi,
    /\b(?:ako\s+)?(gumastos|nagastos|nagbayad|binili|bumili|natanggap|kumita|sweldo|sahod)\b/gi,
    /\b(gasté|gasto|pagué|pago|compré|compro|recibí|recibo|transferí)\b/gi,
    /\b(please record|record|log|add|encode)\b/gi,
  ];

  for (const starter of genericStarters) {
    text = text.replace(starter, " ");
  }

  // 5. Remove matched category keyword if it is not a merchant brand
  const merchantMap = input.merchantLookupMap ?? DEFAULT_FALLBACK_MERCHANTS;
  if (input.matchedCategoryKeyword) {
    const isBrand = merchantMap.has(input.matchedCategoryKeyword.toLowerCase());
    if (!isBrand) {
      const catKwRegex = new RegExp(
        `\\b${escapeRegExp(input.matchedCategoryKeyword)}\\b`,
        "gi",
      );
      text = text.replace(catKwRegex, " ");
    }
  }

  // 6. Check dynamic merchant lookup map (keywords & proper names)
  let detectedMerchantName: string | null = null;
  let matchedMerchantInfo: MerchantLookupInfo | null = null;
  const lowerText = text.toLowerCase();

  // Sort keywords by length descending so longer phrases match first
  const sortedKeywords = Array.from(merchantMap.keys()).sort(
    (a, b) => b.length - a.length,
  );

  for (const kw of sortedKeywords) {
    const reg = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (reg.test(lowerText)) {
      const info = merchantMap.get(kw)!;
      detectedMerchantName = info.name;
      matchedMerchantInfo = info;
      break;
    }
  }

  // 7. Extract merchant after prepositions "at", "sa", "en", "from", "mula", "de"
  if (!detectedMerchantName) {
    const atMatch = text.match(
      /\b(?:at|sa|en|from|mula|de)\s+([A-Za-z0-9&'\s]+?)(?:\s+(?:from|to|using|with|via|galing|mula|gamit|de|con|a)|$)/i,
    );
    if (atMatch && atMatch[1]?.trim()) {
      const candidate = atMatch[1].trim();
      if (candidate.length > 1 && candidate.length < 35) {
        detectedMerchantName = capitalize(candidate);
      }
    }
  }

  // 8. Clean residual text for fallback merchant name (e.g. "Shell 1500")
  let cleaned = text
    .replace(/\b(for|on|at|sa|kay|para sa|en|para|por|from|mula|de)\b/gi, " ")
    .replace(/[,\.?!;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (detectedMerchantName) {
    const merchantRegex = new RegExp(`\\b${escapeRegExp(detectedMerchantName)}\\b`, "i");
    cleaned = cleaned.replace(merchantRegex, " ").replace(/\s+/g, " ").trim();
  }

  const finalName =
    detectedMerchantName ||
    (cleaned ? capitalize(cleaned) : input.matchedCategoryKeyword ? capitalize(input.matchedCategoryKeyword) : null);

  return {
    name: finalName,
    note: explicitNote,
    matchedMerchant: matchedMerchantInfo,
  };
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
