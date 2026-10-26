import { Platform } from "react-native";
import { getWidgetInfo, requestPinWidget } from "react-native-android-widget";

/**
 * Home screen widgets are only available on Android launchers.
 */
export function isWidgetPinningSupported(): boolean {
  return Platform.OS === "android";
}

/**
 * Asks the launcher to show its "Add to home screen" prompt for the widget.
 * Resolves `false` when the platform or launcher cannot pin widgets.
 * `true` means the prompt was shown, not that the user confirmed it.
 */
export async function pinWidget(widgetName: string): Promise<boolean> {
  if (!isWidgetPinningSupported()) return false;
  try {
    return await requestPinWidget({ widgetName });
  } catch {
    return false;
  }
}

/**
 * Returns the subset of widget names that currently have at least one
 * instance placed on the home screen.
 */
export async function getPinnedWidgetNames(
  widgetNames: readonly string[],
): Promise<Set<string>> {
  if (!isWidgetPinningSupported()) return new Set();

  const results = await Promise.all(
    widgetNames.map(async (widgetName) => {
      try {
        const instances = await getWidgetInfo(widgetName);
        return instances.length > 0 ? widgetName : null;
      } catch {
        return null;
      }
    }),
  );

  return new Set(results.filter((name): name is string => name !== null));
}
