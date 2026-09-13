/**
 * Format an integer amount in minor units (centavos/cents) as a formatted currency string.
 * Uses integer math to avoid floating point precision pitfalls.
 *
 * @param amountMinorUnits - Amount in integer minor units (e.g. 150000 for ₱1,500.00)
 * @param currencyCode - Currency code, defaults to 'PHP'
 * @param showSign - Whether to explicitly include a '+' for positive amounts
 */
export function formatCurrency(
  amountMinorUnits: number,
  currencyCode: string = "PHP",
  showSign: boolean = false,
): string {
  const isNegative = amountMinorUnits < 0;
  const absMinorUnits = Math.abs(amountMinorUnits);
  const major = Math.floor(absMinorUnits / 100);
  const minor = absMinorUnits % 100;

  const majorFormatted = major.toLocaleString("en-PH");
  const minorFormatted = minor.toString().padStart(2, "0");
  const symbol = currencyCode === "PHP" ? "₱" : `${currencyCode} `;

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && amountMinorUnits > 0) {
    sign = "+";
  }

  return `${sign}${symbol}${majorFormatted}.${minorFormatted}`;
}
