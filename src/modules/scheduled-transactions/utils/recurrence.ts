import type {
  CalculatedScheduleOccurrence,
  SaveScheduledTransactionInput,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

type RecurrenceRule = Pick<
  SaveScheduledTransactionInput | ScheduledTransaction,
  | "startsAt"
  | "timeZone"
  | "frequency"
  | "intervalCount"
  | "endMode"
  | "maxOccurrences"
  | "endsOn"
  | "weekendPolicy"
> & { anchorOccurrenceNumber?: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(date: Date, timeZone: string): ZonedDateParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour % 24,
    minute: values.minute,
    second: values.second,
  };
}

function zonedDate(parts: ZonedDateParts, timeZone: string): Date {
  const intendedUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
  let guess = intendedUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const represented = zonedParts(new Date(guess), timeZone);
    const representedUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
      0,
    );
    const correction = intendedUtc - representedUtc;
    if (correction === 0) break;
    guess += correction;
  }

  return new Date(guess);
}

function datePartsWithOffset(
  anchor: ZonedDateParts,
  frequency: RecurrenceRule["frequency"],
  intervalCount: number,
  occurrenceOffset: number,
): ZonedDateParts {
  if (frequency === "monthly") {
    const totalMonths =
      anchor.year * 12 +
      (anchor.month - 1) +
      occurrenceOffset * intervalCount;
    const year = Math.floor(totalMonths / 12);
    const monthIndex = ((totalMonths % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    return {
      ...anchor,
      year,
      month: monthIndex + 1,
      day: Math.min(anchor.day, lastDay),
    };
  }

  if (frequency === "yearly") {
    const year = anchor.year + occurrenceOffset * intervalCount;
    const lastDay = new Date(Date.UTC(year, anchor.month, 0)).getUTCDate();
    return { ...anchor, year, day: Math.min(anchor.day, lastDay) };
  }

  const days =
    frequency === "weekly"
      ? occurrenceOffset * intervalCount * 7
      : occurrenceOffset * intervalCount;
  const shifted = new Date(
    Date.UTC(anchor.year, anchor.month - 1, anchor.day + days),
  );
  return {
    ...anchor,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function localDateKey(parts: ZonedDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

function shiftWeekend(
  parts: ZonedDateParts,
  policy: RecurrenceRule["weekendPolicy"],
): ZonedDateParts | null {
  const weekday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  if (weekday !== 0 && weekday !== 6) return parts;
  if (policy === "skip") return null;

  const shift =
    policy === "next_weekday"
      ? weekday === 6
        ? 2
        : 1
      : weekday === 6
        ? -1
        : -2;
  const adjusted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + shift),
  );
  return {
    ...parts,
    year: adjusted.getUTCFullYear(),
    month: adjusted.getUTCMonth() + 1,
    day: adjusted.getUTCDate(),
  };
}

export function calculateScheduleOccurrence(
  rule: RecurrenceRule,
  sequenceNumber: number,
): CalculatedScheduleOccurrence | null {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) return null;
  const ordinal = sequenceNumber - (rule.anchorOccurrenceNumber ?? 1) + 1;
  if (ordinal < 1) return null;
  if (rule.frequency === "once" && ordinal > 1) return null;
  if (
    rule.endMode === "after_count" &&
    rule.maxOccurrences !== null &&
    rule.maxOccurrences !== undefined &&
    ordinal > rule.maxOccurrences
  ) {
    return null;
  }

  const anchor = zonedParts(rule.startsAt, rule.timeZone);
  const nominalParts = datePartsWithOffset(
    anchor,
    rule.frequency,
    rule.intervalCount,
    ordinal - 1,
  );
  if (
    rule.endMode === "on_date" &&
    rule.endsOn &&
    localDateKey(nominalParts) > rule.endsOn
  ) {
    return null;
  }

  const effectiveParts = shiftWeekend(nominalParts, rule.weekendPolicy);
  return {
    sequenceNumber,
    nominalAt: zonedDate(nominalParts, rule.timeZone),
    effectiveAt: effectiveParts
      ? zonedDate(effectiveParts, rule.timeZone)
      : null,
    skippedForWeekend: effectiveParts === null,
  };
}

export function getCurrentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatScheduleRecurrence(
  schedule: Pick<
    ScheduledTransaction,
    "frequency" | "intervalCount" | "endMode" | "maxOccurrences" | "endsOn"
  >,
): string {
  const unit =
    schedule.frequency === "once"
      ? "Once"
      : schedule.intervalCount === 1
        ? schedule.frequency === "daily"
          ? "Daily"
          : schedule.frequency === "weekly"
            ? "Weekly"
            : schedule.frequency === "monthly"
              ? "Monthly"
              : "Yearly"
        : `Every ${schedule.intervalCount} ${schedule.frequency === "daily" ? "days" : schedule.frequency === "weekly" ? "weeks" : schedule.frequency === "monthly" ? "months" : "years"}`;

  if (schedule.endMode === "after_count") {
    return `${unit} · ${schedule.maxOccurrences} occurrences`;
  }
  if (schedule.endMode === "on_date") {
    return `${unit} · through ${schedule.endsOn}`;
  }
  return unit;
}
