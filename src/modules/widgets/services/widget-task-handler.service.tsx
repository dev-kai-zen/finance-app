import React from "react";
import { Platform } from "react-native";
import {
  registerWidgetTaskHandler,
  requestPinWidget,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { QuickExpenseWidget } from "../components/quick-expense-widget";
import { QUICK_EXPENSE_WIDGET_NAME } from "../constants/widget.constants";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      renderWidget(<QuickExpenseWidget />);
      break;
    case "WIDGET_DELETED":
      // No cleanup required for stateless launcher widget
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
 * Prompts the Android home screen launcher to pin the Quick Expense widget.
 */
export async function pinQuickExpenseWidget(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  try {
    return await requestPinWidget({ widgetName: QUICK_EXPENSE_WIDGET_NAME });
  } catch {
    return false;
  }
}

/**
 * Requests an immediate re-render of any existing Quick Expense widgets on the home screen.
 */
export async function updateQuickExpenseWidgets(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await requestWidgetUpdate({
      widgetName: QUICK_EXPENSE_WIDGET_NAME,
      renderWidget: () => <QuickExpenseWidget />,
    });
  } catch {
    // Gracefully handle case where widget is not installed
  }
}
