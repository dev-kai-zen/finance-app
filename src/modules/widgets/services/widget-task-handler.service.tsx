import React from "react";
import { Platform } from "react-native";
import {
  registerWidgetTaskHandler,
  requestPinWidget,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { QuickExpenseWidget } from "../components/quick-expense-widget";
import { QuickIncomeWidget } from "../components/quick-income-widget";
import { QuickTransferWidget } from "../components/quick-transfer-widget";
import { DualActionWidget } from "../components/dual-action-widget";
import { TripleActionWidget } from "../components/triple-action-widget";
import { MonthlyCashflowWidget } from "../components/monthly-cashflow-widget";
import { NetWorthWidget } from "../components/net-worth-widget";
import { MonthlyBudgetWidget } from "../components/monthly-budget-widget";
import {
  DUAL_ACTION_WIDGET_NAME,
  MONTHLY_BUDGET_WIDGET_NAME,
  MONTHLY_CASHFLOW_WIDGET_NAME,
  NET_WORTH_WIDGET_NAME,
  QUICK_EXPENSE_WIDGET_NAME,
  QUICK_INCOME_WIDGET_NAME,
  QUICK_TRANSFER_WIDGET_NAME,
  TRIPLE_ACTION_WIDGET_NAME,
} from "../constants/widget.constants";
import { getFinancialSnapshot } from "./widget-snapshot.service";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      switch (widgetInfo?.widgetName) {
        case QUICK_INCOME_WIDGET_NAME:
          renderWidget(<QuickIncomeWidget />);
          break;
        case QUICK_TRANSFER_WIDGET_NAME:
          renderWidget(<QuickTransferWidget />);
          break;
        case DUAL_ACTION_WIDGET_NAME:
          renderWidget(<DualActionWidget />);
          break;
        case TRIPLE_ACTION_WIDGET_NAME:
          renderWidget(<TripleActionWidget />);
          break;
        case MONTHLY_CASHFLOW_WIDGET_NAME: {
          const snapshot = getFinancialSnapshot();
          renderWidget(<MonthlyCashflowWidget snapshot={snapshot} />);
          break;
        }
        case NET_WORTH_WIDGET_NAME: {
          const snapshot = getFinancialSnapshot();
          renderWidget(<NetWorthWidget snapshot={snapshot} />);
          break;
        }
        case MONTHLY_BUDGET_WIDGET_NAME: {
          const snapshot = getFinancialSnapshot();
          renderWidget(<MonthlyBudgetWidget snapshot={snapshot} />);
          break;
        }
        case QUICK_EXPENSE_WIDGET_NAME:
        default:
          renderWidget(<QuickExpenseWidget />);
          break;
      }
      break;
    case "WIDGET_DELETED":
      // No cleanup required for stateless launcher widgets
      break;

    case "WIDGET_CLICK":
      break;
    default:
      break;
  }
}

/**
 * Registers the widget background task handler with the Android OS.
 * Safe to call on any platform; will no-op on non-Android platforms.
 */
export function registerWidgets(): void {
  if (Platform.OS !== "android") {
    return;
  }

  registerWidgetTaskHandler(widgetTaskHandler);
}

/**
 * Prompts the Android home screen launcher to pin the Quick Expense widget (1x1).
 */
export async function pinQuickExpenseWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: QUICK_EXPENSE_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Prompts the Android home screen launcher to pin the Quick Income widget (1x1).
 */
export async function pinQuickIncomeWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: QUICK_INCOME_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Prompts the Android home screen launcher to pin the Quick Transfer widget (1x1).
 */
export async function pinQuickTransferWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: QUICK_TRANSFER_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Prompts the Android home screen launcher to pin the Expense | Income Dual Action widget (2x1).
 */
export async function pinDualActionWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: DUAL_ACTION_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Prompts the Android home screen launcher to pin the Expense | Income | Transfer Triple Action widget (3x1 / 4x1).
 */
export async function pinTripleActionWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: TRIPLE_ACTION_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Requests an immediate re-render of any existing Quick Expense widgets on the home screen.
 */
export async function updateQuickExpenseWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: QUICK_EXPENSE_WIDGET_NAME,
      renderWidget: () => <QuickExpenseWidget />,
    });
  } catch {}
}

/**
 * Requests an immediate re-render of any existing Quick Income widgets on the home screen.
 */
export async function updateQuickIncomeWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: QUICK_INCOME_WIDGET_NAME,
      renderWidget: () => <QuickIncomeWidget />,
    });
  } catch {}
}

/**
 * Requests an immediate re-render of any existing Quick Transfer widgets on the home screen.
 */
export async function updateQuickTransferWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: QUICK_TRANSFER_WIDGET_NAME,
      renderWidget: () => <QuickTransferWidget />,
    });
  } catch {}
}

/**
 * Requests an immediate re-render of any existing Dual Action widgets on the home screen.
 */
export async function updateDualActionWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: DUAL_ACTION_WIDGET_NAME,
      renderWidget: () => <DualActionWidget />,
    });
  } catch {}
}

/**
 * Requests an immediate re-render of any existing Triple Action widgets on the home screen.
 */
export async function updateTripleActionWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: TRIPLE_ACTION_WIDGET_NAME,
      renderWidget: () => <TripleActionWidget />,
    });
  } catch {}
}

/**
 * Updates all registered launcher widgets.
 */
export async function updateAllActionWidgets(): Promise<void> {
  await Promise.allSettled([
    updateQuickExpenseWidgets(),
    updateQuickIncomeWidgets(),
    updateQuickTransferWidgets(),
    updateDualActionWidgets(),
    updateTripleActionWidgets(),
  ]);
}

/**
 * Prompts the Android home screen launcher to pin the Monthly Cashflow widget (4x2).
 */
export async function pinMonthlyCashflowWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: MONTHLY_CASHFLOW_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Prompts the Android home screen launcher to pin the Net Worth Glance widget (4x2).
 */
export async function pinNetWorthWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: NET_WORTH_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Requests an immediate re-render of any existing Monthly Cashflow widgets on the home screen.
 */
export async function updateMonthlyCashflowWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const snapshot = getFinancialSnapshot();
    await requestWidgetUpdate({
      widgetName: MONTHLY_CASHFLOW_WIDGET_NAME,
      renderWidget: () => <MonthlyCashflowWidget snapshot={snapshot} />,
    });
  } catch {}
}

/**
 * Requests an immediate re-render of any existing Net Worth widgets on the home screen.
 */
export async function updateNetWorthWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const snapshot = getFinancialSnapshot();
    await requestWidgetUpdate({
      widgetName: NET_WORTH_WIDGET_NAME,
      renderWidget: () => <NetWorthWidget snapshot={snapshot} />,
    });
  } catch {}
}

/**
 * Prompts the Android home screen launcher to pin the Monthly Budget Progress widget (4x2).
 */
export async function pinMonthlyBudgetWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: MONTHLY_BUDGET_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Requests an immediate re-render of any existing Monthly Budget widgets on the home screen.
 */
export async function updateMonthlyBudgetWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const snapshot = getFinancialSnapshot();
    await requestWidgetUpdate({
      widgetName: MONTHLY_BUDGET_WIDGET_NAME,
      renderWidget: () => <MonthlyBudgetWidget snapshot={snapshot} />,
    });
  } catch {}
}


