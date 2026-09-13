/** Parse decimal input without floating-point monetary arithmetic. */
export function parseOpeningAmount(input: string): number {
  const value = input.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter a number with at most two decimal places, e.g. -1000.50.");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const magnitude = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The opening amount is too large.");
  const result = Number(magnitude) * (value.startsWith("-") ? -1 : 1);
  return result === 0 ? 0 : result;
}

export function openingAmountInput(minorUnits: number): string {
  if (!Number.isSafeInteger(minorUnits)) throw new Error("Invalid stored opening amount.");
  const magnitude = Math.abs(minorUnits);
  return `${minorUnits < 0 ? "-" : ""}${Math.floor(magnitude / 100)}.${String(magnitude % 100).padStart(2, "0")}`;
}

export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseOpeningDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use YYYY-MM-DD for the opening date.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (year < 1900 || localDateInput(date) !== value) throw new Error("Enter a valid date from 1900 onward.");
  return date;
}
