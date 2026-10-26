export interface ExtractedAmount {
  rawAmount: number;
  amountMinorUnits: number;
  currencySymbol?: string | null;
  matchedText: string;
}

/**
 * Extracts numeric transaction amounts from natural language text.
 * Handles:
 * - Direct numbers: "500", "500.50", "1,200", "1200.75"
 * - With currency symbols: "₱500", "$25", "PHP 1,500", "€80"
 * - Multipliers / Suffixes: "25k" (25,000), "1.5k" (1,500), "2m" (2,000,000)
 */
export function extractAmount(text: string): ExtractedAmount | null {
  // Regex pattern matching currency symbols and numbers with optional k/m multipliers
  const regex =
    /(?:(₱|\$|€|£|¥|PHP|USD|EUR)\s*)?([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(k|m|million|thousand)?(?:\s*(?:pesos|dollars|euros|cents|bucks|php|usd))?/i;

  const match = text.match(regex);
  if (!match) {
    return null;
  }

  const symbol = match[1] ?? null;
  const numString = match[2].replace(/,/g, "");
  let parsedNum = parseFloat(numString);
  if (isNaN(parsedNum) || parsedNum <= 0) {
    return null;
  }

  const multiplierStr = match[3]?.toLowerCase();
  if (multiplierStr === "k" || multiplierStr === "thousand") {
    parsedNum *= 1000;
  } else if (multiplierStr === "m" || multiplierStr === "million") {
    parsedNum *= 1000000;
  }

  // Round to nearest integer minor units (e.g. 500 -> 50000, 500.50 -> 50050)
  const amountMinorUnits = Math.round(parsedNum * 100);

  return {
    rawAmount: parsedNum,
    amountMinorUnits,
    currencySymbol: symbol,
    matchedText: match[0],
  };
}
