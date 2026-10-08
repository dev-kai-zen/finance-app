import { CURRENCY_DECIMALS, DEFAULT_BASE_CURRENCY } from "@/utils/currency";

function currencyDecimalPlaces(currencyCode: string): number {
  return CURRENCY_DECIMALS[currencyCode] ?? 2;
}

function amountPattern(decimalPlaces: number, allowNegative: boolean): RegExp {
  const sign = allowNegative ? "-?" : "";
  return decimalPlaces === 0
    ? new RegExp(`^${sign}\\d+$`)
    : new RegExp(`^${sign}\\d+(\\.\\d{1,${decimalPlaces}})?$`);
}

function decimalPlacesMessage(decimalPlaces: number, allowNegative: boolean): string {
  const example = decimalPlaces === 0
    ? allowNegative ? "-1000" : "1000"
    : `${allowNegative ? "-" : ""}1000.${"5".padEnd(decimalPlaces, "0")}`;
  return decimalPlaces === 0
    ? `Enter a whole number, e.g. ${example}.`
    : `Enter a number with at most ${decimalPlaces} decimal places, e.g. ${example}.`;
}

/** Parse decimal input without floating-point monetary arithmetic. */
export function parseOpeningAmount(
  input: string,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number {
  const value = input.trim();
  const decimalPlaces = currencyDecimalPlaces(currencyCode);
  if (!amountPattern(decimalPlaces, true).test(value)) {
    throw new Error(decimalPlacesMessage(decimalPlaces, true));
  }
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const divisor = BigInt(10 ** decimalPlaces);
  const magnitude = BigInt(whole) * divisor + BigInt(fraction.padEnd(decimalPlaces, "0") || "0");
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The opening amount is too large.");
  const result = Number(magnitude) * (value.startsWith("-") ? -1 : 1);
  return result === 0 ? 0 : result;
}

export function openingAmountInput(
  minorUnits: number,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): string {
  if (!Number.isSafeInteger(minorUnits)) throw new Error("Invalid stored opening amount.");
  const decimalPlaces = currencyDecimalPlaces(currencyCode);
  const divisor = 10 ** decimalPlaces;
  const magnitude = Math.abs(minorUnits);
  const fraction = decimalPlaces > 0
    ? `.${String(magnitude % divisor).padStart(decimalPlaces, "0")}`
    : "";
  return `${minorUnits < 0 ? "-" : ""}${Math.floor(magnitude / divisor)}${fraction}`;
}

/** Parse a non-negative decimal amount for target/maintaining balances. */
export function parseMaintainingAmount(
  input: string,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number {
  const value = input.trim();
  const decimalPlaces = currencyDecimalPlaces(currencyCode);
  if (!amountPattern(decimalPlaces, false).test(value)) {
    throw new Error(decimalPlacesMessage(decimalPlaces, false));
  }
  const [whole, fraction = ""] = value.split(".");
  const divisor = BigInt(10 ** decimalPlaces);
  const magnitude = BigInt(whole) * divisor + BigInt(fraction.padEnd(decimalPlaces, "0") || "0");
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The amount is too large.");
  return Number(magnitude);
}

export function maintainingAmountInput(
  minorUnits: number | null | undefined,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): string {
  if (minorUnits == null) return "";
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
    throw new Error("Invalid stored maintaining balance.");
  }
  const decimalPlaces = currencyDecimalPlaces(currencyCode);
  const divisor = 10 ** decimalPlaces;
  const fraction = decimalPlaces > 0
    ? `.${String(minorUnits % divisor).padStart(decimalPlaces, "0")}`
    : "";
  return `${Math.floor(minorUnits / divisor)}${fraction}`;
}

export function parseCreditLimit(
  input: string,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): number {
  return parseMaintainingAmount(input, currencyCode);
}

export function creditLimitInput(
  minorUnits: number | null | undefined,
  currencyCode: string = DEFAULT_BASE_CURRENCY,
): string {
  return maintainingAmountInput(minorUnits, currencyCode);
}

export function parseBillingDay(input: string, label: string): number {
  const value = input.trim();
  if (!/^\d{1,2}$/.test(value)) {
    throw new Error(`${label} must be a whole number from 1 to 31.`);
  }
  const day = Number(value);
  if (day < 1 || day > 31) {
    throw new Error(`${label} must be from 1 to 31.`);
  }
  return day;
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
