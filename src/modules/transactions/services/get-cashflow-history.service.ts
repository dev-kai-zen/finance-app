import { and, gte, isNull, lte } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export interface CashFlowPeriodPoint {
  periodKey: string; // e.g. "2026-10"
  periodLabel: string; // e.g. "Oct 2026"
  startDate: Date;
  endDate: Date;
  inflowMinorUnits: number;
  outflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  savingsRatePercentage: number;
}

export interface CashFlowHistoryQuery {
  startDate: Date;
  endDate: Date;
}

export interface CashFlowHistoryResult {
  periods: CashFlowPeriodPoint[];
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  averageMonthlyNetMinorUnits: number;
  overallSavingsRatePercentage: number;
}

/**
 * Builds chronological monthly periods between startDate and endDate.
 */
function generateMonthlySlots(startDate: Date, endDate: Date): CashFlowPeriodPoint[] {
  const slots: CashFlowPeriodPoint[] = [];

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  let curYear = startYear;
  let curMonth = startMonth;

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
    const slotStart = new Date(curYear, curMonth, 1, 0, 0, 0, 0);
    const slotEnd = new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999);
    const periodKey = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
    const periodLabel = slotStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    slots.push({
      periodKey,
      periodLabel,
      startDate: slotStart,
      endDate: slotEnd,
      inflowMinorUnits: 0,
      outflowMinorUnits: 0,
      netCashFlowMinorUnits: 0,
      savingsRatePercentage: 0,
    });

    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }

  return slots;
}

export function getCashFlowHistory(
  query: CashFlowHistoryQuery,
  context: DbContext = db,
): CashFlowHistoryResult {
  const periods = generateMonthlySlots(query.startDate, query.endDate);
  const periodMap = new Map<string, CashFlowPeriodPoint>();
  for (const p of periods) {
    periodMap.set(p.periodKey, p);
  }

  const txRows = context
    .select({
      type: transactions.type,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, query.startDate),
        lte(transactions.occurredAt, query.endDate),
      ),
    )
    .all();

  let overallInflow = 0;
  let overallOutflow = 0;

  for (const tx of txRows) {
    if (tx.type === "transfer") continue;

    const txDate = new Date(tx.occurredAt);
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
    const slot = periodMap.get(key);
    if (!slot) continue;

    if (tx.amountCents > 0) {
      slot.inflowMinorUnits += tx.amountCents;
      overallInflow += tx.amountCents;
    } else if (tx.amountCents < 0) {
      const outflow = Math.abs(tx.amountCents);
      slot.outflowMinorUnits += outflow;
      overallOutflow += outflow;
    }
  }

  // Calculate Net Cash Flow & Savings Rate for each period
  for (const slot of periods) {
    slot.netCashFlowMinorUnits = slot.inflowMinorUnits - slot.outflowMinorUnits;
    slot.savingsRatePercentage =
      slot.inflowMinorUnits > 0
        ? Math.round((slot.netCashFlowMinorUnits / slot.inflowMinorUnits) * 100)
        : 0;
  }

  const overallNet = overallInflow - overallOutflow;
  const periodCount = Math.max(1, periods.length);
  const averageMonthlyNet = Math.round(overallNet / periodCount);
  const overallSavingsRate =
    overallInflow > 0 ? Math.round((overallNet / overallInflow) * 100) : 0;

  return {
    periods,
    totalInflowMinorUnits: overallInflow,
    totalOutflowMinorUnits: overallOutflow,
    netCashFlowMinorUnits: overallNet,
    averageMonthlyNetMinorUnits: averageMonthlyNet,
    overallSavingsRatePercentage: overallSavingsRate,
  };
}
