interface ExtractMerchantNoteInput {
  rawText: string;
  matchedAmountText?: string;
  matchedAccountTexts?: string[];
  matchedCategoryKeyword?: string | null;
  intentMatchedWords?: string[];
}

export interface ExtractedMerchantNote {
  name: string | null;
  note: string | null;
}

const COMMON_MERCHANTS: Record<string, string> = {
  mcdonalds: "McDonald's",
  mcdo: "McDonald's",
  jollibee: "Jollibee",
  starbucks: "Starbucks",
  kfc: "KFC",
  chowking: "Chowking",
  wendys: "Wendy's",
  subway: "Subway",
  meralco: "Meralco",
  maynilad: "Maynilad",
  pldt: "PLDT",
  globe: "Globe Telecom",
  smart: "Smart Communications",
  converge: "Converge",
  shell: "Shell",
  petron: "Petron",
  caltex: "Caltex",
  seaoil: "Seaoil",
  grab: "Grab",
  uber: "Uber",
  shopee: "Shopee",
  lazada: "Lazada",
  amazon: "Amazon",
  watsons: "Watsons",
  puregold: "Puregold",
};

/**
 * Extracts the merchant/payee name and description/note from residual prompt text.
 */
export function extractMerchantNote(
  input: ExtractMerchantNoteInput,
): ExtractedMerchantNote {
  let text = input.rawText;

  // Remove matched amount text
  if (input.matchedAmountText) {
    text = text.replace(input.matchedAmountText, " ");
  }

  // Remove matched account texts
  if (input.matchedAccountTexts) {
    for (const accText of input.matchedAccountTexts) {
      const reg = new RegExp(`\\b(from|to|using|with|via|galing|mula|gamit|de|con|a|el|la|my|sa|ang|aking)?\\s*${accText}\\b`, "gi");
      text = text.replace(reg, " ");
    }
  }

  // Remove generic intent starter phrases
  const genericStarters = [
    /\b(?:i\s+)?(spend|spent|spends|pay|paid|pays|bought|buy|buys|received|receive|receives|got|transferred|transfer|transfers)\b/gi,
    /\b(?:ako\s+)?(gumastos|nagastos|nagbayad|binili|bumili|natanggap|kumita|sweldo|sahod)\b/gi,
    /\b(gasté|gasto|pagué|pago|compré|compro|recibí|recibo|transferí)\b/gi,
    /\b(please record|record|log|add|encode)\b/gi,
  ];

  for (const starter of genericStarters) {
    text = text.replace(starter, " ");
  }

  // Remove matched category keyword so merchant doesn't repeat category
  if (input.matchedCategoryKeyword) {
    const isCommonBrand = Object.keys(COMMON_MERCHANTS).includes(
      input.matchedCategoryKeyword.toLowerCase(),
    );
    if (!isCommonBrand) {
      const catKwRegex = new RegExp(`\\b${input.matchedCategoryKeyword}\\b`, "gi");
      text = text.replace(catKwRegex, " ");
    }
  }

  // Check if any known merchant alias exists
  let detectedMerchant: string | null = null;
  const lowerText = text.toLowerCase();
  for (const [alias, properName] of Object.entries(COMMON_MERCHANTS)) {
    const reg = new RegExp(`\\b${alias}\\b`, "i");
    if (reg.test(lowerText)) {
      detectedMerchant = properName;
      break;
    }
  }

  // Extract merchant after "at", "in", "on", "sa", "en", "from", "mula", "de"
  if (!detectedMerchant) {
    const atMatch = text.match(/\b(?:at|sa|en|from|mula|de)\s+([A-Za-z0-9&'\s]+?)(?:\s+(?:from|to|using|with|via|galing|mula|gamit|de|con|a)|$)/i);
    if (atMatch && atMatch[1]?.trim()) {
      const candidate = atMatch[1].trim();
      if (candidate.length > 1 && candidate.length < 35) {
        detectedMerchant = capitalize(candidate);
      }
    }
  }

  // Clean remaining text for memo/note
  let cleaned = text
    .replace(/\b(for|on|at|sa|kay|para sa|en|para|por|from|mula|de)\b/gi, " ")
    .replace(/[,\.?!;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If detected merchant was found, remove it from cleaned note
  if (detectedMerchant) {
    const merchantRegex = new RegExp(`\\b${detectedMerchant}\\b`, "i");
    cleaned = cleaned.replace(merchantRegex, " ").replace(/\s+/g, " ").trim();
  }

  const finalName = detectedMerchant || (cleaned ? capitalize(cleaned) : input.matchedCategoryKeyword ? capitalize(input.matchedCategoryKeyword) : null);
  const finalNote = cleaned ? capitalize(cleaned) : input.matchedCategoryKeyword ? capitalize(input.matchedCategoryKeyword) : null;

  return {
    name: finalName,
    note: finalNote,
  };
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
