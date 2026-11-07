import { MAX_VALID_YEAR, MIN_VALID_YEAR } from "../constants/data-import.constants";
import type { DateFormatPattern } from "../types/data-import.types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface DateAnalysisResult {
  isValid: boolean;
  containsTime: boolean;
  detectedFormat?: DateFormatPattern;
  isAmbiguous?: boolean;
  option1?: { format: DateFormatPattern; reading: string; date: Date };
  option2?: { format: DateFormatPattern; reading: string; date: Date };
  singleReading?: string;
}

export function formatDateInWords(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Checks if a date string contains an embedded time portion (e.g. T12:30 or 12:30:00).
 */
export function hasEmbeddedTime(value: string): boolean {
  return /T\d{1,2}:\d{2}|\s\d{1,2}:\d{2}(:\d{2})?/.test(value.trim());
}

/**
 * Extracts pure date part from a string that might have time attached.
 */
export function extractDatePart(value: string): string {
  const trimmed = value.trim();
  const tIndex = trimmed.indexOf("T");
  if (tIndex > 0) return trimmed.slice(0, tIndex);
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex > 0 && /:\d{2}/.test(trimmed)) return trimmed.slice(0, spaceIndex);
  return trimmed;
}

/**
 * Extracts time part from a string if present.
 */
export function extractTimePart(value: string): string | null {
  const trimmed = value.trim();
  const match = /(?:T|\s)(\d{1,2}:\d{2}(?::\d{2})?)/.exec(trimmed);
  return match ? match[1] : null;
}

/**
 * Parses time string (e.g. "09:30" or "09:30:00") into hours, minutes, seconds.
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number; seconds: number } | null {
  const trimmed = timeStr.trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }
  return { hours, minutes, seconds };
}

/**
 * Analyzes a raw date string from the first non-empty row to determine format and ambiguity.
 */
export function analyzeFirstRowDate(rawValue: string): DateAnalysisResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { isValid: false, containsTime: false };
  }

  const containsTime = hasEmbeddedTime(trimmed);
  const dateStr = extractDatePart(trimmed);

  // Match separators -, /, or .
  const parts = dateStr.split(/[-/.]/);
  if (parts.length !== 3) {
    return { isValid: false, containsTime };
  }

  const [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
  if (isNaN(p1) || isNaN(p2) || isNaN(p3)) {
    return { isValid: false, containsTime };
  }

  const sep = trimmed.includes("/") ? "/" : trimmed.includes(".") ? "." : "-";

  // Case 1: YYYY at start (e.g. 2026-03-24)
  if (p1 >= MIN_VALID_YEAR && p1 <= MAX_VALID_YEAR) {
    const year = p1;
    const month = p2;
    const day = p3;
    const d = makeValidDate(year, month, day);
    if (!d) return { isValid: false, containsTime };
    const pattern = sep === "/" ? "YYYY/MM/DD" : sep === "." ? "YYYY.MM.DD" : "YYYY-MM-DD";
    return {
      isValid: true,
      containsTime,
      detectedFormat: pattern,
      isAmbiguous: false,
      singleReading: formatDateInWords(d),
    };
  }

  // Case 2: YYYY at end (e.g. 24/03/2026 or 03/24/2026)
  if (p3 >= MIN_VALID_YEAR && p3 <= MAX_VALID_YEAR) {
    const year = p3;
    const v1 = p1; // Could be day or month
    const v2 = p2; // Could be month or day

    const dmyValid = isValidDayMonth(v1, v2, year);
    const mdyValid = isValidDayMonth(v2, v1, year);

    if (dmyValid && mdyValid) {
      if (v1 === v2) {
        // e.g. 05/05/2026
        const d = makeValidDate(year, v2, v1)!;
        const pattern = sep === "/" ? "DD/MM/YYYY" : sep === "." ? "DD.MM.YYYY" : "DD-MM-YYYY";
        return {
          isValid: true,
          containsTime,
          detectedFormat: pattern,
          isAmbiguous: false,
          singleReading: formatDateInWords(d),
        };
      }
      // Ambiguous! E.g. 01/02/2026
      const d1 = makeValidDate(year, v1, v2)!; // MM/DD/YYYY where v1=MM, v2=DD
      const d2 = makeValidDate(year, v2, v1)!; // DD/MM/YYYY where v1=DD, v2=MM

      const patternMdy = sep === "/" ? "MM/DD/YYYY" : "MM-DD-YYYY";
      const patternDmy = sep === "/" ? "DD/MM/YYYY" : sep === "." ? "DD.MM.YYYY" : "DD-MM-YYYY";

      return {
        isValid: true,
        containsTime,
        isAmbiguous: true,
        option1: {
          format: patternMdy,
          reading: formatDateInWords(d1),
          date: d1,
        },
        option2: {
          format: patternDmy,
          reading: formatDateInWords(d2),
          date: d2,
        },
      };
    } else if (dmyValid) {
      const d = makeValidDate(year, v2, v1)!;
      const pattern = sep === "/" ? "DD/MM/YYYY" : sep === "." ? "DD.MM.YYYY" : "DD-MM-YYYY";
      return {
        isValid: true,
        containsTime,
        detectedFormat: pattern,
        isAmbiguous: false,
        singleReading: formatDateInWords(d),
      };
    } else if (mdyValid) {
      const d = makeValidDate(year, v1, v2)!;
      const pattern = sep === "/" ? "MM/DD/YYYY" : "MM-DD-YYYY";
      return {
        isValid: true,
        containsTime,
        detectedFormat: pattern,
        isAmbiguous: false,
        singleReading: formatDateInWords(d),
      };
    }
  }

  return { isValid: false, containsTime };
}

function isValidDayMonth(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function makeValidDate(year: number, month: number, day: number): Date | null {
  if (year < MIN_VALID_YEAR || year > MAX_VALID_YEAR) return null;
  if (!isValidDayMonth(day, month, year)) return null;
  return new Date(year, month - 1, day);
}

/**
 * Parses a date cell using a specific pattern and optional time string.
 */
export function parseDateWithFormat(
  rawDate: string,
  format: DateFormatPattern,
  rawTime?: string | null,
): Date | null {
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  const embeddedTimeStr = extractTimePart(trimmed);
  const dateStr = extractDatePart(trimmed);
  const parts = dateStr.split(/[-/.]/);
  if (parts.length !== 3) return null;

  const [n1, n2, n3] = parts.map((p) => parseInt(p, 10));
  if (isNaN(n1) || isNaN(n2) || isNaN(n3)) return null;

  let year: number;
  let month: number;
  let day: number;

  switch (format) {
    case "YYYY-MM-DD":
    case "YYYY.MM.DD":
    case "YYYY/MM/DD":
      year = n1;
      month = n2;
      day = n3;
      break;
    case "DD/MM/YYYY":
    case "DD.MM.YYYY":
    case "DD-MM-YYYY":
      day = n1;
      month = n2;
      year = n3;
      break;
    case "MM/DD/YYYY":
    case "MM-DD-YYYY":
      month = n1;
      day = n2;
      year = n3;
      break;
    case "auto":
    default: {
      const analysis = analyzeFirstRowDate(rawDate);
      if (analysis.detectedFormat) {
        return parseDateWithFormat(rawDate, analysis.detectedFormat, rawTime);
      }
      return null;
    }
  }

  const baseDate = makeValidDate(year, month, day);
  if (!baseDate) return null;

  // Add time if available
  const timeToApply = rawTime?.trim() || embeddedTimeStr;
  if (timeToApply) {
    const parsedTime = parseTimeString(timeToApply);
    if (parsedTime) {
      baseDate.setHours(parsedTime.hours, parsedTime.minutes, parsedTime.seconds, 0);
    }
  }

  return baseDate;
}

