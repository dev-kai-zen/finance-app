export interface ExtractedAmount {
  rawAmount: number;
  amountMinorUnits: number;
  currencySymbol?: string | null;
  matchedText: string;
}

export interface ExtractAmountsResult {
  primaryAmount: ExtractedAmount | null;
  allAmounts: ExtractedAmount[];
  hasMultipleAmounts: boolean;
}

/**
 * Extracts numeric transaction amounts from natural language text.
 * Handles:
 * - Direct numbers: "500", "500.50", "1,200", "1200.75"
 * - With currency symbols: "₱500", "$25", "PHP 1,500", "€80"
 * - Multipliers / Suffixes: "25k" (25,000), "1.5k" (1,500), "2m" (2,000,000)
 * - Identifies single vs multiple ambiguous amounts
 */
export function extractAmounts(text: string): ExtractAmountsResult {
  const regex =
    /(?:(₱|\$|€|£|¥|PHP|USD|EUR)\s*)?([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(k|m|million|thousand)?(?:\s*(?:pesos|dollars|euros|cents|bucks|php|usd))?(?![a-zA-Z0-9_-])/gi;

  const matches = Array.from(text.matchAll(regex));
  const validAmounts: ExtractedAmount[] = [];

  for (const match of matches) {
    const symbol = match[1] ?? null;
    const numString = match[2].replace(/,/g, "");
    let parsedNum = parseFloat(numString);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      continue;
    }

    const multiplierStr = match[3]?.toLowerCase();
    if (multiplierStr === "k" || multiplierStr === "thousand") {
      parsedNum *= 1000;
    } else if (multiplierStr === "m" || multiplierStr === "million") {
      parsedNum *= 1000000;
    }

    // Ignore ordinals: e.g. "13th"
    const matchIdx = match.index ?? 0;
    const afterMatch = text.slice(matchIdx + match[0].length);
    if (/^(?:st|nd|rd|th)\b/i.test(afterMatch)) {
      continue;
    }

    const amountMinorUnits = Math.round(parsedNum * 100);

    validAmounts.push({
      rawAmount: parsedNum,
      amountMinorUnits,
      currencySymbol: symbol,
      matchedText: match[0].trim(),
    });
  }

  // Deduplicate identical numbers (e.g. "500 pesos (500)")
  const uniqueAmounts: ExtractedAmount[] = [];
  const seenUnits = new Set<number>();
  for (const item of validAmounts) {
    if (!seenUnits.has(item.amountMinorUnits)) {
      seenUnits.add(item.amountMinorUnits);
      uniqueAmounts.push(item);
    }
  }

  return {
    primaryAmount: uniqueAmounts[0] ?? null,
    allAmounts: uniqueAmounts,
    hasMultipleAmounts: uniqueAmounts.length > 1,
  };
}

export function extractAmount(text: string): ExtractedAmount | null {
  const result = extractAmounts(text);
  return result.primaryAmount;
}
