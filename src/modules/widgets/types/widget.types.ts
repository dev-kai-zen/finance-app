export type WidgetActionType =
  | "WIDGET_ADDED"
  | "WIDGET_UPDATE"
  | "WIDGET_RESIZED"
  | "WIDGET_DELETED"
  | "WIDGET_CLICK";

export interface WidgetRouteParams {
  action?: "new";
  type?: "expense" | "income" | "transfer";
  source?: "widget";
}
