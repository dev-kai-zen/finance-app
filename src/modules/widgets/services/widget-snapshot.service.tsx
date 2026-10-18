import React from "react";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { requestWidgetUpdate } from "react-native-android-widget";
import { db, type DbContext } from "@/infrastructure/database/client";
import { settings } from "@/infrastructure/database/schema";
import { getDashboardSummary, getMonthlyCashflow } from "@/modules/dashboard";
import { getCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency, DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import type { FinancialWidgetSnapshot } from "../types/widget.types";
import {
  DEFAULT_WIDGET_SNAPSHOT,
  MONTHLY_CASHFLOW_WIDGET_NAME,
  NET_WORTH_WIDGET_NAME,
  WIDGET_SNAPSHOT_SETTINGS_KEY,
} from "../constants/widget.constants";
import { MonthlyCashflowWidget } from "../components/monthly-cashflow-widget";
import { NetWorthWidget } from "../components/net-worth-widget";

export { DEFAULT_WIDGET_SNAPSHOT };


/**
 * Retrieves the current financial snapshot for widgets.
 * Reads the cached snapshot from SQLite settings. If absent, computes and saves a fresh snapshot.
 * Safe against cold starts: falls back to DEFAULT_WIDGET_SNAPSHOT if DB is inaccessible.
 */
export function getFinancialSnapshot(context: DbContext = db): FinancialWidgetSnapshot {
  try {
    const row = context
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, WIDGET_SNAPSHOT_SETTINGS_KEY))
      .get();

    if (row?.value) {
      const parsed = JSON.parse(row.value) as FinancialWidgetSnapshot;
      if (parsed && typeof parsed.netWorthFormatted === "string") {
        return parsed;
      }
    }

    return computeAndSaveFinancialSnapshot(context);
  } catch {
    return DEFAULT_WIDGET_SNAPSHOT;
  }
}

/**
 * Computes live totals from dashboard/currencies modules, saves to settings, and returns the snapshot.
 */
export function computeAndSaveFinancialSnapshot(
  context: DbContext = db,
): FinancialWidgetSnapshot {
  try {
    const homeCurrency =
      getCurrencyPreferences(context)?.defaultCurrency ?? DEFAULT_BASE_CURRENCY;
    const summary = getDashboardSummary(context);
    const cashflow = summary.monthlyCashflow ?? getMonthlyCashflow(context);

    const inflow = cashflow.totalInflowMinorUnits;
    const outflow = cashflow.totalOutflowMinorUnits;
    const netSavings = cashflow.netSavingsMinorUnits;
    const netWorth = summary.netWorthMinorUnits;
    const totalAssets = summary.totalAssetsMinorUnits;
    const totalLiabilities = Math.abs(summary.totalLiabilitiesMinorUnits);

    const snapshot: FinancialWidgetSnapshot = {
      monthLabel: cashflow.monthLabel ?? "This Month",
      inflowMinorUnits: inflow,
      inflowFormatted: formatCurrency(inflow, homeCurrency, false),
      outflowMinorUnits: outflow,
      outflowFormatted: formatCurrency(outflow, homeCurrency, false),
      netSavingsMinorUnits: netSavings,
      netSavingsFormatted: formatCurrency(netSavings, homeCurrency, true),
      savingsRatePercentage: cashflow.savingsRatePercentage,
      netWorthMinorUnits: netWorth,
      netWorthFormatted: formatCurrency(netWorth, homeCurrency, false),
      totalAssetsMinorUnits: totalAssets,
      totalAssetsFormatted: formatCurrency(totalAssets, homeCurrency, false),
      totalLiabilitiesMinorUnits: totalLiabilities,
      totalLiabilitiesFormatted: formatCurrency(totalLiabilities, homeCurrency, false),
      netWorthChangePercentage: summary.netWorthChangePercentage,
      currencyCode: homeCurrency,
      updatedAt: Date.now(),
    };

    try {
      context
        .insert(settings)
        .values({
          key: WIDGET_SNAPSHOT_SETTINGS_KEY,
          value: JSON.stringify(snapshot),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: JSON.stringify(snapshot),
            updatedAt: new Date(),
          },
        })
        .run();
    } catch {
      // Ignored if table is temporarily locked
    }

    return snapshot;
  } catch {
    return DEFAULT_WIDGET_SNAPSHOT;
  }
}

/**
 * Triggers an immediate re-render of both Monthly Cashflow and Net Worth widgets on the home screen.
 */
export async function updateDataWidgets(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    const snapshot = computeAndSaveFinancialSnapshot();
    await Promise.allSettled([
      requestWidgetUpdate({
        widgetName: MONTHLY_CASHFLOW_WIDGET_NAME,
        renderWidget: () => <MonthlyCashflowWidget snapshot={snapshot} />,
      }),
      requestWidgetUpdate({
        widgetName: NET_WORTH_WIDGET_NAME,
        renderWidget: () => <NetWorthWidget snapshot={snapshot} />,
      }),
    ]);
  } catch {
    // Graceful error handling for missing widgets
  }
}
